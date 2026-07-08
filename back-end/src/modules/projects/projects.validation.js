const Joi = require('joi');


const createProjectSchema = Joi.object({
  name: Joi.string().min(3).max(100).required().messages({
    'string.min': 'Project name must be at least 3 characters long',
    'string.max': 'Project name must not exceed 100 characters',
    'string.empty': 'Project name is required',
  }),
  description: Joi.string().max(1000).optional().messages({
    'string.max': 'Description must not exceed 1000 characters',
  }),
});


const updateProjectSchema = Joi.object({
  name: Joi.string().min(3).max(100).optional().messages({
    'string.min': 'Project name must be at least 3 characters long',
    'string.max': 'Project name must not exceed 100 characters',
  }),
  description: Joi.string().max(1000).optional().messages({
    'string.max': 'Description must not exceed 1000 characters',
  }),
})
  .min(1)
  .messages({
    'object.min': 'At least one field must be provided for update',
  });

module.exports = { createProjectSchema, updateProjectSchema };
