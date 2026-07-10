import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import './Projects.css'
import AddNewProject from './AddNewProject'

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000'


function ProjectCard({project}) {
  const id = project.id || project._id;
  const title = project.title || project.name || 'Untitled project';
  const description = project.description || project.body || '';
  const date = project.date || project.updated_at || project.created_at || '';

  return (
    <Link key={id} to={`/projects/${id}`} className='project-card project-card--link'>
      <div>
        <div className='project-title'>{title}</div>
        <p className='project-label'>{description}</p>
      </div>
    </Link>
  );
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
        // add the projects to the list
        setProjects(list);
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
        <AddNewProject onCreated={fetchProjects} />

        {!loading && !error && projects.map((project) => {
          return (
            <ProjectCard key={project.id} project={project} />
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