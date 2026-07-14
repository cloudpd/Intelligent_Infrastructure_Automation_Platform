const fs = require('fs');
const os = require('os');
const path = require('path');
const simpleGit = require('simple-git');

const AppError = require('../../../core/utils/AppError');
const githubService = require('../../github/github.service');
const { KubernetesConfig } = require('./k8s.model');
const { validateServiceOwnership } = require('./k8s.validation');
const { buildManifests } = require('./generators/manifest.builder');

const COMMIT_MESSAGE = 'Generate Kubernetes manifests using DevOps Platform';

function toConfigRow(serviceId, wizard) {
  return {
    service_id: serviceId,
    app_name: wizard.application.name,
    docker_image: wizard.application.dockerImage,
    image_tag: wizard.application.imageTag,
    container_port: wizard.application.containerPort,
    env_vars: wizard.application.envVars,
    namespace: wizard.workload.namespace,
    workload_type: wizard.workload.workloadType,
    replicas: wizard.workload.replicas,
    cpu_request: wizard.resources.cpuRequest,
    memory_request: wizard.resources.memoryRequest,
    cpu_limit: wizard.resources.cpuLimit,
    memory_limit: wizard.resources.memoryLimit,
    namespace_quota: wizard.resources.namespaceQuota,
    storage: wizard.storage?.enabled ? wizard.storage : null,
    service_account: wizard.serviceAccount?.enabled ? wizard.serviceAccount : null,
    networking: wizard.networking,
    health_checks: wizard.healthChecks?.enabled ? wizard.healthChecks : null,
    autoscaling: wizard.autoscaling?.enabled ? wizard.autoscaling : null,
  };
}

/**
 * Saves/updates the wizard answers for a service (upsert, like CIConfig).
 */
async function saveWizardConfig(serviceId, wizard) {
  const [config] = await KubernetesConfig.findOrCreate({
    where: { service_id: serviceId },
    defaults: toConfigRow(serviceId, wizard),
  });
  await config.update(toConfigRow(serviceId, wizard));
  return config;
}

async function getWizardConfig(serviceId) {
  return KubernetesConfig.findOne({ where: { service_id: serviceId } });
}

async function deleteWizardConfig(serviceId) {
  const deleted = await KubernetesConfig.destroy({ where: { service_id: serviceId } });
  if (!deleted) throw new AppError('No Kubernetes configuration found for this service', 404);
}

async function getPATTokenFromDB(userId, githubTokenId) {
  if (githubTokenId) {
    return githubService.getDecryptedToken(userId, githubTokenId);
  }

  const tokens = await githubService.listUserTokens(userId);
  if (!tokens.length) {
    throw new AppError('GitHub token not found. Add one under GitHub Tokens first.', 404);
  }
  if (tokens.length > 1) {
    // Don't guess which account to push as — that's how the wrong
    // account ends up trying (and failing) to push.
    throw new AppError(
      'You have multiple GitHub tokens saved. Pick which one to push with (githubTokenId).',
      400
    );
  }
  return githubService.getDecryptedToken(userId, tokens[0].id);
}

function buildAuthenticatedCloneUrl(repositoryUrl, token) {
  // https://github.com/owner/repo(.git) -> https://<token>@github.com/owner/repo.git
  const url = new URL(repositoryUrl);
  url.username = token;
  if (!url.pathname.endsWith('.git')) {
    url.pathname = `${url.pathname}.git`;
  }
  return url.toString();
}

/**
 * Clones the service's repository into a temp directory, writes the
 * generated manifests under k8s/, commits, and pushes to the default
 * branch. Only files under k8s/ are touched — application source is
 * never modified. The temp clone is always removed afterwards.
 */
async function cloneWriteCommitPush({ repositoryUrl, branch, token, files }) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'k8s-wizard-'));

  try {
    const git = simpleGit();
    const cloneUrl = buildAuthenticatedCloneUrl(repositoryUrl, token);

    await git.clone(cloneUrl, tmpDir, ['--depth', '1', '--branch', branch]);
    const repoGit = simpleGit(tmpDir);

    const k8sDir = path.join(tmpDir, 'k8s');
    fs.mkdirSync(k8sDir, { recursive: true });

    for (const { file, content } of files) {
      const absPath = path.join(tmpDir, file);
      fs.mkdirSync(path.dirname(absPath), { recursive: true });
      fs.writeFileSync(absPath, content, 'utf-8');
    }

    await repoGit.add(files.map((f) => f.file));

    const status = await repoGit.status();
    if (status.staged.length === 0) {
      // Nothing changed — return current HEAD without an empty commit.
      const log = await repoGit.log({ n: 1 });
      return { commitSha: log.latest?.hash || null, pushed: false };
    }

    await repoGit.addConfig('user.name', 'DevOps Platform Bot');
    await repoGit.addConfig('user.email', 'devops-platform@bot.local');
    const commitResult = await repoGit.commit(COMMIT_MESSAGE);
    await repoGit.push('origin', branch);

    return { commitSha: commitResult.commit, pushed: true };
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

/**
 * Full orchestration for POST /:serviceId/k8s/generate.
 * Accepts the full wizard payload, persists it, renders every manifest,
 * and — unless dryRun is set — clones, commits, and pushes to the repo.
 */
async function generateKubernetesManifests(userId, serviceId, wizard) {
  const service = await validateServiceOwnership(userId, serviceId);

  await saveWizardConfig(serviceId, wizard);

  const files = buildManifests(wizard);
  const generatedFiles = files.map((f) => f.file);

  if (wizard.dryRun) {
    return {
      success: true,
      message: 'Kubernetes manifests rendered (dry run — nothing pushed).',
      branch: service.branch,
      commitSha: null,
      generatedFiles,
      manifests: files, // included only for dry runs, used by the preview UI
    };
  }

  const token = await getPATTokenFromDB(userId, wizard.githubTokenId);
  const { commitSha, pushed } = await cloneWriteCommitPush({
    repositoryUrl: service.repository_url,
    branch: service.branch,
    token,
    files,
  });

  await KubernetesConfig.update(
    { last_commit_sha: commitSha, last_generated_files: generatedFiles },
    { where: { service_id: serviceId } }
  );

  return {
    success: true,
    message: pushed
      ? 'Kubernetes manifests generated successfully.'
      : 'Kubernetes manifests generated — no changes to push (repository already up to date).',
    branch: service.branch,
    commitSha,
    generatedFiles,
  };
}

module.exports = {
  generateKubernetesManifests,
  getWizardConfig,
  deleteWizardConfig,
};