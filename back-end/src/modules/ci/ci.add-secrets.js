const sodium = require("libsodium-wrappers");
const AppError = require('../../core/utils/AppError');
const { getServiceById, parseGithubUrl, getPATTokenFromDB } = require('./ci.service');
const { REGISTRY_TYPES, getRequiredSecrets } = require('./registry-secrets.config');

const githubApiBaseUrl = "https://api.github.com/repos";

async function getRepoPublicKey(token, owner, repo) {
  const res = await fetch(
    `${githubApiBaseUrl}/${owner}/${repo}/actions/secrets/public-key`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
      },
    }
  );

  if (!res.ok) throw new AppError(`Failed to get public key: ${res.status}`, res.status);
  return res.json(); // { key_id, key }
}

async function encryptSecret(publicKeyBase64, secretValue) {
  await sodium.ready;
  const publicKey = sodium.from_base64(publicKeyBase64, sodium.base64_variants.ORIGINAL);
  const secretBytes = sodium.from_string(secretValue);
  const encryptedBytes = sodium.crypto_box_seal(secretBytes, publicKey);
  return sodium.to_base64(encryptedBytes, sodium.base64_variants.ORIGINAL);
}

async function pushSecret(token, owner, repo, keyId, publicKey, secretName, secretValue) {
  const encryptedValue = await encryptSecret(publicKey, secretValue);

  const res = await fetch(
    `${githubApiBaseUrl}/${owner}/${repo}/actions/secrets/${secretName}`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ encrypted_value: encryptedValue, key_id: keyId }),
    }
  );

  if (res.status !== 201 && res.status !== 204) {
    const result = await res.json().catch(() => ({}));
    throw new AppError(`Failed to push secret ${secretName}: ${res.status} - ${JSON.stringify(result)}`, res.status);
  }

  return { name: secretName, status: "success" };
}

async function pushRegistrySecrets(userId, serviceId, registry = REGISTRY_TYPES.DOCKER, rawSecrets) {
  const service = await getServiceById(serviceId, userId);
  const { owner, repo } = parseGithubUrl(service.repository_url);
  const token = await getPATTokenFromDB(userId);

  const { key, key_id } = await getRepoPublicKey(token, owner, repo);
  
  const results = [];
  for (const [name, value] of Object.entries(rawSecrets)) {
    const result = await pushSecret(token, owner, repo, key_id, key, name, value);
    results.push(result);
  }

  return { registry, pushedSecrets: results };
}


module.exports = { pushRegistrySecrets };