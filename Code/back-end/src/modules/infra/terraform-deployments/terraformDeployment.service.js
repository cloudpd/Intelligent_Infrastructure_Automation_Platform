const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const AppError = require('../../../core/utils/AppError');
const { Service } = require('../../service/service.model');
const { Project } = require('../../projects/projects.model');
const { TerraformDeployment } = require('./terraformDeployment.model');
const { copyDir } = require('../terraform/utils/writeFiles');
const { run } = require('../terraform/utils/execTerraform');
const awsService = require('../../aws/aws.service');

const DEPLOYMENTS_ROOT = path.join(process.cwd(), 'deployments');
const DESTROY_TMP_ROOT = path.join(process.cwd(), 'destroy-tmp');

// Same ownership-check shape used throughout modules/infra/* — kept local
// rather than shared, matching the existing convention in this codebase
// (network.service.js, eks.service.js, vm.service.js, terraformState.service.js
// all keep their own copy).
async function getOwnedService(serviceId, userId) {
  const service = await Service.findOne({
    where: { id: serviceId },
    include: [{ model: Project, as: 'project', where: { owner_id: userId }, attributes: [] }],
  });
  if (!service) throw new AppError('Service not found', 404);
  return service;
}

async function getOwnedDeployment(serviceId, environment, userId) {
  await getOwnedService(serviceId, userId);
  const deployment = await TerraformDeployment.findOne({
    where: { service_id: serviceId, environment },
  });
  if (!deployment) {
    throw new AppError(
      'No applied Terraform deployment found for this service/environment — nothing to destroy',
      404
    );
  }
  return deployment;
}

async function getOwnedDeploymentById(deploymentId, userId) {
  const deployment = await TerraformDeployment.findOne({
    where: { id: deploymentId },
    include: [
      {
        model: Service,
        as: 'service',
        required: true,
        attributes: ['id', 'name'],
        include: [
          {
            model: Project,
            as: 'project',
            required: true,
            where: { owner_id: userId },
            attributes: ['id', 'name'],
          },
        ],
      },
    ],
  });
  if (!deployment) throw new AppError('Deployment not found', 404);
  return deployment;
}

async function listDeployments(userId, serviceId) {
  await getOwnedService(serviceId, userId);
  return TerraformDeployment.findAll({ where: { service_id: serviceId } });
}

/**
 * Lists every currently-applied deployment owned by this user, across
 * every project/service — this is what powers the "Active projects"
 * panel, which has no single serviceId to scope to. Joins through
 * Service -> Project the same way getOwnedService does, just as a
 * findAll instead of a single ownership check.
 */
async function listAllForUser(userId) {
  return TerraformDeployment.findAll({
    include: [
      {
        model: Service,
        as: 'service',
        required: true,
        attributes: ['id', 'name'],
        include: [
          {
            model: Project,
            as: 'project',
            required: true,
            where: { owner_id: userId },
            attributes: ['id', 'name'],
          },
        ],
      },
    ],
    order: [['applied_at', 'DESC']],
  });
}

/**
 * Inspects an already-generated output directory and reports which
 * static module folders are present, purely by looking at disk — this
 * works no matter which generate endpoint produced the directory
 * (generateEksFiles, generateVmFiles, generateServiceFiles, ...), since
 * none of them tell the apply step which modules they wrote.
 */
function detectModules(outputDir) {
  const has = (name) => fs.existsSync(path.join(outputDir, 'modules', name));
  return {
    network: has('network'),
    ecr: has('ecr'),
    eks: has('eks'),
    vm: has('vm'),
  };
}

/**
 * Called right after `terraform apply` succeeds (see terraform.controller.js).
 * Copies the exact directory that was just applied — .tf files and all —
 * into an immutable snapshot, and records/updates the single
 * TerraformDeployment row for this (service, environment).
 *
 * There is at most one row per (service, environment): a re-apply on top
 * of an already-applied deployment (e.g. adding ECR, resizing node
 * groups) updates that same row and replaces its snapshot in place,
 * rather than growing a new row/folder each time — this is what keeps
 * `deployments/<id>/` from accumulating duplicates across repeated
 * updates to the same live deployment. The row's own id never changes
 * across re-applies, so its snapshot folder name is stable too.
 *
 * Deliberately copies the literal rendered files (via copyDir) rather
 * than re-deriving them later from stored config — the generator/templates
 * can change over the app's lifetime, and destroy must always operate on
 * something byte-identical to what actually created the real resources.
 */
async function recordDeployment({
  serviceId,
  environment,
  serviceSlug,
  outputDir,
  stateBucket,
  lockTable,
  awsRegion,
  awsCredentialId,
}) {
  const modules = detectModules(outputDir);

  const existing = await TerraformDeployment.findOne({
    where: { service_id: serviceId, environment },
  });

  if (existing) {
    fs.rmSync(existing.snapshot_dir, { recursive: true, force: true });
    const snapshotDir = path.join(DEPLOYMENTS_ROOT, existing.id);
    copyDir(outputDir, snapshotDir);

    existing.set({
      service_slug: serviceSlug,
      state_bucket: stateBucket,
      lock_table: lockTable || null,
      aws_region: awsRegion,
      aws_credential_id: awsCredentialId || existing.aws_credential_id,
      snapshot_dir: snapshotDir,
      modules,
      status: 'applied',
      destroy_error: null,
      applied_at: new Date(),
    });
    await existing.save();
    return existing;
  }

  const id = crypto.randomUUID();
  const snapshotDir = path.join(DEPLOYMENTS_ROOT, id);
  copyDir(outputDir, snapshotDir);

  return TerraformDeployment.create({
    id,
    service_id: serviceId,
    environment,
    service_slug: serviceSlug,
    state_bucket: stateBucket,
    lock_table: lockTable || null,
    aws_region: awsRegion,
    aws_credential_id: awsCredentialId || null,
    snapshot_dir: snapshotDir,
    modules,
    status: 'applied',
    applied_at: new Date(),
  });
}

/**
 * Validates and locks a deployment for destroy. Deliberately mirrors
 * terraform.controller.js#applyTerraformResources's shape (validate →
 * mark busy → return what the caller needs to run the background work),
 * so the destroy endpoint can respond 202 immediately the same way apply
 * does, and run the actual `terraform destroy` afterward.
 */
async function prepareDestroy({ serviceId, environment, userId, awsCredentialId }) {
  const deployment = await getOwnedDeployment(serviceId, environment, userId);

  if (deployment.status === 'destroying') {
    throw new AppError('A destroy is already in progress for this deployment', 409);
  }

  const credentialId = awsCredentialId || deployment.aws_credential_id;
  if (!credentialId) {
    throw new AppError(
      'awsCredentialId is required — the credential originally used for this deployment is no longer available',
      400
    );
  }

  const creds = await awsService.getDecryptedCredential(userId, credentialId);

  await TerraformDeployment.update(
    { status: 'destroying', destroy_error: null },
    { where: { id: deployment.id } }
  );

  return { deployment, creds };
}

/**
 * The actual `terraform destroy`, run against a disposable copy of the
 * deployment's snapshot — never the snapshot directory itself, and never
 * `generated/`. `terraform init` here rebuilds `.terraform/` from
 * `backend.tf` and reconnects to the exact same S3 state key the
 * original apply used; it does not need anything preserved from the
 * original apply's local `.terraform/` folder.
 *
 * On success: deletes the snapshot, deletes the mutable `generated/`
 * scratch folder for this service+environment (nothing left to apply
 * against once the infra is gone), and hard-deletes the DB row.
 *
 * On failure: leaves the snapshot and the work directory in place (so a
 * retry can resume against the exact same files/state) and records the
 * error on the row instead of deleting it.
 */
async function runDestroy(deployment, creds) {
  const workDir = path.join(DESTROY_TMP_ROOT, deployment.id);

  try {
    fs.rmSync(workDir, { recursive: true, force: true });
    copyDir(deployment.snapshot_dir, workDir);

    const env = {
      AWS_ACCESS_KEY_ID: creds.access_key,
      AWS_SECRET_ACCESS_KEY: creds.secret_key,
      AWS_DEFAULT_REGION: deployment.aws_region,
    };

    await run(['init', '-input=false'], { cwd: workDir, env });
    await run(['destroy', '-auto-approve', '-input=false'], { cwd: workDir, env });

    fs.rmSync(workDir, { recursive: true, force: true });
    fs.rmSync(deployment.snapshot_dir, { recursive: true, force: true });

    const generatedDir = path.join(process.cwd(), 'generated', deployment.service_slug, deployment.environment);
    fs.rmSync(generatedDir, { recursive: true, force: true });

    const deploymentId = deployment.id;
    const serviceId = deployment.service_id;
    await deployment.destroy(); // hard delete — no 'destroyed' row is kept

    // Best-effort: reflect the teardown back on the Setup Wizard's state
    // row too, so the UI's "generated / applied" flags aren't stale.
    // Never let this fail the destroy itself.
    try {
      const { TerraformState } = require('../terraform-state/terraformState.model');
      await TerraformState.update(
        { applied: false, generated: false },
        { where: { service_id: serviceId } }
      );
    } catch (_) {
      // non-fatal
    }

    return { deploymentId };
  } catch (err) {
    await TerraformDeployment.update(
      { status: 'destroy_failed', destroy_error: err.message },
      { where: { id: deployment.id } }
    );
    throw err;
  }
}

module.exports = {
  getOwnedDeployment,
  getOwnedDeploymentById,
  listDeployments,
  listAllForUser,
  recordDeployment,
  prepareDestroy,
  runDestroy,
};