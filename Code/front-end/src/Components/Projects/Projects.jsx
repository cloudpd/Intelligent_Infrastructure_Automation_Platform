import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import './Projects.css';
import AddNewProject from './AddNewProject';
import { baseUrl as API_URL } from '../Shared/baseUrl';
import Breadcrumb from '../Shared/Breadcrumb';
import StatusBadge from '../Shared/StatusBadge';

function ProjectCard({ project }) {
  const id = project.id || project._id;
  const title = project.title || project.name || 'Untitled project';
  const description = project.description || project.body || 'Infrastructure workspace environment.';
  const serviceCount = project.services?.length ?? project.serviceCount ?? project.services_count ?? 0;

  return (
    <Link to={`/projects/${id}`} className='project-card project-card--link'>
      <div>
        <div className='project-card__top'>
          <div className='project-title'>{title}</div>
          <StatusBadge status='healthy' customLabel='Active' size='sm' />
        </div>
        {description && <p className='project-label'>{description}</p>}
      </div>
      <div className='project-status'>
        <span className='project-status__count'>
          <i className='fa-solid fa-cubes' aria-hidden='true' style={{ marginRight: '6px', color: 'var(--accent)' }} />
          {serviceCount} {serviceCount === 1 ? 'service' : 'services'}
        </span>
        <i className='fa-solid fa-chevron-right project-status__arrow' aria-hidden='true' />
      </div>
    </Link>
  );
}

export default function Projects() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState('');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'table'

  useEffect(() => {
    fetchProjects();
  }, []);

  function fetchProjects() {
    setLoading(true);
    setError(null);

    const token = localStorage.getItem('token');
    const headers = { Authorization: `Bearer ${token}` };

    Promise.all([
      fetch(`${API_URL}/projects/list`, { headers })
        .then((r) => (r.ok ? r.json() : []))
        .catch(() => []),
      fetch(`${API_URL}/services/list-all`, { headers })
        .then((r) => (r.ok ? r.json() : { services: [] }))
        .catch(() => ({ services: [] })),
    ])
      .then(([projectsData, servicesData]) => {
        const rawProjects = Array.isArray(projectsData) ? projectsData : projectsData.projects || [];
        const rawServices = Array.isArray(servicesData) ? servicesData : servicesData.services || [];

        const enriched = rawProjects.map((proj) => {
          const pId = proj.id || proj._id;
          const matchingServices = rawServices.filter(
            (s) => String(s.project_id) === String(pId) || String(s.project?.id) === String(pId)
          );
          const existingServices = Array.isArray(proj.services) ? proj.services : [];
          const combinedServices = matchingServices.length > 0 ? matchingServices : existingServices;

          return {
            ...proj,
            services: combinedServices,
            serviceCount: combinedServices.length,
          };
        });

        setProjects(enriched);
      })
      .catch((err) => {
        console.error('Failed to fetch projects:', err);
        setError('Could not load your projects. Please verify backend connectivity.');
      })
      .finally(() => setLoading(false));
  }

  const filtered = query.trim()
    ? projects.filter((p) => {
        const name = (p.title || p.name || '').toLowerCase();
        const desc = (p.description || p.body || '').toLowerCase();
        return name.includes(query.toLowerCase()) || desc.includes(query.toLowerCase());
      })
    : projects;

  return (
    <div className='projects-shell'>
      <Breadcrumb crumbs={[
        { label: 'Home', to: '/home' },
        { label: 'Projects' },
      ]} />

      <header className='projects-header'>
        <div>
          <h1 className='projects-title'>Projects &amp; Environments</h1>
          <p className='projects-subtitle'>Manage application environments, container services, and cloud infrastructure pipelines.</p>
        </div>
        <div className='projects-header__controls'>
          <div className='view-toggle' role='radiogroup' aria-label='View layout'>
            <button
              type='button'
              className={`view-toggle__btn ${viewMode === 'grid' ? 'view-toggle__btn--active' : ''}`}
              onClick={() => setViewMode('grid')}
              title='Grid View'
            >
              <i className='fa-solid fa-border-all' aria-hidden='true' />
            </button>
            <button
              type='button'
              className={`view-toggle__btn ${viewMode === 'table' ? 'view-toggle__btn--active' : ''}`}
              onClick={() => setViewMode('table')}
              title='Table View'
            >
              <i className='fa-solid fa-list' aria-hidden='true' />
            </button>
          </div>
          <div className='projects-search'>
            <input
              type='search'
              placeholder='Search environments…'
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label='Filter projects'
            />
          </div>
        </div>
      </header>

      {loading && (
        <div className='projects-state'>
          <div className='skeleton-grid'>
            {[1, 2, 3].map((n) => (
              <div key={n} className='skeleton-card' aria-hidden='true'>
                <div className='skeleton-line skeleton-line--title' />
                <div className='skeleton-line skeleton-line--body' />
                <div className='skeleton-line skeleton-line--body skeleton-line--short' />
              </div>
            ))}
          </div>
        </div>
      )}

      {!loading && error && (
        <div className='projects-state projects-state--error'>
          <i className='fa-solid fa-circle-exclamation projects-state__icon' aria-hidden='true' />
          <p>{error}</p>
          <button type='button' className='project-button project-button--primary' onClick={fetchProjects}>
            Try again
          </button>
        </div>
      )}

      {!loading && !error && viewMode === 'grid' && (
        <div className='projects-grid'>
          <AddNewProject onCreated={fetchProjects} />

          {filtered.map((project) => (
            <ProjectCard key={project.id || project._id} project={project} />
          ))}
        </div>
      )}

      {!loading && !error && viewMode === 'table' && (
        <div className='projects-table-container'>
          <table className='enterprise-table'>
            <thead>
              <tr>
                <th>Project Name</th>
                <th>Description</th>
                <th>Services</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((project) => {
                const id = project.id || project._id;
                const title = project.title || project.name || 'Untitled';
                const desc = project.description || project.body || '—';
                const sCount = project.services?.length ?? project.serviceCount ?? 0;
                return (
                  <tr key={id}>
                    <td>
                      <Link to={`/projects/${id}`} className='table-link-title'>
                        <i className='fa-solid fa-folder-closed table-icon' aria-hidden='true' />
                        <strong>{title}</strong>
                      </Link>
                    </td>
                    <td className='table-desc'>{desc}</td>
                    <td>
                      <span className='table-badge'>
                        <i className='fa-solid fa-cubes' style={{ marginRight: '4px' }} />
                        {sCount}
                      </span>
                    </td>
                    <td><StatusBadge status='healthy' customLabel='Active' size='sm' /></td>
                    <td style={{ textAlign: 'right' }}>
                      <Link to={`/projects/${id}`} className='project-button project-button--ghost project-button--sm'>
                        Open Project <i className='fa-solid fa-arrow-right' aria-hidden='true' style={{ marginLeft: '4px' }} />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {!loading && !error && projects.length === 0 && (
        <div className='projects-state projects-state--empty-hero'>
          <div className='empty-hero__icon'>
            <i className='fa-solid fa-diagram-project' aria-hidden='true' />
          </div>
          <h3 className='empty-hero__title'>No projects found</h3>
          <p className='empty-hero__subtitle'>Create your first project to organize applications and cloud resources.</p>
        </div>
      )}

      {!loading && !error && projects.length > 0 && filtered.length === 0 && (
        <div className='projects-state'>
          <i className='fa-solid fa-magnifying-glass projects-state__icon' aria-hidden='true' />
          <p>No projects match "<strong>{query}</strong>"</p>
        </div>
      )}
    </div>
  );
}