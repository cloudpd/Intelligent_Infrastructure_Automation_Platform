import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import '../Projects/Projects.css';
import './Dockerize.css';
import ExistingDockerfileForm from './ExistingDockerfileForm';
import GenerateDockerfileForm from './GenerateDockerfileForm';
import Breadcrumb from '../Shared/Breadcrumb';
import PipelineProgress from '../Shared/PipelineProgress';
import { baseUrl as API_URL } from '../Shared/baseUrl';

export default function DockerizePage() {
  const { serviceId } = useParams();
  const [choice, setChoice] = useState(null); // null | 'existing' | 'generate'
  const [completed, setCompleted] = useState(false);
  const [service, setService] = useState(null);
  const [projectId, setProjectId] = useState(() => sessionStorage.getItem(`service_${serviceId}_projectId`));

  useEffect(() => {
    if (!serviceId) return;
    const token = localStorage.getItem('token');
    fetch(`${API_URL}/services/get/${serviceId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        const s = data.service || data;
        if (s) {
          setService(s);
          const pId = s.project_id || s.project?.id;
          if (pId) {
            setProjectId(pId);
            sessionStorage.setItem(`service_${serviceId}_projectId`, pId);
          }
        }
      })
      .catch((err) => console.error('Failed to fetch service details:', err));
  }, [serviceId]);

  const ciPath = projectId
    ? `/projects/${projectId}/services/${serviceId}/ci`
    : `/services/${serviceId}/ci`;

  const projectName = service?.project?.name || 'Project';
  const serviceName = service?.name || 'Service';

  if (completed) {
    return (
      <div className='projects-shell'>
        <Breadcrumb crumbs={[
          { label: 'Home', to: '/home' },
          { label: 'Projects', to: '/projects' },
          ...(projectId ? [{ label: projectName, to: `/projects/${projectId}` }] : []),
          { label: serviceName },
          { label: 'Dockerize' },
        ]} />

        <PipelineProgress activeStage={3} serviceId={serviceId} projectId={projectId} />

        <div className='dockerize-completion-card'>
          <div className='dockerize-completion-card__badge'>
            <i className='fa-solid fa-circle-check' aria-hidden='true' />
          </div>
          <h2 className='dockerize-completion-card__title'>Dockerfile Ready!</h2>
          <p className='dockerize-completion-card__text'>
            Your service container configuration has been verified. Next, set up your continuous integration workflow.
          </p>

          <div className='dockerize-completion-card__actions'>
            <Link to={ciPath} className='project-button project-button--primary project-button--lg'>
              <span>Continue to CI Pipeline</span>
              <i className='fa-solid fa-arrow-right' aria-hidden='true' />
            </Link>
            {projectId ? (
              <Link to={`/projects/${projectId}`} className='project-button project-button--ghost'>
                Back to service
              </Link>
            ) : (
              <Link to='/projects' className='project-button project-button--ghost'>
                Back to projects
              </Link>
            )}
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
        ...(projectId ? [{ label: projectName, to: `/projects/${projectId}` }] : []),
        { label: serviceName },
        { label: 'Dockerize' },
      ]} />

      <PipelineProgress activeStage={3} serviceId={serviceId} projectId={projectId} />

      <header className='projects-header'>
        <div>
          <h1 className='projects-title'>Containerize Service</h1>
          <p className='projects-subtitle'>
            Set up a Dockerfile for <strong>{serviceName}</strong> to package your code for automated deployments.
          </p>
        </div>
        <div>
          <Link to={`/services/${serviceId}/terraform-configuration`} className='project-button project-button--ghost'>
            <i className='fa-solid fa-arrow-left' style={{ marginRight: '6px' }} aria-hidden='true' />
            Back to Config
          </Link>
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
              <p className='project-label'>Specify the path to an existing Dockerfile inside your repository.</p>
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
              <p className='project-title'>Generate Dockerfile</p>
              <p className='project-label'>Analyze your application stack and create an optimized Dockerfile.</p>
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