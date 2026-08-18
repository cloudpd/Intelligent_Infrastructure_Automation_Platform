import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import '../Projects/Projects.css';
import './Dockerize.css';
import ExistingDockerfileForm from './ExistingDockerfileForm';
import GenerateDockerfileForm from './GenerateDockerfileForm';
import Breadcrumb from '../Shared/Breadcrumb';
import PipelineProgress from '../Shared/PipelineProgress';

export default function DockerizePage() {
  const { serviceId } = useParams();
  const [choice,    setChoice]    = useState(null); // null | 'existing' | 'generate'
  const [completed, setCompleted] = useState(false);
  const [projectId, setProjectId] = useState(null);

  // Attempt to extract projectId from state or sessionStorage (set by service navigation)
  // CI and K8s routes need it — if not available the links gracefully degrade in ServiceCard
  const storedProjectId = projectId || sessionStorage.getItem(`service_${serviceId}_projectId`);

  if (completed) {
    return (
      <div className='projects-shell'>
        <Breadcrumb crumbs={[
          { label: 'Home', to: '/home' },
          { label: 'Projects', to: '/projects' },
          { label: 'Dockerize' },
        ]} />

        <PipelineProgress activeStage={3} />

        <div className='projects-state projects-state--empty'>
          <i className='fa-solid fa-circle-check projects-state__icon' style={{ opacity: 1, color: 'var(--success)' }} aria-hidden='true' />
          <p style={{ color: 'var(--success)', fontWeight: 700 }}>Dockerfile step complete!</p>
          <p className='projects-state__hint'>Your service is now containerised. Set up your CI pipeline next.</p>
          <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap', justifyContent: 'center' }}>
            {storedProjectId && (
              <Link
                to={`/projects/${storedProjectId}/services/${serviceId}/ci`}
                className='project-button project-button--primary'
              >
                Set up CI Pipeline
                <i className='fa-solid fa-arrow-right' aria-hidden='true' />
              </Link>
            )}
            <Link to={-1} className='project-button project-button--ghost'>
              Back
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className='projects-shell'>
      <Breadcrumb crumbs={[
        { label: 'Home', to: '/home' },
        { label: 'Projects', to: '/projects' },
        { label: 'Dockerize' },
      ]} />

      <PipelineProgress activeStage={3} />

      <header className='projects-header'>
        <div>
          <h1 className='projects-title'>Dockerfile Setup</h1>
          <p className='projects-subtitle'>
            Before deploying, let's make sure your service has a Dockerfile.
          </p>
        </div>
      </header>

      {!choice && (
        <div className='dockerize-choice'>
          <button
            type='button'
            className='project-card dockerize-choice-card'
            onClick={() => setChoice('existing')}
          >
            <div className='dockerize-choice-card__icon'>
              <i className='fa-brands fa-docker' aria-hidden='true' />
            </div>
            <div>
              <p className='project-title'>I already have a Dockerfile</p>
              <p className='project-label'>My repo already contains one — I just need to tell you where it is.</p>
            </div>
            <i className='fa-solid fa-arrow-right dockerize-choice-card__arrow' aria-hidden='true' />
          </button>

          <button
            type='button'
            className='project-card dockerize-choice-card'
            onClick={() => setChoice('generate')}
          >
            <div className='dockerize-choice-card__icon'>
              <i className='fa-solid fa-wand-magic-sparkles' aria-hidden='true' />
            </div>
            <div>
              <p className='project-title'>Generate one for me</p>
              <p className='project-label'>We'll analyse your repo and generate an optimised Dockerfile.</p>
            </div>
            <i className='fa-solid fa-arrow-right dockerize-choice-card__arrow' aria-hidden='true' />
          </button>
        </div>
      )}

      {choice === 'existing' && (
        <ExistingDockerfileForm
          serviceId={serviceId}
          onBack={() => setChoice(null)}
          onDone={() => setCompleted(true)}
        />
      )}

      {choice === 'generate' && (
        <GenerateDockerfileForm
          serviceId={serviceId}
          onBack={() => setChoice(null)}
          onDone={() => setCompleted(true)}
        />
      )}
    </div>
  );
}