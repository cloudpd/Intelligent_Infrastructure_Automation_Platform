import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import '../Projects/Projects.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

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
      <header className='projects-header'>
        <div>
          <h1 className='projects-title'>Services</h1>
          <p className='projects-subtitle'>All services across your projects.</p>
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

      {!loading && !error && (
        <div className='service-grid'>
          {services.length > 0 ? (
            services.map((service) => (
              <div className='service-card' key={service.id || service._id}>
                <div>
                  <p className='service-label'><strong>Project</strong></p>
                  <div className='service-title'>{service.project?.name || 'Unknown project'}</div>
                  <p className='service-label'><strong>Service</strong></p>
                  <div className='service-title'>{service.name}</div>
                </div>
                <div className='service-card__footer'>
                  <Link
                    to={`/services/${service.id || service._id}/terraform-setup`}
                    className='project-button project-button--primary service-deploy-button'
                  >
                    Open
                  </Link>
                </div>
              </div>
            ))
          ) : (
            <div className='projects-state'>
              <p>No services yet. Create a project and add a service to get started.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}