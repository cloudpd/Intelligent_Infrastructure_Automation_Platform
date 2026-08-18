import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import './ActiveProjects.css';
import { baseUrl as API_URL } from '../Shared/baseUrl';

const STATUS_LABEL = {
  applied: 'Live',
  destroying: 'Destroying',
  destroy_failed: 'Destroy failed',
};

function DeploymentRow({ deployment }) {
  const projectName = deployment.service?.project?.name || 'Project';
  const serviceName = deployment.service?.name || 'Service';
  const status = deployment.status || 'applied';
  const env = deployment.environment || 'production';
  const infraType = deployment.eksConfig ? 'AWS EKS Cluster' : 'AWS EC2 VM';

  return (
    <Link
      to={`/active-projects/${deployment.id}`}
      className='active-project-row'
    >
      <div className='active-project-row__left'>
        <span className={`active-project-dot active-project-dot--${status}`} />
        <div className='active-project-row__main'>
          <span className='active-project-row__project'>{projectName} / <strong>{serviceName}</strong></span>
          <span className='active-project-row__service'>{infraType} · {env}</span>
        </div>
      </div>

      <div className='active-project-row__right'>
        <span className={`active-project-status active-project-status--${status}${status === 'destroying' ? ' active-project-status--pulse' : ''}`}>
          {STATUS_LABEL[status] || status}
        </span>
        <i className='fa-solid fa-chevron-right active-project-row__chevron' aria-hidden='true' />
      </div>
    </Link>
  );
}

export default function ActiveProjects() {
  const [deployments, setDeployments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  function fetchDeployments() {
    setLoading(true);
    setError(null);

    const token = localStorage.getItem('token');

    fetch(`${API_URL}/infra/terraform-deployments`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Request failed with status ${res.status}`);
        }
        return res.json();
      })
      .then((data) => {
        setDeployments(data.deployments || []);
      })
      .catch((err) => {
        console.error('Failed to fetch active projects:', err);
        setError('Could not load active projects.');
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    fetchDeployments();
  }, []);

  return (
    <aside className='active-projects-panel'>
      <div className='active-projects-panel__header'>
        <div>
          <h2 className='active-projects-panel__title'>
            <i className='fa-solid fa-bolt active-projects-panel__icon' aria-hidden='true' />
            Active Infrastructure
          </h2>
          <p className='active-projects-panel__subtitle'>Live resources deployed in your AWS environment</p>
        </div>
        <button
          type='button'
          className='active-projects-panel__refresh'
          onClick={fetchDeployments}
          aria-label='Refresh active projects'
          title='Refresh active deployments'
        >
          <i className={`fa-solid fa-rotate-right ${loading ? 'fa-spin' : ''}`} aria-hidden='true' />
        </button>
      </div>

      {loading && (
        <div className='active-projects-panel__skeleton' aria-hidden='true'>
          {[1, 2].map((n) => (
            <div key={n} className='active-projects-panel__skeleton-row' />
          ))}
        </div>
      )}

      {!loading && error && (
        <div className='active-projects-panel__state active-projects-panel__state--error'>
          <p>{error}</p>
          <button type='button' className='project-button project-button--ghost' onClick={fetchDeployments}>Try again</button>
        </div>
      )}

      {!loading && !error && deployments.length === 0 && (
        <div className='active-projects-panel__state active-projects-panel__state--empty'>
          <div className='active-panel-empty-icon'>
            <i className='fa-solid fa-server' aria-hidden='true' />
          </div>
          <p className='active-panel-empty-title'>No active deployments</p>
          <p className='active-panel-empty-text'>Apply Terraform on a service to monitor live resources here.</p>
        </div>
      )}

      {!loading && !error && deployments.length > 0 && (
        <div className='active-projects-panel__list'>
          {deployments.map((deployment) => (
            <DeploymentRow key={deployment.id} deployment={deployment} />
          ))}
        </div>
      )}
    </aside>
  );
}
