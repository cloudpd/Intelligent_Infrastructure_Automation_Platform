const fs = require('fs');
const path = require('path');
const terraformService = require('./terraform.service');
const networkService = require('../network/network.service');
const ecrService = require('../ecr/ecr.service');

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

    const networkConfig = await networkService.getGeneratorConfig(req.user.id, req.params.vpcId, {
      serviceSlug,
      environment,
    });

    const files = terraformService.generateNetworkFiles({ serviceSlug, environment, networkConfig });

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

    const ecrConfig = await ecrService.getGeneratorConfig(req.user.id, req.params.repoId, {
      serviceSlug,
      environment,
    });

    const files = terraformService.generateEcrFiles({ serviceSlug, environment, ecrConfig });

    const moduleDir = path.join(terraformService.TEMPLATE_DIR, 'modules', 'ecr');
    files['modules/ecr/main.tf'] = fs.readFileSync(path.join(moduleDir, 'main.tf'), 'utf8');
    files['modules/ecr/variables.tf'] = fs.readFileSync(path.join(moduleDir, 'variables.tf'), 'utf8');
    files['modules/ecr/outputs.tf'] = fs.readFileSync(path.join(moduleDir, 'outputs.tf'), 'utf8');

    res.json({ success: true, data: files });
  } catch (err) {
    next(err);
  }
}

module.exports = { generateNetworkFiles, generateEcrFiles };

