import React from 'react';

export default function SecretForm({
    registry,
    useExistingSecrets,
    onUseExistingSecretsToggle,
    awsEcrRegion,
    onAwsEcrRegionChange,
    secrets,
    onSecretChange,
    secretErrors,
    onSubmit,
    pushingSecrets,
    secretSubmitError,
}) {
    return (
        <section className='ci-card'>
            <div className='ci-card__header'>
                <div>
                    <h2 className='project-title'>2. Registry secrets</h2>
                    <p className='project-label'>Push the credentials that the deployment pipeline will need.</p>
                </div>
            </div>

            <form className='ci-form' onSubmit={onSubmit}>
                <label className='ci-field ci-checkbox'>
                    <input
                        type='checkbox'
                        checked={useExistingSecrets}
                        onChange={(event) => onUseExistingSecretsToggle(event.target.checked)}
                    />
                    I already have registry secrets configured in the repository
                </label>

                {!useExistingSecrets && (
                    <>
                        {registry === 'aws-ecr' ? (
                            <>
                                <label className={`ci-field ${secretErrors.awsEcrRegion ? 'ci-field--error' : ''}`}>
                                    AWS region
                                    <input
                                        value={awsEcrRegion}
                                        onChange={(event) => onAwsEcrRegionChange(event.target.value)}
                                        placeholder='e.g. eu-west-1'
                                    />
                                    {secretErrors.awsEcrRegion && <span className='ci-error'>{secretErrors.awsEcrRegion}</span>}
                                </label>
                                <label className={`ci-field ${secretErrors.AWS_ACCOUNT_ID ? 'ci-field--error' : ''}`}>
                                    AWS account ID
                                    <input
                                        value={secrets.AWS_ACCOUNT_ID || ''}
                                        onChange={(event) => onSecretChange('AWS_ACCOUNT_ID', event.target.value)}
                                        placeholder='e.g. 123456789012'
                                    />
                                    {secretErrors.AWS_ACCOUNT_ID && <span className='ci-error'>{secretErrors.AWS_ACCOUNT_ID}</span>}
                                </label>

                                <label className={`ci-field ${secretErrors.AWS_ACCESS_KEY_ID ? 'ci-field--error' : ''}`}>
                                    AWS access key ID
                                    <input
                                        value={secrets.AWS_ACCESS_KEY_ID || ''}
                                        onChange={(event) => onSecretChange('AWS_ACCESS_KEY_ID', event.target.value)}
                                    />
                                    {secretErrors.AWS_ACCESS_KEY_ID && <span className='ci-error'>{secretErrors.AWS_ACCESS_KEY_ID}</span>}
                                </label>
                                <label className={`ci-field ${secretErrors.AWS_SECRET_ACCESS_KEY ? 'ci-field--error' : ''}`}>
                                    AWS secret access key
                                    <input
                                        value={secrets.AWS_SECRET_ACCESS_KEY || ''}
                                        onChange={(event) => onSecretChange('AWS_SECRET_ACCESS_KEY', event.target.value)}
                                    />
                                    {secretErrors.AWS_SECRET_ACCESS_KEY && <span className='ci-error'>{secretErrors.AWS_SECRET_ACCESS_KEY}</span>}
                                </label>
                            </>
                        ) : (
                            <>
                                <label className={`ci-field ${secretErrors.DOCKER_USERNAME ? 'ci-field--error' : ''}`}>
                                    Docker username
                                    <input
                                        value={secrets.DOCKER_USERNAME || ''}
                                        onChange={(event) => onSecretChange('DOCKER_USERNAME', event.target.value)}
                                    />
                                    {secretErrors.DOCKER_USERNAME && <span className='ci-error'>{secretErrors.DOCKER_USERNAME}</span>}
                                </label>
                                <label className={`ci-field ${secretErrors.DOCKER_PASSWORD ? 'ci-field--error' : ''}`}>
                                    Docker password
                                    <input
                                        type='password'
                                        value={secrets.DOCKER_PASSWORD || ''}
                                        onChange={(event) => onSecretChange('DOCKER_PASSWORD', event.target.value)}
                                    />
                                    {secretErrors.DOCKER_PASSWORD && <span className='ci-error'>{secretErrors.DOCKER_PASSWORD}</span>}
                                </label>
                            </>
                        )}

                        {secretSubmitError && <div className='ci-error-message'>{secretSubmitError}</div>}

                        <button type='submit' className='project-button project-button--primary' disabled={pushingSecrets}>
                            {pushingSecrets ? 'Pushing secrets...' : 'Push secrets'}
                        </button>
                    </>
                )}
            </form>
        </section>
    );
}