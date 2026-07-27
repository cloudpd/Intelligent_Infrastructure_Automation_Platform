const path = require('path');
const AppError = require('../../../core/utils/AppError');
const { renderTemplate } = require('./utils/renderTemplate');
const { writeFiles, copyDir } = require('./utils/writeFiles');
const { generateMainTf } = require('./generators/main.generator');
const { generateVariablesTf } = require('./generators/variables.generator');
const { generateOutputsTf } = require('./generators/outputs.generator');

const TEMPLATE_DIR = path.join(__dirname, 'template');

/**

 * Returns backend.tf content.
 * If LOCAL_TF_BACKEND=true in env, uses a local file backend (no S3 needed).
 * This is only for local development — always use S3 in production.
 */
function buildBackendTf(templateData) {
  if (process.env.LOCAL_TF_BACKEND === 'true') {
    return `terraform {
  backend "local" {
    path = "terraform.tfstate"
  }
}\n`;
  }
  console.log("LOCAL_TF_BACKEND =", process.env.LOCAL_TF_BACKEND);
  return renderTemplate(path.join(TEMPLATE_DIR, 'backend.tf'), templateData);
}

/**
 * Builds the full set of Terraform files for a service/environment from
 * the simplified network config: { name, region, cidr }.
 * Everything else is fixed inside modules/network/main.tf itself.
 */

function generateNetworkFiles({ serviceSlug, environment, networkConfig }) {
  if (!networkConfig || !networkConfig.cidr) {
    throw new AppError('networkConfig is required', 400);
  }

  const templateData = {
    serviceSlug,
    environment,
    awsRegion: networkConfig.region,
    stateBucket: process.env.TF_STATE_BUCKET,
    lockTable: process.env.TF_LOCK_TABLE,
  };

  const files = {};
  files['backend.tf'] = buildBackendTf(templateData);
  files['providers.tf'] = renderTemplate(path.join(TEMPLATE_DIR, 'providers.tf'), templateData);
  files['versions.tf'] = renderTemplate(path.join(TEMPLATE_DIR, 'versions.tf'), templateData);
  files['variables.tf'] = generateVariablesTf();
  files['outputs.tf'] = generateOutputsTf('network');
  files['main.tf'] = generateMainTf({ network: { ...networkConfig, serviceSlug, environment } });
  files['terraform.tfvars'] = `aws_region = "${networkConfig.region}"\n`;

  return files;
}


/**
 * Builds the full set of Terraform files for a service/environment from
 * the ECR config: { name, image_tag_mutability, scan_on_push, force_delete, region? }.
 * The root scaffolding (backend, providers, versions, variables) is identical
 * to the network workspace — same S3 state, same AWS provider, same version pins.
 */
function generateEcrFiles({ serviceSlug, environment, ecrConfig }) {
  if (!ecrConfig || !ecrConfig.name) {
    throw new AppError('ecrConfig is required', 400);
  }

  const templateData = {
    serviceSlug,
    environment,
    awsRegion: ecrConfig.region || process.env.AWS_DEFAULT_REGION || 'us-east-1',
    stateBucket: process.env.TF_STATE_BUCKET,
    lockTable: process.env.TF_LOCK_TABLE,
  };

  const files = {};
  files['backend.tf'] = buildBackendTf(templateData);
  files['providers.tf'] = renderTemplate(path.join(TEMPLATE_DIR, 'providers.tf'), templateData);
  files['versions.tf'] = renderTemplate(path.join(TEMPLATE_DIR, 'versions.tf'), templateData);
  files['variables.tf'] = generateVariablesTf();
  files['outputs.tf'] = generateOutputsTf('ecr');
  files['main.tf'] = generateMainTf({ ecr: { ...ecrConfig, serviceSlug, environment } });
  files['terraform.tfvars'] = `aws_region = "${templateData.awsRegion}"\n`;

  return files;
}

/**
 * Builds the full set of Terraform files for a service/environment from
 * both the Network config and the EKS config.
 *
 * Unlike Network/ECR, EKS can never stand alone: snippets/eks.hbs wires
 * vpc_id/public_subnet_ids/private_subnet_ids as literal
 * `module.network.*` references (never templated, never sourced from the
 * EKS DB config — see eks.hbs), so a Network module must be rendered into
 * the same main.tf. This mirrors generateNetworkFiles/generateEcrFiles for
 * everything else (root scaffolding, variables, outputs, module copy) and
 * only differs by requiring the extra config and rendering two module
 * blocks instead of one.
 */
function generateEksFiles({ serviceSlug, environment, networkConfig, eksConfig }) {
  if (!networkConfig || !networkConfig.cidr) {
    throw new AppError('networkConfig is required', 400);
  }
  if (!eksConfig || !eksConfig.clusterName) {
    throw new AppError('eksConfig is required', 400);
  }

  const templateData = {
    serviceSlug,
    environment,
    awsRegion: eksConfig.region || networkConfig.region,
    stateBucket: process.env.TF_STATE_BUCKET,
    lockTable: process.env.TF_LOCK_TABLE,
  };

  const files = {};
  files['backend.tf'] = buildBackendTf(templateData);
  files['providers.tf'] = renderTemplate(path.join(TEMPLATE_DIR, 'providers.tf'), templateData);
  files['versions.tf'] = renderTemplate(path.join(TEMPLATE_DIR, 'versions.tf'), templateData);
  files['variables.tf'] = generateVariablesTf({ eksEnabled: true });
  files['outputs.tf'] = generateOutputsTf('network') + generateOutputsTf('eks');
  files['main.tf'] = generateMainTf({
    network: { ...networkConfig, serviceSlug, environment },
    eks: { ...eksConfig, serviceSlug, environment },
  });
  files['terraform.tfvars'] =
    `aws_region = "${templateData.awsRegion}"\n` +
    `grafana_admin_password = "${eksConfig.grafanaAdminPassword}"\n`;

  return files;
}

function generateVmFiles({ serviceSlug, environment, networkConfig, vmConfig }) {
  if (!networkConfig || !networkConfig.cidr) {
    throw new AppError('networkConfig is required', 400);
  }
  if (!vmConfig || !vmConfig.name) {
    throw new AppError('vmConfig is required', 400);
  }

  const templateData = {
    serviceSlug,
    environment,
    awsRegion: vmConfig.region || networkConfig.region,
    stateBucket: process.env.TF_STATE_BUCKET,
    lockTable: process.env.TF_LOCK_TABLE,
  };

  const files = {};
  files['backend.tf'] = buildBackendTf(templateData);
  files['providers.tf'] = renderTemplate(path.join(TEMPLATE_DIR, 'providers.tf'), templateData);
  files['versions.tf'] = renderTemplate(path.join(TEMPLATE_DIR, 'versions.tf'), templateData);
  files['variables.tf'] = generateVariablesTf();
  files['outputs.tf'] = generateOutputsTf('network') + generateOutputsTf('vm');
  files['main.tf'] = generateMainTf({
    network: { ...networkConfig, serviceSlug, environment },
    vm: { ...vmConfig, serviceSlug, environment },
  });
  files['terraform.tfvars'] = `aws_region = "${templateData.awsRegion}"\n`;

  return files;
}

/**
 * Builds the full set of Terraform files for a service/environment from
 * whichever module configs are actually present in the DB for this
 * service. Network is mandatory (the base module, always generated).
 * ecr / eks / vm are each optional — pass `null` for any module that
 * hasn't been configured yet for this service, and it's simply left out
 * of main.tf/outputs.tf/variables.tf, exactly as if the corresponding
 * per-module generate* function had never been called.
 *
 * This mirrors generateNetworkFiles/generateEcrFiles/generateEksFiles/
 * generateVmFiles above (same root scaffolding, same generator calls) —
 * it doesn't replace them, it composes them behind the single
 * /infra/terraform/services/:serviceId/generate endpoint so the caller
 * doesn't have to know in advance which modules exist for a service.
 */
function generateServiceFiles({ serviceSlug, environment, networkConfig, ecrConfig, eksConfig, vmConfig }) {
  if (!networkConfig || !networkConfig.cidr) {
    throw new AppError('This service has no Network module yet — create one before generating Terraform files', 422);
  }

  const awsRegion =
    (eksConfig && eksConfig.region) ||
    (vmConfig && vmConfig.region) ||
    (ecrConfig && ecrConfig.region) ||
    networkConfig.region;

  const templateData = {
    serviceSlug,
    environment,
    awsRegion,
    stateBucket: process.env.TF_STATE_BUCKET,
    lockTable: process.env.TF_LOCK_TABLE,
  };

  const files = {};
  files['backend.tf'] = buildBackendTf(templateData);
  files['providers.tf'] = renderTemplate(path.join(TEMPLATE_DIR, 'providers.tf'), templateData);
  files['versions.tf'] = renderTemplate(path.join(TEMPLATE_DIR, 'versions.tf'), templateData);
  files['variables.tf'] = generateVariablesTf({ eksEnabled: Boolean(eksConfig) });

  files['outputs.tf'] =
    generateOutputsTf('network') +
    (ecrConfig ? generateOutputsTf('ecr') : '') +
    (eksConfig ? generateOutputsTf('eks') : '') +
    (vmConfig ? generateOutputsTf('vm') : '');

  files['main.tf'] = generateMainTf({
    network: { ...networkConfig, serviceSlug, environment },
    ecr: ecrConfig ? { ...ecrConfig, serviceSlug, environment } : undefined,
    eks: eksConfig ? { ...eksConfig, serviceSlug, environment } : undefined,
    vm: vmConfig ? { ...vmConfig, serviceSlug, environment } : undefined,
  });

  files['terraform.tfvars'] =
    `aws_region = "${awsRegion}"\n` +
    (eksConfig ? `grafana_admin_password = "${eksConfig.grafanaAdminPassword}"\n` : '');

  return files;
}

function writeToDisk(outputDir, files, { includeNetwork = false, includeEcr = false, includeEks = false, includeVm = false } = {}) {
  writeFiles(outputDir, files);
  if (includeNetwork) {
    copyDir(
      path.join(TEMPLATE_DIR, 'modules', 'network'),
      path.join(outputDir, 'modules', 'network')
    );
  }
  if (includeEcr) {
    copyDir(
      path.join(TEMPLATE_DIR, 'modules', 'ecr'),
      path.join(outputDir, 'modules', 'ecr')
    );
  }
  if (includeEks) {
    copyDir(
      path.join(TEMPLATE_DIR, 'modules', 'eks'),
      path.join(outputDir, 'modules', 'eks')
    );
  }
  if (includeVm) {
      copyDir(path.join(TEMPLATE_DIR, 'modules', 'vm'),
      path.join(outputDir, 'modules', 'vm')
    );
  }
}

module.exports = {
  generateNetworkFiles,
  generateEcrFiles,
  generateEksFiles,
  generateVmFiles,
  generateServiceFiles,
  writeToDisk,
  TEMPLATE_DIR,
};