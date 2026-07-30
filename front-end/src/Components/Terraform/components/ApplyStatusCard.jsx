import React from 'react';

const APPLY_STATUS_COPY = {
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

export default function ApplyStatusCard({ applyPhase, applyProgress }) {
  if (applyPhase === 'idle') return null;

  const status = APPLY_STATUS_COPY[applyPhase];
  if (!status) return null;

  return (
    <div className={`terraform-status-card terraform-status-card--${applyPhase}`}>
      <div className='terraform-status-header'>
        <span className='terraform-status-title'>{status.title}</span>
        <span className='terraform-status-badge'>{status.badge}</span>
      </div>
      <div className='terraform-progress-track'>
        <div
          className={`terraform-progress-fill ${applyPhase === 'completed' ? 'terraform-progress-fill--completed' : ''}`}
          style={{ width: `${applyProgress}%` }}
        />
      </div>
      <p className='terraform-status-message'>{status.message}</p>
    </div>
  );
}