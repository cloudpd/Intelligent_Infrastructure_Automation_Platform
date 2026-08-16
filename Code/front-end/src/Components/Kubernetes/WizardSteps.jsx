import React from 'react';
import { CUSTOM_RESOURCE_TYPES, SA_PRESETS, VERBS, PRESET_DESCRIPTIONS, emptyEnvVar } from './k8sConstants';

// ---- Step 1 — Application -------------------------------------------------
export function StepApplication({ wizard, setField, service }) {
  const { application } = wizard;

  function updateEnvVar(index, patch) {
    const next = application.envVars.map((v, i) => (i === index ? { ...v, ...patch } : v));
    setField('application', 'envVars', next);
  }

  function addEnvVar() {
    setField('application', 'envVars', [...application.envVars, emptyEnvVar()]);
  }

  function removeEnvVar(index) {
    setField('application', 'envVars', application.envVars.filter((_, i) => i !== index));
  }

  return (
    <div className='k8s-step'>
      <h2 className='k8s-step__title'>Application</h2>
      <p className='k8s-step__hint'>
        Image, tag, and port come from your Docker build for <strong>{service?.name || 'this service'}</strong>.
      </p>

      <label className='k8s-field'>
        Application name
        <input
          type='text'
          value={application.name}
          onChange={(e) => setField('application', 'name', e.target.value)}
          placeholder='e.g. payment-service'
          required
        />
      </label>

      <div className='k8s-field-grid'>
        <label className='k8s-field'>
          Docker image (read only)
          <input type='text' value={application.dockerImage} readOnly disabled />
          {/* <input type='text' value={application.dockerImage} /> */}

        </label>
        <label className='k8s-field'>
          Image tag (read only)
          <input type='text' value={application.imageTag} readOnly disabled />
        </label>
        <label className='k8s-field'>
          Container port (read only)
          <input type='number' value={application.containerPort} readOnly disabled />
        </label>
      </div>

      <div className='k8s-subsection'>
        <div className='k8s-subsection__header'>
          <h3>Environment variables</h3>
          <button type='button' className='project-button project-button--ghost' onClick={addEnvVar}>
            + Add variable
          </button>
        </div>

        {application.envVars.length === 0 && (
          <p className='k8s-step__hint'>No environment variables yet — add one if this app needs config or secrets.</p>
        )}

        {application.envVars.map((envVar, index) => (
          <div className='k8s-envvar-row' key={index}>
            <input
              type='text'
              placeholder='KEY'
              value={envVar.key}
              onChange={(e) => updateEnvVar(index, { key: e.target.value })}
            />
            <input
              type='text'
              placeholder='value'
              value={envVar.value}
              onChange={(e) => updateEnvVar(index, { value: e.target.value })}
            />
            <select value={envVar.target} onChange={(e) => updateEnvVar(index, { target: e.target.value })}>
              <option value='ConfigMap'>ConfigMap</option>
              <option value='Secret'>Secret</option>
            </select>
            <button type='button' className='k8s-icon-button' onClick={() => removeEnvVar(index)} aria-label='Remove variable'>
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---- Step 2 — Workload ------------------------------------------------------
export function StepWorkload({ wizard, setField }) {
  const { workload } = wizard;
  return (
    <div className='k8s-step'>
      <h2 className='k8s-step__title'>Workload</h2>
      <p className='k8s-step__hint'>How should this application run?</p>

      <div className='k8s-field-grid'>
        <label className='k8s-field'>
          Namespace name
          <input
            type='text'
            value={workload.namespace}
            onChange={(e) => setField('workload', 'namespace', e.target.value)}
            placeholder='e.g. payments'
            required
          />
        </label>
        <label className='k8s-field'>
          Replicas
          <input
            type='number'
            min={1}
            value={workload.replicas}
            onChange={(e) => setField('workload', 'replicas', Number(e.target.value))}
          />
        </label>
      </div>

      <div className='k8s-radio-group'>
        {['Deployment', 'StatefulSet'].map((type) => (
          <label key={type} className={`k8s-radio-card ${workload.workloadType === type ? 'is-selected' : ''}`}>
            <input
              type='radio'
              name='workloadType'
              checked={workload.workloadType === type}
              onChange={() => setField('workload', 'workloadType', type)}
            />
            <span className='k8s-radio-card__title'>{type}</span>
            <span className='k8s-radio-card__hint'>
              {type === 'Deployment'
                ? 'Stateless app — any replica can be replaced freely.'
                : 'Stateful app — needs stable identity and storage per replica.'}
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}

// ---- Step 3 — Resources ------------------------------------------------------
export function StepResources({ wizard, setField, setNestedField }) {
  const { resources } = wizard;
  return (
    <div className='k8s-step'>
      <h2 className='k8s-step__title'>Resources</h2>
      <p className='k8s-step__hint'>How much CPU and memory does each replica need?</p>

      <div className='k8s-field-grid'>
        <label className='k8s-field'>
          CPU requests
          <input type='text' value={resources.cpuRequest} onChange={(e) => setField('resources', 'cpuRequest', e.target.value)} placeholder='100m' />
        </label>
        <label className='k8s-field'>
          Memory requests
          <input type='text' value={resources.memoryRequest} onChange={(e) => setField('resources', 'memoryRequest', e.target.value)} placeholder='128Mi' />
        </label>
        <label className='k8s-field'>
          CPU limits
          <input type='text' value={resources.cpuLimit} onChange={(e) => setField('resources', 'cpuLimit', e.target.value)} placeholder='250m' />
        </label>
        <label className='k8s-field'>
          Memory limits
          <input type='text' value={resources.memoryLimit} onChange={(e) => setField('resources', 'memoryLimit', e.target.value)} placeholder='256Mi' />
        </label>
      </div>

      <div className='k8s-subsection'>
        <h3>Namespace quota</h3>
        <p className='k8s-step__hint'>Caps the total resources everything in this namespace can use.</p>
        <div className='k8s-field-grid'>
          <label className='k8s-field'>
            Total CPU requests
            <input type='text' value={resources.namespaceQuota.cpuRequests} onChange={(e) => setNestedField('resources', 'namespaceQuota', 'cpuRequests', e.target.value)} />
          </label>
          <label className='k8s-field'>
            Total memory requests
            <input type='text' value={resources.namespaceQuota.memoryRequests} onChange={(e) => setNestedField('resources', 'namespaceQuota', 'memoryRequests', e.target.value)} />
          </label>
          <label className='k8s-field'>
            Total CPU limits
            <input type='text' value={resources.namespaceQuota.cpuLimits} onChange={(e) => setNestedField('resources', 'namespaceQuota', 'cpuLimits', e.target.value)} />
          </label>
          <label className='k8s-field'>
            Total memory limits
            <input type='text' value={resources.namespaceQuota.memoryLimits} onChange={(e) => setNestedField('resources', 'namespaceQuota', 'memoryLimits', e.target.value)} />
          </label>
          <label className='k8s-field'>
            Max pods
            <input type='number' min={1} value={resources.namespaceQuota.maxPods} onChange={(e) => setNestedField('resources', 'namespaceQuota', 'maxPods', Number(e.target.value))} />
          </label>
        </div>
      </div>
    </div>
  );
}

// ---- Step 4 — Storage ------------------------------------------------------
export function StepStorage({ wizard, setField }) {
  const { storage } = wizard;
  return (
    <div className='k8s-step'>
      <h2 className='k8s-step__title'>Storage</h2>
      <p className='k8s-step__hint'>Does this application require persistent storage?</p>

      <div className='k8s-toggle-group'>
        <button type='button' className={`k8s-toggle-btn ${!storage.enabled ? 'is-selected' : ''}`} onClick={() => setField('storage', 'enabled', false)}>
          No
        </button>
        <button type='button' className={`k8s-toggle-btn ${storage.enabled ? 'is-selected' : ''}`} onClick={() => setField('storage', 'enabled', true)}>
          Yes
        </button>
      </div>

      {storage.enabled && (
        <div className='k8s-field-grid'>
          <label className='k8s-field'>
            Storage size
            <input type='text' value={storage.size} onChange={(e) => setField('storage', 'size', e.target.value)} placeholder='5Gi' />
          </label>
          <label className='k8s-field'>
            Storage class
            <input type='text' value={storage.storageClass} onChange={(e) => setField('storage', 'storageClass', e.target.value)} placeholder='standard' />
          </label>
          <label className='k8s-field'>
            Mount path
            <input type='text' value={storage.mountPath} onChange={(e) => setField('storage', 'mountPath', e.target.value)} placeholder='/data' />
          </label>
        </div>
      )}
    </div>
  );
}

// ---- Step 5 — Service Account -----------------------------------------------
export function StepServiceAccount({ wizard, setField }) {
  const { serviceAccount } = wizard;

  function toggleCustomVerb(resource, verb) {
    const rules = serviceAccount.customRules || [];
    const existing = rules.find((r) => r.resource === resource);

    let nextRules;
    if (!existing) {
      nextRules = [...rules, { resource, verbs: [verb] }];
    } else {
      const hasVerb = existing.verbs.includes(verb);
      const nextVerbs = hasVerb ? existing.verbs.filter((v) => v !== verb) : [...existing.verbs, verb];
      nextRules = nextVerbs.length === 0
        ? rules.filter((r) => r.resource !== resource)
        : rules.map((r) => (r.resource === resource ? { ...r, verbs: nextVerbs } : r));
    }
    setField('serviceAccount', 'customRules', nextRules);
  }

  return (
    <div className='k8s-step'>
      <h2 className='k8s-step__title'>Service account</h2>
      <p className='k8s-step__hint'>Does this application require a custom service account?</p>

      <div className='k8s-toggle-group'>
        <button type='button' className={`k8s-toggle-btn ${!serviceAccount.enabled ? 'is-selected' : ''}`} onClick={() => setField('serviceAccount', 'enabled', false)}>
          No
        </button>
        <button type='button' className={`k8s-toggle-btn ${serviceAccount.enabled ? 'is-selected' : ''}`} onClick={() => setField('serviceAccount', 'enabled', true)}>
          Yes
        </button>
      </div>

      {serviceAccount.enabled && (
        <>
          <div className='k8s-radio-group'>
            {SA_PRESETS.map((preset) => (
              <label key={preset} className={`k8s-radio-card ${serviceAccount.preset === preset ? 'is-selected' : ''}`}>
                <input
                  type='radio'
                  name='saPreset'
                  checked={serviceAccount.preset === preset}
                  onChange={() => setField('serviceAccount', 'preset', preset)}
                />
                <span className='k8s-radio-card__title'>{preset}</span>
                <span className='k8s-radio-card__hint'>{PRESET_DESCRIPTIONS[preset]}</span>
              </label>
            ))}
          </div>

          {serviceAccount.preset === 'Custom' && (
            <div className='k8s-permission-table-wrap'>
              <p className='k8s-step__hint'>
                Pick exactly what this app can do — nothing else is granted (least privilege).
              </p>
              <table className='k8s-permission-table'>
                <thead>
                  <tr>
                    <th>Resource</th>
                    {VERBS.map((verb) => (
                      <th key={verb}>{verb}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {CUSTOM_RESOURCE_TYPES.map((resource) => {
                    const rule = serviceAccount.customRules.find((r) => r.resource === resource);
                    return (
                      <tr key={resource}>
                        <td>{resource}</td>
                        {VERBS.map((verb) => (
                          <td key={verb}>
                            <input
                              type='checkbox'
                              checked={!!rule?.verbs.includes(verb)}
                              onChange={() => toggleCustomVerb(resource, verb)}
                            />
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ---- Step 6 — Networking ------------------------------------------------------
export function StepNetworking({ wizard, setField }) {
  const { networking } = wizard;
  return (
    <div className='k8s-step'>
      <h2 className='k8s-step__title'>Networking</h2>
      <p className='k8s-step__hint'>How should this application be exposed?</p>

      <div className='k8s-radio-group'>
        <label className={`k8s-radio-card ${networking.exposure === 'Internal' ? 'is-selected' : ''}`}>
          <input type='radio' name='exposure' checked={networking.exposure === 'Internal'} onChange={() => setField('networking', 'exposure', 'Internal')} />
          <span className='k8s-radio-card__title'>Internal only</span>
          <span className='k8s-radio-card__hint'>Reachable only from inside the cluster.</span>
        </label>
        <label className={`k8s-radio-card ${networking.exposure === 'Public' ? 'is-selected' : ''}`}>
          <input type='radio' name='exposure' checked={networking.exposure === 'Public'} onChange={() => setField('networking', 'exposure', 'Public')} />
          <span className='k8s-radio-card__title'>Public</span>
          <span className='k8s-radio-card__hint'>Reachable from the internet through an Ingress.</span>
        </label>
      </div>

      {networking.exposure === 'Public' && (
        <div className='k8s-field-grid'>
          <label className='k8s-field'>
            Host
            <input type='text' value={networking.host} onChange={(e) => setField('networking', 'host', e.target.value)} placeholder='app.example.com' />
          </label>
          <label className='k8s-field'>
            Path
            <input type='text' value={networking.path} onChange={(e) => setField('networking', 'path', e.target.value)} placeholder='/' />
          </label>
          <label className='k8s-field'>
            Ingress class
            <input type='text' value={networking.ingressClass} onChange={(e) => setField('networking', 'ingressClass', e.target.value)} placeholder='nginx' />
          </label>
          <label className='k8s-field k8s-field--checkbox'>
            <input type='checkbox' checked={networking.tlsEnabled} onChange={(e) => setField('networking', 'tlsEnabled', e.target.checked)} />
            TLS enabled
          </label>
        </div>
      )}
    </div>
  );
}

// ---- Step 7 — Health Checks ------------------------------------------------------
export function StepHealthChecks({ wizard, setField }) {
  const { healthChecks } = wizard;
  return (
    <div className='k8s-step'>
      <h2 className='k8s-step__title'>Health checks</h2>
      <p className='k8s-step__hint'>Enable health probes so Kubernetes knows if this app is alive and ready.</p>

      <div className='k8s-toggle-group'>
        <button type='button' className={`k8s-toggle-btn ${!healthChecks.enabled ? 'is-selected' : ''}`} onClick={() => setField('healthChecks', 'enabled', false)}>
          No
        </button>
        <button type='button' className={`k8s-toggle-btn ${healthChecks.enabled ? 'is-selected' : ''}`} onClick={() => setField('healthChecks', 'enabled', true)}>
          Yes
        </button>
      </div>

      {healthChecks.enabled && (
        <label className='k8s-field'>
          Health endpoint
          <input type='text' value={healthChecks.endpoint} onChange={(e) => setField('healthChecks', 'endpoint', e.target.value)} placeholder='/health' />
        </label>
      )}
    </div>
  );
}

// ---- Step 8 — Autoscaling ------------------------------------------------------
export function StepAutoscaling({ wizard, setField }) {
  const { autoscaling } = wizard;
  return (
    <div className='k8s-step'>
      <h2 className='k8s-step__title'>Autoscaling</h2>
      <p className='k8s-step__hint'>Enable Horizontal Pod Autoscaler?</p>

      <div className='k8s-toggle-group'>
        <button type='button' className={`k8s-toggle-btn ${!autoscaling.enabled ? 'is-selected' : ''}`} onClick={() => setField('autoscaling', 'enabled', false)}>
          No
        </button>
        <button type='button' className={`k8s-toggle-btn ${autoscaling.enabled ? 'is-selected' : ''}`} onClick={() => setField('autoscaling', 'enabled', true)}>
          Yes
        </button>
      </div>

      {autoscaling.enabled && (
        <div className='k8s-field-grid'>
          <label className='k8s-field'>
            Minimum replicas
            <input type='number' min={1} value={autoscaling.minReplicas} onChange={(e) => setField('autoscaling', 'minReplicas', Number(e.target.value))} />
          </label>
          <label className='k8s-field'>
            Maximum replicas
            <input type='number' min={1} value={autoscaling.maxReplicas} onChange={(e) => setField('autoscaling', 'maxReplicas', Number(e.target.value))} />
          </label>
          <label className='k8s-field'>
            Target CPU %
            <input type='number' min={1} max={100} value={autoscaling.targetCPU} onChange={(e) => setField('autoscaling', 'targetCPU', Number(e.target.value))} />
          </label>
          <label className='k8s-field'>
            Target memory %
            <input type='number' min={1} max={100} value={autoscaling.targetMemory} onChange={(e) => setField('autoscaling', 'targetMemory', Number(e.target.value))} />
          </label>
        </div>
      )}
    </div>
  );
}
