const Joi = require('joi');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const AppError = require('../../core/utils/AppError');
const { Service } = require('../../modules/service/service.model');
const { Project } = require('../../modules/projects/projects.model');

const execAsync = promisify(exec);

const ciConfigSchema = Joi.object({
  serviceId: Joi.string().uuid().required().messages({
    'string.empty': 'Service ID is required',
    'string.uuid': 'Service ID must be a valid UUID',
  }),
  pipelineName: Joi.string().min(3).max(50).required().messages({
    'string.min': 'Pipeline name must be at least 3 characters',
    'string.max': 'Pipeline name must not exceed 50 characters',
    'string.empty': 'Pipeline name is required',
  }),
  triggerBranch: Joi.string().min(1).max(50).required().messages({
    'string.empty': 'Trigger branch is required',
    'string.max': 'Branch name too long',
  }),
  registry: Joi.string()
    .valid('docker-hub', 'aws-ecr')
    .required()
    .messages({
      'any.only': 'Registry must be either "docker-hub" or "aws-ecr"',
      'string.empty': 'Registry is required',
    }),
  imageName: Joi.string().min(3).max(100).required().messages({
    'string.min': 'Image name must be at least 3 characters',
    'string.max': 'Image name must not exceed 100 characters',
    'string.empty': 'Image name is required',
  }),
  enableTrivy: Joi.boolean().default(false).messages({
    'boolean.base': 'Enable Trivy must be true or false',
  }),
//   dockerHubUsername: Joi.when('registry', {
//     is: 'docker-hub',
//     then: Joi.string().required().messages({
//       'string.empty': 'Docker Hub username is required for Docker Hub registry',
//     }),
//     otherwise: Joi.optional(),
//   }),
  awsEcrRegion: Joi.when('registry', {
    is: 'aws-ecr',
    then: Joi.string().required().messages({
      'string.empty': 'AWS ECR region is required for AWS ECR registry',
    }),
    otherwise: Joi.optional(),
  }),
}).unknown(false);

/**
 * Validate user CI configuration input
 * @param {object} configData - User input
 * @returns {object} Validated config
 */
function validateCIConfig(configData) {
  const { error, value } = ciConfigSchema.validate(configData);

  if (error) {
    throw new AppError(error.details[0].message, 400);
  }

  // Normalize registry-specific fields
  if (value.registry === 'docker-hub') {
    value.awsEcrRegion = null;
  }

  if (value.registry === 'aws-ecr') {
    value.dockerHubUsername = null;
  }

  return value;
}
/**
 * Validate repository configuration
 */
async function validateRepository(userId, serviceId) {
  // Get service with authorization check
  const service = await Service.findByPk(serviceId, {
    include: [{ model: Project, as: 'project', attributes: ['id', 'owner_id'] }],
  });

  if (!service) {
    throw new AppError('Service not found', 404);
  }

  if (service.project.owner_id !== userId) {
    throw new AppError('You do not have permission to access this service', 403);
  }

 
  const { owner, repo } = parseGithubUrl(service.repository_url);



  return {
    owner,
    repo,
    branch: service.branch,
    repositoryUrl: service.repository_url,
    service,
  };
}

/**
 * Validate branch exists in repository
 * @param {string} owner - GitHub owner
 * @param {string} repo - GitHub repo
 * @param {string} branch - Branch name
 * @param {string} token - GitHub PAT
 * @returns {boolean}
 */
async function validateBranchExists(token, owner, repo, branch) {
  try {
    const res = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/branches/${branch}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github+json',
        },
      }
    );

    if (res.status === 404) {
      throw new AppError(`Branch "${branch}" does not exist in the repository`, 404);
    }

    return true;
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new AppError('Failed to validate branch', 500);
  }
}

/**
 * Validate Dockerfile exists in repository
 * @param {string} owner - GitHub owner
 * @param {string} repo - GitHub repo
 * @param {string} branch - Branch name
 * @param {string} token - GitHub PAT
 * @returns {boolean}
 */
async function validateDockerfileExists(token, owner, repo, branch) {
  try {
    const res = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/Dockerfile?ref=${branch}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github+json',
        },
      }
    );

    if (res.status === 404) {
      throw new AppError(
        'Dockerfile not found.\nPlease add a Dockerfile to the root of your repository before enabling CI.',
        404
      );
    }

    if (!res.ok) {
      throw new AppError(`Failed to validate Dockerfile: ${res.status}`, res.status);
    }

    return true;
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new AppError('Failed to validate Dockerfile', 500);
  }
}

/**
 * Parse GitHub repository URL
 * @param {string} repositoryUrl - GitHub URL (with or without .git)
 * @returns {object} { owner, repo }
 */
function parseGithubUrl(repositoryUrl) {
  const cleanUrl = repositoryUrl.replace(/\.git$/, '');
  const parts = cleanUrl.split('/');
  const repo = parts.pop();
  const owner = parts.pop();

  if (!owner || !repo) {
    throw new AppError('Invalid GitHub repository URL format', 400);
  }

  return { owner, repo };
}

/**
 * Complete validation workflow
 * @param {string} userId - User ID
 * @param {object} configData - User CI config
 * @returns {object} Validated service and config
 */
async function validateAllAndReturn(userId, configData) {
  // Validate schema
  const validatedConfig = validateCIConfig(configData);

  // Validate repository
  const repoInfo = await validateRepository(userId, validatedConfig.serviceId);

  return {
    config: validatedConfig,
    repoInfo,
  };
}

module.exports = {
  validateCIConfig,
  validateRepository,
  validateBranchExists,
  validateDockerfileExists,
  parseGithubUrl,
  validateAllAndReturn,
};
