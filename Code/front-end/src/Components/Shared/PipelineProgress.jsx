import React from 'react';
import './PipelineProgress.css';

/**
 * PipelineProgress — horizontal stepper showing the 5-stage deployment pipeline.
 *
 * @param {number} activeStage — 1-indexed stage that is currently active (1–5)
 *
 * Stages:
 *  1. Terraform Setup
 *  2. Terraform Config
 *  3. Dockerize
 *  4. CI Pipeline
 *  5. Kubernetes
 */

const STAGES = [
  { icon: 'fa-solid fa-gear',         label: 'Terraform Setup' },
  { icon: 'fa-solid fa-sliders',      label: 'Terraform Config' },
  { icon: 'fa-brands fa-docker',      label: 'Dockerize' },
  { icon: 'fa-solid fa-rotate',       label: 'CI Pipeline' },
  { icon: 'fa-solid fa-dharmachakra', label: 'Kubernetes' },
];

export default function PipelineProgress({ activeStage = 1 }) {
  return (
    <div className='pipeline-progress' role='list' aria-label='Deployment pipeline stages'>
      {STAGES.map((stage, idx) => {
        const stageNum = idx + 1;
        const isDone   = stageNum < activeStage;
        const isActive = stageNum === activeStage;
        const stateClass = isDone ? 'pipeline-stage--done' : isActive ? 'pipeline-stage--active' : 'pipeline-stage--idle';

        return (
          <React.Fragment key={stage.label}>
            <div
              className={`pipeline-stage ${stateClass}`}
              role='listitem'
              aria-current={isActive ? 'step' : undefined}
            >
              <div className='pipeline-stage__icon'>
                {isDone
                  ? <i className='fa-solid fa-check' aria-hidden='true' />
                  : <i className={stage.icon} aria-hidden='true' />
                }
              </div>
              <span className='pipeline-stage__label'>{stage.label}</span>
            </div>
            {idx < STAGES.length - 1 && (
              <div className={`pipeline-connector${isDone ? ' pipeline-connector--done' : ''}`} aria-hidden='true' />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}
