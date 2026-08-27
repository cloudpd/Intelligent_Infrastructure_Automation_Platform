import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import '../Projects/Projects.css';
import './Terraform.css';
import BackendSummary from './components/BackendSummary';
import DeploymentTypeSelector from './components/DeploymentTypeSelector';
import ApplyStatusCard from './components/ApplyStatusCard';
import VmDeploymentForm from './components/VmDeploymentForm';
import EksClusterForm from './components/EksClusterForm';
import TerraformActions from './components/TerraformActions';
import { baseUrl as API_URL } from '../Shared/baseUrl';
import Breadcrumb from '../Shared/Breadcrumb';
import PipelineProgress from '../Shared/PipelineProgress';


export default function TerraformConfiguration() {
  const { serviceId } = useParams();

  const [state, setState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const serviceSlug = useMemo(() => {
    const rawName = state?.serviceName || state?.service?.name || serviceId || 'service';
    return String(rawName).toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || 'service';
  }, [state, serviceId]);

  const [deploymentType, setDeploymentType] = useState('');
  const [savingDeployment, setSavingDeployment] = useState(false);

  const [generating, setGenerating] = useState(false);
  const [applying, setApplying] = useState(false);
  const [applyPhase, setApplyPhase] = useState('idle');
  const [applyProgress, setApplyProgress] = useState(0);
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  const [vmForm, setVmForm] = useState({
    name: '',
    region: 'us-east-1',
    instance_type: 't3.micro',
    kind_cluster_name: 'kind',
    container_port: 3000,
    host_port: 80,
    allow_ssh: false,
  });
  const [vmCreating, setVmCreating] = useState(false);

  const [eksForm, setEksForm] = useState({
    clusterName: 'demo-cluster',
    clusterVersion: '1.35',
    region: 'eu-north-1',
    nodeGroups: {
      general: {
        instanceTypes: ['c7i-flex.large'],
        capacityType: 'ON_DEMAND',
        desiredSize: 2,
        minSize: 1,
        maxSize: 4,
        diskSize: 20,
      },
    },
    clusterAdmins: [{ userName: '', userAccountId: '' }],
    grafanaAdminPassword: 'changeme123',
    enableEbsCsi: true,
    enableAlbController: true,
    enableExternalDns: true,
    enableExternalSecrets: true,
  });
  const [eksCreating, setEksCreating] = useState(false);

  const [githubTokens, setGithubTokens] = useState([]);
  const [loadingGithubTokens, setLoadingGithubTokens] = useState(true);
  const [selectedGithubTokenId, setSelectedGithubTokenId] = useState('');
  const [pushingToGithub, setPushingToGithub] = useState(false);

  const authHeaders = useMemo(() => {
    const token = localStorage.getItem('token');
    return { Authorization: `Bearer ${token}` };
  }, []);

  function fetchState() {
    setLoading(true);
    setLoadError('');
    fetch(`${API_URL}/terraform/state/${serviceId}`, { headers: authHeaders })
      .then((res) => {
        if (!res.ok) throw new Error(`Request failed with status ${res.status}`);
        return res.json();
      })
      .then((data) => {
        const s = data.terraformState || data;
        setState(s);
        setDeploymentType(s?.deploymentType || '');
      })
      .catch((err) => {
        console.error('Failed to load Terraform state:', err);
        setLoadError('Run the Terraform Setup Wizard for this service first.');
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (!serviceId) return;
    fetchState();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serviceId]);

  useEffect(() => {
    setLoadingGithubTokens(true);
    fetch(`${API_URL}/github/tokens`, { headers: authHeaders })
      .then((res) => res.json())
      .then((data) => {
        const list = Array.isArray(data) ? data : data.tokens || [];
        setGithubTokens(list);
      })
      .catch(() => setGithubTokens([]))
      .finally(() => setLoadingGithubTokens(false));
  }, [authHeaders]);

  async function handleSaveDeployment(type) {
    setDeploymentType(type);
    setSavingDeployment(true);
    setActionError('');
    setActionSuccess('');
    try {
      const res = await fetch(`${API_URL}/terraform/deployment`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({ serviceId, deploymentType: type }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message || `Request failed with status ${res.status}`);
      fetchState();
    } catch (err) {
      setActionError(err.message || 'Could not save deployment type.');
    } finally {
      setSavingDeployment(false);
    }
  }

  async function handleGenerateVm() {
    setVmCreating(true);
    setActionError('');
    setActionSuccess('');

    try {
      const createRes = await fetch(`${API_URL}/infra/vm/${serviceId}/vms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify(vmForm),
      });
      const createData = await createRes.json().catch(() => null);
      if (!createRes.ok) throw new Error(createData?.message || `Request failed with status ${createRes.status}`);

      const res = await fetch(`${API_URL}/terraform/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({ serviceId, serviceSlug, environment: 'dev' }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message || `Request failed with status ${res.status}`);

      setActionSuccess('VM generated successfully.');
      fetchState();
    } catch (err) {
      setActionError(err.message || 'Could not generate VM files.');
    } finally {
      setVmCreating(false);
      setGenerating(false);
    }
  }

  async function handleGenerateEks() {
    setEksCreating(true);
    setActionError('');
    setActionSuccess('');

    try {
      const createRes = await fetch(`${API_URL}/infra/eks/${serviceId}/clusters`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({
          ...eksForm,
          clusterAdmins: eksForm.clusterAdmins.map((admin) => ({
            userName: admin.userName,
            userAccountId: admin.userAccountId,
          })),
        }),
      });
      const createData = await createRes.json().catch(() => null);
      if (!createRes.ok) throw new Error(createData?.message || `Request failed with status ${createRes.status}`);

      const res = await fetch(`${API_URL}/terraform/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({ serviceId, serviceSlug, environment: 'dev' }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message || `Request failed with status ${res.status}`);

      // createData.data is the EksCluster row plus a githubSync summary
      // (see eks.service.js#syncClusterSecretsToGithub) that tells us
      // whether EKS_CLUSTER_NAME / AWS_REGION actually landed in the repo.
      const githubSync = createData?.data?.githubSync;
      if (githubSync?.synced) {
        setActionSuccess(
          `EKS cluster generated successfully. Cluster name and region were added as secrets to ${githubSync.repoFullName}.`
        );
      } else if (githubSync && !githubSync.synced) {
        setActionSuccess(
          `EKS cluster generated successfully, but pushing secrets to ${githubSync.repoFullName || 'the repository'} failed: ${githubSync.error}. You can retry from the GitHub tokens page.`
        );
      } else {
        setActionSuccess('EKS cluster generated successfully.');
      }
      fetchState();
    } catch (err) {
      setActionError(err.message || 'Could not generate EKS cluster files.');
    } finally {
      setEksCreating(false);
      setGenerating(false);
    }
  }

  async function handleGenerate() {
    setGenerating(true);
    setActionError('');
    setActionSuccess('');
    let eksGithubSync = null; // filled in when deploymentType === 'eks' and creation succeeds
    try {
      if (deploymentType === 'vm') {
        const createRes = await fetch(`${API_URL}/infra/vm/${serviceId}/vms`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...authHeaders },
          body: JSON.stringify(vmForm),
        });

        if (createRes.status === 409) {
          const createData = await createRes.json().catch(() => null);
          const isHarmless = createData?.message?.includes('already has a VM deployment');
          if (!isHarmless) {
            throw new Error(createData?.message || 'Could not create VM deployment.');
          }
          // else: harmless "this exact VM already exists" — fall through and continue
        } else if (createRes.status !== 200 && createRes.status !== 201) {
          const createData = await createRes.json().catch(() => null);
          throw new Error(createData?.message || `Request failed with status ${createRes.status}`);
        }
      }

      if (deploymentType === 'eks') {
        const createRes = await fetch(`${API_URL}/infra/eks/${serviceId}/clusters`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...authHeaders },
          body: JSON.stringify({
            ...eksForm,
            clusterAdmins: eksForm.clusterAdmins.map((admin) => ({
              userName: admin.userName,
              userAccountId: admin.userAccountId,
            })),
          }),
        });

        if (createRes.status === 409) {
          const createData = await createRes.json().catch(() => null);
          const isHarmless = createData?.message?.includes('already has an EKS cluster');
          if (!isHarmless) {
            throw new Error(createData?.message || 'Could not create EKS cluster.');
          }

          // A cluster already exists for this service — POST always 409s
          // once one exists, so it can never apply form edits on its own.
          // Look up the existing cluster and PATCH it with whatever's
          // actually updatable (see eks.validation.js#updateEksClusterSchema).
          const listRes = await fetch(`${API_URL}/infra/eks/${serviceId}/clusters`, { headers: authHeaders });
          const listData = await listRes.json().catch(() => null);
          const existingCluster = Array.isArray(listData?.data) ? listData.data[0] : null;
          if (!listRes.ok || !existingCluster?.id) {
            throw new Error(listData?.message || 'Could not find the existing EKS cluster to update.');
          }

          const updateRes = await fetch(`${API_URL}/infra/eks/clusters/${existingCluster.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', ...authHeaders },
            body: JSON.stringify({
              clusterName: eksForm.clusterName,
              region: eksForm.region,
              clusterVersion: eksForm.clusterVersion,
              nodeGroups: eksForm.nodeGroups,
              clusterAdmins: eksForm.clusterAdmins.map((admin) => ({
                userName: admin.userName,
                userAccountId: admin.userAccountId,
              })),
              grafanaAdminPassword: eksForm.grafanaAdminPassword,
              enableEbsCsi: eksForm.enableEbsCsi,
              enableAlbController: eksForm.enableAlbController,
              enableExternalDns: eksForm.enableExternalDns,
              enableExternalSecrets: eksForm.enableExternalSecrets,
            }),
          });
          const updateData = await updateRes.json().catch(() => null);
          if (!updateRes.ok) throw new Error(updateData?.message || 'Could not update EKS cluster.');
          // clusterName/region are now updatable pre-apply (see
          // eks.validation.js#updateEksClusterSchema). If the cluster has
          // already been applied, the backend rejects the change with a
          // 409 above, whose message surfaces via the catch block below —
          // no need to compare against existingCluster here anymore.
        } else if (createRes.status !== 200 && createRes.status !== 201) {
          const createData = await createRes.json().catch(() => null);
          throw new Error(createData?.message || `Request failed with status ${createRes.status}`);
        }
      }

      if (deploymentType === 'eks') {
        // Push EKS_CLUSTER_NAME / AWS_REGION to the repo's Actions secrets
        // on every Generate click — not just on first creation — so an
        // update (PATCH path above) also re-syncs them. clusterName/region
        // are immutable after creation (see eks.validation.js), so
        // eksForm's values always match what's actually stored, whether
        // this run created or updated the cluster.
        const secretsRes = await fetch(`${API_URL}/github/${serviceId}/secrets`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...authHeaders },
          body: JSON.stringify({
            secrets: {
              EKS_CLUSTER_NAME: eksForm.clusterName,
              AWS_REGION: eksForm.region,
            },
          }),
        });
        const secretsData = await secretsRes.json().catch(() => null);
        if (secretsRes.ok) {
          eksGithubSync = { synced: true, repoFullName: secretsData?.result?.repoFullName };
        } else {
          eksGithubSync = { synced: false, error: secretsData?.message || `Request failed with status ${secretsRes.status}` };
        }
      }

      const res = await fetch(`${API_URL}/terraform/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({ serviceId, serviceSlug, environment: 'dev' }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message || `Request failed with status ${res.status}`);

      let successMessage;
      if (deploymentType === 'vm') {
        successMessage = 'VM deployment and Terraform files generated successfully.';
      } else if (deploymentType === 'eks') {
        successMessage = 'EKS cluster and Terraform files generated successfully.';
        if (eksGithubSync?.synced) {
          successMessage += ` Region: ${eksForm.region}, Cluster name: ${eksForm.clusterName} were pushed to GitHub repo: ${eksGithubSync.repoFullName} as secrets.`;
        } else if (eksGithubSync && !eksGithubSync.synced) {
          successMessage += ` Note: pushing region/cluster name to GitHub secrets failed (${eksGithubSync.error}) — add a GitHub token and retry.`;
        }
      } else {
        successMessage = 'Terraform files generated successfully.';
      }
      setActionSuccess(successMessage);
      fetchState();
    } catch (err) {
      setActionError(err.message || 'Could not generate Terraform files.');
    } finally {
      setGenerating(false);
    }
  }

  // `applying` on the server can take anywhere from ~30s (VM) to 30-40+
  // minutes (EKS: cluster creation, then node group provisioning, then
  // 4 sequential `wait = true` Helm releases). This polls the VM/cluster's
  // own record — not the terraform_states row — because that's where
  // markApplying/markApplied/markFailed actually write the real outcome.
  // Stops polling once status is anything other than "applying", or after
  // ~50 minutes. A timeout here does NOT mean the apply failed — the
  // background job on the server keeps running and will still call
  // markApplied/markFailed whether or not anyone's still polling — so this
  // resolves with a `timedOut: true` marker instead of throwing, letting
  // the caller show "still running, check back" rather than a false error.
  async function pollUntilSettled({ deploymentType, resourceId, authHeaders, intervalMs = 5000, maxAttempts = 600 }) {
    const url = deploymentType === 'eks'
      ? `${API_URL}/infra/eks/clusters/${resourceId}`
      : `${API_URL}/infra/vm/vms/${resourceId}`;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const res = await fetch(url, { headers: authHeaders });
        const data = await res.json().catch(() => null);
        if (res.ok) {
          const resource = data.data || data;
          if (resource.status && resource.status !== 'applying') {
            return resource;
          }
        }
      } catch (err) {
        // Silently swallow transient network fetch hiccups during long apply polling
        console.warn(`Polling attempt ${attempt + 1} network hiccup, retrying...`, err);
      }

      await new Promise((resolve) => window.setTimeout(resolve, intervalMs));
    }

    return { status: 'applying', timedOut: true };
  }

  async function handleApply() {
    setApplying(true);
    setActionError('');
    setActionSuccess('');
    setApplyPhase('initializing');
    setApplyProgress(8);

    const progressTimer = window.setInterval(() => {
      setApplyProgress((current) => {
        if (current >= 88) return current;
        if (current < 30) return Math.min(current + 4, 30);
        if (current < 70) return Math.min(current + 3, 70);
        return Math.min(current + 2, 88);
      });
    }, 350);

    try {
      if (!state?.awsCredentialId) {
        throw new Error('Choose an AWS credential in the Terraform setup wizard before applying.');
      }
      if (deploymentType !== 'vm' && deploymentType !== 'eks') {
        throw new Error('Choose either an EKS cluster or a VM deployment before applying.');
      }
      if (!state?.generated) {
        throw new Error('Generate Terraform files first.');
      }

      setApplyPhase('preparing');
      setApplyProgress(24);

      const [vpcsRes, secondaryRes] = await Promise.all([
        fetch(`${API_URL}/infra/network/${serviceId}/vpcs`, { headers: authHeaders }),
        deploymentType === 'eks'
          ? fetch(`${API_URL}/infra/eks/${serviceId}/clusters`, { headers: authHeaders })
          : fetch(`${API_URL}/infra/vm/${serviceId}/vms`, { headers: authHeaders }),
      ]);

      const [vpcsData, secondaryData] = await Promise.all([
        vpcsRes.json().catch(() => null),
        secondaryRes.json().catch(() => null),
      ]);

      if (!vpcsRes.ok) {
        throw new Error(vpcsData?.message || `Request failed with status ${vpcsRes.status}`);
      }
      if (!secondaryRes.ok) {
        throw new Error(secondaryData?.message || `Request failed with status ${secondaryRes.status}`);
      }

      setApplyPhase('collecting');
      setApplyProgress(56);

      const vpc = Array.isArray(vpcsData?.data)
        ? vpcsData.data.find((item) => item?.id) || vpcsData.data[0]
        : null;
      const target = Array.isArray(secondaryData?.data)
        ? secondaryData.data.find((item) => item?.id) || secondaryData.data[0]
        : null;

      if (!vpc?.id) {
        throw new Error('No VPC was found for this service.');
      }
      if (!target?.id) {
        throw new Error(deploymentType === 'eks' ? 'No EKS cluster was found for this service.' : 'No VM deployment was found for this service.');
      }

      setApplyPhase('applying');
      setApplyProgress(78);

      const endpoint = deploymentType === 'eks'
        ? `${API_URL}/infra/terraform/vpcs/${vpc.id}/clusters/${target.id}/apply`
        : `${API_URL}/infra/terraform/vpcs/${vpc.id}/vms/${target.id}/apply`;

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({
          serviceSlug,
          environment: 'dev',
          awsCredentialId: state.awsCredentialId,
          ...(deploymentType === 'eks' ? { clusterId: target.id } : { vmId: target.id }),
          vpcId: vpc.id,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message || `Request failed with status ${res.status}`);

      // The apply endpoint responds as soon as the background job *starts*
      // (status 202, "Terraform apply started") — it does NOT mean Terraform
      // has actually finished. The real result only shows up later on the
      // VM/EKS record's own `status` field (set by markApplied/markFailed
      // once `terraform apply` truly completes on the server). So instead of
      // treating this response as success, poll that record until it settles.
      setApplyPhase('applying');
      setApplyProgress(85);

      const finalResource = await pollUntilSettled({
        deploymentType,
        resourceId: target.id,
        authHeaders,
      });

      if (finalResource.timedOut) {
        // Not a failure — the server-side apply is still running. Leave the
        // progress bar visibly "applying" rather than erroring out, and let
        // the person know it's safe to check back later or reload.
        setActionSuccess(
          "Terraform apply is still running on the server (EKS + Helm add-ons can take a while). It hasn't failed — reload this page in a few minutes to see the final status."
        );
        return;
      }

      if (finalResource.status === 'failed') {
        throw new Error(finalResource.apply_error || finalResource.applyError || 'Terraform apply failed on the server.');
      }

      setApplyPhase('completed');
      setApplyProgress(100);
      setActionSuccess('Terraform apply completed successfully. Your infrastructure is now running.');
      if (serviceId) {
        localStorage.setItem(`service_stage_${serviceId}`, '2');
      }
      fetchState();
    } catch (err) {
      setApplyPhase('error');
      setApplyProgress(0);
      const friendlyMsg = err?.message === 'Failed to fetch'
        ? 'Unable to connect to the backend server (http://localhost:5000). Please check your backend process status.'
        : err?.message || 'Could not apply Terraform files.';
      setActionError(friendlyMsg);
    } finally {
      window.clearInterval(progressTimer);
      setApplying(false);
    }
  }

  async function handlePushToGithub() {
    setPushingToGithub(true);
    setActionError('');
    setActionSuccess('');
    try {
      const res = await fetch(`${API_URL}/github/${serviceId}/push-terraform-files`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({ githubTokenId: selectedGithubTokenId, branch: 'main' }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message || `Request failed with status ${res.status}`);

      const { pushedFiles, repoFullName } = data.result || {};
      const failed = (pushedFiles || []).filter((f) => f.status === 'failed');
      if (failed.length > 0) {
        setActionError(`Pushed to ${repoFullName} but ${failed.length} file(s) failed: ${failed.map((f) => f.path).join(', ')}`);
      } else {
        setActionSuccess(`Terraform files pushed to ${repoFullName} successfully.`);
      }
    } catch (err) {
      setActionError(err.message || 'Could not push files to GitHub.');
    } finally {
      setPushingToGithub(false);
    }
  }

  const setupComplete = Boolean(state?.s3Bucket) && Boolean(deploymentType);

  return (
    <div className='projects-shell min-vh-100'>
      <Breadcrumb crumbs={[
        { label: 'Home', to: '/home' },
        { label: 'Projects', to: '/projects' },
        { label: 'Terraform Configuration' },
      ]} />

      <PipelineProgress activeStage={2} serviceId={serviceId} />

      <header className='projects-header'>
        <div>
          <h1 className='projects-title'>Terraform Configuration</h1>
          <p className='projects-subtitle'>Review the backend and choose a deployment target.</p>
        </div>
        <div>
          <Link to={`/services/${serviceId}/terraform-setup`} className='project-button project-button--ghost'>
            <i className='fa-solid fa-arrow-left' style={{ marginRight: '6px' }} aria-hidden='true' />
            Back to setup
          </Link>
        </div>
      </header>

      {loading && (
        <div className='projects-state'>
          <p>Loading Terraform configuration...</p>
        </div>
      )}

      {loadError && !loading && (
        <div className='projects-state projects-state--error'>
          <p>{loadError}</p>
        </div>
      )}

      {!loading && !loadError && state && (
        <div className='terraform-wizard-card'>
          <BackendSummary state={state} />

          <DeploymentTypeSelector
            deploymentType={deploymentType}
            onSelect={handleSaveDeployment}
            disabled={savingDeployment}
          />

          <ApplyStatusCard applyPhase={applyPhase} applyProgress={applyProgress} />

          {deploymentType === 'vm' && (
            <VmDeploymentForm
              vmForm={vmForm}
              setVmForm={setVmForm}
              onGenerate={handleGenerateVm}
              creating={vmCreating}
              disabled={!setupComplete || generating}
            />
          )}

          {deploymentType === 'eks' && (
            <EksClusterForm
              eksForm={eksForm}
              setEksForm={setEksForm}
              onGenerate={handleGenerateEks}
              creating={eksCreating}
              disabled={!setupComplete || generating}
            />
          )}

          <TerraformActions
            serviceId={serviceId}
            setupComplete={setupComplete}
            generating={generating}
            applying={applying}
            applyPhase={applyPhase}
            state={state}
            actionError={actionError}
            actionSuccess={actionSuccess}
            onGenerate={handleGenerate}
            onApply={handleApply}
            githubTokens={githubTokens}
            loadingGithubTokens={loadingGithubTokens}
            selectedGithubTokenId={selectedGithubTokenId}
            setSelectedGithubTokenId={setSelectedGithubTokenId}
            onPushToGithub={handlePushToGithub}
            pushingToGithub={pushingToGithub}
          />

          {/* Next-step CTA after successful apply */}
          {applyPhase === 'completed' && (
            <div className='next-step-cta'>
              <span className='next-step-cta__text'>
                <i className='fa-solid fa-circle-check' style={{ marginRight: '6px' }} aria-hidden='true' />
                Infrastructure is live! Next: set up your Dockerfile.
              </span>
              <Link
                to={`/services/${serviceId}/dockerize`}
                className='project-button project-button--primary'
              >
                Dockerize <i className='fa-solid fa-arrow-right' aria-hidden='true' style={{ marginLeft: '4px' }} />
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}