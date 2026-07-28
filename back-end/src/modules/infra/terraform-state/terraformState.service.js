const path = require('path');
const crypto = require('crypto');
const AppError = require('../../../core/utils/AppError');
const { Service } = require('../../service/service.model');
const { Project } = require('../../projects/projects.model');
const { TerraformState } = require('./terraformState.model');

const networkService = require('../network/network.service');
const ecrService = require('../ecr/ecr.service');
const eksService = require('../EKS/eks.service');
const vmService = require('../vm/vm.service');
const terraformService = require('../terraform/terraform.service');
const awsService = require('../../aws/aws.service');

// Same ownership-check shape used throughout modules/infra/* (network,
// ecr, EKS, vm) — kept local here rather than imported since each module
// keeps its own copy today; not introducing a shared util to stay within
// "extend, don't restructure existing modules".
async function getOwnedService(serviceId, userId) {
  const service = await Service.findOne({
    where: { id: serviceId },
    include: [{ model: Project, as: 'project', where: { owner_id: userId }, attributes: [] }],
  });
  if (!service) throw new AppError('Service not found', 404);
  return service;
}

function slugify(value) {
  const slug = String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/^[^a-z]+/, ''); // createVpcSchema requires the name to start with a letter
  return slug || 'svc';
}

/**
 * Network is the mandatory base module — every service needs one before
 * anything can be generated. Rather than requiring the user to have
 * already called `POST /infra/network/:serviceId/vpcs` by hand, this
 * looks the config up and, if it doesn't exist yet, provisions it here
 * by calling that exact same existing network service function (so
 * ownership checks, validation, and persistence are all unchanged) with
 * sensible defaults, then re-reads the generator config.
 */
async function ensureNetworkConfig(userId, serviceId, service, { serviceSlug, environment }) {
  const existing = await networkService.getGeneratorConfigForService(userId, serviceId, {
    serviceSlug,
    environment,
  });
  if (existing) return existing;

  await networkService.createVpc(userId, serviceId, {
    name: slugify(serviceSlug || service.name),
    region: process.env.AWS_DEFAULT_REGION || 'us-east-1',
    cidr: '10.0.0.0/16',
  });

  return networkService.getGeneratorConfigForService(userId, serviceId, { serviceSlug, environment });
}

/**
 * ECR is optional — only provisioned when the wizard's registry choice is
 * AWS ECR. Same pattern as ensureNetworkConfig: reuse the existing
 * `POST /infra/ecr/:serviceId/repos/create` service function (ownership
 * checks / persistence unchanged), only reached when nothing exists yet.
 */
async function ensureEcrConfig(userId, serviceId, service, { serviceSlug, environment }) {
  const existing = await ecrService.getGeneratorConfigForService(userId, serviceId, {
    serviceSlug,
    environment,
  });
  if (existing) return existing;

  await ecrService.createRepo(userId, serviceId, {
    name: slugify(serviceSlug || service.name),
  });

  return ecrService.getGeneratorConfigForService(userId, serviceId, { serviceSlug, environment });
}

/**
 * EKS cluster auto-provisioning for the "Amazon EKS" deployment choice.
 * createCluster requires a real AWS account id per cluster admin and a
 * Grafana password — there's no safe way to guess a real AWS account id,
 * so this fills in an obvious placeholder (000000000000 / "admin") that
 * must be edited before the generated Terraform is ever actually applied.
 * The Grafana password is instead randomly generated (it only needs to
 * exist, not be guessed by anyone), and returned back to the caller once
 * since it's stored encrypted and can't be read back out later.
 */
async function ensureEksConfig(userId, serviceId, service, { generatedSecrets }) {
  const existing = await eksService.getGeneratorConfigForService(userId, serviceId);
  if (existing) return existing;

  const grafanaAdminPassword = crypto.randomBytes(16).toString('hex');
  generatedSecrets.push({ module: 'eks', field: 'grafanaAdminPassword', value: grafanaAdminPassword });
  generatedSecrets.push({
    module: 'eks',
    field: 'clusterAdmins',
    value: 'placeholder AWS account id 000000000000 — replace with a real one before applying',
  });

  await eksService.createCluster(userId, serviceId, {
    clusterName: slugify(service.name),
    clusterVersion: process.env.EKS_DEFAULT_VERSION || '1.29',
    region: process.env.AWS_DEFAULT_REGION || 'us-east-1',
    nodeGroups: {
      default: {
        instanceTypes: ['t3.medium'],
        capacityType: 'ON_DEMAND',
        desiredSize: 2,
        minSize: 1,
        maxSize: 3,
        diskSize: 20,
      },
    },
    clusterAdmins: [{ userName: 'admin', userAccountId: '000000000000' }],
    grafanaAdminPassword,
    enableEbsCsi: true,
    enableAlbController: true,
    enableExternalDns: true,
    enableExternalSecrets: true,
  });

  return eksService.getGeneratorConfigForService(userId, serviceId);
}

/**
 * VM (Minikube/KIND) auto-provisioning for the "Virtual Machine" choice.
 * Every other field has a safe model default (see vm.model.js), so only
 * name + region need supplying.
 */
async function ensureVmConfig(userId, serviceId, service, { serviceSlug, environment }) {
  const existing = await vmService.getGeneratorConfigForService(userId, serviceId, {
    serviceSlug,
    environment,
  });
  if (existing) return existing;

  await vmService.createVm(userId, serviceId, {
    name: slugify(serviceSlug || service.name),
    region: process.env.AWS_DEFAULT_REGION || 'us-east-1',
  });

  return vmService.getGeneratorConfigForService(userId, serviceId, { serviceSlug, environment });
}

async function getOwnedState(serviceId, userId) {
  await getOwnedService(serviceId, userId);
  const state = await TerraformState.findOne({ where: { service_id: serviceId } });
  if (!state) {
    throw new AppError('Terraform has not been set up for this service yet — run the Terraform Setup Wizard first', 404);
  }
  return state;
}

/**
 * Step 0 (AWS Credentials) + Step 1 + 2 (S3 backend + registry choice) of
 * the Setup Wizard, saved together since the wizard only calls this once,
 * on completion. Insert-or-update: a service can only have one
 * TerraformState row. Changing the backend/registry choice invalidates
 * anything already generated, so `generated` is reset — the user needs
 * to re-run Generate.
 *
 * awsCredentialId is optional here only for backward compatibility with
 * existing rows created before the AWS Credentials step existed — the
 * wizard's frontend always sends one now (a credential is picked or
 * created before the user can even reach the S3 step).
 */
async function saveSetup(userId, { serviceId, awsCredentialId, s3Bucket, useEcr }) {
  await getOwnedService(serviceId, userId);

  if (awsCredentialId) {
    // Reuses the existing /aws module's own ownership check — throws if
    // the credential doesn't exist or belongs to a different user.
    await awsService.getCredentialById(userId, awsCredentialId);
  }

  let state = await TerraformState.findOne({ where: { service_id: serviceId } });
  if (state) {
    if (awsCredentialId) state.aws_credential_id = awsCredentialId;
    state.s3_bucket = s3Bucket;
    state.use_ecr = useEcr;
    state.generated = false;
    await state.save();
  } else {
    state = await TerraformState.create({
      service_id: serviceId,
      aws_credential_id: awsCredentialId || null,
      s3_bucket: s3Bucket,
      use_ecr: useEcr,
    });
  }
  return state;
}

/**
 * Terraform Configuration page's deployment-type radio (EKS vs VM).
 * Requires the setup step to already exist for this service.
 */
async function saveDeployment(userId, { serviceId, deploymentType }) {
  const state = await getOwnedState(serviceId, userId);
  state.deployment_type = deploymentType;
  state.generated = false;
  await state.save();
  return state;
}

async function getState(userId, serviceId) {
  return getOwnedState(serviceId, userId);
}

/**
 * Phase 4 — Generate Terraform.
 *
 * Deliberately thin: it does not reimplement any generation logic. It
 * (1) reads the wizard's saved choices, (2) for each module the wizard
 * selected (Network always, ECR if useEcr, EKS or VM per deploymentType)
 * either reuses the existing DB config or — if none exists yet —
 * provisions one by calling that exact module's own existing "create"
 * service function (the same one its own POST endpoint uses, e.g.
 * `POST /infra/ecr/:serviceId/repos/create`), and (3) hands the results
 * to the existing `terraformService.generateServiceFiles` / `writeToDisk`
 * functions. Nothing here duplicates generation logic — it only decides
 * which existing per-module service functions to call and with what data.
 */
async function generate(userId, { serviceId, serviceSlug, environment = 'dev' }) {
  const service = await getOwnedService(serviceId, userId);
  const state = await getOwnedState(serviceId, userId);

  if (!state.s3_bucket) {
    throw new AppError('Terraform backend (S3 bucket) has not been configured yet', 422);
  }
  if (!state.deployment_type) {
    throw new AppError('Deployment type has not been selected yet — choose EKS or VM in Terraform Configuration', 422);
  }

  const resolvedSlug = serviceSlug || 'service';
  const generatedSecrets = [];

  const networkConfig = await ensureNetworkConfig(userId, serviceId, service, {
    serviceSlug: resolvedSlug,
    environment,
  });
  const finalSlug = networkConfig.serviceSlug || resolvedSlug;

  let ecrConfig = null;
  if (state.use_ecr) {
    ecrConfig = await ensureEcrConfig(userId, serviceId, service, { serviceSlug: finalSlug, environment });
  }

  let eksConfig = null;
  let vmConfig = null;
  if (state.deployment_type === 'eks') {
    eksConfig = await ensureEksConfig(userId, serviceId, service, { generatedSecrets });
  } else {
    vmConfig = await ensureVmConfig(userId, serviceId, service, { serviceSlug: finalSlug, environment });
  }

  const files = terraformService.generateServiceFiles({
    serviceSlug: finalSlug,
    environment,
    networkConfig,
    ecrConfig,
    eksConfig,
    vmConfig,
    // Per-service backend override from the wizard, instead of the
    // global TF_STATE_BUCKET env var the existing generator falls back to.
    stateBucketOverride: state.s3_bucket,
  });

  const outputDir = path.join(process.cwd(), 'generated', finalSlug, environment);

  terraformService.writeToDisk(outputDir, files, {
    includeNetwork: true,
    includeEcr: Boolean(ecrConfig),
    includeEks: Boolean(eksConfig),
    includeVm: Boolean(vmConfig),
  });

  state.generated = true;
  await state.save();

  return {
    state,
    outputDir,
    modules: {
      network: true,
      ecr: Boolean(ecrConfig),
      eks: Boolean(eksConfig),
      vm: Boolean(vmConfig),
    },
    generatedSecrets,
  };
}

module.exports = {
  saveSetup,
  saveDeployment,
  getState,
  generate,
};
