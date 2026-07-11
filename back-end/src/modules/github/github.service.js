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