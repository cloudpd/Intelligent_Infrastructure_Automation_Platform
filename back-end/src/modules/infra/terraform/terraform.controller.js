const fs = require('fs');
const path = require('path');
const AppError = require('../../../core/utils/AppError');
const terraformService = require('./terraform.service');
const networkService = require('../network/network.service');
const ecrService = require('../ecr/ecr.service');
const eksService = require('../EKS/eks.service');
const vmService = require('../vm/vm.service');
const awsService = require('../../aws/aws.service');
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

async function generateVmFiles(req, res, next) {
  try {
    const { serviceSlug = 'service', environment = 'dev' } = req.body;

    const networkConfig = await networkService.getGeneratorConfig(req.user.id, req.params.vpcId, {
      serviceSlug,
      environment,
    });
    const vmConfig = await vmService.getGeneratorConfig(req.user.id, req.params.vmId, {
      serviceSlug,
      environment,
    });

    const files = terraformService.generateVmFiles({ serviceSlug, environment, networkConfig, vmConfig });

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

    if (!vmId) {
      return res.status(400).json({ success: false, message: 'vmId is required' });
    }

    if (!awsCredentialId) {
      return res.status(400).json({ success: false, message: 'awsCredentialId is required' });
    }

    const vm = await vmService.getOwnedVm(vmId, req.user.id);

    if (vm.status === 'applying') {
      return res.status(409).json({ success: false, message: 'This VM is already being applied' });
    }

    const outputDir = path.join(process.cwd(), 'generated', serviceSlug, environment);
    if (!fs.existsSync(path.join(outputDir, 'main.tf'))) {
      return res.status(422).json({ success: false, message: 'No generated Terraform files found — run /generate first' });
    }

    const creds = await awsService.getDecryptedCredential(req.user.id, awsCredentialId);

    await vmService.markApplying(vmId);

    // Respond immediately — the apply itself keeps running after this
    res.status(202).json({ success: true, message: 'Terraform apply started', status: 'applying' });

    // Background work — deliberately not awaited before the response above
    terraformService
      .applyGeneratedFiles({
        outputDir,
        awsAccessKeyId: creds.access_key,
        awsSecretAccessKey: creds.secret_key,
        awsRegion: vm.region,
      })
      .then((outputs) => {
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

module.exports = {
  generateNetworkFiles,
  generateEcrFiles,
  generateEksFiles,
  generateVmFiles,
  generateServiceFiles,
  applyVmFiles,
};