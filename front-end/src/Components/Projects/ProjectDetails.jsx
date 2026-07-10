import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import './Projects.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

export default function ProjectDetails() {
  const { projectId } = useParams();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!projectId) return;

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
        <article className='project-card project-card--detail'>
          <div>
            <div className='project-title'>{project.title || project.name || 'Untitled project'}</div>
            <p className='project-label'>{project.description || project.body || 'No description available.'}</p>
          </div>

          <div className='project-detail-grid'>
            <div className='project-detail-item'>
              <span className='project-detail-key'>Project ID</span>
              <span className='project-detail-value'>{project.id || project._id || '—'}</span>
            </div>
            <div className='project-detail-item'>
              <span className='project-detail-key'>Status</span>
              <span className='project-detail-value'>{project.status || 'Unknown'}</span>
            </div>
            <div className='project-detail-item'>
              <span className='project-detail-key'>Created</span>
              <span className='project-detail-value'>{new Date(project.created_at || project.createdAt || project.date || Date.now()).toLocaleString()}</span>
            </div>
            <div className='project-detail-item'>
              <span className='project-detail-key'>Updated</span>
              <span className='project-detail-value'>{new Date(project.updated_at || project.updatedAt || project.date || Date.now()).toLocaleString()}</span>
            </div>
          </div>
        </article>
      )}
    </div>
  );
}
