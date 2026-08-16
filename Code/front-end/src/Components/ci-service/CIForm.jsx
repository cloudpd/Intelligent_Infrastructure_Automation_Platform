import React from 'react';

export default function CIForm({
  config,
  fieldErrors,
  onConfigChange,
  onSubmit,
  onPreview,
  onPushWorkflow,
  saving,
  previewing,
  pushingWorkflow,
  saveError,
  configSaved,
}) {
  return (
    <section className='ci-card'>
      <div className='ci-card__header'>
        <div>
          <h2 className='project-title'>1. CI workflow</h2>
          <p className='project-label'>Create the workflow and generate the deployment pipeline.</p>
        </div>
      </div>

      <form className='ci-form' onSubmit={onSubmit}>
        <label className='ci-field'>
          Registry type
          <select value={config.registry} onChange={(event) => onConfigChange('registry', event.target.value)}>
            <option value='docker-hub'>Docker Hub</option>
            <option value='aws-ecr'>AWS ECR</option>
          </select>
        </label>

        <label className={`ci-field ${fieldErrors.pipelineName ? 'ci-field--error' : ''}`}>
          Pipeline name
          <input value={config.pipelineName} onChange={(event) => onConfigChange('pipelineName', event.target.value)} />
          {fieldErrors.pipelineName && <span className='ci-error'>{fieldErrors.pipelineName}</span>}
        </label>

        <label className={`ci-field ${fieldErrors.triggerBranch ? 'ci-field--error' : ''}`}>
          Trigger branch
          <input value={config.triggerBranch} onChange={(event) => onConfigChange('triggerBranch', event.target.value)} />
          {fieldErrors.triggerBranch && <span className='ci-error'>{fieldErrors.triggerBranch}</span>}
        </label>

        <label className={`ci-field ${fieldErrors.imageName ? 'ci-field--error' : ''}`}>
          Image name
          <input value={config.imageName} onChange={(event) => onConfigChange('imageName', event.target.value)} />
          {fieldErrors.imageName && <span className='ci-error'>{fieldErrors.imageName}</span>}
        </label>

        <label className='ci-field ci-checkbox'>
          <input type='checkbox' checked={config.enableTrivy} onChange={(event) => onConfigChange('enableTrivy', event.target.checked)} />
          Enable Trivy security scan
        </label>

        <label className='ci-field ci-checkbox'>
          <input type='checkbox' checked={config.enableLint} onChange={(event) => onConfigChange('enableLint', event.target.checked)} />
          Enable linting
        </label>

        <label className='ci-field ci-checkbox'>
          <input type='checkbox' checked={config.enableTests} onChange={(event) => onConfigChange('enableTests', event.target.checked)} />
          Enable tests
        </label>

        <label className='ci-field ci-checkbox'>
          <input type='checkbox' checked={config.enableBuild} onChange={(event) => onConfigChange('enableBuild', event.target.checked)} />
          Enable build
        </label>

        {saveError && <div className='ci-error-message'>{saveError}</div>}

        <div className='ci-actions ci-actions--stack'>
          <button type='submit' className='project-button project-button--primary' disabled={saving}>
            {saving ? 'Saving...' : configSaved ? 'Save again' : 'Save CI config'}
          </button>

          {configSaved && (
            <>
              <button type='button' className='project-button project-button--ghost' onClick={onPreview} disabled={previewing}>
                {previewing ? 'Generating preview...' : 'Preview workflow'}
              </button>
              <button type='button' className='project-button project-button--primary' onClick={onPushWorkflow} disabled={pushingWorkflow}>
                {pushingWorkflow ? 'Pushing...' : 'Push workflow'}
              </button>
            </>
          )}
        </div>
      </form>
    </section>
  );
}