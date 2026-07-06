const Joi = require('joi');

// Validates the raw request body BEFORE it reaches the service/DB.
// Not the same as the Sequelize model's own validation — this is the
// first line of defense, catching bad input early with clear messages.
const signupSchema = Joi.object({
  name: Joi.string().min(3).max(50).required().messages({
    'string.min': 'Name must be at least 3 characters long',
    'string.max': 'Name must not exceed 50 characters',
    'string.empty': 'Name is required',
  }),
  email: Joi.string().email().required().messages({
    'string.email': 'Invalid email address',
    'string.empty': 'Email is required',
  }),
  password: Joi.string()
    .trim()
    .min(8)
    .max(16)
    .required()
    .pattern(/^(?=.*[0-9])(?=.*[a-z])(?=.*[A-Z]).*$/)
    .messages({
      'string.empty': 'Password is required',
      'string.min': 'Password must be at least 8 characters',
      'string.max': 'Password must not exceed 16 characters',
      'string.pattern.base':
        'Password must contain at least one uppercase letter, one lowercase letter, and one number',
    }),
  role: Joi.string().valid('user', 'admin').default('user').messages({
    'any.only': 'Role must be either "user" or "admin"',
  }),
});

const loginSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Invalid email address',
    'string.empty': 'Email is required',
  }),
  password: Joi.string().required().messages({
    'string.empty': 'Password is required',
  }),
});

module.exports = { signupSchema, loginSchema };