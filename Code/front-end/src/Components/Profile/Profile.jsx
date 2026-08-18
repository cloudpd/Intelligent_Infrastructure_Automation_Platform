import React, { useContext, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Profile.css';
import { authContext } from '../../Context/AuthContext';
import { baseUrl as API_URL } from '../Shared/baseUrl';
import Breadcrumb from '../Shared/Breadcrumb';
import StatusBadge from '../Shared/StatusBadge';

export default function Profile() {
  const { userData, setToken } = useContext(authContext);
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tokenCount, setTokenCount] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    const headers = { Authorization: `Bearer ${token}` };

    Promise.all([
      fetch(`${API_URL}/auth/me`, { headers })
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
      fetch(`${API_URL}/github-tokens`, { headers })
        .then((r) => (r.ok ? r.json() : { tokens: [] }))
        .catch(() => ({ tokens: [] })),
    ])
      .then(([meData, tokensData]) => {
        const u = meData?.user || meData?.data || meData || null;
        setProfileData(u);
        const tList = Array.isArray(tokensData) ? tokensData : tokensData.tokens || [];
        setTokenCount(tList.length);
      })
      .finally(() => setLoading(false));
  }, []);

  const userName = profileData?.name || userData?.name || 'DevOps Engineer';
  const userEmail = profileData?.email || userData?.email || 'user@infrastructure.local';
  const userId = profileData?.id || userData?.id || '—';
  const userRole = profileData?.role || userData?.role || 'user';

  const initials = userName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  function handleLogout() {
    localStorage.removeItem('token');
    if (setToken) setToken(null);
    navigate('/login');
  }

  return (
    <div className='projects-shell min-vh-100'>
      <Breadcrumb crumbs={[
        { label: 'Home', to: '/home' },
        { label: 'User Profile' },
      ]} />

      <div className='profile-shell'>
        {/* User Hero Banner */}
        <div className='profile-hero'>
          <div className='profile-hero__left'>
            <div className='profile-avatar'>{initials}</div>
            <div>
              <h1 className='profile-info__name'>{userName}</h1>
              <p className='profile-info__email'>
                <i className='fa-solid fa-envelope' aria-hidden='true' />
                {userEmail}
              </p>
              <div className='profile-hero__tags'>
                <StatusBadge status='healthy' customLabel='Verified Account' size='sm' />
              </div>
            </div>
          </div>

          <button
            type='button'
            className='project-button project-button--danger'
            onClick={handleLogout}
          >
            <i className='fa-solid fa-right-from-bracket' aria-hidden='true' style={{ marginRight: '6px' }} />
            Sign Out
          </button>
        </div>

        {/* Profile Content Grid */}
        <div className='profile-grid'>
          {/* Identity & Account Details */}
          <div className='profile-card'>
            <h2 className='profile-card__title'>
              <i className='fa-solid fa-id-card' style={{ color: 'var(--accent)' }} aria-hidden='true' />
              Account Specifications
            </h2>

            <div className='profile-field-list'>
              <div className='profile-field-row'>
                <span className='profile-field-label'>User ID</span>
                <span className='profile-code-box'>{userId}</span>
              </div>
              <div className='profile-field-row'>
                <span className='profile-field-label'>Primary Email</span>
                <span className='profile-field-value'>{userEmail}</span>
              </div>
              <div className='profile-field-row'>
                <span className='profile-field-label'>Workspace Organization</span>
                <span className='profile-field-value'>Cloud Infrastructure Platform</span>
              </div>
            </div>
          </div>

          {/* DevOps Integrations & Security */}
          <div className='profile-card'>
            <h2 className='profile-card__title'>
              <i className='fa-solid fa-shield-halved' style={{ color: 'var(--accent-2)' }} aria-hidden='true' />
              Platform Integrations &amp; Security
            </h2>

            <div className='profile-integrations'>
              <div className='profile-integration-item'>
                <div className='profile-integration-item__left'>
                  <i className='fa-brands fa-github profile-integration-icon' aria-hidden='true' />
                  <div>
                    <strong style={{ color: 'var(--text-primary)' }}>GitHub Access Tokens</strong>
                    <p style={{ margin: 0, fontSize: 'var(--font-xs)', color: 'var(--text-tertiary)' }}>
                      {loading ? 'Checking tokens...' : `${tokenCount} PAT Token(s) configured`}
                    </p>
                  </div>
                </div>
                <Link to='/github-tokens' className='project-button project-button--ghost project-button--sm'>
                  Manage Tokens →
                </Link>
              </div>

              <div className='profile-integration-item'>
                <div className='profile-integration-item__left'>
                  <i className='fa-solid fa-server profile-integration-icon' aria-hidden='true' style={{ color: 'var(--warning)' }} />
                  <div>
                    <strong style={{ color: 'var(--text-primary)' }}>AWS Infrastructure State</strong>
                    <p style={{ margin: 0, fontSize: 'var(--font-xs)', color: 'var(--text-tertiary)' }}>
                      Terraform Remote S3 &amp; VPC Networks
                    </p>
                  </div>
                </div>
                <Link to='/projects' className='project-button project-button--ghost project-button--sm'>
                  View Projects →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
