import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import '../Projects/Projects.css';
import './Terraform.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

export default function TerraformConfiguration() {
  const { serviceId } = useParams();

  const [state, setState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [deploymentType, setDeploymentType] = useState('');
  const [savingDeployment, setSavingDeployment] = useState(false);

  const [generating, setGenerating] = useState(false);
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  const authHeaders = useMemo(() => {
    const token = localStorage.getItem('token');
    return { Authorization: `Bearer ${token}` };
  }, []);

  function fetchState() {
    setLoading(true);
    setLoadError('');
    fetch(`${API_URL}/terraform/state/${serviceId}`, { headers: authHeaders })
      .then((res) => {
        if (!res.ok) throw new Error(`Request failed with status ${res.status}`);
        return res.json();
      })
      .then((data) => {
        const s = data.terraformState || data;
        setState(s);
        setDeploymentType(s?.deploymentType || '');
      })
      .catch((err) => {
        console.error('Failed to load Terraform state:', err);
        setLoadError('Run the Terraform Setup Wizard for this service first.');
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (!serviceId) return;
    fetchState();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serviceId]);

  async function handleSaveDeployment(type) {
    setDeploymentType(type);
    setSavingDeployment(true);
    setActionError('');
    setActionSuccess('');
    try {
      const res = await fetch(`${API_URL}/terraform/deployment`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({ serviceId, deploymentType: type }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message || `Request failed with status ${res.status}`);
      fetchState();
    } catch (err) {
      setActionError(err.message || 'Could not save deployment type.');
    } finally {
      setSavingDeployment(false);
    }
  }

  async function handleGenerate() {
    setGenerating(true);
    setActionError('');
    setActionSuccess('');
    try {
      const res = await fetch(`${API_URL}/terraform/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({ serviceId }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message || `Request failed with status ${res.status}`);
      setActionSuccess('Terraform files generated successfully.');
      fetchState();
    } catch (err) {
      setActionError(err.message || 'Could not generate Terraform files.');
    } finally {
      setGenerating(false);
    }
  }

  const setupComplete = Boolean(state?.s3Bucket) && Boolean(deploymentType);

  return (
    <div className='projects-shell min-vh-100'>
      <header className='projects-header'>
        <div>
          <h1 className='projects-title'>Terraform Configuration</h1>
          <p className='projects-subtitle'>Review the backend and choose a deployment target.</p>
        </div>
        <div>
          <Link to={`/services/${serviceId}/terraform-setup`} className='project-button project-button--ghost'>
            Back to setup
          </Link>
        </div>
      </header>

      {loading && (
        <div className='projects-state'>
          <p>Loading Terraform configuration...</p>
        </div>
      )}

      {loadError && !loading && (
        <div className='projects-state projects-state--error'>
          <p>{loadError}</p>
        </div>
      )}

      {!loading && !loadError && state && (
        <div className='terraform-wizard-card'>
          <h2 className='terraform-step-title'>Backend</h2>
          <p className='terraform-readonly-row'>
            <strong>S3 Bucket:</strong> {state.s3Bucket}
          </p>
          <p className='terraform-readonly-row'>
            <strong>Registry:</strong> {state.useEcr ? 'AWS ECR' : 'GitHub Container Registry'}
          </p>
          <p className='terraform-readonly-row'>
            <strong>Configured</strong>
          </p>

          <h2 className='terraform-step-title'>Deployment</h2>
          <label className='terraform-radio'>
            <input
              type='radio'
              name='deploymentType'
              checked={deploymentType === 'eks'}
              onChange={() => handleSaveDeployment('eks')}
              disabled={savingDeployment}
            />
            Amazon EKS
          </label>
          <label className='terraform-radio'>
            <input
              type='radio'
              name='deploymentType'
              checked={deploymentType === 'vm'}
              onChange={() => handleSaveDeployment('vm')}
              disabled={savingDeployment}
            />
            Virtual Machine (Minikube)
          </label>

          {actionError && <p className='terraform-error'>{actionError}</p>}
          {actionSuccess && <p className='terraform-success'>{actionSuccess}</p>}

          <div className='terraform-actions'>
            <button
              type='button'
              className='project-button project-button--primary'
              onClick={handleGenerate}
              disabled={!setupComplete || generating}
            >
              {generating ? 'Generating...' : 'Generate Terraform'}
            </button>
            <button type='button' className='project-button project-button--ghost' disabled>
              Run Terraform Apply (Coming Soon)
            </button>
          </div>

          {state.generated && (
            <p className='terraform-readonly-row'>
              Terraform files are generated. Continue to{' '}
              <Link to={`/services/${serviceId}/dockerize`}>Docker workflow</Link>.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
