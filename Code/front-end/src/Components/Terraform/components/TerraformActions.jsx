import React from 'react';
import { Link } from 'react-router-dom';

export default function TerraformActions({
  serviceId,
  setupComplete,
  generating,
  applying,
  applyPhase,
  state,
  actionError,
  actionSuccess,
  onGenerate,
  onApply,
  githubTokens,
  loadingGithubTokens,
  selectedGithubTokenId,
  setSelectedGithubTokenId,
  onPushToGithub,
  pushingToGithub,
}) {
  const pushDisabled = applyPhase !== 'completed' || pushingToGithub || !selectedGithubTokenId;

  return (
    <>
      {actionError && <p className='terraform-error'>{actionError}</p>}
      {actionSuccess && <p className='terraform-success'>{actionSuccess}</p>}

      <div className='terraform-actions'>
        <button
          type='button'
          className='project-button project-button--primary'
          onClick={onGenerate}
          disabled={!setupComplete || generating || !state?.deploymentType}
        >
          {generating ? 'Generating...' : 'Generate Terraform Files'}
        </button>
        <button
          type='button'
          className='project-button project-button--ghost'
          onClick={onApply}
          disabled={!setupComplete || generating || applying || !state?.generated || !state?.deploymentType}
        >
          {applying ? (applyPhase === 'completed' ? 'Completed' : 'Applying...') : 'Run Terraform Apply'}
        </button>
      </div>

      {applyPhase === 'completed' && (
        <div className='terraform-push-github'>
          <div className='terraform-push-github__row'>
            <div className='terraform-push-github__select-wrap'>
              <label className='terraform-field-label' htmlFor='githubTokenPush'>
                GitHub Token
              </label>
              {loadingGithubTokens && <p className='projects-subtitle'>Loading tokens...</p>}
              {!loadingGithubTokens && githubTokens.length === 0 && (
                <p className='projects-subtitle'>
                  No GitHub tokens found. <Link to='/github-tokens'>Add one</Link> first.
                </p>
              )}
              {!loadingGithubTokens && githubTokens.length > 0 && (
                <select
                  id='githubTokenPush'
                  className='terraform-input'
                  value={selectedGithubTokenId}
                  onChange={(e) => setSelectedGithubTokenId(e.target.value)}
                >
                  <option value=''>Select a token...</option>
                  {githubTokens.map((tok) => (
                    <option key={tok.id} value={tok.id}>
                      {tok.name || tok.description || `Token #${tok.id}`}
                    </option>
                  ))}
                </select>
              )}
            </div>
            <button
              type='button'
              className='project-button project-button--primary'
              onClick={onPushToGithub}
              disabled={pushDisabled}
            >
              {pushingToGithub ? 'Pushing...' : 'Push to GitHub'}
            </button>
          </div>
        </div>
      )}

      {state.generated && (
        <p className='terraform-readonly-row'>
          Terraform files are generated. Continue to{' '}
          <Link to={`/services/${serviceId}/dockerize`}>Docker workflow</Link>.
        </p>
      )}
    </>
  );
}
