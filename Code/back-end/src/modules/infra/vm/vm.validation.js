const Joi = require('joi');

const AWS_REGION_PATTERN = /^[a-z]{2}-[a-z]+-[0-9]$/;

// Whitelist, not free text — keeps this reliably inside AWS's free tier.
const ALLOWED_INSTANCE_TYPES = ['t2.micro', 't3.micro'];

const createVmSchema = Joi.object({
  name: Joi.string().min(2).max(64).pattern(/^[a-z][a-z0-9-]*$/).required().messages({
    'string.pattern.base': 'Name must be lowercase, start with a letter, and use only letters, numbers, and hyphens',
  }),
  region: Joi.string().pattern(AWS_REGION_PATTERN).required(),
  instance_type: Joi.string().valid(...ALLOWED_INSTANCE_TYPES).default('t3.micro').messages({
    'any.only': `Instance type must be one of: ${ALLOWED_INSTANCE_TYPES.join(', ')}`,
  }),
  kind_cluster_name: Joi.string().min(2).max(32).pattern(/^[a-z][a-z0-9-]*$/).default('kind'),
  container_port: Joi.number().integer().min(1).max(65535).default(3000),
  host_port: Joi.number().integer().min(1).max(65535).default(80),
  allow_ssh: Joi.boolean().default(false),
});

const updateVmSchema = Joi.object({
  name: Joi.string().min(2).max(64).pattern(/^[a-z][a-z0-9-]*$/),
  instance_type: Joi.string().valid(...ALLOWED_INSTANCE_TYPES),
  container_port: Joi.number().integer().min(1).max(65535),
  host_port: Joi.number().integer().min(1).max(65535),
  allow_ssh: Joi.boolean(),
  // region and kind_cluster_name are not updatable after creation —
  // same philosophy as Network's region/cidr being locked post-create.
});

module.exports = { createVmSchema, updateVmSchema, ALLOWED_INSTANCE_TYPES };