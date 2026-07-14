const Joi = require('joi');

const SUPPORTED_LANGUAGES = ['node', 'python'];

const existingDockerfileSchema = Joi.object({
  service_id: Joi.string().uuid().required().messages({
    'string.guid': 'Invalid service id',
    'any.required': 'Service id is required',
  }),
  dockerfile_path: Joi.string().trim().required().messages({
    'string.empty': 'Please provide the path to your Dockerfile in the repo',
  }),
});

const generateDockerfileSchema = Joi.object({
  service_id: Joi.string().uuid().required(),
  github_token_id: Joi.string().uuid().required().messages({
    'any.required': 'Please select which GitHub token to use',
  }),
  language: Joi.string().valid(...SUPPORTED_LANGUAGES).required(),

  base_image: Joi.string().trim().required().messages({
    'string.empty': 'Base image is required',
  }),
  port: Joi.number().integer().min(1).max(65535).required().messages({
    'number.base': 'Port must be a valid number',
  }),
  run_command: Joi.string().trim().required().messages({
    'string.empty': 'Run command is required',
  }),

  target_path: Joi.string().trim().default('Dockerfile'),
});

module.exports = { existingDockerfileSchema, generateDockerfileSchema, SUPPORTED_LANGUAGES };