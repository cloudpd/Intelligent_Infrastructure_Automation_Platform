const fs = require('fs');
const path = require('path');
const terraformService = require('./terraform.service');
const networkService = require('../network/network.service');
const ecrService = require('../ecr/ecr.service');
const eksService = require('../EKS/eks.service');

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

    const networkConfig = await networkService.getGeneratorConfig(req.user.id, req.params.vpcId, {
      serviceSlug,
      environment,
    });
    const eksConfig = await eksService.getGeneratorConfig(req.user.id, req.params.clusterId);

    const files = terraformService.generateEksFiles({ serviceSlug, environment, networkConfig, eksConfig });

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

module.exports = { generateNetworkFiles, generateEcrFiles, generateEksFiles };

