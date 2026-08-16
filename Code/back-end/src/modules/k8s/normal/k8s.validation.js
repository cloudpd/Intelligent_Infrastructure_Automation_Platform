const Joi = require('joi');
const AppError = require('../../../core/utils/AppError.js');
const { Service } = require('../../service/service.model');
const { Project } = require('../../projects/projects.model');
const { CUSTOM_RESOURCE_TYPES, SA_PRESETS } = require('./k8s.RBAC-Builder');

// ---- Step 1 — Application ----------------------------------------------
const envVarSchema = Joi.object({
  key: Joi.string()
    .pattern(/^[A-Za-z_][A-Za-z0-9_]*$/)
    .required()
    .messages({
      'string.pattern.base': 'Environment variable keys must be valid env var names',
    }),
  value: Joi.string().allow('').required(),
  target: Joi.string().valid('ConfigMap', 'Secret').required().messages({
    'any.only': 'Environment variable target must be "ConfigMap" or "Secret"',
  }),
});

const applicationSchema = Joi.object({
  name: Joi.string().min(2).max(63).required(),
  dockerImage: Joi.string().min(1).required().messages({
    'string.empty': 'Docker image is required',
  }),
  imageTag: Joi.string().min(1).required().messages({
    'string.empty': 'Image tag is required',
  }),
  containerPort: Joi.number().integer().min(1).max(65535).required(),
  envVars: Joi.array().items(envVarSchema).default([]),
}).required();

// ---- Step 2 — Workload ---------------------------------------------------
const workloadSchema = Joi.object({
  namespace: Joi.string()
    .pattern(/^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/)
    .max(63)
    .required()
    .messages({
      'string.pattern.base':
        'Namespace must be a valid DNS-1123 label (lowercase letters, digits, hyphens)',
    }),
  workloadType: Joi.string().valid('Deployment', 'StatefulSet').required(),
  replicas: Joi.number().integer().min(1).max(100).required(),
}).required();

// ---- Step 3 — Resources ---------------------------------------------------
const namespaceQuotaSchema = Joi.object({
  cpuRequests: Joi.string().required(),
  memoryRequests: Joi.string().required(),
  cpuLimits: Joi.string().required(),
  memoryLimits: Joi.string().required(),
  maxPods: Joi.number().integer().min(1).optional(),
});

const resourcesSchema = Joi.object({
  cpuRequest: Joi.string().required(),
  memoryRequest: Joi.string().required(),
  cpuLimit: Joi.string().required(),
  memoryLimit: Joi.string().required(),
  namespaceQuota: namespaceQuotaSchema.required(),
}).required();

// ---- Step 4 — Storage ------------------------------------------------------
const storageSchema = Joi.object({
  enabled: Joi.boolean().required(),
  size: Joi.when('enabled', { is: true, then: Joi.string().required(), otherwise: Joi.optional().allow(null) }),
  storageClass: Joi.when('enabled', { is: true, then: Joi.string().required(), otherwise: Joi.optional().allow(null) }),
  mountPath: Joi.when('enabled', { is: true, then: Joi.string().required(), otherwise: Joi.optional().allow(null) }),
}).default({ enabled: false });

// ---- Step 5 — Service Account ----------------------------------------------
const customRuleSchema = Joi.object({
  resource: Joi.string()
    .valid(...CUSTOM_RESOURCE_TYPES)
    .required(),
  verbs: Joi.array()
    .items(Joi.string().valid('get', 'list', 'watch', 'create', 'update', 'patch', 'delete'))
    .min(1)
    .required(),
});

const serviceAccountSchema = Joi.object({
  enabled: Joi.boolean().required(),
  preset: Joi.when('enabled', {
    is: true,
    then: Joi.string()
      .valid(...SA_PRESETS, 'Custom')
      .required(),
    otherwise: Joi.optional().allow(null),
  }),
  customRules: Joi.when('preset', {
    is: 'Custom',
    then: Joi.array().items(customRuleSchema).min(1).required(),
    otherwise: Joi.optional().allow(null),
  }),
}).default({ enabled: false });

// ---- Step 6 — Networking ----------------------------------------------------
const networkingSchema = Joi.object({
  exposure: Joi.string().valid('Internal', 'Public').required(),
  host: Joi.when('exposure', { is: 'Public', then: Joi.string().required(), otherwise: Joi.optional().allow(null, '') }),
  path: Joi.when('exposure', { is: 'Public', then: Joi.string().default('/'), otherwise: Joi.optional().allow(null, '') }),
  ingressClass: Joi.when('exposure', { is: 'Public', then: Joi.string().required(), otherwise: Joi.optional().allow(null, '') }),
  tlsEnabled: Joi.when('exposure', { is: 'Public', then: Joi.boolean().default(false), otherwise: Joi.optional() }),
}).required();

// ---- Step 7 — Health Checks --------------------------------------------------
const healthChecksSchema = Joi.object({
  enabled: Joi.boolean().required(),
  endpoint: Joi.when('enabled', { is: true, then: Joi.string().required(), otherwise: Joi.optional().allow(null, '') }),
}).default({ enabled: false });

// ---- Step 8 — Autoscaling -----------------------------------------------------
const autoscalingSchema = Joi.object({
  enabled: Joi.boolean().required(),
  minReplicas: Joi.when('enabled', { is: true, then: Joi.number().integer().min(1).required(), otherwise: Joi.optional() }),
  maxReplicas: Joi.when('enabled', {
    is: true,
    then: Joi.number().integer().min(Joi.ref('minReplicas')).required(),
    otherwise: Joi.optional(),
  }),
  targetCPU: Joi.when('enabled', { is: true, then: Joi.number().integer().min(1).max(100).required(), otherwise: Joi.optional() }),
  targetMemory: Joi.number().integer().min(1).max(100).optional(),
}).default({ enabled: false });

// ---- Full wizard payload -------------------------------------------------------
const generateK8sSchema = Joi.object({
  application: applicationSchema,
  workload: workloadSchema,
  resources: resourcesSchema,
  storage: storageSchema,
  serviceAccount: serviceAccountSchema,
  networking: networkingSchema,
  healthChecks: healthChecksSchema,
  autoscaling: autoscalingSchema,
  // when true, render manifests and return them without touching Git
  dryRun: Joi.boolean().default(false),
}).unknown(false);

function validateGenerateK8sPayload(payload) {
  const { error, value } = generateK8sSchema.validate(payload, {
    abortEarly: true,
    stripUnknown: true,
  });
  if (error) {
    throw new AppError(error.details[0].message, 400);
  }
  return value;
}

/**
 * Ownership + repo resolution — mirrors ci.validation.js#validateRepository
 */
async function validateServiceOwnership(userId, serviceId) {
  const service = await Service.findByPk(serviceId, {
    include: [{ model: Project, as: 'project', attributes: ['id', 'owner_id'] }],
  });

  if (!service) {
    throw new AppError('Service not found', 404);
  }
  if (service.project.owner_id !== userId) {
    throw new AppError('You do not have permission to access this service', 403);
  }
  return service;
}

module.exports = {
  generateK8sSchema,
  validateGenerateK8sPayload,
  validateServiceOwnership,
};
