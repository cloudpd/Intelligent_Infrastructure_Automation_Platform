import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import '../Projects/Projects.css';
import ExistingDockerfileForm from './ExistingDockerfileForm';
import GenerateDockerfileForm from './GenerateDockerfileForm';

export default function DockerizePage() {
  const { serviceId } = useParams();
  const [choice, setChoice] = useState(null); // null | 'existing' | 'generate'
  const [completed, setCompleted] = useState(false);

  if (completed) {
    return (
      <div className='projects-shell'>
        <div className='projects-state'>
          <p>✅ Dockerfile step complete for this service.</p>
          <Link to={-1} className='project-button project-button--primary'>
            Back to service
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className='projects-shell'>
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
          <article
            className='project-card dockerize-choice-card'
            onClick={() => setChoice('existing')}
          >
            <p className='project-title'>I already have a Dockerfile</p>
            <p className='project-label'>My repo already contains one — I just need to tell you where it is.</p>
          </article>

          <article
            className='project-card dockerize-choice-card'
            onClick={() => setChoice('generate')}
          >
            <p className='project-title'>I don't have one yet</p>
            <p className='project-label'>Pick your language and we'll generate one for you.</p>
          </article>
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