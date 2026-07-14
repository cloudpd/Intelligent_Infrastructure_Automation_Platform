import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import '../Projects/Projects.css';
import './ci-service.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const emptySecretState = {
  DOCKER_USERNAME: '',
  DOCKER_PASSWORD: '',
};

export default function CIServicePage() {
  const { projectId, serviceId } = useParams();
  const navigate = useNavigate();
  const [service, setService] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [pushingWorkflow, setPushingWorkflow] = useState(false);
  const [pushingSecrets, setPushingSecrets] = useState(false);
  const [previewYaml, setPreviewYaml] = useState('');
  const [config, setConfig] = useState({
    pipelineName: '',
    triggerBranch: 'main',
    registry: 'docker-hub',
    imageName: '',
    enableTrivy: false,
    enableLint: true,
    enableTests: true,
    enableBuild: false,
    enableInstall: true,
    awsEcrRegion: '',
  });
  const [secrets, setSecrets] = useState(emptySecretState);
  const [statusMessage, setStatusMessage] = useState('');

  const authHeaders = useMemo(() => {
    const token = localStorage.getItem('token');
    return { Authorization: `Bearer ${token}` };
  }, []);

  useEffect(() => {
    async function loadService() {
      setLoading(true);
      setError('');
      try {
        const response = await fetch(`${API_URL}/services/get/${serviceId}`, { headers: authHeaders });
        const data = await response.json().catch(() => null);
        if (!response.ok) throw new Error(data?.message || 'Unable to load service.');
        const serviceData = data.service || data || null;
        setService(serviceData);
        setConfig((prev) => ({
          ...prev,
          pipelineName: `${serviceData?.name || 'service'}-pipeline`,
          imageName: serviceData?.name || 'service',
        }));
      } catch (err) {
        setError(err.message || 'Unable to load service.');
      } finally {
        setLoading(false);
      }
    }

    if (serviceId) {
      loadService();
    }
  }, [authHeaders, serviceId]);

  const handleChange = (field, value) => {
    setConfig((prev) => ({ ...prev, [field]: value }));
  };

  const handleSaveConfig = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setStatusMessage('');

    try {
      const response = await fetch(`${API_URL}/services/${serviceId}/ci`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({
          serviceId,
          ...config,
        }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.message || 'Unable to save CI config.');
      setStatusMessage('CI configuration saved.');
    } catch (err) {
      setError(err.message || 'Unable to save CI config.');
    } finally {
      setSaving(false);
    }
  };

  const handlePreviewWorkflow = async () => {
    setPreviewing(true);
    setError('');
    setStatusMessage('');

    try {
      const response = await fetch(`${API_URL}/services/${serviceId}/ci/preview`, { headers: authHeaders });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.message || 'Unable to preview workflow.');
      setPreviewYaml(data?.workflow?.yaml || '');
      setStatusMessage('Workflow preview generated.');
    } catch (err) {
      setError(err.message || 'Unable to preview workflow.');
    } finally {
      setPreviewing(false);
    }
  };

  const handlePushWorkflow = async () => {
    setPushingWorkflow(true);
    setError('');
    setStatusMessage('');

    try {
      const response = await fetch(`${API_URL}/services/${serviceId}/ci/push`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({}),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.message || 'Unable to push workflow.');
      setStatusMessage('Workflow pushed to GitHub.');
    } catch (err) {
      setError(err.message || 'Unable to push workflow.');
    } finally {
      setPushingWorkflow(false);
    }
  };

  const handlePushSecrets = async (event) => {
    event.preventDefault();
    setPushingSecrets(true);
    setError('');
    setStatusMessage('');

    try {
      const response = await fetch(`${API_URL}/services/${serviceId}/ci/secrets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({
          registry: config.registry === 'aws-ecr' ? 'aws-ecr' : 'docker',
          secrets,
        }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.message || 'Unable to push secrets.');
      setStatusMessage('Registry secrets pushed.');
    } catch (err) {
      setError(err.message || 'Unable to push secrets.');
    } finally {
      setPushingSecrets(false);
    }
  };

  return (
    <div className='projects-shell'>
      <header className='projects-header'>
        <div>
          <h1 className='projects-title'>CI & Secrets Setup</h1>
          <p className='projects-subtitle'>Add your registry secrets first, then configure the CI workflow for {service?.name || 'this service'}.</p>
        </div>
        <div className='ci-actions'>
          <Link to={projectId ? `/projects/${projectId}` : '/projects'} className='project-button project-button--ghost'>Back to project</Link>
        </div>
      </header>

      {loading ? (
        <div className='projects-state'>Loading service data...</div>
      ) : error ? (
        <div className='projects-state projects-state--error'>{error}</div>
      ) : (
        <div className='ci-page-grid'>
          <section className='ci-card'>
            <div className='ci-card__header'>
              <div>
                <h2 className='project-title'>1. Registry secrets</h2>
                <p className='project-label'>Push the credentials that the deployment pipeline will need.</p>
              </div>
            </div>

            <form className='ci-form' onSubmit={handlePushSecrets}>
              <label className='ci-field'>
                Registry type
                <select value={config.registry} onChange={(event) => handleChange('registry', event.target.value)}>
                  <option value='docker-hub'>Docker Hub</option>
                  <option value='aws-ecr'>AWS ECR</option>
                </select>
              </label>

              {config.registry === 'aws-ecr' ? (
                <>
                  <label className='ci-field'>
                    AWS region
                    <input value={config.awsEcrRegion} onChange={(event) => handleChange('awsEcrRegion', event.target.value)} placeholder='e.g. eu-west-1' />
                  </label>
                  <label className='ci-field'>
                    AWS access key ID
                    <input value={secrets.AWS_ACCESS_KEY_ID || ''} onChange={(event) => setSecrets((prev) => ({ ...prev, AWS_ACCESS_KEY_ID: event.target.value }))} />
                  </label>
                  <label className='ci-field'>
                    AWS secret access key
                    <input value={secrets.AWS_SECRET_ACCESS_KEY || ''} onChange={(event) => setSecrets((prev) => ({ ...prev, AWS_SECRET_ACCESS_KEY: event.target.value }))} />
                  </label>
                </>
              ) : (
                <>
                  <label className='ci-field'>
                    Docker username
                    <input value={secrets.DOCKER_USERNAME} onChange={(event) => setSecrets((prev) => ({ ...prev, DOCKER_USERNAME: event.target.value }))} />
                  </label>
                  <label className='ci-field'>
                    Docker password
                    <input type='password' value={secrets.DOCKER_PASSWORD} onChange={(event) => setSecrets((prev) => ({ ...prev, DOCKER_PASSWORD: event.target.value }))} />
                  </label>
                </>
              )}

              <button type='submit' className='project-button project-button--primary' disabled={pushingSecrets}>
                {pushingSecrets ? 'Pushing secrets...' : 'Push secrets'}
              </button>
            </form>
          </section>

          <section className='ci-card'>
            <div className='ci-card__header'>
              <div>
                <h2 className='project-title'>2. CI workflow</h2>
                <p className='project-label'>Create the workflow and generate the deployment pipeline.</p>
              </div>
            </div>

            <form className='ci-form' onSubmit={handleSaveConfig}>
              <label className='ci-field'>
                Pipeline name
                <input value={config.pipelineName} onChange={(event) => handleChange('pipelineName', event.target.value)} required />
              </label>

              <label className='ci-field'>
                Trigger branch
                <input value={config.triggerBranch} onChange={(event) => handleChange('triggerBranch', event.target.value)} required />
              </label>

              <label className='ci-field'>
                Image name
                <input value={config.imageName} onChange={(event) => handleChange('imageName', event.target.value)} required />
              </label>

              <label className='ci-field ci-checkbox'>
                <input type='checkbox' checked={config.enableTrivy} onChange={(event) => handleChange('enableTrivy', event.target.checked)} />
                Enable Trivy security scan
              </label>

              <label className='ci-field ci-checkbox'>
                <input type='checkbox' checked={config.enableLint} onChange={(event) => handleChange('enableLint', event.target.checked)} />
                Enable linting
              </label>

              <label className='ci-field ci-checkbox'>
                <input type='checkbox' checked={config.enableTests} onChange={(event) => handleChange('enableTests', event.target.checked)} />
                Enable tests
              </label>

              <div className='ci-actions ci-actions--stack'>
                <button type='submit' className='project-button project-button--primary' disabled={saving}>
                  {saving ? 'Saving...' : 'Save CI config'}
                </button>
                <button type='button' className='project-button project-button--ghost' onClick={handlePreviewWorkflow} disabled={previewing}>
                  {previewing ? 'Generating preview...' : 'Preview workflow'}
                </button>
                <button type='button' className='project-button project-button--primary' onClick={handlePushWorkflow} disabled={pushingWorkflow}>
                  {pushingWorkflow ? 'Pushing...' : 'Push workflow'}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {statusMessage && <div className='ci-status'>{statusMessage}</div>}

      {previewYaml && (
        <section className='ci-preview-card'>
          <h3 className='project-title'>Workflow preview</h3>
          <pre className='ci-preview'>{previewYaml}</pre>
        </section>
      )}
    </div>
  );
}
