export const WORKLOAD_TYPES = ['Deployment', 'StatefulSet'];

export const SA_PRESETS = ['Default', 'ReadOnly', 'Developer', 'Custom'];

export const CUSTOM_RESOURCE_TYPES = [
  'pods',
  'deployments',
  'services',
  'secrets',
  'configmaps',
  'persistentvolumeclaims',
  'namespaces',
  'ingresses',
  'jobs',
  'cronjobs',
];

export const VERBS = ['get', 'list', 'watch', 'create', 'update', 'patch', 'delete'];

export const PRESET_DESCRIPTIONS = {
  Default: 'Read-only access to pods, services, and configmaps.',
  ReadOnly: 'Read-only access (get/list/watch) across all common resource types.',
  Developer: 'Read + write (no delete) on pods, deployments, services, configmaps, secrets, PVCs, jobs, and cronjobs.',
  Custom: 'Pick exactly which resources and verbs this service account can use.',
};

export const emptyEnvVar = () => ({ key: '', value: '', target: 'ConfigMap' });

export const initialWizardState = (appDefaults = {}) => ({
  application: {
    name: appDefaults.name || '',
    dockerImage: appDefaults.dockerImage || 'nginx',
    imageTag: appDefaults.imageTag || 'latest',
    containerPort: appDefaults.containerPort || 8080,
    envVars: [],
  },
  workload: {
    namespace: appDefaults.name ? appDefaults.name : '',
    workloadType: 'Deployment',
    replicas: 1,
  },
  resources: {
    cpuRequest: '100m',
    memoryRequest: '128Mi',
    cpuLimit: '250m',
    memoryLimit: '256Mi',
    namespaceQuota: {
      cpuRequests: '1',
      memoryRequests: '1Gi',
      cpuLimits: '2',
      memoryLimits: '2Gi',
      maxPods: 20,
    },
  },
  storage: {
    enabled: false,
    size: '1Gi',
    storageClass: 'standard',
    mountPath: '/data',
  },
  serviceAccount: {
    enabled: false,
    preset: 'Default',
    customRules: [],
  },
  networking: {
    exposure: 'Internal',
    host: '',
    path: '/',
    ingressClass: 'nginx',
    tlsEnabled: false,
  },
  healthChecks: {
    enabled: false,
    endpoint: '/health',
  },
  autoscaling: {
    enabled: false,
    minReplicas: 2,
    maxReplicas: 5,
    targetCPU: 70,
    targetMemory: 80,
  },
});
