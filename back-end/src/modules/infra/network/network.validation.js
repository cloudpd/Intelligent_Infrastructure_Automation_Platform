const Joi = require('joi');

const CIDR_PATTERN = /^([0-9]{1,3}\.){3}[0-9]{1,3}\/([0-9]|[1-2][0-9]|3[0-2])$/;
const AWS_REGION_PATTERN = /^[a-z]{2}-[a-z]+-[0-9]$/;

/**
 * Only three real inputs now. Everything else (AZ, subnets, IGW, NAT, DNS)
 * is fixed policy applied inside the Terraform module itself.
 */
const createVpcSchema = Joi.object({
  name: Joi.string().min(2).max(64).pattern(/^[a-z][a-z0-9-]*$/).required(),
  region: Joi.string().pattern(AWS_REGION_PATTERN).required(),
  cidr: Joi.string().pattern(CIDR_PATTERN).required().messages({
    'string.pattern.base': 'Must be a valid CIDR block, e.g. 10.0.0.0/16',
  }),
});

const updateVpcSchema = Joi.object({
  name: Joi.string().min(2).max(64).pattern(/^[a-z][a-z0-9-]*$/).required(),
  // region and cidr are not updatable after creation.
});

module.exports = { createVpcSchema, updateVpcSchema };
