const Joi = require('joi');

const pushRepoSecretsSchema = Joi.object({
  githubTokenId: Joi.string().uuid().optional(),
  secrets: Joi.object({
    AWS_ACCESS_KEY_ID: Joi.string().trim().min(16).max(128).required().messages({
      'string.empty': 'AWS Access Key ID is required',
      'string.min': 'AWS Access Key ID must be at least 16 characters',
      'string.max': 'AWS Access Key ID must not exceed 128 characters',
    }),
    AWS_SECRET_ACCESS_KEY: Joi.string().trim().min(16).max(256).required().messages({
      'string.empty': 'AWS Secret Access Key is required',
      'string.min': 'AWS Secret Access Key must be at least 16 characters',
      'string.max': 'AWS Secret Access Key must not exceed 256 characters',
    }),
    githubTokenId: Joi.string().uuid().optional(),
  }).required(),
}).required();

const pushTerraformFilesSchema = Joi.object({
  githubTokenId: Joi.string().uuid().required().messages({
    'any.required': 'A GitHub token is required to push files',
    'string.uuid': 'Invalid GitHub token ID',
  }),
  branch: Joi.string().optional().default('main'),
}).required();

module.exports = {
  pushRepoSecretsSchema,
  pushTerraformFilesSchema,
};
