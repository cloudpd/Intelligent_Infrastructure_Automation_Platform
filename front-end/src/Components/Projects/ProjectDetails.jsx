import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ServiceCard, ServiceCreateModal } from '../Services';
import './Projects.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

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

  return (
    <div className='projects-shell'>
      <header className='projects-header'>
        <div>
          <h1 className='projects-title'>Project details</h1>
          <p className='projects-subtitle'>Review the full project data and metadata below.</p>
        </div>
        <div>
          <Link to='/projects' className='project-button project-button--ghost'>Back to projects</Link>
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
              <p className='projects-subtitle'>Add and deploy services for this project.</p>
            </div>
            <button type='button' className='project-button project-button--ghost' onClick={openServiceModal}>
              Add service
            </button>
          </div>

          <div className='service-grid'>
            <article className='project-card project-card--new project-card--new-action service-add-card' onClick={openServiceModal}>
              <p className='plus-mark'>+</p>
              <p className='project-title'>Add a new service</p>
            </article>

            {projectServices.length > 0 ? (
              projectServices.map((service) => (
                <ServiceCard key={service.id || service._id} service={service} />
              ))
            ) : (
              <div className='projects-state'>
                <p>No services yet. Add your first service to deploy your app.</p>
              </div>
            )}
          </div>
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
