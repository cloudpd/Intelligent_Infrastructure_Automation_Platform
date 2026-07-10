import React, { useEffect, useState } from 'react'
import './Projects.css'

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000'
function getStatusMeta(rawStatus) {
  const status = (rawStatus || '').toString().toUpperCase()

  const map = {
    LIVE: { statusClass: 'status-pill--live', badgeColor: '#22c55e' },
    BUILDING: { statusClass: 'status-pill--building', badgeColor: '#f59e0b' },
    FAILED: { statusClass: 'status-pill--failed', badgeColor: '#f87171' },
  }

  return {
    status: status || 'UNKNOWN',
    ...(map[status] || { statusClass: 'status-pill--unknown', badgeColor: '#94a3b8' }),
  }
}

export default function Projects() {
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchProjects()
  }, [])

  function fetchProjects() {
    setLoading(true)
    setError(null)

    const token = localStorage.getItem('token');

    const url = `${API_URL}/projects/list`
    fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Request failed with status ${res.status}`)
        }
        return res.json()
      })
      .then((data) => {
        // Accept either a raw array or { projects: [...] }
        const list = Array.isArray(data) ? data : (data.projects || [])
        setProjects(list)
      })
      .catch((err) => {
        console.error('Failed to fetch projects:', err)
        setError('Could not load your projects. Is the backend running on localhost:5000?')
      })
      .finally(() => {
        setLoading(false)
      })
  }

  return (
    <div className='projects-shell'>
      <header className='projects-header'>
        <div>
          <h1 className='projects-title'>Your Projects</h1>
          <p className='projects-subtitle'>Deploy, monitor, and manage every service in one place.</p>
        </div>
        <div className='projects-search'>
          <input type='search' placeholder='Search projects...' />
        </div>
      </header>

      <div className='projects-grid'>
        <article className='project-card project-card--new'>
          <div>
            <div className='project-title'>
              <span className='plus-mark'>+</span>
              New Project
            </div>
            <p className='project-label'>Deploy from a Git repository</p>
          </div>
        </article>

        {!loading && !error && projects.map((project) => {
          const title = project.title || project.name || 'Untitled project'
          const description = project.description || ''
          const date = project.date || project.updated_at || project.created_at || ''
          const { status, statusClass, badgeColor } = getStatusMeta(project.status)

          return (
            <article key={project.id || title} className='project-card'>
              <div>
                <div className='project-title'>{title}</div>
                <p className='project-label'>{description}</p>
              </div>
              <div>
                <div className={`status-pill ${statusClass}`}>{status}</div>
                <div className='project-status'>
                  <span className='project-stats'>
                    <span className='status-dot' style={{ color: badgeColor }} />
                    <span>{description.toLowerCase().includes('api') ? 'API service' : 'Service'}</span>
                  </span>
                  <span>{date}</span>
                </div>
              </div>
            </article>
          )
        })}
      </div>

      {loading &&
        <div className='projects-state'>
          <p>Loading your projects...</p>
        </div>
      }

      {!loading && error &&
        <div className='projects-state projects-state--error'>
          <p>{error}</p>
          <button type='button' onClick={fetchProjects}>Try again</button>
        </div>
      }

      {/* {!loading && !error && projects.length === 0 &&
        <div className='projects-state'>
          <p>No projects yet. Deploy your first project from a Git repository to see it here.</p>
        </div>
      } */}
    </div>
  )
}