const awsService = require('./aws.service');
const AppError = require('../../core/utils/AppError');

const createCredential = async (req, res, next) => {
  try {
    const credential = await awsService.createCredential(req.user.id, req.body);
    return res.status(201).json({
      status: 'success',
      data: credential,
    });
  } catch (err) {
    return next(err);
  }
};

const getUserCredentials = async (req, res, next) => {
  try {
    const credentials = await awsService.getUserCredentials(req.user.id);
    return res.status(200).json({
      status: 'success',
      results: credentials.length,
      data: credentials,
    });
  } catch (err) {
    return next(err);
  }
};

const getCredentialById = async (req, res, next) => {
  try {
    const credential = await awsService.getCredentialById(req.user.id, req.params.id);
    return res.status(200).json({
      status: 'success',
      data: credential,
    });
  } catch (err) {
    return next(err);
  }
};

const updateCredential = async (req, res, next) => {
  try {
    const credential = await awsService.updateCredential(req.user.id, req.params.id, req.body);
    return res.status(200).json({
      status: 'success',
      data: credential,
    });
  } catch (err) {
    return next(err);
  }
};

const deleteCredential = async (req, res, next) => {
  try {
    await awsService.deleteCredential(req.user.id, req.params.id);
    return res.status(204).json({
      status: 'success',
      data: null,
    });
  } catch (err) {
    return next(err);
  }
};

module.exports = {
  createCredential,
  getUserCredentials,
  getCredentialById,
  updateCredential,
  deleteCredential,
};