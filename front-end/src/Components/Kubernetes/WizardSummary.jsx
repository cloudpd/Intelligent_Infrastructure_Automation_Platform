import React from 'react';

function ResourceCheck({ label, checked }) {
  return (
    <li className={`k8s-summary__item ${checked ? 'is-on' : 'is-off'}`}>
      <span className='k8s-summary__mark'>{checked ? '✓' : '—'}</span>
      {label}
    </li>
  );
}

export default function WizardSummary({ wizard }) {
  const { application, workload, storage, serviceAccount, networking, autoscaling } = wizard;

  const generated = [
    { label: 'Namespace', checked: true },
    { label: workload.workloadType, checked: true },
    { label: 'Service', checked: true },
    { label: 'LimitRange', checked: true },
    { label: 'ResourceQuota', checked: true },
    { label: 'ConfigMap', checked: application.envVars.some((v) => v.target === 'ConfigMap') },
    { label: 'Secret', checked: application.envVars.some((v) => v.target === 'Secret') },
    { label: 'PersistentVolumeClaim', checked: !!storage.enabled },
    { label: 'Ingress', checked: networking.exposure === 'Public' },
    { label: 'ServiceAccount', checked: !!serviceAccount.enabled },
    { label: 'Role', checked: !!serviceAccount.enabled },
    { label: 'RoleBinding', checked: !!serviceAccount.enabled },
    { label: 'HorizontalPodAutoscaler', checked: !!autoscaling.enabled },
  ];

  return (
    <aside className='k8s-summary'>
      <h3 className='k8s-summary__title'>Live summary</h3>

      <dl className='k8s-summary__facts'>
        <div>
          <dt>Application</dt>
          <dd>{application.name || '—'}</dd>
        </div>
        <div>
          <dt>Workload</dt>
          <dd>{workload.workloadType}</dd>
        </div>
        <div>
          <dt>Replicas</dt>
          <dd>{workload.replicas}</dd>
        </div>
        <div>
          <dt>Storage</dt>
          <dd>{storage.enabled ? 'Enabled' : 'Disabled'}</dd>
        </div>
        <div>
          <dt>Networking</dt>
          <dd>{networking.exposure}</dd>
        </div>
        <div>
          <dt>Autoscaling</dt>
          <dd>{autoscaling.enabled ? 'Enabled' : 'Disabled'}</dd>
        </div>
      </dl>

      <h4 className='k8s-summary__subtitle'>Generated resources</h4>
      <ul className='k8s-summary__list'>
        {generated.map((item) => (
          <ResourceCheck key={item.label} label={item.label} checked={item.checked} />
        ))}
      </ul>
    </aside>
  );
}
