import React from 'react';
import { Link } from 'react-router-dom';

export default function ServiceCard({ service }) {
    console.log('Rendering ServiceCard with service:', service);
  const id = service.id || service._id;
  const name = service.name || 'Untitled service';
  const repoUrl = service.repository_url || '';
  const branch = service.branch || '';

  return (
    <div className='service-card' key={id}>
      <div>
        <div className='service-title'> {name}</div>
        <p className='service-label'> {repoUrl}</p>
        <p className='service-label'>Branch: {branch}</p>
      </div>
      <div className='service-card__footer'>
          <Link className='project-button project-button--primary service-deploy-button' target='_blank' rel='noreferrer'>
            Go through the deployment process
          </Link>

      </div>
    </div>
  );
}
