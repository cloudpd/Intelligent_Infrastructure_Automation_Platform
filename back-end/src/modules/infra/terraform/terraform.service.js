const path = require('path');
const AppError = require('../../../core/utils/AppError');
const { renderTemplate } = require('./utils/renderTemplate');
const { writeFiles, copyDir } = require('./utils/writeFiles');
const { generateMainTf } = require('./generators/main.generator');
const { generateVariablesTf } = require('./generators/variables.generator');
const { generateOutputsTf } = require('./generators/outputs.generator');

const TEMPLATE_DIR = path.join(__dirname, 'template');

/**
 * Builds the full set of Terraform files for one project/environment from
 * the simplified network config (see network.service.js#toGeneratorConfig
 * for the exact input shape).
 *
 * With the simplified config, main.tf embeds the actual values directly
 * (via the network.hbs snippet) rather than referencing var.* — so
 * terraform.tfvars only needs to carry aws_region now. That's a direct
 * consequence of moving to count+cidrs config instead of the old fully
 * normalized per-subnet/per-route entity model.
 */
function generateNetworkFiles({ projectSlug, environment, networkConfig }) {
  if (!networkConfig || !networkConfig.cidr) {
    throw new AppError('networkConfig is required', 400);
  }

  const templateData = {
    projectSlug,
    environment,
    awsRegion: networkConfig.region,
    stateBucket: process.env.TF_STATE_BUCKET,
    lockTable: process.env.TF_LOCK_TABLE,
  };

  const files = {};
  files['backend.tf'] = renderTemplate(path.join(TEMPLATE_DIR, 'backend.tf'), templateData);
  files['providers.tf'] = renderTemplate(path.join(TEMPLATE_DIR, 'providers.tf'), templateData);
  files['versions.tf'] = renderTemplate(path.join(TEMPLATE_DIR, 'versions.tf'), templateData);
  files['variables.tf'] = generateVariablesTf();
  files['outputs.tf'] = generateOutputsTf();
  files['main.tf'] = generateMainTf({ network: { ...networkConfig, projectSlug, environment } });
  files['terraform.tfvars'] = `aws_region = "${networkConfig.region}"\n`;

  return files;
}

function writeToDisk(outputDir, files) {
  writeFiles(outputDir, files);
  copyDir(path.join(TEMPLATE_DIR, 'modules', 'network'), path.join(outputDir, 'modules', 'network'));
}

module.exports = { generateNetworkFiles, writeToDisk, TEMPLATE_DIR };
