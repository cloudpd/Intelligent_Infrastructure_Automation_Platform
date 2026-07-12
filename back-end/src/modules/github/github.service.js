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

module.exports = { saveToken, listUserTokens, deleteToken, getDecryptedToken };