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

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

export default function TerraformConfiguration() {
  const { serviceId } = useParams();

  const [state, setState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

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

      const res = await fetch(`${API_URL}/infra/terraform/services/${serviceId}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({ serviceSlug: 'service', environment: 'dev' }),
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

      const res = await fetch(`${API_URL}/infra/terraform/services/${serviceId}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({ serviceId }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message || `Request failed with status ${res.status}`);

      setActionSuccess('EKS cluster generated successfully.');
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
          // else: harmless "this exact cluster already exists" — fall through and continue
        } else if (createRes.status !== 200 && createRes.status !== 201) {
          const createData = await createRes.json().catch(() => null);
          throw new Error(createData?.message || `Request failed with status ${createRes.status}`);
        }
      }

      const res = await fetch(`${API_URL}/infra/terraform/services/${serviceId}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({ serviceSlug: 'service', environment: 'dev' }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message || `Request failed with status ${res.status}`);
      setActionSuccess(
        deploymentType === 'vm'
          ? 'VM deployment and Terraform files generated successfully.'
          : deploymentType === 'eks'
            ? 'EKS cluster and Terraform files generated successfully.'
            : 'Terraform files generated successfully.'
      );
      fetchState();
    } catch (err) {
      setActionError(err.message || 'Could not generate Terraform files.');
    } finally {
      setGenerating(false);
    }
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
          serviceSlug: 'service',
          environment: 'dev',
          awsCredentialId: state.awsCredentialId,
          ...(deploymentType === 'eks' ? { clusterId: target.id } : { vmId: target.id }),
          vpcId: vpc.id,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message || `Request failed with status ${res.status}`);

      setApplyPhase('completed');
      setApplyProgress(100);
      setActionSuccess(data.message || 'Terraform apply completed successfully. Your infrastructure is now running.');
      fetchState();
    } catch (err) {
      setApplyPhase('error');
      setApplyProgress(0);
      setActionError(err.message || 'Could not apply Terraform files.');
    } finally {
      window.clearInterval(progressTimer);
      setApplying(false);
    }
  }

  const setupComplete = Boolean(state?.s3Bucket) && Boolean(deploymentType);

  return (
    <div className='projects-shell min-vh-100'>
      <header className='projects-header'>
        <div>
          <h1 className='projects-title'>Terraform Configuration</h1>
          <p className='projects-subtitle'>Review the backend and choose a deployment target.</p>
        </div>
        <div>
          <Link to={`/services/${serviceId}/terraform-setup`} className='project-button project-button--ghost'>
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
          />
        </div>
      )}
    </div>
  );
}