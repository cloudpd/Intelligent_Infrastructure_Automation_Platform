const fs = require('fs');
const path = require('path');
const terraformService = require('./terraform.service');
const networkService = require('../network/network.service');

/**
 * GET /infra/terraform/vpcs/:vpcId/preview?projectSlug=x&environment=dev
 * Pulls the VPC's config straight from the DB (via network.service) and
 * renders all 6 generated files + the 3 static network module files, so
 * you can eyeball correctness before wiring up the GitHub push / plan-apply
 * flow.
 */
async function previewNetworkFiles(req, res, next) {
  try {
    const { projectSlug = 'project', environment = 'dev' } = req.query;

    const networkConfig = await networkService.getGeneratorConfig(req.user.id, req.params.vpcId, {
      projectSlug,
      environment,
    });

    const files = terraformService.generateNetworkFiles({ projectSlug, environment, networkConfig });

    const moduleDir = path.join(terraformService.TEMPLATE_DIR, 'modules', 'network');
    files['modules/network/main.tf'] = fs.readFileSync(path.join(moduleDir, 'main.tf'), 'utf8');
    files['modules/network/variables.tf'] = fs.readFileSync(path.join(moduleDir, 'variables.tf'), 'utf8');
    files['modules/network/outputs.tf'] = fs.readFileSync(path.join(moduleDir, 'outputs.tf'), 'utf8');

    res.json({ success: true, data: files });
  } catch (err) {
    next(err);
  }
}

module.exports = { previewNetworkFiles };
