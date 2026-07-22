const Joi = require('joi');

const CIDR_PATTERN = /^([0-9]{1,3}\.){3}[0-9]{1,3}\/([0-9]|[1-2][0-9]|3[0-2])$/;
const AWS_REGION_PATTERN = /^[a-z]{2}-[a-z]+-[0-9]$/;

const cidr = Joi.string().pattern(CIDR_PATTERN).messages({
  'string.pattern.base': 'Must be a valid CIDR block, e.g. 10.0.1.0/24',
});

const subnetGroupSchema = Joi.object({
  enabled: Joi.boolean().required(),
  count: Joi.number().integer().min(0).max(10).required(),
  // Optional: if omitted, the backend auto-generates CIDRs from the VPC block.
  // If provided, length must match `count` exactly.
  cidrs: Joi.array().items(cidr),
}).custom((value, helpers) => {
  if (value.cidrs && value.cidrs.length !== value.count) {
    return helpers.message('"cidrs" length must match "count"');
  }
  if (value.enabled && value.count < 1) {
    return helpers.message('"count" must be at least 1 when enabled is true');
  }
  return value;
});

const createVpcSchema = Joi.object({
  name: Joi.string().min(2).max(64).pattern(/^[a-z][a-z0-9-]*$/).required(),
  description: Joi.string().max(500).allow('', null),
  region: Joi.string().pattern(AWS_REGION_PATTERN).required(),
  cidr: cidr.required(),
  publicSubnets: subnetGroupSchema.required(),
  privateSubnets: subnetGroupSchema.required(),
  natGateway: Joi.string().valid('single', 'one_per_az', 'none').required(),
  internetGateway: Joi.boolean().required(),
  enableDnsSupport: Joi.boolean().default(true),
  enableDnsHostnames: Joi.boolean().default(true),
}).custom((value, helpers) => {
  // NAT gateways live in public subnets — can't request NAT without public subnets enabled
  if (value.natGateway !== 'none' && !value.publicSubnets.enabled) {
    return helpers.message('natGateway requires publicSubnets.enabled to be true');
  }
  return value;
});

const updateVpcSchema = Joi.object({
  name: Joi.string().min(2).max(64).pattern(/^[a-z][a-z0-9-]*$/),
  description: Joi.string().max(500).allow('', null),
  natGateway: Joi.string().valid('single', 'one_per_az', 'none'),
  internetGateway: Joi.boolean(),
  enableDnsSupport: Joi.boolean(),
  enableDnsHostnames: Joi.boolean(),
  // region, cidr, and subnet groups are NOT updatable after creation —
  // changing them means a new VPC, same rule as before.
}).min(1);

module.exports = { createVpcSchema, updateVpcSchema };