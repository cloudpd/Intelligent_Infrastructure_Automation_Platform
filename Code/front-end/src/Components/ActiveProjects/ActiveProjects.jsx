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
  const projectName = deployment.service?.project?.name || 'Untitled project';
  const serviceName = deployment.service?.name || 'Untitled service';
  const status = deployment.status || 'applied';

  return (
    <Link
      to={`/active-projects/${deployment.id}`}
      className='active-project-row'
    >
      <div className='active-project-row__main'>
        <span className='active-project-row__project'>{projectName}</span>
        <span className='active-project-row__service'>{serviceName} · {deployment.environment}</span>
      </div>
      <span className={`active-project-status active-project-status--${status}`}>
        {STATUS_LABEL[status] || status}
      </span>
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
        setError('Could not load your active projects.');
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
          <h2 className='active-projects-panel__title'>Active projects</h2>
          <p className='active-projects-panel__subtitle'>Infrastructure that is currently live</p>
        </div>
        <button
          type='button'
          className='active-projects-panel__refresh'
          onClick={fetchDeployments}
          aria-label='Refresh active projects'
          title='Refresh'
        >
          ↻
        </button>
      </div>

      {loading && (
        <div className='active-projects-panel__state'>
          <p>Loading active projects...</p>
        </div>
      )}

      {!loading && error && (
        <div className='active-projects-panel__state active-projects-panel__state--error'>
          <p>{error}</p>
          <button type='button' onClick={fetchDeployments}>Try again</button>
        </div>
      )}

      {!loading && !error && deployments.length === 0 && (
        <div className='active-projects-panel__state'>
          <p>No live infrastructure yet. Run Terraform Apply on a service to see it here.</p>
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
