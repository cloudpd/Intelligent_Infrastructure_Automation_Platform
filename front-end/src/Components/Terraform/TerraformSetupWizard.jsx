import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import '../Projects/Projects.css';
import './Terraform.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

export default function TerraformSetupWizard() {
  const { serviceId } = useParams();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Step 1 — AWS Credentials
  const [credentials, setCredentials] = useState([]);
  const [loadingCredentials, setLoadingCredentials] = useState(true);
  const [selectedCredentialId, setSelectedCredentialId] = useState('');
  const [addingNew, setAddingNew] = useState(false);
  const [credName, setCredName] = useState('');
  const [accessKey, setAccessKey] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [savingCredential, setSavingCredential] = useState(false);

  // Step 2 — Terraform backend
  const [s3Bucket, setS3Bucket] = useState('');
  const [lockTable, setLockTable] = useState('');

  // Step 3 — Registry
  const [useEcr, setUseEcr] = useState(true);

  const authHeaders = useMemo(() => {
    const token = localStorage.getItem('token');
    return { Authorization: `Bearer ${token}` };
  }, []);

  useEffect(() => {
    setLoadingCredentials(true);
    fetch(`${API_URL}/aws`, { headers: authHeaders })
      .then((res) => {
        if (!res.ok) throw new Error(`Request failed with status ${res.status}`);
        return res.json();
      })
      .then((data) => {
        const list = data.data || [];
        setCredentials(list);
        if (list.length > 0) {
          setSelectedCredentialId(list[0].id);
        } else {
          setAddingNew(true);
        }
      })
      .catch((err) => {
        console.error('Failed to load AWS credentials:', err);
        setAddingNew(true);
      })
      .finally(() => setLoadingCredentials(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSaveCredentialAndContinue() {
    setError('');

    if (addingNew || credentials.length === 0) {
      if (!accessKey.trim() || !secretKey.trim()) {
        setError('Please enter your AWS access key ID and secret access key.');
        return;
      }
      setSavingCredential(true);
      try {
        const res = await fetch(`${API_URL}/aws`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...authHeaders },
          body: JSON.stringify({
            name: credName.trim() || null,
            access_key: accessKey.trim(),
            secret_key: secretKey.trim(),
          }),
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) {
          throw new Error(data?.message || `Request failed with status ${res.status}`);
        }
        setSelectedCredentialId(data.data.id);
        setStep(2);
      } catch (err) {
        setError(err.message || 'Could not save AWS credentials.');
      } finally {
        setSavingCredential(false);
      }
      return;
    }

    if (!selectedCredentialId) {
      setError('Please select an AWS account, or add a new one.');
      return;
    }
    setStep(2);
  }

  function goToStep3() {
    setError('');
    if (!s3Bucket.trim()) {
      setError('Please enter the S3 bucket URL for Terraform state.');
      return;
    }
    setStep(3);
  }

  async function handleFinish() {
    setError('');
    setSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/terraform/setup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({
          serviceId,
          awsCredentialId: selectedCredentialId,
          s3Bucket: s3Bucket.trim(),
          lockTable: lockTable.trim() || null,
          useEcr,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.message || `Request failed with status ${res.status}`);
      }
      navigate(`/services/${serviceId}/terraform-configuration`);
    } catch (err) {
      setError(err.message || 'Could not save Terraform setup.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className='projects-shell min-vh-100'>
      <header className='projects-header'>
        <div>
          <h1 className='projects-title'>Terraform Setup Wizard</h1>
          <p className='projects-subtitle'>Step {step} of 3</p>
        </div>
      </header>

      <div className='terraform-wizard-card'>
        {step === 1 && (
          <>
            <h2 className='terraform-step-title'>AWS Credentials</h2>
            <p className='projects-subtitle'>Which AWS account should this service's infrastructure use?</p>

            {loadingCredentials && <p className='projects-subtitle'>Loading your AWS accounts...</p>}

            {!loadingCredentials && credentials.length > 0 && !addingNew && (
              <>
                {credentials.map((cred) => (
                  <label className='terraform-radio' key={cred.id}>
                    <input
                      type='radio'
                      name='awsCredential'
                      checked={selectedCredentialId === cred.id}
                      onChange={() => setSelectedCredentialId(cred.id)}
                    />
                    {cred.name || cred.access_key}
                  </label>
                ))}
                <button
                  type='button'
                  className='project-button project-button--ghost terraform-add-new-button'
                  onClick={() => setAddingNew(true)}
                >
                  + Use a different AWS account
                </button>
              </>
            )}

            {!loadingCredentials && (addingNew || credentials.length === 0) && (
              <>
                {credentials.length > 0 && (
                  <button
                    type='button'
                    className='project-button project-button--ghost terraform-add-new-button'
                    onClick={() => setAddingNew(false)}
                  >
                    Use a saved account instead
                  </button>
                )}
                <label className='terraform-field-label' htmlFor='credName'>Name (optional)</label>
                <input
                  id='credName'
                  className='terraform-input'
                  type='text'
                  placeholder='e.g. Production AWS account'
                  value={credName}
                  onChange={(e) => setCredName(e.target.value)}
                />
                <label className='terraform-field-label' htmlFor='accessKey'>AWS Access Key ID</label>
                <input
                  id='accessKey'
                  className='terraform-input'
                  type='text'
                  value={accessKey}
                  onChange={(e) => setAccessKey(e.target.value)}
                />
                <label className='terraform-field-label' htmlFor='secretKey'>AWS Secret Access Key</label>
                <input
                  id='secretKey'
                  className='terraform-input'
                  type='password'
                  value={secretKey}
                  onChange={(e) => setSecretKey(e.target.value)}
                />
              </>
            )}

            {error && <p className='terraform-error'>{error}</p>}
            <div className='terraform-actions'>
              <button
                type='button'
                className='project-button project-button--primary'
                onClick={handleSaveCredentialAndContinue}
                disabled={loadingCredentials || savingCredential}
              >
                {savingCredential ? 'Saving...' : 'Next'}
              </button>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <h2 className='terraform-step-title'>Terraform Backend</h2>
            <p className='projects-subtitle'>Where will Terraform state be stored?</p>
            <label className='terraform-field-label' htmlFor='s3Bucket'>S3 Bucket URL</label>
            <input
              id='s3Bucket'
              className='terraform-input'
              type='text'
              placeholder='s3://terraform-state-prod'
              value={s3Bucket}
              onChange={(e) => setS3Bucket(e.target.value)}
            />
            <label className='terraform-field-label' htmlFor='lockTable'>DynamoDB Lock Table (Optional)</label>
            <input
              id='lockTable'
              className='terraform-input'
              type='text'
              placeholder='terraform-locks'
              value={lockTable}
              onChange={(e) => setLockTable(e.target.value)}
            />
            {error && <p className='terraform-error'>{error}</p>}
            <div className='terraform-actions'>
              <button type='button' className='project-button project-button--ghost' onClick={() => setStep(1)}>
                Back
              </button>
              <button type='button' className='project-button project-button--primary' onClick={goToStep3}>
                Next
              </button>
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <h2 className='terraform-step-title'>Container Registry</h2>
            <p className='projects-subtitle'>Where should container images be stored?</p>
            <label className='terraform-radio'>
              <input
                type='radio'
                name='registry'
                checked={useEcr === true}
                onChange={() => setUseEcr(true)}
              />
              AWS ECR
            </label>
            <label className='terraform-radio'>
              <input
                type='radio'
                name='registry'
                checked={useEcr === false}
                onChange={() => setUseEcr(false)}
              />
              GitHub Container Registry
            </label>
            {error && <p className='terraform-error'>{error}</p>}
            <div className='terraform-actions'>
              <button type='button' className='project-button project-button--ghost' onClick={() => setStep(2)} disabled={submitting}>
                Back
              </button>
              <button type='button' className='project-button project-button--primary' onClick={handleFinish} disabled={submitting}>
                {submitting ? 'Saving...' : 'Continue'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
