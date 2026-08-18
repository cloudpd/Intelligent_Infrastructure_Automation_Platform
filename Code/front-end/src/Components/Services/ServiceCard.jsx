import React from 'react';
import { Link } from 'react-router-dom';
import './ServiceCard.css';
import StatusBadge from '../Shared/StatusBadge';

export default function ServiceCard({ service, projectId }) {
  const id = service.id || service._id;
  const name = service.name || 'Untitled service';
  const branch = service.branch || 'main';
  let repoDisplay = service.repository_url || '';
  repoDisplay = repoDisplay.replace(/^https?:\/\/github\.com\//, '') || '—';

  // Logical stage detection (can be expanded based on service state)
  const isTerraformSetupDone = Boolean(service.terraform_setup_complete || service.vpc_id || service.aws_credential_id);
  const isTerraformApplied = Boolean(service.terraform_applied || service.status === 'applied');
  const isDockerized = Boolean(service.dockerfile_path || service.dockerfile_complete);
  const isCiDone = Boolean(service.ci_pushed);

  // Determine current logical next action
  let primaryAction = {
    label: 'Start Setup',
    to: `/services/${id}/terraform-setup`,
    icon: 'fa-solid fa-arrow-right',
    stageName: 'Step 1: Terraform Setup',
  };

  if (isCiDone) {
    primaryAction = {
      label: 'Configure Kubernetes',
      to: projectId ? `/projects/${projectId}/services/${id}/k8s` : `/services/${id}/k8s`,
      icon: 'fa-solid fa-dharmachakra',
      stageName: 'Step 5: Kubernetes',
    };
  } else if (isDockerized) {
    primaryAction = {
      label: 'Set up CI Pipeline',
      to: projectId ? `/projects/${projectId}/services/${id}/ci` : `/services/${id}/ci`,
      icon: 'fa-solid fa-rotate',
      stageName: 'Step 4: CI Pipeline',
    };
  } else if (isTerraformApplied) {
    primaryAction = {
      label: 'Dockerize Service',
      to: `/services/${id}/dockerize`,
      icon: 'fa-brands fa-docker',
      stageName: 'Step 3: Dockerize',
    };
  } else if (isTerraformSetupDone) {
    primaryAction = {
      label: 'Configure & Apply Terraform',
      to: `/services/${id}/terraform-configuration`,
      icon: 'fa-solid fa-sliders',
      stageName: 'Step 2: Terraform Config',
    };
  }

  const STAGES = [
    { num: 1, label: 'Setup', done: isTerraformSetupDone },
    { num: 2, label: 'Config', done: isTerraformApplied },
    { num: 3, label: 'Docker', done: isDockerized },
    { num: 4, label: 'CI', done: isCiDone },
    { num: 5, label: 'K8s', done: Boolean(service.k8s_complete) },
  ];

  return (
    <div className='service-card service-card--modern'>
      {/* Header */}
      <div className='service-card__header'>
        <div className='service-card__brand'>
          <div className='service-card__icon-box'>
            <i className='fa-solid fa-cube' aria-hidden='true' />
          </div>
          <div>
            <h3 className='service-title'>{name}</h3>
            {repoDisplay !== '—' ? (
              <p className='service-label'>
                <i className='fa-brands fa-github service-card__meta-icon' aria-hidden='true' />
                <span title={service.repository_url}>{repoDisplay}</span>
                <span className='service-card__branch'> · {branch}</span>
              </p>
            ) : (
              <p className='service-label'>No repository linked</p>
            )}
          </div>
        </div>
        <StatusBadge
          status={isTerraformApplied ? 'live' : 'draft'}
          customLabel={isTerraformApplied ? 'Live' : 'Configuring'}
          size='sm'
        />
      </div>

      {/* Visual Pipeline Stage Dots */}
      <div className='service-card__pipeline-track'>
        <div className='pipeline-track__label-row'>
          <span className='pipeline-track__stage-title'>{primaryAction.stageName}</span>
        </div>
        <div className='pipeline-track__dots'>
          {STAGES.map((s, idx) => (
            <React.Fragment key={s.num}>
              <div
                className={`track-dot ${s.done ? 'track-dot--done' : idx === 0 || STAGES[idx - 1]?.done ? 'track-dot--active' : 'track-dot--locked'}`}
                title={`Step ${s.num}: ${s.label}`}
              >
                {s.done ? (
                  <i className='fa-solid fa-check' aria-hidden='true' />
                ) : (
                  <span>{s.num}</span>
                )}
              </div>
              {idx < STAGES.length - 1 && (
                <div className={`track-line ${s.done ? 'track-line--done' : ''}`} />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Single Primary Action Button */}
      <div className='service-card__footer'>
        <Link to={primaryAction.to} className='project-button project-button--primary service-card__btn'>
          <span>{primaryAction.label}</span>
          <i className={primaryAction.icon} aria-hidden='true' />
        </Link>
      </div>
    </div>
  );
}