const Joi = require('joi');

const createCredentialSchema = Joi.object({
  name: Joi.string().trim().max(100).allow(null, '').optional(),
  access_key: Joi.string().trim().min(16).max(128).required(),
  secret_key: Joi.string().trim().min(16).max(256).required(),
});

const updateCredentialSchema = Joi.object({
  name: Joi.string().trim().max(100).allow(null, '').optional(),
  access_key: Joi.string().trim().min(16).max(128).optional(),
  secret_key: Joi.string().trim().min(16).max(256).optional(),
}).min(1);

module.exports = { createCredentialSchema, updateCredentialSchema };