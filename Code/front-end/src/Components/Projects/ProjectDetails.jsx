import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ServiceCard, ServiceCreateModal } from '../Services';
import './Projects.css';
import { baseUrl as API_URL } from '../Shared/baseUrl';
import Breadcrumb from '../Shared/Breadcrumb';
import StatusBadge from '../Shared/StatusBadge';


export default function ProjectDetails() {
  const { projectId } = useParams();
  const [project, setProject] = useState(null);
  const [projectServices, setProjectServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [serviceModalOpen, setServiceModalOpen] = useState(false);
  const [serviceName, setServiceName] = useState('');
  const [repositoryUrl, setRepositoryUrl] = useState('');
  const [branch, setBranch] = useState('main');
  const [serviceSubmitting, setServiceSubmitting] = useState(false);
  const [serviceError, setServiceError] = useState('');
  const [serviceSuccess, setServiceSuccess] = useState('');


  function fetchProjectDetails() {
    const token = localStorage.getItem('token');
    setLoading(true);
    setError(null);

    fetch(`${API_URL}/projects/get/${projectId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Request failed with status ${res.status}`);
        }
        return res.json();
      })
      .then((data) => {
        setProject(data.project || data || null);
      })
      .catch((err) => {
        console.error('Failed to fetch project details:', err);
        setError('Unable to load project details.');
      })
      .finally(() => setLoading(false));
  }

  function fetchProjectServices() {
    const token = localStorage.getItem('token');
    setLoading(true);
    setError(null);

    fetch(`${API_URL}/services/list/${projectId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Request failed with status ${res.status}`);
        }
        return res.json();
      })
      .then((data) => {
        setProjectServices(data.services || data || []);
      })
      .catch((err) => {
        console.error('Failed to fetch project services:', err);
        setError('Unable to load project services.');
      })
      .finally(() => setLoading(false));
  }

  function openServiceModal() {
    setServiceError('');
    setServiceSuccess('');
    setServiceModalOpen(true);
  }

  function closeServiceModal() {
    setServiceModalOpen(false);
    setServiceName('');
    setRepositoryUrl('');
    setBranch('main');
    setServiceSubmitting(false);
    setServiceError('');
    setServiceSuccess('');
  }

  async function handleCreateService(event) {
    event.preventDefault();
    setServiceError('');
    setServiceSuccess('');
    setServiceSubmitting(true);

    const token = localStorage.getItem('token');

    try {
      const response = await fetch(`${API_URL}/services/create/${projectId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: serviceName,
          repository_url: repositoryUrl,
          branch,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.message || `Request failed with status ${response.status}`);
      }

      const result = await response.json();
      setServiceSuccess('Service created successfully.');
      setServiceName('');
      setRepositoryUrl('');
      setBranch('main');
      fetchProjectServices();
      setTimeout(closeServiceModal, 800);
      return result;
    } catch (err) {
      setServiceError(err.message || 'Could not create the service.');
      console.error('Create service failed:', err);
    } finally {
      setServiceSubmitting(false);
    }
  }

  useEffect(() => {
    if (!projectId) return;
    fetchProjectDetails();
    fetchProjectServices();
    
  }, [projectId]);

  const projectName = project?.name || project?.title || 'Project';

  return (
    <div className='projects-shell'>
      <Breadcrumb crumbs={[
        { label: 'Home', to: '/home' },
        { label: 'Projects', to: '/projects' },
        { label: projectName },
      ]} />

      <header className='projects-header'>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            <h1 className='projects-title'>{projectName}</h1>
            <StatusBadge status='healthy' customLabel='Active' size='md' />
          </div>
          <p className='projects-subtitle'>Manage services and launch your deployment pipeline.</p>
        </div>
        <div>
          <Link to='/projects' className='project-button project-button--ghost'>
            <i className='fa-solid fa-arrow-left' style={{ marginRight: '6px' }} aria-hidden='true' />
            Back to projects
          </Link>
        </div>
      </header>

      {loading && (
        <div className='projects-state'>
          <p>Loading project details...</p>
        </div>
      )}

      {error && !loading && (
        <div className='projects-state projects-state--error'>
          <p>{error}</p>
        </div>
      )}

      {!loading && !error && project && (
        <section className='service-section'>
          <div className='service-section__header'>
            <div>
              <h2 className='projects-title'>Services</h2>
              <p className='projects-subtitle'>Services and infrastructure components in this project.</p>
            </div>
            {projectServices.length > 0 && (
              <button type='button' className='project-button project-button--primary' onClick={openServiceModal}>
                <i className='fa-solid fa-plus' aria-hidden='true' style={{ marginRight: '6px' }} />
                Add service
              </button>
            )}
          </div>

          {projectServices.length > 0 ? (
            <div className='service-grid'>
              <article className='project-card project-card--new project-card--new-action service-add-card' onClick={openServiceModal}>
                <p className='plus-mark'>+</p>
                <p className='project-title'>Add a new service</p>
              </article>

              {projectServices.map((service) => (
                <ServiceCard
                  key={service.id || service._id}
                  service={service}
                  projectId={projectId}
                />
              ))}
            </div>
          ) : (
            <div className='projects-state projects-state--empty-hero'>
              <div className='empty-hero__icon'>
                <i className='fa-solid fa-layer-group' aria-hidden='true' />
              </div>
              <h3 className='empty-hero__title'>No services in this project yet</h3>
              <p className='empty-hero__subtitle'>Connect your repository and launch your infrastructure pipeline in minutes.</p>
              <button type='button' className='project-button project-button--primary project-button--lg' onClick={openServiceModal}>
                <i className='fa-solid fa-plus' aria-hidden='true' style={{ marginRight: '6px' }} />
                Create your first service
              </button>
            </div>
          )}
        </section>
      )}

      {serviceModalOpen && (
        <ServiceCreateModal
          onClose={closeServiceModal}
          onSubmit={handleCreateService}
          serviceName={serviceName}
          setServiceName={setServiceName}
          repositoryUrl={repositoryUrl}
          setRepositoryUrl={setRepositoryUrl}
          branch={branch}
          setBranch={setBranch}
          submitting={serviceSubmitting}
          error={serviceError}
          success={serviceSuccess}
        />
      )}
    </div>
  );
}
