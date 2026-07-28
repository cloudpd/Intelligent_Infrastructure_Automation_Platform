import React from 'react';
import { Link } from 'react-router-dom';

export default function ServiceCard({ service, projectId }) {
  const id = service.id || service._id;
  const name = service.name || 'Untitled service';
  let repoUrl = service.repository_url || "No Github repo existed";

  repoUrl = repoUrl
    .replace(/^https?:\/\/github\.com\//, "") // remove https://github.com/
    .split("/")[1]                            // get repository name
    ?.substring(0, 20) || "";



  const branch = service.branch || '';

  return (
    <div className='service-card' key={id}>
      <div>
        <div className='service-title'>{name}</div>
        <p className='service-label'><strong>Repo Name: </strong> {repoUrl}</p>
        <p className='service-label'><strong>Branch:</strong> {branch}</p>
      </div>
      <div className='service-card__footer'>
        <Link to={`/services/${id}/terraform-setup`} className='project-button project-button--primary service-deploy-button'>
          Go through the deployment process
        </Link>

        {/* <Link
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
        </Link> */}
      </div>
    </div>
  );
}