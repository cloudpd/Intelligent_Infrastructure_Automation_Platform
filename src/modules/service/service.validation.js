const Joi = require('joi');

const createServiceSchema = Joi.object({
  name: Joi.string().min(2).max(100).required().messages({
    'string.min': 'Service name must be at least 2 characters long',
    'string.max': 'Service name must not exceed 100 characters',
    'string.empty': 'Service name is required',
  }),
  repository_url: Joi.string().uri().required().messages({
    'string.uri': 'repository_url must be a valid URL',
    'string.empty': 'repository_url is required',
  }),
  branch: Joi.string().max(100).optional().messages({
    'string.max': 'Branch name must not exceed 100 characters',
  }),
});

const updateServiceSchema = Joi.object({
  name: Joi.string().min(2).max(100).optional().messages({
    'string.min': 'Service name must be at least 2 characters long',
    'string.max': 'Service name must not exceed 100 characters',
  }),
  repository_url: Joi.string().uri().optional().messages({
    'string.uri': 'repository_url must be a valid URL',
  }),
  branch: Joi.string().max(100).optional().messages({
    'string.max': 'Branch name must not exceed 100 characters',
  }),
})
  .min(1)
  .messages({
    'object.min': 'At least one field must be provided for update',
  });

module.exports = { createServiceSchema, updateServiceSchema };