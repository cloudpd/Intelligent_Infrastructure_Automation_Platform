import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import './KubernetesWizard.css';
import '../Projects/Projects.css';
import { initialWizardState } from './k8sConstants';
import WizardSummary from './WizardSummary';
import {
  StepApplication,
  StepWorkload,
  StepResources,
  StepStorage,
  StepServiceAccount,
  StepNetworking,
  StepHealthChecks,
  StepAutoscaling,
} from './WizardSteps';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const STEPS = [
  { key: 'application', title: 'Application', Component: StepApplication },
  { key: 'workload', title: 'Workload', Component: StepWorkload },
  { key: 'resources', title: 'Resources', Component: StepResources },
  { key: 'storage', title: 'Storage', Component: StepStorage },
  { key: 'serviceAccount', title: 'Service Account', Component: StepServiceAccount },
  { key: 'networking', title: 'Networking', Component: StepNetworking },
  { key: 'healthChecks', title: 'Health Checks', Component: StepHealthChecks },
  { key: 'autoscaling', title: 'Autoscaling', Component: StepAutoscaling },
];

export default function KubernetesWizard() {
  const { projectId, serviceId } = useParams();

  const [service, setService] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const [stepIndex, setStepIndex] = useState(0);
  const [wizard, setWizard] = useState(initialWizardState());

  const [previewFiles, setPreviewFiles] = useState(null);
  const [previewing, setPreviewing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [githubTokens, setGithubTokens] = useState([]);
  const [githubTokenId, setGithubTokenId] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [submitResult, setSubmitResult] = useState(null);

  const authHeaders = useMemo(() => {
    const token = localStorage.getItem('token');
    return { Authorization: `Bearer ${token}` };
  }, []);

  useEffect(() => {
    if (!serviceId) return;
    setLoading(true);
    setLoadError(null);

    fetch(`${API_URL}/services/get/${serviceId}`, { headers: authHeaders })
      .then((res) => {
        if (!res.ok) throw new Error(`Request failed with status ${res.status}`);
        return res.json();
      })
      .then((data) => {
        const svc = data.service || data;
        setService(svc);
        setWizard((prev) => ({
          ...prev,
          application: {
            ...prev.application,
            name: prev.application.name || svc?.name || '',
          },
          workload: {
            ...prev.workload,
            namespace: prev.workload.namespace || svc?.name || '',
          },
        }));
      })
      .catch((err) => {
        console.error('Failed to load service:', err);
        setLoadError('Unable to load this service.');
      })
      .finally(() => setLoading(false));

    // Pre-fill from a previously saved wizard config, if one exists.
    fetch(`${API_URL}/services/${serviceId}/k8s/get`, { headers: authHeaders })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data?.config) return;
        const c = data.config;
        setWizard({
          application: {
            name: c.app_name,
            dockerImage: c.docker_image,
            imageTag: c.image_tag,
            containerPort: c.container_port,
            envVars: c.env_vars || [],
          },
          workload: { namespace: c.namespace, workloadType: c.workload_type, replicas: c.replicas },
          resources: {
            cpuRequest: c.cpu_request,
            memoryRequest: c.memory_request,
            cpuLimit: c.cpu_limit,
            memoryLimit: c.memory_limit,
            namespaceQuota: c.namespace_quota,
          },
          storage: c.storage || { enabled: false, size: '1Gi', storageClass: 'standard', mountPath: '/data' },
          serviceAccount: c.service_account || { enabled: false, preset: 'Default', customRules: [] },
          networking: c.networking,
          healthChecks: c.health_checks || { enabled: false, endpoint: '/health' },
          autoscaling: c.autoscaling || { enabled: false, minReplicas: 2, maxReplicas: 5, targetCPU: 70, targetMemory: 80 },
        });
      })
      .catch(() => {}); // no saved config yet — fine, wizard stays at defaults

    fetch(`${API_URL}/github/tokens`, { headers: authHeaders })
      .then((res) => (res.ok ? res.json() : { tokens: [] }))
      .then((data) => {
        const tokens = data.tokens || [];
        setGithubTokens(tokens);
        if (tokens.length === 1) setGithubTokenId(tokens[0].id);
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serviceId]);

  function setField(section, field, value) {
    setWizard((prev) => ({ ...prev, [section]: { ...prev[section], [field]: value } }));
  }

  function setNestedField(section, subsection, field, value) {
    setWizard((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [subsection]: { ...prev[section][subsection], [field]: value },
      },
    }));
  }

  async function callGenerate(dryRun) {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/services/${serviceId}/k8s/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ ...wizard, dryRun, githubTokenId: githubTokenId || undefined }),
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(data?.message || `Request failed with status ${response.status}`);
    }
    return data;
  }

  async function handlePreview() {
    setPreviewing(true);
    setSubmitError('');
    try {
      const result = await callGenerate(true);
      setPreviewFiles(result.manifests || []);
    } catch (err) {
      setSubmitError(err.message || 'Could not render a preview.');
    } finally {
      setPreviewing(false);
    }
  }

  async function handleGenerate() {
    if (githubTokens.length > 1 && !githubTokenId) {
      setSubmitError('Pick which GitHub account to push with before generating.');
      return;
    }
    setSubmitting(true);
    setSubmitError('');
    setSubmitResult(null);
    try {
      const result = await callGenerate(false);
      setSubmitResult(result);
    } catch (err) {
      setSubmitError(err.message || 'Could not generate Kubernetes manifests.');
    } finally {
      setSubmitting(false);
    }
  }

  const isFirstStep = stepIndex === 0;
  const isLastStep = stepIndex === STEPS.length - 1;
  const CurrentStep = STEPS[stepIndex].Component;

  if (loading) {
    return (
      <div className='projects-shell'>
        <p className='projects-subtitle'>Loading service…</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className='projects-shell'>
        <div className='projects-state projects-state--error'>
          <p>{loadError}</p>
        </div>
      </div>
    );
  }

  return (
    <div className='projects-shell'>
      <header className='projects-header'>
        <div>
          <h1 className='projects-title'>Kubernetes Deployment Wizard</h1>
          <p className='projects-subtitle'>
            Answer a few questions about <strong>{service?.name}</strong> — we'll generate
            production-ready Kubernetes manifests and push them to your repository.
          </p>
        </div>
        <Link to={`/projects/${projectId}`} className='project-button project-button--ghost'>
          Back to project
        </Link>
      </header>

      <div className='k8s-step-tracker'>
        {STEPS.map((step, index) => (
          <button
            type='button'
            key={step.key}
            className={`k8s-step-tracker__item ${index === stepIndex ? 'is-active' : ''} ${index < stepIndex ? 'is-done' : ''}`}
            onClick={() => setStepIndex(index)}
          >
            <span className='k8s-step-tracker__num'>{index + 1}</span>
            {step.title}
          </button>
        ))}
      </div>

      <div className='k8s-wizard-layout'>
        <section className='k8s-wizard-card'>
          <CurrentStep wizard={wizard} setField={setField} setNestedField={setNestedField} service={service} />

          {isLastStep && githubTokens.length > 0 && (
            <div className='k8s-subsection'>
              <h3>Push as</h3>
              <p className='k8s-step__hint'>
                Choose which GitHub token to push the generated manifests with — make sure it has
                write access to <code>{service?.repository_url}</code>.
              </p>
              <label className='k8s-field'>
                GitHub token
                <select value={githubTokenId} onChange={(e) => setGithubTokenId(e.target.value)}>
                  <option value=''>— Select a token —</option>
                  {githubTokens.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                      {t.description ? ` — ${t.description}` : ''}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          )}

          <div className='k8s-wizard-actions'>
            <button
              type='button'
              className='project-button project-button--ghost'
              onClick={() => setStepIndex((i) => Math.max(0, i - 1))}
              disabled={isFirstStep}
            >
              Back
            </button>

            {!isLastStep && (
              <button
                type='button'
                className='project-button project-button--primary'
                onClick={() => setStepIndex((i) => Math.min(STEPS.length - 1, i + 1))}
              >
                Next
              </button>
            )}

            {isLastStep && (
              <div className='k8s-wizard-actions__final'>
                <button type='button' className='project-button project-button--ghost' onClick={handlePreview} disabled={previewing}>
                  {previewing ? 'Rendering…' : 'Preview manifests'}
                </button>
                <button type='button' className='project-button project-button--primary' onClick={handleGenerate} disabled={submitting}>
                  {submitting ? 'Generating…' : 'Generate & Push'}
                </button>
              </div>
            )}
          </div>

          {submitError && <div className='project-alert project-alert--error'>{submitError}</div>}

          {submitResult && (
            <div className='project-alert project-alert--success k8s-result'>
              <p>{submitResult.message}</p>
              {submitResult.commitSha && (
                <p className='k8s-result__meta'>
                  Branch <code>{submitResult.branch}</code> · commit <code>{submitResult.commitSha.slice(0, 7)}</code>
                </p>
              )}
              <ul className='k8s-result__files'>
                {submitResult.generatedFiles?.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
            </div>
          )}

          {previewFiles && (
            <div className='k8s-preview'>
              <h3>Manifest preview</h3>
              {previewFiles.map((f) => (
                <details key={f.file} className='k8s-preview__file'>
                  <summary>{f.file}</summary>
                  <pre>{f.content}</pre>
                </details>
              ))}
            </div>
          )}
        </section>

        <WizardSummary wizard={wizard} />
      </div>
    </div>
  );
}