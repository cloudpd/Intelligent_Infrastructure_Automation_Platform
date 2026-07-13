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
  service_id: Joi.string().uuid().required().messages({
    'any.required': 'Service id is required',
  }),
  github_token_id: Joi.string().uuid().required().messages({
    'any.required': 'Please select which GitHub token to use',
  }),
  language: Joi.string().valid(...SUPPORTED_LANGUAGES).required().messages({
    'any.only': `Language must be one of: ${SUPPORTED_LANGUAGES.join(', ')}`,
  }),
  dockerfile_content: Joi.string().min(1).required().messages({
    'string.empty': 'Dockerfile content cannot be empty',
  }),
  target_path: Joi.string().trim().default('Dockerfile'),
});

module.exports = { existingDockerfileSchema, generateDockerfileSchema, SUPPORTED_LANGUAGES };