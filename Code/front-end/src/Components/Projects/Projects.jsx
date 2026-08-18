import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import './Projects.css'
import AddNewProject from './AddNewProject'
import { baseUrl as API_URL } from '../Shared/baseUrl';
import Breadcrumb from '../Shared/Breadcrumb';


function ProjectCard({ project }) {
  const id          = project.id || project._id;
  const title       = project.title || project.name || 'Untitled project';
  const description = project.description || project.body || '';
  const serviceCount = project.serviceCount ?? project.services_count ?? null;

  return (
    <Link to={`/projects/${id}`} className='project-card project-card--link'>
      <div>
        <div className='project-title'>{title}</div>
        {description && <p className='project-label'>{description}</p>}
      </div>
      <div className='project-status'>
        {serviceCount !== null && (
          <span>
            <i className='fa-solid fa-layer-group' aria-hidden='true' style={{ marginRight: '4px' }} />
            {serviceCount} {serviceCount === 1 ? 'service' : 'services'}
          </span>
        )}
        <i className='fa-solid fa-arrow-right' aria-hidden='true' style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }} />
      </div>
    </Link>
  );
}

export default function Projects() {
  const [projects, setProjects] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState(null)
  const [query,    setQuery]    = useState('')

  useEffect(() => {
    fetchProjects()
  }, [])

  function fetchProjects() {
    setLoading(true)
    setError(null)

    const token = localStorage.getItem('token');
    const url   = `${API_URL}/projects/list`

    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => {
        if (!res.ok) throw new Error(`Request failed with status ${res.status}`)
        return res.json()
      })
      .then((data) => {
        const list = Array.isArray(data) ? data : (data.projects || [])
        setProjects(list);
      })
      .catch((err) => {
        console.error('Failed to fetch projects:', err)
        setError('Could not load your projects. Is the backend running?')
      })
      .finally(() => setLoading(false))
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
          <h1 className='projects-title'>Your Projects</h1>
          <p className='projects-subtitle'>Deploy, monitor, and manage every service in one place.</p>
        </div>
        <div className='projects-search'>
          <input
            type='search'
            placeholder='Search projects…'
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label='Search projects'
          />
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

      {!loading && !error && (
        <div className='projects-grid'>
          <AddNewProject onCreated={fetchProjects} />

          {filtered.map((project) => (
            <ProjectCard key={project.id || project._id} project={project} />
          ))}
        </div>
      )}

      {!loading && !error && projects.length === 0 && (
        <div className='projects-state projects-state--empty'>
          <i className='fa-solid fa-diagram-project projects-state__icon' aria-hidden='true' />
          <p>No projects yet.</p>
          <p className='projects-state__hint'>Create your first project to start deploying services.</p>
        </div>
      )}

      {!loading && !error && projects.length > 0 && filtered.length === 0 && (
        <div className='projects-state'>
          <i className='fa-solid fa-magnifying-glass projects-state__icon' aria-hidden='true' />
          <p>No projects match "<strong>{query}</strong>"</p>
        </div>
      )}
    </div>
  )
}