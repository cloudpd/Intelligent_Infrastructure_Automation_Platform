const { GithubToken } = require('./github.model');
const { encrypt, decrypt } = require('../../core/utils/encryption');
const AppError = require('../../core/utils/AppError');

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

module.exports = { saveToken, listUserTokens, deleteToken, getDecryptedToken, parseRepoUrl, pushFileToRepo };