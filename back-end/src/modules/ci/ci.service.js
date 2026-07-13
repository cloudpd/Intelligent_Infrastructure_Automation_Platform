const fs = require("fs");
const path = require("path");
const AppError = require('../../core/utils/AppError');
const { GithubToken } = require('../../modules/github/github.model');
const { Service } = require('../../modules/service/service.model');
const { Project } = require('../../modules/projects/projects.model');

const { decrypt } = require('../../core/utils/encryption');
const WorkflowBuilder = require('./ci.workflowBuilder');
const { BuildConfig } = require('../dockerize/dockerize.model');

const FILE_PATH_IN_REPO = ".github/workflows/deploy.yml";
const githubApiBaseUrl = "https://api.github.com/repos";

function parseGithubUrl(repositoryUrl) {
  const cleanUrl = repositoryUrl.replace(/\.git$/, "");
  const parts = cleanUrl.split("/");
  const repo = parts.pop();
  const owner = parts.pop();
  return { owner, repo };
}

async function getServiceById(serviceId, userId) {
  const service = await Service.findByPk(serviceId, {
    include: [{ model: Project, as: 'project', attributes: ['id', 'owner_id'] }],
  });

  if (!service) throw new AppError('Service not found', 404);
  if (service.project.owner_id !== userId) {
    throw new AppError('You do not have permission to access this service', 403);
  }
  return service;
}

async function getPATTokenFromDB(userId) {
  const tokenRecord = await GithubToken.findOne({ where: { user_id: userId } });
  if (!tokenRecord) throw new AppError("Token not found", 404);
  return decrypt(tokenRecord.token);
}

async function getFileSha(token, owner, repo, branch) {
  const res = await fetch(
    `${githubApiBaseUrl}/${owner}/${repo}/contents/${FILE_PATH_IN_REPO}?ref=${branch}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
      },
    }
  );

  if (res.status === 404) return null;
  if (!res.ok) throw new AppError(`Failed to get file: ${res.status}`, res.status);

  const data = await res.json();
  return data.sha;
}

function generateWorkflowYAML(config) {
  const builder = new WorkflowBuilder(config);
  return builder.generateYAML();
}

/**
 * Look up the language the user set in the Dockerize step.
 * Returns 'node', 'python', or null if not found.
 * @param {string} serviceId
 * @returns {Promise<string|null>}
 */
async function getLanguageFromBuildConfig(serviceId) {
  const buildConfig = await BuildConfig.findOne({ where: { service_id: serviceId } });
  return buildConfig ? buildConfig.language : null;
}

async function pushWorkflowToGithub(userId, serviceId, config) {
  // Get the language the user set in the Dockerize step
  const language = await getLanguageFromBuildConfig(serviceId);

  // Enrich the config with language before generating YAML
  const rawConfig = typeof config.toJSON === 'function' ? config.toJSON() : config;
  const enrichedConfig = { ...rawConfig, language };

  const workflowYAML = generateWorkflowYAML(enrichedConfig);
  const contentBase64 = Buffer.from(workflowYAML).toString('base64');

  const service = await getServiceById(serviceId, userId);
  const { owner, repo } = parseGithubUrl(service.repository_url);
  const token = await getPATTokenFromDB(userId);
  const sha = await getFileSha(token, owner, repo, service.branch);

  const body = {
    message: `Create or update ${FILE_PATH_IN_REPO}`,
    content: contentBase64,
    branch: service.branch,
    ...(sha && { sha }),
  };

  const res = await fetch(
    `${githubApiBaseUrl}/${owner}/${repo}/contents/${FILE_PATH_IN_REPO}`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    }
  );

  const result = await res.json();
  if (!res.ok) {
    throw new AppError(`Push failed: ${res.status} - ${JSON.stringify(result)}`, res.status);
  }

  return result;
}

async function getExistingWorkflow(userId, serviceId) {
  const service = await getServiceById(serviceId, userId);
  const { owner, repo } = parseGithubUrl(service.repository_url);
  const token = await getPATTokenFromDB(userId);

  const res = await fetch(
    `${githubApiBaseUrl}/${owner}/${repo}/contents/${FILE_PATH_IN_REPO}?ref=${service.branch}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
      },
    }
  );

  if (res.status === 404) return null;
  if (!res.ok) throw new AppError(`Failed to fetch workflow: ${res.status}`, res.status);

  const data = await res.json();
  return {
    sha: data.sha,
    path: data.path,
    content: Buffer.from(data.content, 'base64').toString('utf-8'),
    url: data.html_url,
  };
}

module.exports = {
  generateWorkflowYAML,
  pushWorkflowToGithub,
  getExistingWorkflow,
  getServiceById,
  getPATTokenFromDB,
  parseGithubUrl,
  getLanguageFromBuildConfig,
};