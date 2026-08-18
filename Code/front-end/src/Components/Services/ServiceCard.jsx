import React from 'react';
import { Link } from 'react-router-dom';
import './ServiceCard.css';

const PIPELINE_STAGES = [
  {
    key: 'terraform-setup',
    icon: 'fa-solid fa-gear',
    label: 'Terraform Setup',
    getTo: (serviceId) => `/services/${serviceId}/terraform-setup`,
  },
  {
    key: 'terraform-config',
    icon: 'fa-solid fa-sliders',
    label: 'Terraform Config',
    getTo: (serviceId) => `/services/${serviceId}/terraform-configuration`,
  },
  {
    key: 'dockerize',
    icon: 'fa-brands fa-docker',
    label: 'Dockerize',
    getTo: (serviceId) => `/services/${serviceId}/dockerize`,
  },
  {
    key: 'ci',
    icon: 'fa-solid fa-rotate',
    label: 'CI Pipeline',
    getTo: (serviceId, projectId) => `/projects/${projectId}/services/${serviceId}/ci`,
    needsProject: true,
  },
  {
    key: 'k8s',
    icon: 'fa-solid fa-dharmachakra',
    label: 'Kubernetes',
    getTo: (serviceId, projectId) => `/projects/${projectId}/services/${serviceId}/k8s`,
    needsProject: true,
  },
];

export default function ServiceCard({ service, projectId }) {
  const id        = service.id || service._id;
  const name      = service.name || 'Untitled service';
  const branch    = service.branch || '';
  let repoDisplay = service.repository_url || '';
  repoDisplay = repoDisplay
    .replace(/^https?:\/\/github\.com\//, '')
    .split('/')[1]
    ?.substring(0, 24) || repoDisplay.substring(0, 24) || '—';

  return (
    <div className='service-card service-card--pipeline'>
      {/* Card header */}
      <div className='service-card__header'>
        <div>
          <div className='service-title'>{name}</div>
          {repoDisplay && repoDisplay !== '—' && (
            <p className='service-label'>
              <i className='fa-brands fa-github service-card__meta-icon' aria-hidden='true' />
              {repoDisplay}
              {branch && <span className='service-card__branch'> · {branch}</span>}
            </p>
          )}
        </div>
      </div>

      {/* Pipeline stage buttons */}
      <div className='service-pipeline' role='list' aria-label='Deployment pipeline stages'>
        {PIPELINE_STAGES.map((stage) => {
          const to = (stage.needsProject && projectId)
            ? stage.getTo(id, projectId)
            : (!stage.needsProject ? stage.getTo(id) : null);

          // If CI/K8s but no projectId available, disable gracefully
          if (!to) {
            return (
              <div key={stage.key} className='service-pipeline__stage service-pipeline__stage--disabled' role='listitem'>
                <i className={stage.icon} aria-hidden='true' />
                <span>{stage.label}</span>
              </div>
            );
          }

          return (
            <Link
              key={stage.key}
              to={to}
              className='service-pipeline__stage'
              role='listitem'
              title={`Go to ${stage.label}`}
            >
              <i className={stage.icon} aria-hidden='true' />
              <span>{stage.label}</span>
              <i className='fa-solid fa-arrow-right service-pipeline__arrow' aria-hidden='true' />
            </Link>
          );
        })}
      </div>
    </div>
  );
}