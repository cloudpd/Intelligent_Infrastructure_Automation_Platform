const Joi = require('joi');

const destroySchema = Joi.object({
  environment: Joi.string().max(50).required().messages({
    'string.empty': 'environment is required',
    'any.required': 'environment is required',
  }),
  awsCredentialId: Joi.string().uuid().optional().messages({
    'string.guid': 'awsCredentialId must be a valid id',
  }),
});

module.exports = { destroySchema };