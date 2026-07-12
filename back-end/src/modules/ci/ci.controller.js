const ciService = require('./ci.service');
const { validateRepository } = require('./ci.validation');
const { CIConfig } = require('./ci.model');
const AppError = require('../../core/utils/AppError');


async function getCIConfigController(req, res, next) {
  try {
    const { serviceId } = req.params;

    const config = await CIConfig.findOne({
      where: { service_id: serviceId },
    });

    if (!config) {
      return res.status(404).json({
        success: false,
        message: 'No CI configuration found for this service',
      });
    }

    res.status(200).json({
      success: true,
      config: {
        pipelineName: config.pipeline_name,
        triggerBranch: config.trigger_branch,
        registry: config.registry,
        imageName: config.image_name,
        enableTrivy: config.enable_trivy,
        dockerHubUsername: config.docker_hub_username,
        awsEcrRegion: config.aws_ecr_region,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Create or Update CI Configuration
 * POST /services/:serviceId/ci
 */
async function upsertCIConfigController(req, res, next) {
  try {
    const serviceId = req.params.serviceId || req.body.serviceId;
    const config = req.ciConfig;

    // Validate repository access
    await validateRepository(req.user.id, serviceId);

    // Upsert configuration
    const [ciConfig, created] = await CIConfig.findOrCreate({
      where: { service_id: serviceId },
      defaults: {
        service_id: serviceId,
        pipeline_name: config.pipelineName,
        trigger_branch: config.triggerBranch,
        registry: config.registry,
        image_name: config.imageName,
        enable_trivy: config.enableTrivy,
        docker_hub_username: config.dockerHubUsername,
        aws_ecr_region: config.awsEcrRegion,
      },
    });

    if (!created) {
      await ciConfig.update({
        pipeline_name: config.pipelineName,
        trigger_branch: config.triggerBranch,
        registry: config.registry,
        image_name: config.imageName,
        enable_trivy: config.enableTrivy,
        docker_hub_username: config.dockerHubUsername,
        aws_ecr_region: config.awsEcrRegion,
      });
    }

    res.status(created ? 201 : 200).json({
      success: true,
      message: created ? 'CI configuration created' : 'CI configuration updated',
      config: {
        pipelineName: ciConfig.pipeline_name,
        triggerBranch: ciConfig.trigger_branch,
        registry: ciConfig.registry,
        imageName: ciConfig.image_name,
        enableTrivy: ciConfig.enable_trivy,
        dockerHubUsername: ciConfig.docker_hub_username,
        awsEcrRegion: ciConfig.aws_ecr_region,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Preview Generated Workflow YAML
 * GET /services/:serviceId/ci/preview
 */
async function previewWorkflowController(req, res, next) {
  try {
    const { serviceId } = req.params;

    // Get configuration from database
    const ciConfig = await CIConfig.findOne({
      where: { service_id: serviceId },
    });

    if (!ciConfig) {
      throw new AppError('No CI configuration found for this service', 404);
    }

    // Build config object for generator
    const config = {
      serviceId,
      pipelineName: ciConfig.pipeline_name,
      triggerBranch: ciConfig.trigger_branch,
      registry: ciConfig.registry,
      imageName: ciConfig.image_name,
      enableTrivy: ciConfig.enable_trivy,
      dockerHubUsername: ciConfig.docker_hub_username,
      awsEcrRegion: ciConfig.aws_ecr_region,
    };

    // Generate workflow YAML
    const workflowYAML = ciService.generateWorkflowYAML(config);

    // Return preview and the expected workflow file path in the repository
    res.status(200).json({
      success: true,
      message: 'Workflow preview generated',
      workflow: {
        yaml: workflowYAML,
        config,
        filePath: '.github/workflows/deploy.yml',
      },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getCIConfigController,
  upsertCIConfigController,
  previewWorkflowController,
};
