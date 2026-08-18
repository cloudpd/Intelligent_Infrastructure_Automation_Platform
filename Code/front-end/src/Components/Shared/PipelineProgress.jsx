import React from 'react';
import { Link } from 'react-router-dom';
import './PipelineProgress.css';

/**
 * PipelineProgress — horizontal stepper showing the 5-stage deployment pipeline.
 *
 * @param {number} activeStage — 1-indexed stage that is currently active (1–5)
 * @param {string} [serviceId] — optional service ID to make steps clickable links
 * @param {string} [projectId] — optional project ID for nested route links
 */

const STAGES = [
  { key: 'tf-setup',  icon: 'fa-solid fa-gear',         label: 'Terraform Setup',  getPath: (sId) => `/services/${sId}/terraform-setup` },
  { key: 'tf-config', icon: 'fa-solid fa-sliders',      label: 'Terraform Config', getPath: (sId) => `/services/${sId}/terraform-configuration` },
  { key: 'dockerize', icon: 'fa-brands fa-docker',      label: 'Dockerize',        getPath: (sId) => `/services/${sId}/dockerize` },
  { key: 'ci',        icon: 'fa-solid fa-rotate',       label: 'CI Pipeline',     getPath: (sId, pId) => pId ? `/projects/${pId}/services/${sId}/ci` : `/services/${sId}/ci` },
  { key: 'k8s',       icon: 'fa-solid fa-dharmachakra', label: 'Kubernetes',      getPath: (sId, pId) => pId ? `/projects/${pId}/services/${sId}/k8s` : `/services/${sId}/k8s` },
];

export default function PipelineProgress({ activeStage = 1, serviceId, projectId }) {
  return (
    <div className='pipeline-progress' role='list' aria-label='Deployment pipeline stages'>
      {STAGES.map((stage, idx) => {
        const stageNum = idx + 1;
        const isDone   = stageNum < activeStage;
        const isActive = stageNum === activeStage;
        const stateClass = isDone ? 'pipeline-stage--done' : isActive ? 'pipeline-stage--active' : 'pipeline-stage--idle';

        const path = serviceId ? stage.getPath(serviceId, projectId) : null;

        const stageContent = (
          <>
            <div className='pipeline-stage__icon'>
              {isDone
                ? <i className='fa-solid fa-check' aria-hidden='true' />
                : <i className={stage.icon} aria-hidden='true' />
              }
            </div>
            <span className='pipeline-stage__label'>{stage.label}</span>
          </>
        );

        return (
          <React.Fragment key={stage.label}>
            {path ? (
              <Link
                data-stage={stageNum}
                to={path}
                className={`pipeline-stage pipeline-stage--clickable ${stateClass}`}
                role='listitem'
                aria-current={isActive ? 'step' : undefined}
                title={`Go to ${stage.label}`}
              >
                {stageContent}
              </Link>
            ) : (
              <div
                data-stage={stageNum}
                className={`pipeline-stage ${stateClass}`}
                role='listitem'
                aria-current={isActive ? 'step' : undefined}
              >
                {stageContent}
              </div>
            )}
            {idx < STAGES.length - 1 && (
              <div className={`pipeline-connector${isDone ? ' pipeline-connector--done' : ''}`} aria-hidden='true' />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}
