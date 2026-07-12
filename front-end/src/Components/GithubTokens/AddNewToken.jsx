import React, { useState } from 'react';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

export default function AddNewToken({ onCreated }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [token, setToken] = useState('');
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
    setToken('');
    setDescription('');
    setSubmitting(false);
    setError('');
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSuccess('');
    setSubmitting(true);

    const authToken = localStorage.getItem('token');

    try {
      const response = await fetch(`${API_URL}/github/tokens`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ name, token, description }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.message || `Request failed with status ${response.status}`);
      }

      const createdToken = await response.json();
      setSuccess('Token added successfully.');
      setName('');
      setToken('');
      setDescription('');
      onCreated?.();
      setTimeout(closeModal, 700);
      return createdToken;
    } catch (err) {
      setError(err.message || 'Could not add the token.');
      console.error('Add token failed:', err);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <article className='project-card project-card--new project-card--new-action' onClick={openModal}>
        <p className='plus-mark'>+</p>
        <p className='project-title'>Add a GitHub token</p>
      </article>

      {open && (
        <div className='add-project-modal' onClick={closeModal}>
          <div className='add-project-modal__content' onClick={(e) => e.stopPropagation()}>
            <div className='add-project-modal__header'>
              <h2>Add GitHub Token</h2>
              <button type='button' className='add-project-modal__close' onClick={closeModal}>
                ×
              </button>
            </div>

            <form className='add-project-form' onSubmit={handleSubmit}>
              <label>
                Token name
                <input
                  type='text'
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder='e.g. weather-app repo'
                />
              </label>

              <label>
                GitHub token
                <input
                  type='password'
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  required
                  placeholder='ghp_...'
                />
              </label>

              <label>
                Description
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder='What is this token for?'
                  rows='3'
                />
              </label>

              {error && <div className='project-alert project-alert--error'>{error}</div>}
              {success && <div className='project-alert project-alert--success'>{success}</div>}

              <div className='add-project-form__actions'>
                <button type='button' className='project-button project-button--ghost' onClick={closeModal} disabled={submitting}>
                  Cancel
                </button>
                <button type='submit' className='project-button project-button--primary' disabled={submitting || !name.trim() || !token.trim()}>
                  {submitting ? 'Saving...' : 'Add Token'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}