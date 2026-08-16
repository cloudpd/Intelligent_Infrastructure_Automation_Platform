import React from 'react';

export default function DeploymentTypeSelector({ deploymentType, onSelect, disabled }) {
  return (
    <>
      <h2 className='terraform-step-title'>Deployment</h2>
      <label className='terraform-radio'>
        <input
          type='radio'
          name='deploymentType'
          checked={deploymentType === 'eks'}
          onChange={() => onSelect('eks')}
          disabled={disabled}
        />
        Amazon EKS
      </label>
      <label className='terraform-radio'>
        <input
          type='radio'
          name='deploymentType'
          checked={deploymentType === 'vm'}
          onChange={() => onSelect('vm')}
          disabled={disabled}
        />
        Virtual Machine (Minikube)
      </label>
    </>
  );
}