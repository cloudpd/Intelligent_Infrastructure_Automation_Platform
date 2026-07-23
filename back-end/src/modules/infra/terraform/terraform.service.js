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

function writeToDisk(outputDir, files, { includeNetwork = false, includeEcr = false } = {}) {
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
}

module.exports = { generateNetworkFiles, generateEcrFiles, writeToDisk, TEMPLATE_DIR };

