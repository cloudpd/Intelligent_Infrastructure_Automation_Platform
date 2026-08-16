import React, { useState } from 'react';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

export default function ExistingDockerfileForm({ serviceId, onBack, onDone }) {
  const [dockerfilePath, setDockerfilePath] = useState('Dockerfile');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSubmitting(true);

    const token = localStorage.getItem('token');

    try {
      const response = await fetch(`${API_URL}/dockerize/existing`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ service_id: serviceId, dockerfile_path: dockerfilePath }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.message || `Request failed with status ${response.status}`);
      }

      onDone();
    } catch (err) {
      setError(err.message || 'Could not save your Dockerfile path.');
      console.error('Mark existing dockerfile failed:', err);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className='add-project-modal__content dockerize-form-panel'>
      <h2>Where's your Dockerfile?</h2>
      <p className='project-label'>
        Tell us the path relative to your repository root — e.g. <code>Dockerfile</code> or <code>backend/Dockerfile</code>.
      </p>

      <form className='add-project-form' onSubmit={handleSubmit}>
        <label>
          Dockerfile path
          <input
            type='text'
            value={dockerfilePath}
            onChange={(e) => setDockerfilePath(e.target.value)}
            required
            placeholder='Dockerfile'
          />
        </label>

        {error && <div className='project-alert project-alert--error'>{error}</div>}

        <div className='add-project-form__actions'>
          <button type='button' className='project-button project-button--ghost' onClick={onBack} disabled={submitting}>
            Back
          </button>
          <button type='submit' className='project-button project-button--primary' disabled={submitting || !dockerfilePath.trim()}>
            {submitting ? 'Saving...' : 'Confirm'}
          </button>
        </div>
      </form>
    </div>
  );
}