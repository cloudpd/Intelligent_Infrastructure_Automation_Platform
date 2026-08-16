const { BuildConfig } = require('./dockerize.model');
const AppError = require('../../core/utils/AppError');
const githubService = require('../github/github.service');
const { Service } = require('../service/service.model');   
const { Project } = require('../projects/projects.model');   
const { renderDockerfile } = require('./dockerize.templates');

async function getServiceOwnedByUser(userId, serviceId) {
  const service = await Service.findOne({
    where: { id: serviceId },
    include: [
      {
        model: Project,
        as: 'project',
        where: { owner_id: userId },
        attributes: [],
      },
    ],
  });
  return service;
}

async function markExistingDockerfile(userId, { service_id, dockerfile_path }) {
  const service = await getServiceOwnedByUser(userId, service_id);
  if (!service) throw new AppError('Service not found', 404);

  const [config] = await BuildConfig.findOrCreate({
    where: { service_id },
    defaults: { service_id, has_existing_dockerfile: true, dockerfile_path, status: 'completed' },
  });

  await config.update({
    has_existing_dockerfile: true,
    dockerfile_path,
    language: null,
    status: 'completed',
  });

  return config;
}

async function generateAndPushDockerfile(userId, data) {
  const { service_id, github_token_id, language, base_image, port, run_command, target_path } = data;

  const service = await getServiceOwnedByUser(userId, service_id);
  if (!service) throw new AppError('Service not found', 404);

  const runCommandArray = run_command
    .split(' ')
    .map((part) => `"${part}"`)
    .join(', ');

  const dockerfileContent = renderDockerfile(language, {
    BASE_IMAGE: base_image,
    PORT: String(port),
    RUN_COMMAND: runCommandArray,
  });

  const accessToken = await githubService.getDecryptedToken(userId, github_token_id);
  const { owner, repo } = githubService.parseRepoUrl(service.repository_url);

  await githubService.pushFileToRepo({
    accessToken,
    owner,
    repo,
    path: target_path,
    content: dockerfileContent,
    branch: service.branch || 'main',
    commitMessage: `Add Dockerfile via DeployHub (${language})`,
  });

  const [config] = await BuildConfig.findOrCreate({
    where: { service_id },
    defaults: { service_id, has_existing_dockerfile: false, dockerfile_path: target_path, language, status: 'completed' },
  });

  await config.update({
    has_existing_dockerfile: false,
    dockerfile_path: target_path,
    language,
    status: 'completed',
  });

  return config;
}

async function getBuildConfigForService(userId, serviceId) {
  const service = await getServiceOwnedByUser(userId, serviceId);
  if (!service) throw new AppError('Service not found', 404);

  const config = await BuildConfig.findOne({ where: { service_id: serviceId } });
  if (!config) throw new AppError('This service has not completed the Dockerfile step yet', 404);
  return config;
}

module.exports = { markExistingDockerfile, generateAndPushDockerfile, getBuildConfigForService };