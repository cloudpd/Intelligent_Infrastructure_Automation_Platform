import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import '../Projects/Projects.css';
import { baseUrl as API_URL } from '../Shared/baseUrl';
import Breadcrumb from '../Shared/Breadcrumb';
import StatusBadge from '../Shared/StatusBadge';

export default function Services() {
  const [services, setServices] = useState([]);
  const [deployments, setDeployments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const headers = { Authorization: `Bearer ${token}` };
    setLoading(true);
    setError(null);

    Promise.all([
      fetch(`${API_URL}/services/list-all`, { headers })
        .then((res) => (res.ok ? res.json() : []))
        .catch(() => []),
      fetch(`${API_URL}/infra/terraform-deployments`, { headers })
        .then((res) => (res.ok ? res.json() : { deployments: [] }))
        .catch(() => ({ deployments: [] })),
    ])
      .then(([servicesData, deploymentsData]) => {
        const sList = Array.isArray(servicesData) ? servicesData : servicesData.services || [];
        const dList = Array.isArray(deploymentsData) ? deploymentsData : deploymentsData.deployments || [];

        setServices(sList);
        setDeployments(dList);
      })
      .catch((err) => {
        console.error('Failed to fetch services catalog:', err);
        setError('Unable to load services catalog.');
      })
      .finally(() => setLoading(false));
  }, []);

  function getServiceStageInfo(service) {
    const sId = String(service.id || service._id);
    const pId = service.project_id || service.project?.id;

    // Check localStorage persistent stage flag
    let savedStage = 0;
    try {
      const stored = localStorage.getItem(`service_stage_${sId}`);
      if (stored) {
        savedStage = parseInt(stored, 10) || 0;
      }
    } catch (e) {}

    // Check active deployment records
    const hasActiveDeployment = deployments.some(
      (d) => String(d.service_id || d.serviceId || d.service?.id) === sId && d.status === 'applied'
    );

    const isSetupDone = Boolean(service.terraform_setup_complete || service.vpc_id || service.aws_credential_id || savedStage >= 1);
    const isInfraApplied = Boolean(service.terraform_applied || service.status === 'applied' || hasActiveDeployment || savedStage >= 2);
    const isDockerized = Boolean(service.dockerfile_path || service.dockerfile_complete || savedStage >= 3);
    const isCiPushed = Boolean(service.ci_pushed || savedStage >= 4);
    const isK8sApplied = Boolean(service.k8s_applied || service.status === 'deployed' || savedStage >= 5);

    let stage = 0;
    if (isK8sApplied || savedStage === 5) {
      stage = 5;
    } else if (isCiPushed || savedStage === 4) {
      stage = 4;
    } else if (isDockerized || savedStage === 3) {
      stage = 3;
    } else if (isInfraApplied || savedStage === 2) {
      stage = 2;
    } else if (isSetupDone || savedStage === 1) {
      stage = 1;
    }

    // Determine Status Badge & Next Action Button
    let statusBadge = <StatusBadge status='neutral' customLabel='0/5 Not Started' size='sm' />;
    let action = {
      label: 'Start Setup',
      to: `/services/${sId}/terraform-setup`,
      icon: 'fa-solid fa-arrow-right',
    };

    if (stage === 5) {
      statusBadge = <StatusBadge status='healthy' customLabel='5/5 Live & Active' size='sm' />;
      action = {
        label: 'Manage K8s',
        to: pId ? `/projects/${pId}/services/${sId}/k8s` : `/services/${sId}/k8s`,
        icon: 'fa-solid fa-dharmachakra',
      };
    } else if (stage === 4) {
      statusBadge = <StatusBadge status='healthy' customLabel='4/5 CI Pushed' size='sm' />;
      action = {
        label: 'Configure K8s',
        to: pId ? `/projects/${pId}/services/${sId}/k8s` : `/services/${sId}/k8s`,
        icon: 'fa-solid fa-dharmachakra',
      };
    } else if (stage === 3) {
      statusBadge = <StatusBadge status='info' customLabel='3/5 Dockerized' size='sm' />;
      action = {
        label: 'Set up CI',
        to: pId ? `/projects/${pId}/services/${sId}/ci` : `/services/${sId}/ci`,
        icon: 'fa-solid fa-rotate',
      };
    } else if (stage === 2) {
      statusBadge = <StatusBadge status='info' customLabel='2/5 Infra Live' size='sm' />;
      action = {
        label: 'Dockerize Service',
        to: `/services/${sId}/dockerize`,
        icon: 'fa-brands fa-docker',
      };
    } else if (stage === 1) {
      statusBadge = <StatusBadge status='warning' customLabel='1/5 Setup Done' size='sm' />;
      action = {
        label: 'Configure Infra',
        to: `/services/${sId}/terraform-configuration`,
        icon: 'fa-solid fa-sliders',
      };
    }

    return { stage, statusBadge, action };
  }

  return (
    <div className='projects-shell min-vh-100'>
      <Breadcrumb crumbs={[
        { label: 'Home', to: '/home' },
        { label: 'Services' },
      ]} />

      <header className='projects-header'>
        <div>
          <h1 className='projects-title'>Services Catalog</h1>
          <p className='projects-subtitle'>All application services and container workloads across your projects.</p>
        </div>
      </header>

      {loading && (
        <div className='projects-state'>
          <p>Loading services...</p>
        </div>
      )}

      {error && !loading && (
        <div className='projects-state projects-state--error'>
          <p>{error}</p>
        </div>
      )}

      {!loading && !error && services.length === 0 && (
        <div className='projects-state projects-state--empty-hero'>
          <div className='empty-hero__icon'>
            <i className='fa-solid fa-layer-group' aria-hidden='true' />
          </div>
          <h3 className='empty-hero__title'>No services found</h3>
          <p className='empty-hero__subtitle'>Create a project and connect your application repository to launch a service.</p>
          <Link to='/projects' className='project-button project-button--primary project-button--lg'>
            Go to Projects
          </Link>
        </div>
      )}

      {!loading && !error && services.length > 0 && (
        <div className='projects-table-container'>
          <table className='enterprise-table'>
            <thead>
              <tr>
                <th style={{ textAlign: 'left' }}>Service Name</th>
                <th style={{ textAlign: 'left' }}>Project</th>
                <th style={{ textAlign: 'left' }}>Repository</th>
                <th style={{ textAlign: 'left' }}>Pipeline Progress</th>
                <th style={{ textAlign: 'left' }}>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {services.map((service) => {
                const id = service.id || service._id;
                const name = service.name || 'Untitled service';
                const projectName = service.project?.name || 'Project';
                const pId = service.project_id || service.project?.id;
                const repo = service.repository_url ? service.repository_url.replace(/^https?:\/\/github\.com\//, '') : '—';

                const { stage, statusBadge, action } = getServiceStageInfo(service);

                return (
                  <tr key={id}>
                    <td style={{ textAlign: 'left' }}>
                      <Link to={`/services/${id}/terraform-setup`} className='table-link-title'>
                        <i className='fa-solid fa-cube table-icon' aria-hidden='true' />
                        <strong>{name}</strong>
                      </Link>
                    </td>
                    <td style={{ textAlign: 'left' }}>
                      {pId ? (
                        <Link to={`/projects/${pId}`} className='auth-link' style={{ fontSize: 'inherit', fontWeight: '600' }}>
                          {projectName}
                        </Link>
                      ) : (
                        <span style={{ fontWeight: '600' }}>{projectName}</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'left' }}>
                      {repo !== '—' ? (
                        <span className='table-badge'>
                          <i className='fa-brands fa-github' style={{ marginRight: '4px' }} />
                          {repo}
                        </span>
                      ) : (
                        <span>—</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'left' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          {[1, 2, 3, 4, 5].map((s) => (
                            <div
                              key={s}
                              style={{
                                width: '10px',
                                height: '10px',
                                borderRadius: '50%',
                                background: s <= stage ? 'var(--success)' : 'var(--border-color-strong)',
                                border: s === stage ? '2px solid var(--accent)' : 'none',
                              }}
                              title={`Step ${s} ${s <= stage ? 'Completed' : 'Pending'}`}
                            />
                          ))}
                          <span style={{ fontSize: 'var(--font-xs)', color: 'var(--text-tertiary)', marginLeft: '6px' }}>
                            Step {stage} of 5
                          </span>
                        </div>
                      </div>
                    </td>
                    <td style={{ textAlign: 'left' }}>
                      {statusBadge}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <Link
                        to={action.to}
                        className='project-button project-button--primary project-button--sm'
                      >
                        <i className={action.icon} aria-hidden='true' style={{ marginRight: '4px' }} />
                        {action.label}
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}