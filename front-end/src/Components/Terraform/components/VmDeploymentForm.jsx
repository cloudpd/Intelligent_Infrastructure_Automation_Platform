import React from 'react';

export default function VmDeploymentForm({ vmForm, setVmForm, onGenerate, creating, disabled }) {
  function setField(field, value) {
    setVmForm({ ...vmForm, [field]: value });
  }

  return (
    <div className='terraform-wizard-card' style={{ marginTop: '1rem' }}>
      <h3 className='terraform-step-title'>VM Deployment Details</h3>

      <label className='terraform-field-label' htmlFor='vm-name'>VM Name</label>
      <input
        id='vm-name'
        className='terraform-input'
        value={vmForm.name}
        onChange={(e) => setField('name', e.target.value)}
        placeholder='test-vm'
      />

      <label className='terraform-field-label' htmlFor='vm-region'>Region</label>
      <input
        id='vm-region'
        className='terraform-input'
        value={vmForm.region}
        onChange={(e) => setField('region', e.target.value)}
        placeholder='us-east-1'
      />

      <label className='terraform-field-label' htmlFor='vm-instance-type'>Instance Type</label>
      <input
        id='vm-instance-type'
        className='terraform-input'
        value={vmForm.instance_type}
        onChange={(e) => setField('instance_type', e.target.value)}
        placeholder='t3.micro'
      />

      <label className='terraform-field-label' htmlFor='vm-kind-cluster'>Kind Cluster Name</label>
      <input
        id='vm-kind-cluster'
        className='terraform-input'
        value={vmForm.kind_cluster_name}
        onChange={(e) => setField('kind_cluster_name', e.target.value)}
        placeholder='kind'
      />

      <label className='terraform-field-label' htmlFor='vm-container-port'>Container Port</label>
      <input
        id='vm-container-port'
        className='terraform-input'
        type='number'
        value={vmForm.container_port}
        onChange={(e) => setField('container_port', Number(e.target.value))}
      />

      <label className='terraform-field-label' htmlFor='vm-host-port'>Host Port</label>
      <input
        id='vm-host-port'
        className='terraform-input'
        type='number'
        value={vmForm.host_port}
        onChange={(e) => setField('host_port', Number(e.target.value))}
      />

      <label className='terraform-radio'>
        <input
          type='checkbox'
          checked={vmForm.allow_ssh}
          onChange={(e) => setField('allow_ssh', e.target.checked)}
        />
        Allow SSH
      </label>

    </div>
  );
}