import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import '../Projects/Projects.css';
import './ci-service.css';
import SecretForm from './SecretForm';
import CIForm from './CIForm';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

export default function CIServicePage() {
    const { projectId, serviceId } = useParams();
    const [service, setService] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);
    const [previewing, setPreviewing] = useState(false);
    const [pushingWorkflow, setPushingWorkflow] = useState(false);
    const [pushingSecrets, setPushingSecrets] = useState(false);
    const [previewYaml, setPreviewYaml] = useState('');
    const [showPreviewModal, setShowPreviewModal] = useState(false);
    const [ciConfigSaved, setCiConfigSaved] = useState(false);
    const [config, setConfig] = useState({
        pipelineName: '',
        triggerBranch: 'main',
        registry: 'docker-hub',
        imageName: '',
        enableTrivy: false,
        enableLint: false,
        enableTests: false,
        enableBuild: false,
        awsEcrRegion: '',
    });
    // NOTE: no more shared "emptySecretState" constant with hardcoded
    // DOCKER_USERNAME/DOCKER_PASSWORD keys. Starting from {} means whatever
    // registry is selected only ever populates the keys relevant to it.
    const [secrets, setSecrets] = useState({});
    const [fieldErrors, setFieldErrors] = useState({});
    const [secretErrors, setSecretErrors] = useState({});
    const [saveError, setSaveError] = useState('');
    const [secretSubmitError, setSecretSubmitError] = useState('');
    const [useExistingSecrets, setUseExistingSecrets] = useState(false);
    const [statusMessage, setStatusMessage] = useState('');

    const authHeaders = useMemo(() => {
        const token = localStorage.getItem('token');
        return { Authorization: `Bearer ${token}` };
    }, []);

    useEffect(() => {
        async function loadService() {
            setLoading(true);
            setError('');
            try {
                const response = await fetch(`${API_URL}/services/get/${serviceId}`, { headers: authHeaders });
                const data = await response.json().catch(() => null);
                if (!response.ok) throw new Error(data?.message || 'Unable to load service.');
                const serviceData = data.service || data || null;
                setService(serviceData);
                setConfig((prev) => ({
                    ...prev,
                    pipelineName: `${serviceData?.name || 'service'}-pipeline`,
                    imageName: serviceData?.name || 'service',
                }));
            } catch (err) {
                setError(err.message || 'Unable to load service.');
            } finally {
                setLoading(false);
            }
        }

        if (serviceId) {
            loadService();
        }
    }, [authHeaders, serviceId]);

    const clearFieldError = (field) => {
        setFieldErrors((prev) => {
            const next = { ...prev };
            delete next[field];
            return next;
        });
    };

    const clearSecretError = (field) => {
        setSecretErrors((prev) => {
            const next = { ...prev };
            delete next[field];
            return next;
        });
    };

    const handleChange = (field, value) => {
        setConfig((prev) => ({ ...prev, [field]: value }));
        clearFieldError(field);
        setCiConfigSaved(false);
        if (field === 'registry') {
            setSecretErrors({});
            // Fully reset secrets state on registry change — previously this
            // reset to a constant that always contained DOCKER_USERNAME /
            // DOCKER_PASSWORD keys, so switching to aws-ecr still left those
            // (empty) keys sitting in state and later in the request body.
            setSecrets({});
        }
    };

    const handleSecretChange = (field, value) => {
        setSecrets((prev) => ({ ...prev, [field]: value }));
        clearSecretError(field);
    };

    const validateCIConfig = () => {
        const errors = {};
        if (!config.pipelineName.trim()) {
            errors.pipelineName = 'Pipeline name is required.';
        }
        if (!config.triggerBranch.trim()) {
            errors.triggerBranch = 'Trigger branch is required.';
        }
        if (!config.imageName.trim()) {
            errors.imageName = 'Image name is required.';
        }
        setFieldErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const validateSecrets = () => {
        const errors = {};
        if (useExistingSecrets) {
            setSecretErrors({});
            return true;
        }
        if (config.registry === 'aws-ecr') {
            if (!config.awsEcrRegion.trim()) {
                errors.awsEcrRegion = 'AWS region is required.';
            }
            if (!secrets.AWS_ACCOUNT_ID?.trim()) {
                errors.AWS_ACCOUNT_ID = 'AWS account ID is required.';
            } else if (!/^\d{12}$/.test(secrets.AWS_ACCOUNT_ID.trim())) {
                errors.AWS_ACCOUNT_ID = 'AWS account ID must be exactly 12 digits.';
            }
            if (!secrets.AWS_ACCESS_KEY_ID?.trim()) {
                errors.AWS_ACCESS_KEY_ID = 'AWS access key ID is required.';
            }
            if (!secrets.AWS_SECRET_ACCESS_KEY?.trim()) {
                errors.AWS_SECRET_ACCESS_KEY = 'AWS secret access key is required.';
            }
        }
        else {
            if (!secrets.DOCKER_USERNAME?.trim()) {
                errors.DOCKER_USERNAME = 'Docker username is required.';
            }
            if (!secrets.DOCKER_PASSWORD?.trim()) {
                errors.DOCKER_PASSWORD = 'Docker password is required.';
            }
        }
        setSecretErrors(errors);
        return Object.keys(errors).length === 0;
    };

    // Builds the payload sent to the backend, containing only the keys
    // relevant to the currently selected registry. This is what actually
    // fixes the bug: previously the whole `secrets` state object (which
    // could contain leftover keys from a different registry) was sent
    // as-is.
    const buildSecretsPayload = () => {
        if (config.registry === 'aws-ecr') {
            return {
                AWS_ACCOUNT_ID: secrets.AWS_ACCOUNT_ID,
                AWS_ACCESS_KEY_ID: secrets.AWS_ACCESS_KEY_ID,
                AWS_SECRET_ACCESS_KEY: secrets.AWS_SECRET_ACCESS_KEY,
                AWS_REGION: config.awsEcrRegion,
            };
        }
        return {
            DOCKER_USERNAME: secrets.DOCKER_USERNAME,
            DOCKER_PASSWORD: secrets.DOCKER_PASSWORD,
        };
    };

    const handleSaveConfig = async (event) => {
        event.preventDefault();
        setSaving(true);
        setSaveError('');
        setError('');
        setStatusMessage('');

        if (!validateCIConfig()) {
            setSaving(false);
            return;
        }

        try {
            const response = await fetch(`${API_URL}/services/${serviceId}/ci`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...authHeaders },
                body: JSON.stringify({
                    serviceId,
                    ...config,
                }),
            });
            const data = await response.json().catch(() => null);
            if (!response.ok) throw new Error(data?.message || 'Unable to save CI config.');
            setStatusMessage('CI configuration saved.');
            setCiConfigSaved(true);
        } catch (err) {
            setSaveError(err.message || 'Unable to save CI config.');
        } finally {
            setSaving(false);
        }
    };

    const handlePreviewWorkflow = async () => {
        setPreviewing(true);
        setSaveError('');
        setError('');
        setStatusMessage('');

        try {
            const response = await fetch(`${API_URL}/services/${serviceId}/ci/preview`, { headers: authHeaders });
            const data = await response.json().catch(() => null);
            if (!response.ok) throw new Error(data?.message || 'Unable to preview workflow.');
            setPreviewYaml(data?.workflow?.yaml || '');
            setStatusMessage('Workflow preview generated.');
            setShowPreviewModal(true);
        } catch (err) {
            setError(err.message || 'Unable to preview workflow.');
        } finally {
            setPreviewing(false);
        }
    };

    const handlePushWorkflow = async () => {
        setPushingWorkflow(true);
        setSaveError('');
        setError('');
        setStatusMessage('');

        try {
            const response = await fetch(`${API_URL}/services/${serviceId}/ci/push`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...authHeaders },
                body: JSON.stringify({}),
            });
            const data = await response.json().catch(() => null);
            if (!response.ok) throw new Error(data?.message || 'Unable to push workflow.');
            setStatusMessage('Workflow pushed to GitHub.');
        } catch (err) {
            setError(err.message || 'Unable to push workflow.');
        } finally {
            setPushingWorkflow(false);
        }
    };

    const handlePushSecrets = async (event) => {
        event.preventDefault();
        setPushingSecrets(true);
        setSecretSubmitError('');
        setError('');
        setStatusMessage('');

        if (!validateSecrets()) {
            setPushingSecrets(false);
            return;
        }

        if (useExistingSecrets) {
            setStatusMessage('Skipping secret push because secrets are already configured.');
            setPushingSecrets(false);
            return;
        }

        try {
            const response = await fetch(`${API_URL}/services/${serviceId}/ci/secrets`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...authHeaders },
                body: JSON.stringify({
                    registry: config.registry === 'aws-ecr' ? 'aws-ecr' : 'docker',
                    secrets: buildSecretsPayload(),
                }),
            });
            const data = await response.json().catch(() => null);
            if (!response.ok) throw new Error(data?.message || 'Unable to push secrets.');
            setStatusMessage('Registry secrets pushed.');
        } catch (err) {
            setSecretSubmitError(err.message || 'Unable to push secrets.');
        } finally {
            setPushingSecrets(false);
        }
    };

    return (
        <div className='projects-shell'>
            <header className='projects-header'>
                <div>
                    <h1 className='projects-title'>CI & Secrets Setup</h1>
                    <p className='projects-subtitle'>Add your registry secrets first, then configure the CI workflow for {service?.name || 'this service'}.</p>
                </div>
                <div className='ci-actions'>
                    <Link to={projectId ? `/projects/${projectId}` : '/projects'} className='project-button project-button--ghost'>Back to project</Link>
                </div>
            </header>

            {loading ? (
                <div className='projects-state'>Loading service data...</div>
            ) : error ? (
                <div className='projects-state projects-state--error'>{error}</div>
            ) : (
                <div className='ci-page-grid'>
                    <CIForm
                        config={config}
                        fieldErrors={fieldErrors}
                        onConfigChange={handleChange}
                        onSubmit={handleSaveConfig}
                        onPreview={handlePreviewWorkflow}
                        onPushWorkflow={handlePushWorkflow}
                        saving={saving}
                        previewing={previewing}
                        pushingWorkflow={pushingWorkflow}
                        saveError={saveError}
                        configSaved={ciConfigSaved}
                    />

                    <SecretForm
                        registry={config.registry}
                        useExistingSecrets={useExistingSecrets}
                        onUseExistingSecretsToggle={setUseExistingSecrets}
                        awsEcrRegion={config.awsEcrRegion}
                        onAwsEcrRegionChange={(value) => handleChange('awsEcrRegion', value)}
                        secrets={secrets}
                        onSecretChange={handleSecretChange}
                        secretErrors={secretErrors}
                        onSubmit={handlePushSecrets}
                        pushingSecrets={pushingSecrets}
                        secretSubmitError={secretSubmitError}
                    />
                </div>
            )}

            {statusMessage && <div className='ci-status'>{statusMessage}</div>}

            {showPreviewModal && (
                <div className='ci-modal-overlay' onClick={() => setShowPreviewModal(false)}>
                    <div className='ci-modal' onClick={(event) => event.stopPropagation()}>
                        <div className='ci-modal__header'>
                            <h3 className='project-title'>Workflow preview</h3>
                            <button
                                type='button'
                                className='ci-modal__close'
                                onClick={() => setShowPreviewModal(false)}
                                aria-label='Close preview'
                            >
                                ×
                            </button>
                        </div>
                        <div className='ci-modal__body'>
                            <pre className='ci-preview'>{previewYaml}</pre>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}