const fs = require("fs");
const path = require("path");
const AppError = require('../../core/utils/AppError');
const { GithubToken } = require('../../modules/github/github.model');
const { Service } = require('../../modules/service/service.model');
const { Project } = require('../../modules/projects/projects.model');
const { CIConfig } = require('./ci.model');

const { decrypt } = require('../../core/utils/encryption');
const WorkflowBuilder = require('./ci.workflowBuilder');
const CdWorkflowBuilder = require('./cd.workflowBuilder');
const { BuildConfig } = require('../dockerize/dockerize.model');
const { Ecr } = require('../infra/ecr/ecr.model');
const { TerraformState } = require('../infra/terraform-state/terraformState.model');
const { EksCluster } = require('../infra/EKS/eks.model');
const { VmDeployment } = require('../infra/vm/vm.model');

const CI_FILE_PATH = ".github/workflows/ci.yml";
const CD_FILE_PATH = ".github/workflows/cd.yml";
const githubApiBaseUrl = "https://api.github.com/repos";


async function getCIConfig(serviceId) {
  const config = await CIConfig.findOne({ where: { service_id: serviceId } });
  if (!config) throw new AppError('No CI configuration found for this service', 404);
  return config;
}

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

async function getFileSha(token, owner, repo, branch, filePath = CI_FILE_PATH) {
  const res = await fetch(
    `${githubApiBaseUrl}/${owner}/${repo}/contents/${filePath}?ref=${branch}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
      },
    }
  );

  console.log('========================================');
  console.log(`res.status for ${filePath}:`, res.status);

  if (res.status === 404) return null;
  if (!res.ok) throw new AppError(`Failed to get file: ${res.status}`, res.status);

  const data = await res.json();
  return data.sha;
}

function generateWorkflowYAML(config) {
  const builder = new WorkflowBuilder(config);
  return builder.generateYAML();
}

function generateCdWorkflowYAML(config) {
  const builder = new CdWorkflowBuilder(config);
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

/**
 * Look up the ECR URL for the CI workflow generator.
 *
 * Priority order:
 *  1. terraform_states.ecr_url  — the REAL full URL Terraform outputs after
 *     apply, e.g. "123456789012.dkr.ecr.us-east-1.amazonaws.com/my-repo".
 *     This is only set once `terraform apply` has completed successfully.
 *  2. ecr_repositories.name     — the repo name the user configured before
 *     apply (e.g. "my-repo"). Used as a fallback so the YAML is still
 *     partially useful even before Terraform has run.
 *  3. null                      — no ECR config found at all; generators
 *     will fall back to ${{ secrets.ECR_REPOSITORY }}.
 *
 * @param {string} serviceId
 * @returns {Promise<string|null>}
 */
async function getEcrRepoNameFromDB(serviceId) {
  // 1. Try the real post-apply URL from terraform_states
  const state = await TerraformState.findOne({ where: { service_id: serviceId } });
  if (state && state.ecr_url) {
    return state.ecr_url; // full URL: "<account>.dkr.ecr.<region>.amazonaws.com/<name>"
  }

  // 2. Fall back to the repo name configured before Terraform apply
  const ecrRepo = await Ecr.findOne({ where: { service_id: serviceId } });
  return ecrRepo ? ecrRepo.name : null;
}

/**
 * Look up the EKS cluster name from the EksCluster table for this service.
 * @param {string} serviceId
 * @returns {Promise<string|null>}
 */
async function getEksClusterNameFromDB(serviceId) {
  const cluster = await EksCluster.findOne({ where: { service_id: serviceId } });
  return cluster ? cluster.cluster_name : null;
}

/**
 * Look up the deployment type (eks vs vm) from terraform_states or resource tables.
 * @param {string} serviceId
 * @returns {Promise<string>} 'eks' or 'vm'
 */
async function getDeploymentTypeFromDB(serviceId) {
  const state = await TerraformState.findOne({ where: { service_id: serviceId } });
  if (state && state.deployment_type) {
    return state.deployment_type;
  }
  const cluster = await EksCluster.findOne({ where: { service_id: serviceId } });
  return cluster ? 'eks' : 'vm';
}

/**
 * Look up the applied VM instance's id and KIND cluster name from the
 * VmDeployment table for this service. instance_id is only populated once
 * `terraform apply` has actually succeeded (see vm.service.js#markApplied);
 * before that, the CD generator falls back to ${{ secrets.VM_INSTANCE_ID }}.
 * @param {string} serviceId
 * @returns {Promise<{instanceId: string|null, kindClusterName: string}|null>}
 */
async function getVmDeploymentFromDB(serviceId) {
  const vm = await VmDeployment.findOne({ where: { service_id: serviceId } });
  if (!vm) return null;
  return {
    instanceId: vm.instance_id || null,
    kindClusterName: vm.kind_cluster_name || 'kind',
  };
}

async function pushSingleFileToGithub({ token, owner, repo, branch, filePath, yamlContent }) {
  const contentBase64 = Buffer.from(yamlContent).toString('base64');
  const sha = await getFileSha(token, owner, repo, branch, filePath);

  const body = {
    message: `Create or update ${filePath}`,
    content: contentBase64,
    branch,
    ...(sha && { sha }),
  };

  const res = await fetch(
    `${githubApiBaseUrl}/${owner}/${repo}/contents/${filePath}`,
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
    throw new AppError(`Push failed for ${filePath}: ${res.status} - ${JSON.stringify(result)}`, res.status);
  }
  return result;
}

async function pushWorkflowToGithub(userId, serviceId) {
  // Get the language the user set in the Dockerize step
  const language = await getLanguageFromBuildConfig(serviceId);
  const config = await getCIConfig(serviceId);

  // Enrich the config with language + Terraform ECR repo name + EKS cluster name + deploymentType
  const rawConfig = typeof config.toJSON === 'function' ? config.toJSON() : config;
  const ecrRepoName = rawConfig.registry === 'aws-ecr' ? await getEcrRepoNameFromDB(serviceId) : null;
  const eksClusterName = await getEksClusterNameFromDB(serviceId);
  const deploymentType = await getDeploymentTypeFromDB(serviceId);
  const vmDeployment = deploymentType === 'vm' ? await getVmDeploymentFromDB(serviceId) : null;
  const enrichedConfig = {
    ...rawConfig,
    language,
    ecrRepoName,
    eksClusterName,
    deploymentType,
    vmInstanceId: vmDeployment ? vmDeployment.instanceId : null,
    kindClusterName: vmDeployment ? vmDeployment.kindClusterName : null,
  };

  const service = await getServiceById(serviceId, userId);
  const { owner, repo } = parseGithubUrl(service.repository_url);
  const token = await getPATTokenFromDB(userId);

  // 1. Push CI Workflow (.github/workflows/ci.yml)
  const ciYaml = generateWorkflowYAML(enrichedConfig);
  const ciResult = await pushSingleFileToGithub({
    token,
    owner,
    repo,
    branch: service.branch,
    filePath: CI_FILE_PATH,
    yamlContent: ciYaml,
  });

  let cdResult = null;
  // 2. If CD is enabled, push CD Workflow (.github/workflows/cd.yml)
  if (enrichedConfig.enable_cd || enrichedConfig.enableCD) {
    const cdYaml = generateCdWorkflowYAML(enrichedConfig);
    cdResult = await pushSingleFileToGithub({
      token,
      owner,
      repo,
      branch: service.branch,
      filePath: CD_FILE_PATH,
      yamlContent: cdYaml,
    });
  }

  return { ciResult, cdResult };
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
  generateWorkflowYAML,
  generateCdWorkflowYAML,
  parseGithubUrl,
  getLanguageFromBuildConfig,
  getEcrRepoNameFromDB,
  getEksClusterNameFromDB,
  getDeploymentTypeFromDB,
  getVmDeploymentFromDB,
  CI_FILE_PATH,
  CD_FILE_PATH,
};