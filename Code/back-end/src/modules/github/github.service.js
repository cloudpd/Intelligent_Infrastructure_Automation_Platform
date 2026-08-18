const sodium = require('libsodium-wrappers');
const { GithubToken } = require('./github.model');
const { Service } = require('../service/service.model');
const { Project } = require('../projects/projects.model');
const { encrypt, decrypt } = require('../../core/utils/encryption');
const AppError = require('../../core/utils/AppError');

const githubApiBaseUrl = 'https://api.github.com/repos';

async function saveToken(userId, name, rawToken, description) {
  const encryptedToken = encrypt(rawToken);

  const savedToken = await GithubToken.create({
    user_id: userId,
    name,
    token: encryptedToken,
    description,
  });

  return {
    id: savedToken.id,
    name: savedToken.name,
    description: savedToken.description,
    createdAt: savedToken.createdAt,
  };
}

async function listUserTokens(userId) {
  return GithubToken.findAll({
    where: { user_id: userId },
    attributes: ['id', 'name', 'description', 'createdAt'],
    order: [['createdAt', 'DESC']],
  });
}

async function deleteToken(userId, tokenId) {
  const deleted = await GithubToken.destroy({
    where: { id: tokenId, user_id: userId },
  });
  if (!deleted) throw new AppError('Token not found', 404);
}

async function getDecryptedToken(userId, tokenId) {
  const record = await GithubToken.findOne({ where: { id: tokenId, user_id: userId } });
  if (!record) throw new AppError('Token not found', 404);
  return decrypt(record.token);
}

function parseRepoUrl(repositoryUrl) {
  const match = repositoryUrl.match(/github\.com[:/]([^/]+)\/([^/.]+)(\.git)?/);
  if (!match) {
    throw new AppError('Invalid GitHub repository URL', 400);
  }
  return { owner: match[1], repo: match[2] };
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

async function getPatTokenFromDb(userId) {
  const tokenRecord = await GithubToken.findOne({ where: { user_id: userId } });
  if (!tokenRecord) throw new AppError('GitHub token not found', 404);
  return decrypt(tokenRecord.token);
}

async function getRepoPublicKey(token, owner, repo) {
  const res = await fetch(`${githubApiBaseUrl}/${owner}/${repo}/actions/secrets/public-key`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
    },
  });

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    throw new AppError(errBody.message || `Failed to get public key: ${res.status}`, res.status);
  }

  return res.json();
}

async function encryptSecret(publicKeyBase64, secretValue) {
  await sodium.ready;
  const publicKey = sodium.from_base64(publicKeyBase64, sodium.base64_variants.ORIGINAL);
  const secretBytes = sodium.from_string(secretValue);
  const encryptedBytes = sodium.crypto_box_seal(secretBytes, publicKey);
  return sodium.to_base64(encryptedBytes, sodium.base64_variants.ORIGINAL);
}

async function pushSingleRepoSecret({ token, owner, repo, secretName, secretValue }) {
  const { key, key_id } = await getRepoPublicKey(token, owner, repo);
  const encryptedValue = await encryptSecret(key, secretValue);

  const res = await fetch(`${githubApiBaseUrl}/${owner}/${repo}/actions/secrets/${secretName}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ encrypted_value: encryptedValue, key_id: key_id }),
  });

  if (res.status !== 201 && res.status !== 204) {
    const result = await res.json().catch(() => ({}));
    throw new AppError(`Failed to push secret ${secretName}: ${res.status} - ${JSON.stringify(result)}`, res.status);
  }

  return { name: secretName, status: 'success' };
}

async function pushRepoSecrets({ userId, serviceId, secrets }) {
  if (!secrets || typeof secrets !== 'object' || Array.isArray(secrets) || Object.keys(secrets).length === 0) {
    throw new AppError('Secrets payload is required and must be a non-empty object', 400);
  }

  const service = await getServiceById(serviceId, userId);
  const { owner, repo } = parseRepoUrl(service.repository_url);
  const token = await getPatTokenFromDb(userId);

  const pushedSecrets = [];
  for (const [secretName, secretValue] of Object.entries(secrets)) {
    pushedSecrets.push(
      await pushSingleRepoSecret({
        token,
        owner,
        repo,
        secretName,
        secretValue: String(secretValue),
      })
    );
  }

  return { serviceId, repoFullName: `${owner}/${repo}`, pushedSecrets };
}

async function pushFileToRepo({ accessToken, owner, repo, path, content, branch, commitMessage }) {
  const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    Accept: 'application/vnd.github+json',
    'Content-Type': 'application/json',
  };

  let sha;
  const existing = await fetch(`${apiUrl}?ref=${branch}`, { headers });
  if (existing.status === 200) {
    const data = await existing.json();
    sha = data.sha;
  } else if (existing.status !== 404) {
    const errBody = await existing.json().catch(() => ({}));
    throw new AppError(errBody.message || 'Failed to check existing file on GitHub', existing.status);
  }

  const body = {
    message: commitMessage || `Add ${path} via DeployHub`,
    content: Buffer.from(content).toString('base64'),
    branch,
  };
  if (sha) body.sha = sha;

  const response = await fetch(apiUrl, { method: 'PUT', headers, body: JSON.stringify(body) });

  if (!response.ok) {
    const errBody = await response.json().catch(() => ({}));
    throw new AppError(errBody.message || 'Failed to push file to GitHub', response.status);
  }

  return response.json();
}

async function getFileContent({ accessToken, owner, repo, path, branch }) {
  const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch}`;
  const res = await fetch(apiUrl, {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/vnd.github+json' },
  });
  if (res.status === 404) return null; // file doesn't exist — not an error, just a signal
  if (!res.ok) throw new AppError('Failed to read file from GitHub', res.status);
  const data = await res.json();
  return Buffer.from(data.content, 'base64').toString('utf8');
}

module.exports = {
  saveToken,
  listUserTokens,
  deleteToken,
  getDecryptedToken,
  parseRepoUrl,
  pushFileToRepo,
  pushRepoSecrets,
  pushSingleRepoSecret,
  getPatTokenFromDb,
  getServiceById,
  getFileContent,
};