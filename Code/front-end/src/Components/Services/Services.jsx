import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import '../Projects/Projects.css';
import { baseUrl as API_URL } from '../Shared/baseUrl';
import Breadcrumb from '../Shared/Breadcrumb';
import StatusBadge from '../Shared/StatusBadge';

export default function Services() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    setLoading(true);
    setError(null);

    fetch(`${API_URL}/services/list-all`, {
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
        setServices(data.services || data || []);
      })
      .catch((err) => {
        console.error('Failed to fetch services:', err);
        setError('Unable to load services.');
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className='projects-shell min-vh-100'>
      <Breadcrumb crumbs={[
        { label: 'Home', to: '/home' },
        { label: 'Services' },
      ]} />

      <header className='projects-header'>
        <div>
          <h1 className='projects-title'>Services Catalog</h1>
          <p className='projects-subtitle'>All application services and container workloads across your projects.</p>
        </div>
      </header>

      {loading && (
        <div className='projects-state'>
          <p>Loading services...</p>
        </div>
      )}

      {error && !loading && (
        <div className='projects-state projects-state--error'>
          <p>{error}</p>
        </div>
      )}

      {!loading && !error && services.length === 0 && (
        <div className='projects-state projects-state--empty-hero'>
          <div className='empty-hero__icon'>
            <i className='fa-solid fa-layer-group' aria-hidden='true' />
          </div>
          <h3 className='empty-hero__title'>No services found</h3>
          <p className='empty-hero__subtitle'>Create a project and connect your application repository to launch a service.</p>
          <Link to='/projects' className='project-button project-button--primary project-button--lg'>
            Go to Projects
          </Link>
        </div>
      )}

      {!loading && !error && services.length > 0 && (
        <div className='projects-table-container'>
          <table className='enterprise-table'>
            <thead>
              <tr>
                <th>Service Name</th>
                <th>Project</th>
                <th>Repository</th>
                <th>Branch</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {services.map((service) => {
                const id = service.id || service._id;
                const name = service.name || 'Untitled service';
                const projectName = service.project?.name || 'Project';
                const pId = service.project_id || service.project?.id;
                const repo = service.repository_url ? service.repository_url.replace(/^https?:\/\/github\.com\//, '') : '—';
                const branch = service.branch || 'main';

                return (
                  <tr key={id}>
                    <td>
                      <Link to={`/services/${id}/terraform-setup`} className='table-link-title'>
                        <i className='fa-solid fa-cube table-icon' aria-hidden='true' />
                        <strong>{name}</strong>
                      </Link>
                    </td>
                    <td>
                      {pId ? (
                        <Link to={`/projects/${pId}`} className='auth-link' style={{ fontSize: 'inherit' }}>
                          {projectName}
                        </Link>
                      ) : (
                        <span>{projectName}</span>
                      )}
                    </td>
                    <td>
                      {repo !== '—' ? (
                        <span className='table-badge'>
                          <i className='fa-brands fa-github' style={{ marginRight: '4px' }} />
                          {repo}
                        </span>
                      ) : (
                        <span>—</span>
                      )}
                    </td>
                    <td>
                      <span className='table-badge'>{branch}</span>
                    </td>
                    <td>
                      <StatusBadge status='healthy' customLabel='Active' size='sm' />
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <Link
                        to={`/services/${id}/terraform-setup`}
                        className='project-button project-button--primary project-button--sm'
                      >
                        Launch Pipeline <i className='fa-solid fa-arrow-right' aria-hidden='true' style={{ marginLeft: '4px' }} />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}