const Joi = require('joi');

const pushRepoSecretsSchema = Joi.object({
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

module.exports = {
  pushRepoSecretsSchema,
};
