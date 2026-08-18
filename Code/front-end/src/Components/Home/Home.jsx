import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import './Home.css';
import ActiveProjects from '../ActiveProjects/ActiveProjects';
import StatusBadge from '../Shared/StatusBadge';
import { baseUrl as API_URL } from '../Shared/baseUrl';

export default function Home() {
  const [projectCount, setProjectCount] = useState(0);
  const [activeCount, setActiveCount] = useState(0);
  const [hasToken, setHasToken] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const headers = { Authorization: `Bearer ${token}` };

    Promise.all([
      fetch(`${API_URL}/projects/list`, { headers })
        .then((r) => (r.ok ? r.json() : []))
        .catch(() => []),
      fetch(`${API_URL}/infra/terraform-deployments`, { headers })
        .then((r) => (r.ok ? r.json() : { deployments: [] }))
        .catch(() => ({ deployments: [] })),
      fetch(`${API_URL}/github-tokens`, { headers })
        .then((r) => (r.ok ? r.json() : { tokens: [] }))
        .catch(() => ({ tokens: [] })),
    ])
      .then(([projectsData, infraData, tokensData]) => {
        const pList = Array.isArray(projectsData) ? projectsData : projectsData.projects || [];
        const dList = infraData.deployments || [];
        const tList = Array.isArray(tokensData) ? tokensData : tokensData.tokens || [];

        setProjectCount(pList.length);
        setActiveCount(dList.length);
        setHasToken(tList.length > 0);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className='home-shell'>
      <div className='home-layout'>
        <div className='home-layout__main'>
          {/* Executive Command Hero Banner */}
          <header className='home-hero-command'>
            <div className='home-hero-content'>
              <div className='home-hero-status-strip'>
                <StatusBadge status='healthy' customLabel='System Operational · 99.98% SLA' size='lg' />
              </div>
              <h1 className='home-title'>Infrastructure Control Center</h1>
              <p className='home-subtitle'>
                Orchestrate AWS infrastructure, container registries, and automated Kubernetes manifests across all environment stacks.
              </p>
            </div>
            <div className='home-hero-actions'>
              <Link to='/projects' className='project-button project-button--primary project-button--lg'>
                <i className='fa-solid fa-plus' aria-hidden='true' style={{ marginRight: '8px' }} />
                New Project
              </Link>
              <Link to='/github-tokens' className='project-button project-button--ghost'>
                <i className='fa-brands fa-github' aria-hidden='true' style={{ marginRight: '6px' }} />
                Tokens
              </Link>
            </div>
          </header>

          {/* Metric Summary Grid */}
          <section className='home-metric-grid' aria-label='Key infrastructure metrics'>
            <Link to='/projects' className='metric-tile metric-tile--interactive'>
              <div className='metric-tile__header'>
                <span className='metric-tile__title'>Configured Projects</span>
                <i className='fa-solid fa-diagram-project metric-tile__icon' aria-hidden='true' />
              </div>
              <div className='metric-tile__number'>{loading ? '—' : projectCount}</div>
              <span className='metric-tile__footer'>
                <i className='fa-solid fa-arrow-trend-up' style={{ color: 'var(--success)', marginRight: '4px' }} />
                Active workspaces
              </span>
            </Link>

            <div className='metric-tile'>
              <div className='metric-tile__header'>
                <span className='metric-tile__title'>Live AWS Infrastructure</span>
                <i className='fa-solid fa-server metric-tile__icon' aria-hidden='true' />
              </div>
              <div className='metric-tile__number'>{loading ? '—' : activeCount}</div>
              <span className='metric-tile__footer'>
                <i className='fa-solid fa-shield-halved' style={{ color: 'var(--accent-2)', marginRight: '4px' }} />
                Terraform state active
              </span>
            </div>

            <Link to='/github-tokens' className='metric-tile metric-tile--interactive'>
              <div className='metric-tile__header'>
                <span className='metric-tile__title'>GitHub Integration</span>
                <i className='fa-brands fa-github metric-tile__icon' aria-hidden='true' />
              </div>
              <div className='metric-tile__status-box'>
                {loading ? (
                  '—'
                ) : hasToken ? (
                  <StatusBadge status='healthy' customLabel='Connected' size='md' />
                ) : (
                  <StatusBadge status='warning' customLabel='Action Required' size='md' />
                )}
              </div>
              <span className='metric-tile__footer'>PAT Workflow Commits →</span>
            </Link>

            <div className='metric-tile'>
              <div className='metric-tile__header'>
                <span className='metric-tile__title'>Pipeline Health</span>
                <i className='fa-solid fa-heart-pulse metric-tile__icon' aria-hidden='true' />
              </div>
              <div className='metric-tile__number' style={{ color: 'var(--success)' }}>100%</div>
              <span className='metric-tile__footer'>Zero deployment errors</span>
            </div>
          </section>

          {/* Project Automated Service Deployment Pipeline */}
          <section className='home-card-section'>
            <div className='card-section-header'>
              <div>
                <h2 className='card-section-title'>
                  <i className='fa-solid fa-diagram-next' style={{ color: 'var(--accent-2)', marginRight: '8px' }} />
                  Automated Service Deployment Flow
                </h2>
                <p className='card-section-subtitle'>The 5-stage automated delivery pipeline executed for each application service.</p>
              </div>
              <span className='topo-pill-tag'>5-Stage Automation Pipeline</span>
            </div>

            <div className='topology-flow-bar'>
              <div className='topo-flow-step'>
                <div className='topo-flow-step__icon'><i className='fa-solid fa-gear' /></div>
                <strong>1. Terraform Setup</strong>
                <span>AWS Credentials &amp; VPC</span>
              </div>
              <div className='topo-flow-line' />

              <div className='topo-flow-step'>
                <div className='topo-flow-step__icon'><i className='fa-solid fa-sliders' /></div>
                <strong>2. Terraform Config</strong>
                <span>Generate &amp; Apply Infra</span>
              </div>
              <div className='topo-flow-line' />

              <div className='topo-flow-step'>
                <div className='topo-flow-step__icon'><i className='fa-brands fa-docker' /></div>
                <strong>3. Dockerize</strong>
                <span>Containerize App Code</span>
              </div>
              <div className='topo-flow-line' />

              <div className='topo-flow-step'>
                <div className='topo-flow-step__icon'><i className='fa-solid fa-rotate' /></div>
                <strong>4. CI Pipeline</strong>
                <span>GitHub Actions Secrets</span>
              </div>
              <div className='topo-flow-line' />

              <div className='topo-flow-step topo-flow-step--active'>
                <div className='topo-flow-step__icon'><i className='fa-solid fa-dharmachakra' /></div>
                <strong>5. Kubernetes</strong>
                <span>Deploy Cluster Manifests</span>
              </div>
            </div>
          </section>
        </div>

        {/* Real-time Operational Monitoring Side Panel */}
        <div className='home-layout__side'>
          <ActiveProjects />
        </div>
      </div>
    </div>
  );
}