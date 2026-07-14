import React from 'react';
import { Link } from 'react-router-dom';

export default function ServiceCard({ service, projectId }) {
  const id = service.id || service._id;
  const name = service.name || 'Untitled service';
  const repoUrl = service.repository_url || '';
  const branch = service.branch || '';

  return (
    <div className='service-card' key={id}>
      <div>
        <div className='service-title'>{name}</div>
        <p className='service-label'>{repoUrl}</p>
        <p className='service-label'>Branch: {branch}</p>
      </div>
      <div className='service-card__footer'>
        <Link to={`/services/${id}/dockerize`} className='project-button project-button--primary service-deploy-button'>
          Go through the deployment process
        </Link>

        <Link
          className='project-button project-button--primary service-deploy-button'
          to={`/projects/${projectId}/services/${id}/ci`}
        >
          Add CI
        </Link>

        <Link
          className='project-button project-button--primary service-deploy-button'
          to={`/projects/${projectId}/services/${id}/k8s`}
        >
          Add K8s
        </Link>
      </div>
    </div>
  );
}