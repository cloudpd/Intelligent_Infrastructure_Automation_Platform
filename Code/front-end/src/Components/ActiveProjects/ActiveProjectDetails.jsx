import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import './ActiveProjects.css';
import './ActiveProjectDetails.css';
import '../Projects/Projects.css';
import { baseUrl as API_URL } from '../Shared/baseUrl';
import Breadcrumb from '../Shared/Breadcrumb';

const STATUS_LABEL = {
  applied: 'Live',
  destroying: 'Destroying',
  destroy_failed: 'Destroy failed',
};

const MODULE_LABEL = {
  network: 'Network (VPC)',
  ecr: 'Container registry (ECR)',
  eks: 'Kubernetes (EKS)',
  vm: 'Virtual machine',
};

export default function ActiveProjectDetails() {
  const { deploymentId } = useParams();
  const navigate = useNavigate();

  const [deployment, setDeployment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [destroying, setDestroying] = useState(false);
  const [destroyError, setDestroyError] = useState('');
  const [destroyStarted, setDestroyStarted] = useState(false);

  const pollRef = useRef(null);

  function fetchDeployment({ silent = false } = {}) {
    if (!silent) setLoading(true);
    setError(null);

    const token = localStorage.getItem('token');

    return fetch(`${API_URL}/infra/terraform-deployments/${deploymentId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => {
        if (res.status === 404) {
          // Successful destroy hard-deletes the row — treat a 404 while
          // we're polling after a destroy as "it's gone, we're done".
          return null;
        }
        if (!res.ok) {
          throw new Error(`Request failed with status ${res.status}`);
        }
        return res.json();
      })
      .then((data) => {
        if (data === null) {
          setDeployment(null);
          return null;
        }
        const dep = data.deployment || data;
        setDeployment(dep);
        return dep;
      })
      .catch((err) => {
        console.error('Failed to fetch deployment:', err);
        setError('Unable to load this active project.');
        return undefined;
      })
      .finally(() => {
        if (!silent) setLoading(false);
      });
  }

  useEffect(() => {
    if (!deploymentId) return;
    fetchDeployment();
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [deploymentId]);

  function startPolling() {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      const dep = await fetchDeployment({ silent: true });
      if (dep === null) {
        // Deployment is gone — destroy finished successfully.
        clearInterval(pollRef.current);
        navigate('/home', { replace: true });
      } else if (dep && dep.status !== 'destroying') {
        clearInterval(pollRef.current);
        setDestroying(false);
        if (dep.status === 'destroy_failed') {
          setDestroyError(dep.destroy_error || 'Terraform destroy failed. You can retry below.');
        }
      }
    }, 4000);
  }

  function openConfirm() {
    setConfirmOpen(true);
    setConfirmText('');
    setDestroyError('');
  }

  function closeConfirm() {
    if (destroying) return;
    setConfirmOpen(false);
    setConfirmText('');
  }

  async function handleDestroy() {
    if (!deployment) return;
    setDestroyError('');
    setDestroying(true);
    setDestroyStarted(true);

    const token = localStorage.getItem('token');

    try {
      const response = await fetch(
        `${API_URL}/infra/terraform-deployments/services/${deployment.service_id}/destroy`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ environment: deployment.environment }),
        }
      );

      if (!(response.status === 202 || response.ok)) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.message || `Request failed with status ${response.status}`);
      }

      setConfirmOpen(false);
      setDeployment((prev) => (prev ? { ...prev, status: 'destroying' } : prev));
      startPolling();
    } catch (err) {
      setDestroyError(err.message || 'Could not start Terraform destroy.');
      setDestroying(false);
    }
  }

  const status = deployment?.status || 'applied';
  const canDestroy = deployment && status !== 'destroying';
  const modules = deployment?.modules || {};
  const activeModules = Object.keys(modules).filter((key) => modules[key]);

  return (
    <div className='projects-shell'>
      <Breadcrumb crumbs={[
        { label: 'Home', to: '/home' },
        { label: 'Active Projects' },
        ...(deployment ? [{ label: deployment.service?.name || 'Deployment' }] : []),
      ]} />

      <header className='projects-header'>
        <div>
          <h1 className='projects-title'>Active project</h1>
          <p className='projects-subtitle'>What is currently live, and where to tear it down.</p>
        </div>
        <Link to='/home' className='project-button project-button--ghost'>
          <i className='fa-solid fa-arrow-left' style={{ marginRight: '6px' }} aria-hidden='true' />
          Back to dashboard
        </Link>
      </header>

      {loading && (
        <div className='projects-state'>
          <p>Loading active project...</p>
        </div>
      )}

      {!loading && error && (
        <div className='projects-state projects-state--error'>
          <p>{error}</p>
          <button type='button' onClick={() => fetchDeployment()}>Try again</button>
        </div>
      )}

      {!loading && !error && !deployment && destroyStarted && (
        <div className='projects-state'>
          <p>This infrastructure has been destroyed.</p>
        </div>
      )}

      {!loading && !error && !deployment && !destroyStarted && (
        <div className='projects-state'>
          <p>This active project no longer exists — it may already have been destroyed.</p>
        </div>
      )}

      {!loading && !error && deployment && (
        <section className='service-section'>
          <div className='service-section__header'>
            <div>
              <h2 className='projects-title'>{deployment.service?.name || 'Service'}</h2>
              <p className='projects-subtitle'>
                {deployment.service?.project?.name || 'Untitled project'} · {deployment.environment}
              </p>
            </div>
            <span className={`active-project-status active-project-status--${status}${status === 'destroying' ? ' active-project-status--pulse' : ''}`}>
              {STATUS_LABEL[status] || status}
            </span>
          </div>

          <div className='active-project-detail-grid'>
            <div className='active-project-detail-card'>
              <span className='active-project-detail-card__label'>AWS region</span>
              <span className='active-project-detail-card__value'>{deployment.aws_region || '—'}</span>
            </div>
            <div className='active-project-detail-card'>
              <span className='active-project-detail-card__label'>State bucket</span>
              <span className='active-project-detail-card__value'>{deployment.state_bucket || '—'}</span>
            </div>
            <div className='active-project-detail-card'>
              <span className='active-project-detail-card__label'>Applied</span>
              <span className='active-project-detail-card__value'>
                {deployment.applied_at ? new Date(deployment.applied_at).toLocaleString() : '—'}
              </span>
            </div>
            <div className='active-project-detail-card'>
              <span className='active-project-detail-card__label'>Resources</span>
              <span className='active-project-detail-card__value'>
                {activeModules.length > 0
                  ? activeModules.map((key) => MODULE_LABEL[key] || key).join(', ')
                  : '—'}
              </span>
            </div>
          </div>

          {status === 'destroying' && (
            <p className='active-project-note'>
              Terraform destroy is running on the server. This page will update automatically once it finishes.
            </p>
          )}

          {status === 'destroy_failed' && deployment.destroy_error && (
            <p className='active-project-error'>{deployment.destroy_error}</p>
          )}

          <div className='active-project-danger-zone'>
            <div>
              <h3 className='active-project-danger-zone__title'>Destroy this infrastructure</h3>
              <p className='active-project-danger-zone__text'>
                Runs <code>terraform destroy</code> against everything that was applied for this
                service/environment. This permanently tears down the real AWS resources and cannot be undone.
              </p>
            </div>
            <button
              type='button'
              className='project-button project-button--danger'
              onClick={openConfirm}
              disabled={!canDestroy || destroying}
            >
              {status === 'destroying' ? 'Destroying...' : status === 'destroy_failed' ? 'Retry destroy' : 'Destroy infrastructure'}
            </button>
          </div>
        </section>
      )}

      {confirmOpen && deployment && (
        <div className='project-modal-overlay' role='dialog' aria-modal='true'>
          <div className='project-modal'>
            <h2 className='projects-title'>Destroy infrastructure?</h2>
            <p className='projects-subtitle'>
              This will permanently destroy all AWS resources for{' '}
              <strong>{deployment.service?.name || 'this service'}</strong> ({deployment.environment}).
              Type <strong>destroy</strong> below to confirm.
            </p>

            {destroyError && <p className='active-project-error'>{destroyError}</p>}

            <input
              type='text'
              className='project-modal__confirm-input'
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder='Type "destroy" to confirm'
              disabled={destroying}
              autoFocus
            />

            <div className='add-project-form__actions'>
              <button
                type='button'
                className='project-button project-button--ghost'
                onClick={closeConfirm}
                disabled={destroying}
              >
                Cancel
              </button>
              <button
                type='button'
                className='project-button project-button--danger'
                onClick={handleDestroy}
                disabled={confirmText.trim().toLowerCase() !== 'destroy' || destroying}
              >
                {destroying ? 'Destroying...' : 'Yes, destroy it'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
