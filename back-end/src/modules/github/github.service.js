const { encrypt, decrypt } = require('../../core/utils/encryption');

async function saveToken(userId, name, rawToken, description) {
  const encryptedToken = encrypt(rawToken);
  return GithubToken.create({ user_id: userId, name, token: encryptedToken, description });
}

async function getDecryptedToken(userId, tokenId) {
  const record = await GithubToken.findOne({ where: { id: tokenId, user_id: userId } });
  if (!record) throw new AppError('Token not found', 404);
  return decrypt(record.token);
}

async function listUserTokens(userId) {
  return GithubToken.findAll({
    where: { user_id: userId },
    attributes: ['id', 'name', 'description', 'createdAt'],
  });
}

async function deleteToken(userId, tokenId) {
  const deleted = await GithubToken.destroy({ where: { id: tokenId, user_id: userId } });
  if (!deleted) throw new AppError('Token not found', 404);
}