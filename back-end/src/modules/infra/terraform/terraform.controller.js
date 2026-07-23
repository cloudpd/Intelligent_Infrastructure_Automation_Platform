const fs = require('fs');
const path = require('path');
const terraformService = require('./terraform.service');
const networkService = require('../network/network.service');

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

module.exports = { generateNetworkFiles };
