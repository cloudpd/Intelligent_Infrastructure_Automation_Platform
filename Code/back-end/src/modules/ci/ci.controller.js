const ciService = require('./ci.service');
const githubService = require('../github/github.service');
const { validateRepository } = require('./ci.validation');
const { CIConfig } = require('./ci.model');
const AppError = require('../../core/utils/AppError');
const { getEcrRepoNameFromDB } = require('./ci.service');

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
                enableLint: config.enable_lint,
                enableTests: config.enable_tests,
                enableBuild: config.enable_build,
                enableCD: config.enable_cd,
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
                enable_lint: config.enableLint,
                enable_tests: config.enableTests,
                enable_build: config.enableBuild,
                enable_cd: config.enableCD,
            },
        });

        if (!created) {
            await ciConfig.update({
                pipeline_name: config.pipelineName,
                trigger_branch: config.triggerBranch,
                registry: config.registry,
                image_name: config.imageName,
                enable_trivy: config.enableTrivy,
                enable_lint: config.enableLint,
                enable_tests: config.enableTests,
                enable_build: config.enableBuild,
                enable_cd: config.enableCD,
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
                enableLint: ciConfig.enable_lint,
                enableTests: ciConfig.enable_tests,
                enableBuild: ciConfig.enable_build,
                enableCD: ciConfig.enable_cd,
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


        const language = await ciService.getLanguageFromBuildConfig(serviceId);

        // Look up the Terraform-created ECR repo name (if registry is aws-ecr)
        const ecrRepoName = ciConfig.registry === 'aws-ecr'
            ? await getEcrRepoNameFromDB(serviceId)
            : null;
        const eksClusterName = await getEksClusterNameFromDB(serviceId);

        // Build config object for generator
        const config = {
            serviceId,
            pipelineName: ciConfig.pipeline_name,
            triggerBranch: ciConfig.trigger_branch,
            registry: ciConfig.registry,
            imageName: ciConfig.image_name,
            enableTrivy: ciConfig.enable_trivy,
            enableLint: ciConfig.enable_lint,
            enableTests: ciConfig.enable_tests,
            enableBuild: ciConfig.enable_build,
            enableCD: ciConfig.enable_cd,
            language,
            ecrRepoName,
            eksClusterName,
        };


        const ciYaml = ciService.generateWorkflowYAML(config);
        const cdYaml = config.enableCD ? ciService.generateCdWorkflowYAML(config) : null;

        res.status(200).json({
            success: true,
            message: 'Workflow preview generated',
            workflow: {
                yaml: ciYaml,
                ciYaml,
                cdYaml,
                config,
                filePath: ciService.CI_FILE_PATH || '.github/workflows/ci.yml',
                cdFilePath: ciService.CD_FILE_PATH || '.github/workflows/cd.yml',
            },
        });
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
    try {
        const { serviceId } = req.params;
        const userId = req.user.id;

        await validateRepository(userId, serviceId);
        const result = await ciService.pushWorkflowToGithub(userId, serviceId);

        res.status(200).json({
            success: true,
            message: 'Workflow pushed to GitHub successfully',
            result,
        });
    } catch (err) {
        next(err);
    }
}

async function pushSecrets(req, res, next) {
    try {
        const { serviceId } = req.params;
        const { secrets } = req.body || {};

        const result = await githubService.pushRepoSecrets({
            userId: req.user.id,
            serviceId,
            secrets,
        });

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

