/**
 * k8s.roleBuilder.js
 *
 * Turns a Step 5 "Service Account" wizard answer into a list of RBAC
 * policyRules for the Role template, always following least privilege:
 * only the resources/verbs the preset (or the user's custom picks)
 * actually named are granted — nothing implicit, nothing cluster-wide.
 */

// Maps a wizard-facing resource name to its Kubernetes apiGroup.
// "" means the core API group.
const RESOURCE_API_GROUPS = {
  pods: '',
  services: '',
  configmaps: '',
  secrets: '',
  persistentvolumeclaims: '',
  namespaces: '',
  deployments: 'apps',
  ingresses: 'networking.k8s.io',
  jobs: 'batch',
  cronjobs: 'batch',
};

const CUSTOM_RESOURCE_TYPES = Object.keys(RESOURCE_API_GROUPS);

// 3 profile presets: Default, ReadOnly, Developer
const ALL_VERBS = ['get', 'list', 'watch', 'create', 'update', 'patch', 'delete'];
const READ_VERBS = ['get', 'list', 'watch'];
const DEVELOPER_VERBS = ['get', 'list', 'watch', 'create', 'update', 'patch'];

// Fixed, least-privilege presets. Each maps resource -> verbs.
const PRESETS = {
  Default: {
    pods: READ_VERBS,
    services: READ_VERBS,
    configmaps: READ_VERBS,
  },
  ReadOnly: CUSTOM_RESOURCE_TYPES.reduce((acc, resource) => {
    acc[resource] = READ_VERBS;
    return acc;
  }, {}),
  Developer: {
    pods: DEVELOPER_VERBS,
    deployments: DEVELOPER_VERBS,
    services: DEVELOPER_VERBS,
    configmaps: DEVELOPER_VERBS,
    secrets: DEVELOPER_VERBS,
    persistentvolumeclaims: DEVELOPER_VERBS,
    jobs: DEVELOPER_VERBS,
    cronjobs: DEVELOPER_VERBS,
  },
};

const SA_PRESETS = Object.keys(PRESETS);

/**
 * Groups a { resource: verbs[] } map into RBAC policyRules, grouped by
 * apiGroup so resources sharing a group are combined into one rule
 * (mirrors how kubectl / real-world Roles are written).
 */
function toPolicyRules(resourceVerbMap) {
  const byGroup = {};

  for (const [resource, verbs] of Object.entries(resourceVerbMap)) {
    const apiGroup = RESOURCE_API_GROUPS[resource];
    if (apiGroup === undefined) continue; // unknown resource, skip defensively
    const key = apiGroup;
    if (!byGroup[key]) byGroup[key] = {};
    // Same resource could theoretically appear twice — union verbs.
    const existing = byGroup[key][resource] || [];
    byGroup[key][resource] = Array.from(new Set([...existing, ...verbs]));
  }

  const rules = [];
  for (const [apiGroup, resources] of Object.entries(byGroup)) {
    const resourceNames = Object.keys(resources);
    // Verbs can differ per resource within the same group, so only merge
    // resources into one rule when they share the exact same verb set.
    const verbBuckets = {};
    for (const [resource, verbs] of Object.entries(resources)) {
      const bucketKey = [...verbs].sort().join(',');
      if (!verbBuckets[bucketKey]) verbBuckets[bucketKey] = { verbs, resources: [] };
      verbBuckets[bucketKey].resources.push(resource);
    }
    for (const bucket of Object.values(verbBuckets)) {
      rules.push({
        apiGroups: [apiGroup],
        resources: bucket.resources,
        verbs: bucket.verbs,
      });
    }
    void resourceNames; // kept for readability of intent above
  }
  return rules;
}



function buildPolicyRules(serviceAccountConfig) {
  const { preset, customRules } = serviceAccountConfig;

  if (preset === 'Custom') {
    const map = {};
    for (const rule of customRules || []) {
      if (!CUSTOM_RESOURCE_TYPES.includes(rule.resource)) continue;
      // Never grant more than the fixed verb list, even if the caller
      // somehow sends more — least privilege is enforced here, not just
      // trusted from the client.
      const safeVerbs = (rule.verbs || []).filter((v) => ALL_VERBS.includes(v));
      map[rule.resource] = Array.from(new Set([...(map[rule.resource] || []), ...safeVerbs]));
    }
    return toPolicyRules(map);
  }

  const presetMap = PRESETS[preset];
  if (!presetMap) {
    throw new Error(`Unknown service account preset: ${preset}`);
  }
  return toPolicyRules(presetMap);
}

module.exports = {
  buildPolicyRules,
  CUSTOM_RESOURCE_TYPES,
  SA_PRESETS,
  RESOURCE_API_GROUPS,
};
