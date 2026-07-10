import React, { useState } from 'react';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

export default function AddNewProject({ onCreated }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  function openModal() {
    setOpen(true);
    setError('');
    setSuccess('');
  }

  function closeModal() {
    setOpen(false);
    setName('');
    setDescription('');
    setSubmitting(false);
    setError('');
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSuccess('');
    setSubmitting(true);

    const token = localStorage.getItem('token');

    try {
      const response = await fetch(`${API_URL}/projects/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name, description }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.message || `Request failed with status ${response.status}`);
      }

      const createdProject = await response.json();
      setSuccess('Project created successfully.');
      setName('');
      setDescription('');
      onCreated?.();
      setTimeout(closeModal, 700);
      return createdProject;
    } catch (err) {
      setError(err.message || 'Could not create the project.');
      console.error('Create project failed:', err);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <article className='project-card project-card--new project-card--new-action' onClick={openModal}>
        <p className='plus-mark'>+</p>
        <p className='project-title'>Add a new project</p>
      </article>

      {open && (
        <div className='add-project-modal' onClick={closeModal}>
          <div className='add-project-modal__content' onClick={(e) => e.stopPropagation()}>
            <div className='add-project-modal__header'>
              <h2>Create New Project</h2>
              <button type='button' className='add-project-modal__close' onClick={closeModal}>
                ×
              </button>
            </div>

            <form className='add-project-form' onSubmit={handleSubmit}>
              <label>
                Project name
                <input
                  type='text'
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder='Enter project name'
                />
              </label>

              <label>
                Description
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder='Enter project description'
                  rows='4'
                />
              </label>

              {error && <div className='project-alert project-alert--error'>{error}</div>}
              {success && <div className='project-alert project-alert--success'>{success}</div>}

              <div className='add-project-form__actions'>
                <button type='button' className='project-button project-button--ghost' onClick={closeModal} disabled={submitting}>
                  Cancel
                </button>
                <button type='submit' className='project-button project-button--primary' disabled={submitting || !name.trim()}>
                  {submitting ? 'Creating...' : 'Create Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
