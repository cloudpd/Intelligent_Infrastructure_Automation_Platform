const fs = require('fs');
const path = require('path');
const AppError = require('../../../core/utils/AppError');
const terraformService = require('./terraform.service');
const networkService = require('../network/network.service');
const ecrService = require('../ecr/ecr.service');
const eksService = require('../EKS/eks.service');
const vmService = require('../vm/vm.service');
const awsService = require('../../aws/aws.service');
const terraformStateService = require('../terraform-state/terraformState.service');
const { saveEcrUrlFromOutputs } = require('../terraform-state/terraformState.service');
const terraformDeploymentService = require('../terraform-deployments/terraformDeployment.service');

/**
 * The Terraform Setup Wizard (`/terraform/setup`) saves the S3 backend
 * bucket/lock-table into the `terraform_states` table, keyed by service_id
 * — not by vpcId/vmId/clusterId, which is all these per-resource generate
 * endpoints receive. This resolves the service that owns the given
 * resource, then reads its saved backend config, so the caller never has
 * to re-supply a bucket the wizard already collected. Throws a clear,
 * actionable error if the wizard's S3 step was never completed for this
 * service.
 */
async function resolveBackendConfig(userId, serviceId) {
  const state = await terraformStateService.getState(userId, serviceId);
  return { stateBucket: state.s3_bucket, lockTable: state.lock_table };
}


async function applyTerraformResources({
  resourceType,
  resourceId,
  userId,
  serviceSlug,
  environment,
  awsCredentialId,
  region,
  markApplying,
  markApplied,
  markFailed,
  getOwnedResource,
  outputDir,
}) {
  if (!resourceId) {
    throw new AppError(`${resourceType}Id is required`, 400);
  }

  if (!awsCredentialId) {
    throw new AppError('awsCredentialId is required', 400);
  }

  const resource = await getOwnedResource(resourceId, userId);

  if (resource.status === 'applying') {
    throw new AppError(`This ${resourceType} is already being applied`, 409);
  }

  const generatedDir = path.join(process.cwd(), 'generated', serviceSlug, environment);
  if (!fs.existsSync(path.join(generatedDir, 'main.tf'))) {
    throw new AppError('No generated Terraform files found — run /generate first', 422);
  }

  const creds = await awsService.getDecryptedCredential(userId, awsCredentialId);

  await markApplying(resourceId);

  return {
    resource,
    generatedDir,
    creds,
    region,
  };
}
/**
 * POST /infra/terraform/vpcs/:vpcId/generate
 * Body: { serviceSlug, environment }
 *
 * Pulls the VPC's config from the DB (must exist, ownership already
 * enforced inside network.service.js), renders all 6 root Terraform files
 * plus the 3 static network module files, and returns them.
 *
 * This is the actual "Generate" button action, not a passive preview —
 * the next step from here is pushing these files to the service's repo
 * (via the existing GitHub module) and then running terraform plan.
 */
async function generateNetworkFiles(req, res, next) {
  try {
    const { serviceSlug = 'service', environment = 'dev' } = req.body;

    const network = await networkService.getOwnedVpc(req.params.vpcId, req.user.id);
    const { stateBucket, lockTable } = await resolveBackendConfig(req.user.id, network.service_id);
    const networkConfig = networkService.toGeneratorConfig(network, { serviceSlug, environment });

    const files = terraformService.generateNetworkFiles({ serviceSlug, environment, networkConfig, stateBucket, lockTable });

    const moduleDir = path.join(terraformService.TEMPLATE_DIR, 'modules', 'network');
    files['modules/network/main.tf'] = fs.readFileSync(path.join(moduleDir, 'main.tf'), 'utf8');
    files['modules/network/variables.tf'] = fs.readFileSync(path.join(moduleDir, 'variables.tf'), 'utf8');
    files['modules/network/outputs.tf'] = fs.readFileSync(path.join(moduleDir, 'outputs.tf'), 'utf8');

    res.json({ success: true, data: files });
  } catch (err) {
    next(err);
  }
}



/**
 * POST /infra/terraform/repos/:repoId/generate
 * Body: { serviceSlug, environment }
 *
 * Pulls the ECR repo's config from the DB (ownership enforced inside
 * ecr.service.js), renders all root Terraform files plus the 3 static
 * ECR module files, and returns them as a { filename → content } map.
 */
async function generateEcrFiles(req, res, next) {
  try {
    const { serviceSlug = 'service', environment = 'dev' } = req.body;

    const repo = await ecrService.getOwnedRepo(req.params.repoId, req.user.id);
    const { stateBucket, lockTable } = await resolveBackendConfig(req.user.id, repo.service_id);
    const ecrConfig = ecrService.toGeneratorConfig(repo, { serviceSlug, environment });

    const files = terraformService.generateEcrFiles({ serviceSlug, environment, ecrConfig, stateBucket, lockTable });

    const moduleDir = path.join(terraformService.TEMPLATE_DIR, 'modules', 'ecr');
    files['modules/ecr/main.tf'] = fs.readFileSync(path.join(moduleDir, 'main.tf'), 'utf8');
    files['modules/ecr/variables.tf'] = fs.readFileSync(path.join(moduleDir, 'variables.tf'), 'utf8');
    files['modules/ecr/outputs.tf'] = fs.readFileSync(path.join(moduleDir, 'outputs.tf'), 'utf8');

    const outputDir = path.join(
      process.cwd(),
      "generated",
      serviceSlug,
      environment
    );

    terraformService.writeToDisk(
      outputDir,
      files,
      {
        includeEcr: true
      }
    );

    res.json({
      success: true,
      message: "Terraform files generated.",
      outputDir
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /infra/terraform/vpcs/:vpcId/clusters/:clusterId/generate
 * Body: { serviceSlug, environment }
 *
 * EKS can never be generated on its own — see terraform.service.js#generateEksFiles
 * and snippets/eks.hbs — so this pulls both the Network config (ownership
 * enforced inside network.service.js) and the EKS config (ownership enforced
 * inside eks.service.js), renders all root Terraform files plus the static
 * Network and EKS module trees, and writes them to disk the same way
 * generateEcrFiles does.
 */
async function generateEksFiles(req, res, next) {
  try {
    const { serviceSlug = 'service', environment = 'dev' } = req.body;

    const cluster = await eksService.getOwnedCluster(req.params.clusterId, req.user.id);
    const { stateBucket, lockTable } = await resolveBackendConfig(req.user.id, cluster.service_id);

    const networkConfig = await networkService.getGeneratorConfig(req.user.id, req.params.vpcId, {
      serviceSlug,
      environment,
    });
    const eksConfig = eksService.toGeneratorConfig(cluster);

    const files = terraformService.generateEksFiles({ serviceSlug, environment, networkConfig, eksConfig, stateBucket, lockTable });

    const outputDir = path.join(
      process.cwd(),
      "generated",
      serviceSlug,
      environment
    );

    terraformService.writeToDisk(
      outputDir,
      files,
      {
        includeNetwork: true,
        includeEks: true,
      }
    );

    res.json({
      success: true,
      message: "Terraform files generated.",
      outputDir,
    });
  } catch (err) {
    next(err);
  }
}

async function generateVmFiles(req, res, next) {
  try {
    const { serviceSlug = 'service', environment = 'dev' } = req.body;

    const vm = await vmService.getOwnedVm(req.params.vmId, req.user.id);
    const { stateBucket, lockTable } = await resolveBackendConfig(req.user.id, vm.service_id);

    const networkConfig = await networkService.getGeneratorConfig(req.user.id, req.params.vpcId, {
      serviceSlug,
      environment,
    });
    const vmConfig = vmService.toGeneratorConfig(vm, { serviceSlug, environment });

    const files = terraformService.generateVmFiles({ serviceSlug, environment, networkConfig, vmConfig, stateBucket, lockTable });

    const outputDir = path.join(process.cwd(), 'generated', serviceSlug, environment);

    terraformService.writeToDisk(outputDir, files, {
      includeNetwork: true,
      includeVm: true,
    });

    res.json({ success: true, message: 'Terraform files generated.', outputDir });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /infra/terraform/services/:serviceId/generate
 * Body: { serviceSlug, environment }
 *
 * The unified "Generate" action: always renders the Network module (the
 * mandatory base module for a service), then independently checks the DB
 * for each optional module — ECR, EKS, VM — and only renders the ones
 * that have actually been configured (i.e. written to the DB) for this
 * service. Skips straight past whatever the caller didn't set up, rather
 * than requiring them to know in advance which per-module generate
 * endpoint to call.
 *
 * EKS/VM still implicitly require Network underneath (enforced at
 * creation time by eks.service.js#assertNetworkExists /
 * vm.service.js#assertNetworkExists), so if either config exists in the
 * DB, Network is guaranteed to exist too — this just makes that
 * dependency explicit by always resolving Network first and failing fast
 * if it's missing.
 */
async function generateServiceFiles(req, res, next) {
  try {
    const { serviceId } = req.params;
    const { serviceSlug, environment = 'dev' } = req.body;

    const { stateBucket, lockTable } = await resolveBackendConfig(req.user.id, serviceId);

    // Network is mandatory — resolved first, and its absence is a hard
    // error, not a "skip this module" case like the other three below.
    const networkConfig = await networkService.getGeneratorConfigForService(req.user.id, serviceId, {
      serviceSlug: serviceSlug || 'service',
      environment,
    });
    if (!networkConfig) {
      throw new AppError(
        'This service has no Network module yet — create one before generating Terraform files',
        422
      );
    }

    // Once Network resolves we know the service exists and is owned by
    // this user, so serviceSlug can safely default off of it too.
    const resolvedSlug = serviceSlug || networkConfig.serviceSlug || 'service';

    // Each of these independently checks the DB and returns null when
    // that module hasn't been configured for this service yet — this is
    // the "check if it's been written to the database" step per module.
    const [ecrConfig, eksConfig, vmConfig] = await Promise.all([
      ecrService.getGeneratorConfigForService(req.user.id, serviceId, { serviceSlug: resolvedSlug, environment }),
      eksService.getGeneratorConfigForService(req.user.id, serviceId),
      vmService.getGeneratorConfigForService(req.user.id, serviceId, { serviceSlug: resolvedSlug, environment }),
    ]);

    const files = terraformService.generateServiceFiles({
      serviceSlug: resolvedSlug,
      environment,
      networkConfig,
      ecrConfig,
      eksConfig,
      vmConfig,
      stateBucketOverride: stateBucket,
      lockTableOverride: lockTable,
    });

    const outputDir = path.join(process.cwd(), 'generated', resolvedSlug, environment);

    terraformService.writeToDisk(outputDir, files, {
      includeNetwork: true,
      includeEcr: Boolean(ecrConfig),
      includeEks: Boolean(eksConfig),
      includeVm: Boolean(vmConfig),
    });

    res.json({
      success: true,
      message: 'Terraform files generated.',
      outputDir,
      modules: {
        network: true,
        ecr: Boolean(ecrConfig),
        eks: Boolean(eksConfig),
        vm: Boolean(vmConfig),
      },
    });
  } catch (err) {
    next(err);
  }
}

async function applyVmFiles(req, res, next) {
  try {
    const vmId = req.params.vmId || req.body.vmId || req.query.vmId;
    const { serviceSlug = 'service', environment = 'dev', awsCredentialId } = req.body;

    const prepared = await applyTerraformResources({
      resourceType: 'VM',
      resourceId: vmId,
      userId: req.user.id,
      serviceSlug,
      environment,
      awsCredentialId,
      region: null,
      markApplying: vmService.markApplying,
      markApplied: vmService.markApplied,
      markFailed: vmService.markFailed,
      getOwnedResource: vmService.getOwnedVm,
      outputDir: path.join(process.cwd(), 'generated', serviceSlug, environment),
    });

    const outputDir = prepared.generatedDir;

    // Respond immediately — the apply itself keeps running after this
    res.status(202).json({ success: true, message: 'Terraform apply started', status: 'applying' });

    // Background work — deliberately not awaited before the response above
    terraformService
      .applyGeneratedFiles({
        outputDir,
        awsAccessKeyId: prepared.creds.access_key,
        awsSecretAccessKey: prepared.creds.secret_key,
        awsRegion: prepared.resource.region,
      })
      .then(async (outputs) => {
        // Persist the real ECR URL (includes AWS account ID) from Terraform outputs
        await saveEcrUrlFromOutputs(prepared.resource.service_id, outputs);

        // Snapshot exactly what was just applied so Destroy has something
        // immutable to work from later, regardless of what a subsequent
        // Generate does to `generated/<slug>/<env>/` afterward.
        const { stateBucket, lockTable } = await resolveBackendConfig(req.user.id, prepared.resource.service_id);
        await terraformDeploymentService.recordDeployment({
          serviceId: prepared.resource.service_id,
          environment,
          serviceSlug,
          outputDir,
          stateBucket,
          lockTable,
          awsRegion: prepared.resource.region,
          awsCredentialId,
        });

        return vmService.markApplied(vmId, {
          instanceId: outputs.vm_instance_id?.value,
          publicIp: outputs.vm_public_ip?.value,
        });
      })
      .catch((err) => {
        console.error(`Terraform apply failed for VM ${vmId}:`, err.message);
        return vmService.markFailed(vmId, err.message);
      });
  } catch (err) {
    next(err);
  }
}

async function applyEksFiles(req, res, next) {
  try {
    const clusterId = req.params.clusterId || req.body.clusterId || req.query.clusterId;
    const { serviceSlug = 'service', environment = 'dev', awsCredentialId } = req.body;

    const prepared = await applyTerraformResources({
      resourceType: 'EKS cluster',
      resourceId: clusterId,
      userId: req.user.id,
      serviceSlug,
      environment,
      awsCredentialId,
      markApplying: async (id) => {
        const { markApplying: markClusterApplying } = require('../EKS/eks.service');
        return markClusterApplying(id);
      },
      markApplied: async (id, metadata) => {
        const { markApplied: markClusterApplied } = require('../EKS/eks.service');
        return markClusterApplied(id, metadata);
      },
      markFailed: async (id, error) => {
        const { markFailed: markClusterFailed } = require('../EKS/eks.service');
        return markClusterFailed(id, error);
      },
      getOwnedResource: async (resourceId, userId) => {
        const { getOwnedCluster } = require('../EKS/eks.service');
        return getOwnedCluster(resourceId, userId);
      },
      outputDir: path.join(process.cwd(), 'generated', serviceSlug, environment),
    });

    const outputDir = prepared.generatedDir;

    res.status(202).json({ success: true, message: 'Terraform apply started', status: 'applying' });

    terraformService
      .applyGeneratedFiles({
        outputDir,
        awsAccessKeyId: prepared.creds.access_key,
        awsSecretAccessKey: prepared.creds.secret_key,
        awsRegion: prepared.resource.region,
      })
      .then(async (outputs) => {
        // Persist the real ECR URL (includes AWS account ID) from Terraform outputs
        await saveEcrUrlFromOutputs(prepared.resource.service_id, outputs);

        // Snapshot exactly what was just applied so Destroy has something
        // immutable to work from later, regardless of what a subsequent
        // Generate does to `generated/<slug>/<env>/` afterward.
        const { stateBucket, lockTable } = await resolveBackendConfig(req.user.id, prepared.resource.service_id);
        await terraformDeploymentService.recordDeployment({
          serviceId: prepared.resource.service_id,
          environment,
          serviceSlug,
          outputDir,
          stateBucket,
          lockTable,
          awsRegion: prepared.resource.region,
          awsCredentialId,
        });

        return require('../EKS/eks.service').markApplied(clusterId, {
          clusterEndpoint: outputs.cluster_endpoint?.value,
          clusterName: outputs.cluster_name?.value,
        });
      })
      .catch((err) => {
        console.error(`Terraform apply failed for EKS cluster ${clusterId}:`, err.message);
        return require('../EKS/eks.service').markFailed(clusterId, err.message);
      });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  generateNetworkFiles,
  generateEcrFiles,
  generateEksFiles,
  generateVmFiles,
  generateServiceFiles,
  applyVmFiles,
  applyEksFiles,
};