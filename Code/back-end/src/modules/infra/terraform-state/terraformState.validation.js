const Joi = require('joi');

const setupSchema = Joi.object({
  serviceId: Joi.string().uuid().required().messages({
    'string.empty': 'serviceId is required',
    'any.required': 'serviceId is required',
  }),
  awsCredentialId: Joi.string().uuid().optional().messages({
    'string.guid': 'awsCredentialId must be a valid id',
  }),
  s3Bucket: Joi.string().min(1).max(255).required().messages({
    'string.empty': 's3Bucket is required',
    'any.required': 's3Bucket is required',
  }),
  lockTable: Joi.string().max(255).optional().allow('', null),
  useEcr: Joi.boolean().required().messages({
    'any.required': 'useEcr is required',
  }),
});

const deploymentSchema = Joi.object({
  serviceId: Joi.string().uuid().required().messages({
    'string.empty': 'serviceId is required',
    'any.required': 'serviceId is required',
  }),
  deploymentType: Joi.string().valid('eks', 'vm').required().messages({
    'any.only': 'deploymentType must be either "eks" or "vm"',
    'any.required': 'deploymentType is required',
  }),
});

const generateSchema = Joi.object({
  serviceId: Joi.string().uuid().required().messages({
    'string.empty': 'serviceId is required',
    'any.required': 'serviceId is required',
  }),
  serviceSlug: Joi.string().max(100).optional(),
  environment: Joi.string().max(50).optional(),
});

module.exports = { setupSchema, deploymentSchema, generateSchema };
