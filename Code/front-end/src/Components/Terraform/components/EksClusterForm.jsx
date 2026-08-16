import React from 'react';

export default function EksClusterForm({ eksForm, setEksForm, onGenerate, creating, disabled }) {
  const groupKey = Object.keys(eksForm.nodeGroups)[0] || 'general';
  const group = eksForm.nodeGroups[groupKey] || {};

  function setField(field, value) {
    setEksForm({ ...eksForm, [field]: value });
  }

  function setNodeGroupField(field, value) {
    setEksForm({
      ...eksForm,
      nodeGroups: { ...eksForm.nodeGroups, [groupKey]: { ...group, [field]: value } },
    });
  }

  function renameNodeGroup(newKey) {
    const key = newKey || 'general';
    setEksForm({ ...eksForm, nodeGroups: { [key]: group } });
  }

  function setAdminField(field, value) {
    const nextAdmins = [...eksForm.clusterAdmins];
    nextAdmins[0] = { ...nextAdmins[0], [field]: value };
    setEksForm({ ...eksForm, clusterAdmins: nextAdmins });
  }

  return (
    <div className='terraform-wizard-card' style={{ marginTop: '1rem' }}>
      <h3 className='terraform-step-title'>EKS Cluster Details</h3>

      <label className='terraform-field-label' htmlFor='eks-cluster-name'>Cluster Name</label>
      <input
        id='eks-cluster-name'
        className='terraform-input'
        value={eksForm.clusterName}
        onChange={(e) => setField('clusterName', e.target.value)}
        placeholder='demo-cluster'
      />

      <label className='terraform-field-label' htmlFor='eks-cluster-version'>Cluster Version</label>
      <input
        id='eks-cluster-version'
        className='terraform-input'
        value={eksForm.clusterVersion}
        onChange={(e) => setField('clusterVersion', e.target.value)}
        placeholder='1.35'
      />

      <label className='terraform-field-label' htmlFor='eks-region'>Region</label>
      <input
        id='eks-region'
        className='terraform-input'
        value={eksForm.region}
        onChange={(e) => setField('region', e.target.value)}
        placeholder='eu-north-1'
      />

      <label className='terraform-field-label' htmlFor='eks-node-group-name'>Node Group Name</label>
      <input
        id='eks-node-group-name'
        className='terraform-input'
        value={groupKey}
        onChange={(e) => renameNodeGroup(e.target.value)}
        placeholder='general'
      />

      <label className='terraform-field-label' htmlFor='eks-instance-types'>Instance Types</label>
      <input
        id='eks-instance-types'
        className='terraform-input'
        value={(group.instanceTypes || []).join(', ')}
        onChange={(e) =>
          setNodeGroupField('instanceTypes', e.target.value.split(',').map((s) => s.trim()).filter(Boolean))
        }
        placeholder='c7i-flex.large'
      />

      <label className='terraform-field-label' htmlFor='eks-capacity-type'>Capacity Type</label>
      <input
        id='eks-capacity-type'
        className='terraform-input'
        value={group.capacityType || 'ON_DEMAND'}
        onChange={(e) => setNodeGroupField('capacityType', e.target.value)}
        placeholder='ON_DEMAND'
      />

      <label className='terraform-field-label' htmlFor='eks-desired-size'>Desired Size</label>
      <input
        id='eks-desired-size'
        className='terraform-input'
        type='number'
        value={group.desiredSize || 2}
        onChange={(e) => setNodeGroupField('desiredSize', Number(e.target.value))}
      />

      <label className='terraform-field-label' htmlFor='eks-min-size'>Min Size</label>
      <input
        id='eks-min-size'
        className='terraform-input'
        type='number'
        value={group.minSize || 1}
        onChange={(e) => setNodeGroupField('minSize', Number(e.target.value))}
      />

      <label className='terraform-field-label' htmlFor='eks-max-size'>Max Size</label>
      <input
        id='eks-max-size'
        className='terraform-input'
        type='number'
        value={group.maxSize || 4}
        onChange={(e) => setNodeGroupField('maxSize', Number(e.target.value))}
      />

      <label className='terraform-field-label' htmlFor='eks-disk-size'>Disk Size</label>
      <input
        id='eks-disk-size'
        className='terraform-input'
        type='number'
        value={group.diskSize || 20}
        onChange={(e) => setNodeGroupField('diskSize', Number(e.target.value))}
      />

      <label className='terraform-field-label' htmlFor='eks-admin-user'>Admin Username</label>
      <input
        id='eks-admin-user'
        className='terraform-input'
        value={eksForm.clusterAdmins[0]?.userName || ''}
        onChange={(e) => setAdminField('userName', e.target.value)}
        placeholder='admin'
      />

      <label className='terraform-field-label' htmlFor='eks-admin-account'>Admin Account ID</label>
      <input
        id='eks-admin-account'
        className='terraform-input'
        value={eksForm.clusterAdmins[0]?.userAccountId || ''}
        onChange={(e) => setAdminField('userAccountId', e.target.value)}
        placeholder='123456789012'
      />

    </div>
  );
}