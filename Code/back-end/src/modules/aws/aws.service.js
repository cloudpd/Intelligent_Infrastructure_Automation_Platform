const { AwsCredential } = require('./aws.model');
const { encrypt, decrypt } = require('../../core/utils/encryption');
const AppError = require('../../core/utils/AppError');

const sanitize = (credential) => {
  const plain = credential.toJSON ? credential.toJSON() : credential;
  const { secret_key, ...rest } = plain;
  return rest;
};

const createCredential = async (userId, payload) => {
  const { name, access_key, secret_key } = payload;

  const credential = await AwsCredential.create({
    user_id: userId,
    name,
    access_key,
    secret_key: encrypt(secret_key),
  });
  
  return sanitize(credential);
};

const getUserCredentials = async (userId) => {
  const credentials = await AwsCredential.findAll({
    where: { user_id: userId },
    order: [['createdAt', 'DESC']],
  });

  return credentials.map(sanitize);
};


const getCredentialById = async (userId, credentialId) => {
  const credential = await AwsCredential.findOne({
    where: { id: credentialId, user_id: userId },
  });

  if (!credential) {
    throw new AppError('AWS credential not found', 404);
  }

  return sanitize(credential);
};


const getDecryptedCredential = async (userId, credentialId) => {
  const credential = await AwsCredential.findOne({
    where: { id: credentialId, user_id: userId },
  });

  if (!credential) {
    throw new AppError('AWS credential not found', 404);
  }

  return {
    id: credential.id,
    name: credential.name,
    access_key: credential.access_key,
    secret_key: decrypt(credential.secret_key),
  };
};


const updateCredential = async (userId, credentialId, payload) => {
  const credential = await AwsCredential.findOne({
    where: { id: credentialId, user_id: userId },
  });

  if (!credential) {
    throw new AppError('AWS credential not found', 404);
  }

  const { name, access_key, secret_key } = payload;

  if (name !== undefined) credential.name = name;
  if (access_key !== undefined) credential.access_key = access_key;
  if (secret_key !== undefined) credential.secret_key = encrypt(secret_key);

  await credential.save();

  return sanitize(credential);
};


const deleteCredential = async (userId, credentialId) => {
  const deletedCount = await AwsCredential.destroy({
    where: { id: credentialId, user_id: userId },
  });

  if (!deletedCount) {
    throw new AppError('AWS credential not found', 404);
  }

  return true;
};


module.exports = {
  createCredential,
  getUserCredentials,
  getCredentialById,
  getDecryptedCredential,
  updateCredential,
  deleteCredential,
};