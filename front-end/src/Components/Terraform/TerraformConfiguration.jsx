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
  const [applying, setApplying] = useState(false);
  const [applyPhase, setApplyPhase] = useState('idle');
  const [applyProgress, setApplyProgress] = useState(0);
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

  async function handleApply() {
    setApplying(true);
    setActionError('');
    setActionSuccess('');
    setApplyPhase('initializing');
    setApplyProgress(8);

    const progressTimer = window.setInterval(() => {
      setApplyProgress((current) => {
        if (current >= 88) return current;
        if (current < 30) return Math.min(current + 4, 30);
        if (current < 70) return Math.min(current + 3, 70);
        return Math.min(current + 2, 88);
      });
    }, 350);

    try {
      if (!state?.awsCredentialId) {
        throw new Error('Choose an AWS credential in the Terraform setup wizard before applying.');
      }
      if (deploymentType !== 'vm') {
        throw new Error('Terraform apply is currently available for VM deployments only.');
      }
      if (!state?.generated) {
        throw new Error('Generate Terraform files first.');
      }

      setApplyPhase('preparing');
      setApplyProgress(24);

      const [vpcsRes, vmsRes] = await Promise.all([
        fetch(`${API_URL}/infra/network/${serviceId}/vpcs`, { headers: authHeaders }),
        fetch(`${API_URL}/infra/vm/${serviceId}/vms`, { headers: authHeaders }),
      ]);

      const [vpcsData, vmsData] = await Promise.all([
        vpcsRes.json().catch(() => null),
        vmsRes.json().catch(() => null),
      ]);

      if (!vpcsRes.ok) {
        throw new Error(vpcsData?.message || `Request failed with status ${vpcsRes.status}`);
      }
      if (!vmsRes.ok) {
        throw new Error(vmsData?.message || `Request failed with status ${vmsRes.status}`);
      }

      setApplyPhase('collecting');
      setApplyProgress(56);

      const vpc = Array.isArray(vpcsData?.data)
        ? vpcsData.data.find((item) => item?.id) || vpcsData.data[0]
        : null;
      const vm = Array.isArray(vmsData?.data)
        ? vmsData.data.find((item) => item?.id) || vmsData.data[0]
        : null;

      if (!vpc?.id) {
        throw new Error('No VPC was found for this service.');
      }
      if (!vm?.id) {
        throw new Error('No VM deployment was found for this service.');
      }

      setApplyPhase('applying');
      setApplyProgress(78);

      const res = await fetch(`${API_URL}/infra/terraform/vpcs/${vpc.id}/vms/${vm.id}/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({
          serviceSlug: 'service',
          environment: 'dev',
          awsCredentialId: state.awsCredentialId,
          vmId: vm.id,
          vpcId: vpc.id,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message || `Request failed with status ${res.status}`);

      setApplyPhase('completed');
      setApplyProgress(100);
      setActionSuccess(data.message || 'Terraform apply completed successfully. Your infrastructure is now running.');
      fetchState();
    } catch (err) {
      setApplyPhase('error');
      setApplyProgress(0);
      setActionError(err.message || 'Could not apply Terraform files.');
    } finally {
      window.clearInterval(progressTimer);
      setApplying(false);
    }
  }

  const setupComplete = Boolean(state?.s3Bucket) && Boolean(deploymentType);
  const applyStatusCopy = {
    initializing: {
      title: 'Initializing Terraform apply',
      badge: 'Preparing',
      message: 'Validating your AWS settings and preparing the deployment workflow.',
    },
    preparing: {
      title: 'Preparing infrastructure',
      badge: 'Preparing',
      message: 'Checking the selected resources and getting the deployment ready.',
    },
    collecting: {
      title: 'Collecting resources',
      badge: 'Fetching data',
      message: 'Gathering the VPC and VM details needed for the apply step.',
    },
    applying: {
      title: 'Applying infrastructure',
      badge: 'In progress',
      message: 'Terraform is creating or updating the requested resources now.',
    },
    completed: {
      title: 'Apply completed',
      badge: 'Success',
      message: 'Your resources were applied successfully and are ready to use.',
    },
    error: {
      title: 'Apply stalled',
      badge: 'Needs attention',
      message: 'The deployment did not finish successfully. Review the error and try again.',
    },
  };
  const activeApplyStatus = applyPhase === 'idle' ? null : applyStatusCopy[applyPhase];

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
          {state.lockTable && (
            <p className='terraform-readonly-row'>
              <strong>DynamoDB Lock Table:</strong> {state.lockTable}
            </p>
          )}
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

          {activeApplyStatus && (
            <div className={`terraform-status-card terraform-status-card--${applyPhase}`}>
              <div className='terraform-status-header'>
                <span className='terraform-status-title'>{activeApplyStatus.title}</span>
                <span className='terraform-status-badge'>{activeApplyStatus.badge}</span>
              </div>
              <div className='terraform-progress-track'>
                <div
                  className={`terraform-progress-fill ${applyPhase === 'completed' ? 'terraform-progress-fill--completed' : ''}`}
                  style={{ width: `${applyProgress}%` }}
                />
              </div>
              <p className='terraform-status-message'>{activeApplyStatus.message}</p>
            </div>
          )}

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
            <button
              type='button'
              className='project-button project-button--ghost'
              onClick={handleApply}
              disabled={!setupComplete || generating || applying || !state?.generated || deploymentType !== 'vm'}
            >
              {applying ? (applyPhase === 'completed' ? 'Completed' : 'Applying...') : 'Run Terraform Apply'}
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
