const ciService = require('./ci.service');
const { validateRepository } = require('./ci.validation');
const { CIConfig } = require('./ci.model');
const AppError = require('../../core/utils/AppError');
const ciSecretsService = require('./ci.add-secrets');

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


async function upsertCIConfigController(req, res, next) {
    try {
        const serviceId = req.params.serviceId || req.body.serviceId;
        const config = req.ciConfig;

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


async function previewWorkflowController(req, res, next) {
    try {
        const { serviceId } = req.params;
        // Get configuration from database
        const ciConfig = await CIConfig.findOne({
            where: { service_id: serviceId },
        });


        console.log(ciConfig);

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

        // Return preview and the expected workflow file path in the repository y2ma han3mlo download y2ma ntl3o yml file w khalas
        res.status(200).json({
            success: true,
            message: 'Workflow preview generated',
            workflow: {
                yaml: workflowYAML,
                config,
                filePath: '.github/workflows/deploy.yml',
            },
        });
        //     res.setHeader("Content-Type", "text/yaml");
        //     res.setHeader(
        //   "Content-Disposition",
        //   'attachment; filename="deploy.yml"'
        // );

        // res.send(workflowYAML);
    } catch (err) {
        next(err);
    }
}

async function deleteCIConfigController(req, res, next) {
    try {
        const { serviceId } = req.params;

        await validateRepository(req.user.id, serviceId);

        const deleted = await CIConfig.destroy({
            where: {
                service_id: serviceId,
            },
        });

        if (!deleted) {
            throw new AppError('CI configuration not found', 404);
        }

        res.status(200).json({
            success: true,
            message: 'CI configuration deleted successfully',
        });
    } catch (err) {
        next(err);
    }
}


async function pushWorkflowToGithub(req, res, next) {
    const { serviceId } = req.params;
    const userId = req.user.id;
    const config = await CIConfig.findOne({
        where: { service_id: serviceId },
    });
    if (!config) {
        return res.status(404).json({
            success: false,
            message: 'No CI configuration found for this service',
        });
    }
    const result = await ciService.pushWorkflowToGithub(userId, serviceId, config);
    res.status(200).json({
        success: true,
        message: 'Workflow pushed to GitHub successfully',
        result,
    });
}


async function pushSecrets(req, res, next) {
    try {
        const { serviceId } = req.params;
        const { registry, secrets } = req.body;

        const result = await ciSecretsService.pushRegistrySecrets(
            req.user.id,
            serviceId,
            registry,
            secrets
        );

        res.status(200).json({ success: true, result });
    } catch (err) {
        next(err);
    }
}

module.exports = {
    getCIConfigController,
    upsertCIConfigController,
    previewWorkflowController,
    deleteCIConfigController,
    pushWorkflowToGithub,
    pushSecrets,
};

