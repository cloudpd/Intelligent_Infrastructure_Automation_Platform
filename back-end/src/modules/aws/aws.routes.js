const express = require('express');
const {
  createCredential,
  getUserCredentials,
  getCredentialById,
  updateCredential,
  deleteCredential,
} = require('./aws.controller');

const authenticate = require('../../core/middlewares/authenticate');
const validate = require('../../core/middlewares/validate');
const { createCredentialSchema, updateCredentialSchema } = require('./aws.validation');

const router = express.Router();

router.use(authenticate);

router
  .route('/')
  .post(validate(createCredentialSchema), createCredential)
  .get(getUserCredentials);

router
  .route('/:id')
  .get(getCredentialById)
  .patch(validate(updateCredentialSchema), updateCredential)
  .delete(deleteCredential);

module.exports = router;