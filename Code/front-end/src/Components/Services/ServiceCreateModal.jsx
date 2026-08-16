import React from 'react';

export default function ServiceCreateModal({
  onClose,
  onSubmit,
  serviceName,
  setServiceName,
  repositoryUrl,
  setRepositoryUrl,
  branch,
  setBranch,
  submitting,
  error,
  success,
}) {
  return (
    <div className='add-project-modal' onClick={onClose}>
      <div className='add-project-modal__content' onClick={(e) => e.stopPropagation()}>
        <div className='add-project-modal__header'>
          <h2>Create new service</h2>
          <button type='button' className='add-project-modal__close' onClick={onClose}>
            ×
          </button>
        </div>
        <form className='add-project-form' onSubmit={onSubmit}>
          <label>
            Service name
            <input
              type='text'
              value={serviceName}
              onChange={(e) => setServiceName(e.target.value)}
              required
              placeholder='Enter service name'
            />
          </label>
          <label>
            Repository URL
            <input
              type='url'
              value={repositoryUrl}
              onChange={(e) => setRepositoryUrl(e.target.value)}
              required
              placeholder='Enter repository URL'
            />
          </label>
          <label>
            Branch
            <input
              type='text'
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
              required
              placeholder='Enter branch name'
            />
          </label>
          {error && <div className='project-alert project-alert--error'>{error}</div>}
          {success && <div className='project-alert project-alert--success'>{success}</div>}
          <div className='add-project-form__actions'>
            <button type='button' className='project-button project-button--ghost' onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button type='submit' className='project-button project-button--primary' disabled={submitting || !serviceName.trim()}>
              {submitting ? 'Creating...' : 'Create service'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
