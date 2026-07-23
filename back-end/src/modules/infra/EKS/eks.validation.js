const Joi = require('joi');

const AWS_REGION_PATTERN = /^[a-z]{2}-[a-z]+-[0-9]$/;
const CLUSTER_NAME_PATTERN = /^[a-z][a-z0-9-]*$/;

const nodeGroupSchema = Joi.object({
  instanceTypes: Joi.array().items(Joi.string()).min(1).required(),
  capacityType: Joi.string().valid('ON_DEMAND', 'SPOT').required(),
  desiredSize: Joi.number().integer().min(0).required(),
  minSize: Joi.number().integer().min(0).required(),
  maxSize: Joi.number().integer().min(1).required(),
  diskSize: Joi.number().integer().min(8).required(),
}).custom((value, helpers) => {
  if (value.minSize > value.desiredSize || value.desiredSize > value.maxSize) {
    return helpers.message('nodeGroups: minSize <= desiredSize <= maxSize must hold');
  }
  return value;
});

// Map of node-group-name -> nodeGroupSchema, at least one entry required.
const nodeGroupsSchema = Joi.object()
  .pattern(Joi.string().pattern(/^[a-z][a-z0-9_-]*$/), nodeGroupSchema)
  .min(1)
  .required();

const clusterAdminSchema = Joi.object({
  userName: Joi.string().min(1).max(64).required(),
  userAccountId: Joi.string().pattern(/^[0-9]{12}$/).required(),
});

const createEksClusterSchema = Joi.object({
  clusterName: Joi.string().min(2).max(64).pattern(CLUSTER_NAME_PATTERN).required(),
  clusterVersion: Joi.string().max(16).required(),
  region: Joi.string().pattern(AWS_REGION_PATTERN).required(),
  nodeGroups: nodeGroupsSchema,
  clusterAdmins: Joi.array().items(clusterAdminSchema).min(1).required(),
  grafanaAdminPassword: Joi.string().min(8).max(128).required(),
  enableEbsCsi: Joi.boolean().default(true),
  enableAlbController: Joi.boolean().default(true),
  enableExternalDns: Joi.boolean().default(true),
  enableExternalSecrets: Joi.boolean().default(true),
});

const updateEksClusterSchema = Joi.object({
  clusterVersion: Joi.string().max(16),
  nodeGroups: nodeGroupsSchema,
  clusterAdmins: Joi.array().items(clusterAdminSchema).min(1),
  grafanaAdminPassword: Joi.string().min(8).max(128),
  enableEbsCsi: Joi.boolean(),
  enableAlbController: Joi.boolean(),
  enableExternalDns: Joi.boolean(),
  enableExternalSecrets: Joi.boolean(),
  // clusterName and region are NOT updatable after creation — same rule as
  // Network's vpc_cidr/region: changing them means a new cluster.
}).min(1);

module.exports = { createEksClusterSchema, updateEksClusterSchema };
