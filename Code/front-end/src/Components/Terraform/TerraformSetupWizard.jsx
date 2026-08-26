import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import '../Projects/Projects.css';
import './Terraform.css';
import { baseUrl as API_URL } from '../Shared/baseUrl';
import Breadcrumb from '../Shared/Breadcrumb';


export default function TerraformSetupWizard() {
  const { serviceId } = useParams();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [error, setError] = useState('');
  const [githubSecretStatus, setGithubSecretStatus] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [pushingGithubSecrets, setPushingGithubSecrets] = useState(false);

  // Step 1 — AWS Credentials
  const [credentials, setCredentials] = useState([]);
  const [loadingCredentials, setLoadingCredentials] = useState(true);
  const [selectedCredentialId, setSelectedCredentialId] = useState('');
  const [addingNew, setAddingNew] = useState(false);
  const [credName, setCredName] = useState('');
  const [accessKey, setAccessKey] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [savingCredential, setSavingCredential] = useState(false);

  // Step 1 — GitHub token (used when pushing secrets to the repo)
  const [githubTokens, setGithubTokens] = useState([]);
  const [loadingGithubTokens, setLoadingGithubTokens] = useState(true);
  const [selectedGithubTokenId, setSelectedGithubTokenId] = useState('');

  // Step 2 — Terraform backend
  const [s3Bucket, setS3Bucket] = useState('');
  const [lockTable, setLockTable] = useState('');

  // Step 3 — Registry
  const [useEcr, setUseEcr] = useState(true);

  // Step 4 — Network
  const [networkForm, setNetworkForm] = useState({
    name: 'demo-network',
    region: 'us-east-1',
    cidr: '10.0.0.0/16',
  });
  const [existingVpc, setExistingVpc] = useState(null);
  const [loadingExistingNetwork, setLoadingExistingNetwork] = useState(false);
  const [loadingNetworkStep, setLoadingNetworkStep] = useState(false);
  const [savingNetwork, setSavingNetwork] = useState(false);

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

  useEffect(() => {
    setLoadingGithubTokens(true);
    fetch(`${API_URL}/github/tokens`, { headers: authHeaders })
      .then((res) => {
        if (!res.ok) throw new Error(`Request failed with status ${res.status}`);
        return res.json();
      })
      .then((data) => {
        const list = data.tokens || [];
        setGithubTokens(list);
        if (list.length > 0) {
          setSelectedGithubTokenId(list[0].id);
        }
      })
      .catch((err) => {
        console.error('Failed to load GitHub tokens:', err);
      })
      .finally(() => setLoadingGithubTokens(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!serviceId) return;

    setLoadingExistingNetwork(true);
    fetch(`${API_URL}/infra/network/${serviceId}/vpcs`, { headers: authHeaders })
      .then((res) => {
        if (!res.ok) throw new Error(`Request failed with status ${res.status}`);
        return res.json();
      })
      .then((data) => {
        const list = Array.isArray(data?.data) ? data.data : [];
        const firstVpc = list[0] || null;
        setExistingVpc(firstVpc);

        if (firstVpc) {
          setNetworkForm({
            name: firstVpc.name || 'demo-network',
            region: firstVpc.region || 'us-east-1',
            cidr: firstVpc.cidr || '10.0.0.0/16',
          });
        } else {
          setNetworkForm({
            name: 'demo-network',
            region: 'us-east-1',
            cidr: '10.0.0.0/16',
          });
        }
      })
      .catch((err) => {
        console.error('Failed to load VPCs:', err);
        setExistingVpc(null);
      })
      .finally(() => setLoadingExistingNetwork(false));
  }, [authHeaders, serviceId]);

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

  async function prepareNetworkStep() {
    setError('');
    setLoadingNetworkStep(true);
    try {
      const res = await fetch(`${API_URL}/infra/network/${serviceId}/vpcs`, { headers: authHeaders });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.message || `Request failed with status ${res.status}`);
      }

      const list = Array.isArray(data?.data) ? data.data : [];
      const firstVpc = list[0] || null;
      setExistingVpc(firstVpc);

      if (firstVpc) {
        setNetworkForm({
          name: firstVpc.name || 'demo-network',
          region: firstVpc.region || 'us-east-1',
          cidr: firstVpc.cidr || '10.0.0.0/16',
        });
      } else {
        setNetworkForm({
          name: 'demo-network',
          region: 'us-east-1',
          cidr: '10.0.0.0/16',
        });
      }

      await new Promise((resolve) => setTimeout(resolve, 1000));
      setStep(4);
    } catch (err) {
      setError(err.message || 'Could not load the network setup.');
    } finally {
      setLoadingNetworkStep(false);
    }
  }

  async function handlePushCredentialsToGithub() {
    setError('');
    setGithubSecretStatus('');

    let credentialPayload = null;

    try {
      if (addingNew || credentials.length === 0) {
        if (!accessKey.trim() || !secretKey.trim()) {
          throw new Error('Please enter your AWS access key and secret key before pushing credentials to GitHub secrets.');
        }

        if(!accessKey.trim().length > 0 || !secretKey.trim().length > 0) {
          throw new Error('Please enter your AWS access key and secret key before pushing credentials to GitHub secrets.');
        }

        credentialPayload = {
          AWS_ACCESS_KEY_ID: accessKey.trim(),
          AWS_SECRET_ACCESS_KEY: secretKey.trim(),
          // AWS_REGION: networkForm.region.trim() || 'us-east-1',
        };
      } else {
        if (!selectedCredentialId) {
          throw new Error('Please select an AWS credential before pushing it to GitHub secrets.');
        }

        const res = await fetch(`${API_URL}/aws/${selectedCredentialId}/decrypted`, { headers: authHeaders });
        const data = await res.json().catch(() => null);

        if (!res.ok) {
          throw new Error(data?.message || `Request failed with status ${res.status}`);
        }

        credentialPayload = {
          AWS_ACCESS_KEY_ID: data?.data?.access_key,
          AWS_SECRET_ACCESS_KEY: data?.data?.secret_key,
          // AWS_REGION: networkForm.region.trim() || 'us-east-1',
        };
      }

      if (!credentialPayload.AWS_ACCESS_KEY_ID || !credentialPayload.AWS_SECRET_ACCESS_KEY) {
        throw new Error('The selected AWS credential is missing keys and cannot be pushed.');
      }

      if (!selectedGithubTokenId) {
        throw new Error('Please select a GitHub token before pushing credentials to GitHub secrets.');
      }

      setPushingGithubSecrets(true);
      const res = await fetch(`${API_URL}/github/${serviceId}/secrets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({ secrets: credentialPayload, githubTokenId: selectedGithubTokenId }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.message || `Request failed with status ${res.status}`);
      }
      setGithubSecretStatus('AWS credentials were pushed to GitHub secrets.');
    } catch (err) {
      setError(err.message || 'Could not push AWS credentials to GitHub secrets.');
    } finally {
      setPushingGithubSecrets(false);
    }
  }

  async function handleFinish() {
    setError('');
    setGithubSecretStatus('');
    setSubmitting(true);
    setSavingNetwork(true);

    try {
      const name = networkForm.name.trim();
      const region = networkForm.region.trim();
      const cidr = networkForm.cidr.trim();

      if (!name || !region || !cidr) {
        throw new Error('Please complete the VPC name, region, and CIDR block.');
      }

      const networkPayload = { name, region, cidr };

      if (existingVpc && existingVpc.id) {
        const patchRes = await fetch(`${API_URL}/infra/network/vpcs/${existingVpc.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', ...authHeaders },
          body: JSON.stringify(networkPayload),
        });
        const patchData = await patchRes.json().catch(() => null);
        if (!patchRes.ok) {
          throw new Error(patchData?.message || `Request failed with status ${patchRes.status}`);
        }
      } else {
        const networkRes = await fetch(`${API_URL}/infra/network/${serviceId}/vpcs`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...authHeaders },
          body: JSON.stringify(networkPayload),
        });
        const networkData = await networkRes.json().catch(() => null);
        if (!networkRes.ok) {
          throw new Error(networkData?.message || `Request failed with status ${networkRes.status}`);
        }
      }

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
      if (serviceId) {
        localStorage.setItem(`service_stage_${serviceId}`, '1');
      }
      navigate(`/services/${serviceId}/terraform-configuration`);
    } catch (err) {
      setError(err.message || 'Could not save Terraform setup.');
    } finally {
      setSubmitting(false);
      setSavingNetwork(false);
    }
  }

  function updateNetworkField(field, value) {
    setNetworkForm((prev) => ({ ...prev, [field]: value }));
  }

  const STEP_LABELS = ['AWS Credentials', 'Terraform Backend', 'Container Registry', 'Network'];

  return (
    <div className='projects-shell min-vh-100'>
      <Breadcrumb crumbs={[
        { label: 'Home', to: '/home' },
        { label: 'Projects', to: '/projects' },
        { label: 'Terraform Setup' },
      ]} />

      <header className='projects-header'>
        <div>
          <h1 className='projects-title'>Terraform Setup Wizard</h1>
          <p className='projects-subtitle'>Step {step} of 4 — {STEP_LABELS[step - 1]}</p>
        </div>
        <div>
          <Link to={-1} className='project-button project-button--ghost'>
            <i className='fa-solid fa-arrow-left' style={{ marginRight: '6px' }} aria-hidden='true' />
            Back
          </Link>
        </div>
      </header>

      {/* Visual step tracker */}
      <div className='tf-step-tracker' role='list' aria-label='Setup steps'>
        {STEP_LABELS.map((label, idx) => {
          const n = idx + 1;
          const isCurrent = n === step;
          const isDone    = n < step;
          return (
            <div
              key={label}
              className={`tf-step-tracker__item${isDone ? ' tf-step-tracker__item--done' : isCurrent ? ' tf-step-tracker__item--current' : ' tf-step-tracker__item--idle'}`}
              role='listitem'
              aria-current={isCurrent ? 'step' : undefined}
            >
              <div className='tf-step-tracker__dot'>
                {isDone ? <i className='fa-solid fa-check' aria-hidden='true' /> : n}
              </div>
              <span className='tf-step-tracker__label'>{label}</span>
              {idx < STEP_LABELS.length - 1 && <div className={`tf-step-tracker__line${isDone ? ' tf-step-tracker__line--done' : ''}`} aria-hidden='true' />}
            </div>
          );
        })}
      </div>

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

            <label className='terraform-field-label' htmlFor='githubToken'>GitHub Token</label>
            {loadingGithubTokens && <p className='projects-subtitle'>Loading your GitHub tokens...</p>}
            {!loadingGithubTokens && githubTokens.length === 0 && (
              <p className='projects-subtitle'>
                No GitHub tokens found. <Link to='/github-tokens'>Add one</Link> before pushing secrets.
              </p>
            )}
            {!loadingGithubTokens && githubTokens.length > 0 && (
              <select
                id='githubToken'
                className='terraform-input'
                value={selectedGithubTokenId}
                onChange={(e) => setSelectedGithubTokenId(e.target.value)}
              >
                {githubTokens.map((tok) => (
                  <option key={tok.id} value={tok.id}>
                    {tok.name || tok.description || `Token #${tok.id}`}
                  </option>
                ))}
              </select>
            )}

            {error && <p className='terraform-error'>{error}</p>}
            {githubSecretStatus && <p className='projects-subtitle' style={{ color: '#0f9d58' }}>{githubSecretStatus}</p>}
            <div className='terraform-actions'>
              <button
                type='button'
                className='project-button project-button--ghost'
                onClick={handlePushCredentialsToGithub}
                disabled={
                  loadingCredentials ||
                  savingCredential ||
                  pushingGithubSecrets ||
                  !selectedGithubTokenId ||
                  (!(selectedCredentialId && !addingNew) && !(accessKey.trim() && secretKey.trim()))
                }
              >
                {pushingGithubSecrets ? 'Pushing...' : 'Push credentials to GitHub secrets'}
              </button>
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
              <button type='button' className='project-button project-button--primary' onClick={prepareNetworkStep} disabled={submitting || loadingExistingNetwork || loadingNetworkStep}>
                {loadingNetworkStep ? 'Checking network...' : 'Continue'}
              </button>
            </div>
          </>
        )}

        {step === 4 && (
          <>
            <h2 className='terraform-step-title'>Network</h2>
            {existingVpc ? (
              <p className='projects-subtitle'>This service already has a VPC. Update it before continuing.</p>
            ) : (
              <p className='projects-subtitle'>Create the VPC that the Terraform modules will use.</p>
            )}

            {existingVpc ? (
              <>
                <label className='terraform-field-label' htmlFor='existingVpc'>Current VPC</label>
                <input
                  id='existingVpc'
                  className='terraform-input'
                  type='text'
                  value={`${existingVpc.name || 'vpc'} (${existingVpc.region || 'us-east-1'})`}
                  readOnly
                />
                <label className='terraform-field-label' htmlFor='networkName'>VPC Name</label>
                <input
                  id='networkName'
                  className='terraform-input'
                  type='text'
                  value={networkForm.name}
                  onChange={(e) => updateNetworkField('name', e.target.value)}
                  placeholder='demo-network'
                />

                <label className='terraform-field-label' htmlFor='networkRegion'>Region</label>
                <input
                  id='networkRegion'
                  className='terraform-input'
                  type='text'
                  value={networkForm.region}
                  onChange={(e) => updateNetworkField('region', e.target.value)}
                  placeholder='us-east-1'
                />

                <label className='terraform-field-label' htmlFor='networkCidr'>CIDR Block</label>
                <input
                  id='networkCidr'
                  className='terraform-input'
                  type='text'
                  value={networkForm.cidr}
                  onChange={(e) => updateNetworkField('cidr', e.target.value)}
                  placeholder='10.0.0.0/16'
                />
              </>
            ) : (
              <>
                <label className='terraform-field-label' htmlFor='networkName'>VPC Name</label>
                <input
                  id='networkName'
                  className='terraform-input'
                  type='text'
                  value={networkForm.name}
                  onChange={(e) => updateNetworkField('name', e.target.value)}
                  placeholder='demo-network'
                />

                <label className='terraform-field-label' htmlFor='networkRegion'>Region</label>
                <input
                  id='networkRegion'
                  className='terraform-input'
                  type='text'
                  value={networkForm.region}
                  onChange={(e) => updateNetworkField('region', e.target.value)}
                  placeholder='us-east-1'
                />

                <label className='terraform-field-label' htmlFor='networkCidr'>CIDR Block</label>
                <input
                  id='networkCidr'
                  className='terraform-input'
                  type='text'
                  value={networkForm.cidr}
                  onChange={(e) => updateNetworkField('cidr', e.target.value)}
                  placeholder='10.0.0.0/16'
                />
              </>
            )}

            {loadingExistingNetwork && <p className='projects-subtitle'>Checking your existing VPCs...</p>}
            {error && <p className='terraform-error'>{error}</p>}
            <div className='terraform-actions'>
              <button type='button' className='project-button project-button--ghost' onClick={() => setStep(3)} disabled={submitting}>
                Back
              </button>
              <button
                type='button'
                className='project-button project-button--primary'
                onClick={handleFinish}
                disabled={submitting || loadingExistingNetwork || savingNetwork}
              >
                {submitting ? 'Saving...' : (existingVpc ? 'Update VPC' : 'Create VPC')}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}