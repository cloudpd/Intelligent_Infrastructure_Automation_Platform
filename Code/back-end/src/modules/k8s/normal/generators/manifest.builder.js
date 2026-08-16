const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const { registerHelpers } = require('../hbs.helpers');
const { buildPolicyRules } = require('../k8s.RBAC-Builder');

const Handlebars = registerHelpers();
const TEMPLATES_DIR = path.join(__dirname, '..', 'templates');

const compiledCache = new Map();

function compileTemplate(name) {
  if (compiledCache.has(name)) return compiledCache.get(name);
  const filePath = path.join(TEMPLATES_DIR, `${name}.hbs`);
  const source = fs.readFileSync(filePath, 'utf-8');
  const template = Handlebars.compile(source, { noEscape: true });
  compiledCache.set(name, template);
  return template;
}

function render(name, context) {
  const template = compileTemplate(name);
  // Every manifest goes through its own .hbs template — never built by
  // string concatenation. We additionally round-trip through js-yaml to
  // fail fast on any template that produced invalid YAML.
  const output = template(context);
  yaml.load(output); // throws if malformed
  return output;
}

/**
 * Builds the full set of manifests for one wizard submission.
 * @param {object} wizard - validated wizard payload (see k8s.validation.js)
 * @returns {Array<{ file: string, content: string }>}
 */
function buildManifests(wizard) {
  const { application, workload, resources, storage, serviceAccount, networking, healthChecks, autoscaling } = wizard;

  const appName = application.name;
  const namespace = workload.namespace;
  const image = `${application.dockerImage}:${application.imageTag}`;

  const configMapVars = application.envVars.filter((v) => v.target === 'ConfigMap');
  const secretVars = application.envVars.filter((v) => v.target === 'Secret');
  const hasConfigMap = configMapVars.length > 0;
  const hasSecret = secretVars.length > 0;

  const files = [];

  // Always generated -----------------------------------------------------
  files.push({ file: 'k8s/namespace.yaml', content: render('namespace', { namespace, appName }) });

  const workloadContext = {
    appName,
    namespace,
    replicas: workload.replicas,
    image,
    containerPort: application.containerPort,
    hasConfigMap,
    hasSecret,
    resources: {
      cpuRequest: resources.cpuRequest,
      memoryRequest: resources.memoryRequest,
      cpuLimit: resources.cpuLimit,
      memoryLimit: resources.memoryLimit,
    },
    healthChecks: healthChecks?.enabled ? healthChecks : { enabled: false },
    volume: storage?.enabled
      ? { enabled: true, mountPath: storage.mountPath }
      : { enabled: false },
    serviceAccountName: serviceAccount?.enabled ? `${appName}-sa` : null,
  };

  if (workload.workloadType === 'StatefulSet') {
    files.push({ file: 'k8s/statefulset.yaml', content: render('statefulset', workloadContext) });
  } else {
    files.push({ file: 'k8s/deployment.yaml', content: render('deployment', workloadContext) });
  }

  files.push({
    file: 'k8s/service.yaml',
    content: render('service', { appName, namespace, containerPort: application.containerPort }),
  });

  files.push({
    file: 'k8s/limitrange.yaml',
    content: render('limitrange', {
      appName,
      namespace,
      cpuRequest: resources.cpuRequest,
      memoryRequest: resources.memoryRequest,
      cpuLimit: resources.cpuLimit,
      memoryLimit: resources.memoryLimit,
    }),
  });

  files.push({
    file: 'k8s/resourcequota.yaml',
    content: render('resourcequota', {
      appName,
      namespace,
      quota: {
        cpuRequests: resources.namespaceQuota.cpuRequests,
        memoryRequests: resources.namespaceQuota.memoryRequests,
        cpuLimits: resources.namespaceQuota.cpuLimits,
        memoryLimits: resources.namespaceQuota.memoryLimits,
        maxPods: resources.namespaceQuota.maxPods,
      },
    }),
  });

  // Conditional ------------------------------------------------------------
  if (hasConfigMap) {
    const data = Object.fromEntries(configMapVars.map((v) => [v.key, v.value]));
    files.push({ file: 'k8s/configmap.yaml', content: render('configmap', { appName, namespace, data }) });
  }

  if (hasSecret) {
    const data = Object.fromEntries(secretVars.map((v) => [v.key, v.value]));
    files.push({ file: 'k8s/secret.yaml', content: render('secret', { appName, namespace, data }) });
  }

  if (storage?.enabled) {
    files.push({
      file: 'k8s/pvc.yaml',
      content: render('pvc', { appName, namespace, size: storage.size, storageClass: storage.storageClass }),
    });
  }

  if (networking.exposure === 'Public') {
    files.push({
      file: 'k8s/ingress.yaml',
      content: render('ingress', {
        appName,
        namespace,
        host: networking.host,
        path: networking.path || '/',
        ingressClass: networking.ingressClass,
        tlsEnabled: !!networking.tlsEnabled,
        containerPort: application.containerPort,
      }),
    });
  }

  if (serviceAccount?.enabled) {
    files.push({ file: 'k8s/serviceaccount.yaml', content: render('serviceaccount', { appName, namespace }) });

    const rules = buildPolicyRules(serviceAccount);
    files.push({ file: 'k8s/role.yaml', content: render('role', { appName, namespace, rules }) });
    files.push({ file: 'k8s/rolebinding.yaml', content: render('rolebinding', { appName, namespace }) });
  }

  if (autoscaling?.enabled) {
    files.push({
      file: 'k8s/hpa.yaml',
      content: render('hpa', {
        appName,
        namespace,
        workloadType: workload.workloadType,
        minReplicas: autoscaling.minReplicas,
        maxReplicas: autoscaling.maxReplicas,
        targetCPU: autoscaling.targetCPU,
        targetMemory: autoscaling.targetMemory,
      }),
    });
  }

  return files;
}

module.exports = { buildManifests };
