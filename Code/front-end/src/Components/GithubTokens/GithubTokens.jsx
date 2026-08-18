import React, { useEffect, useState } from 'react';
import '../Projects/Projects.css';
import '../Terraform/Terraform.css'; // callout classes
import AddNewToken from './AddNewToken';
import { baseUrl as API_URL } from '../Shared/baseUrl';
import Breadcrumb from '../Shared/Breadcrumb';
import StatusBadge from '../Shared/StatusBadge';

export default function GithubTokens() {
  const [tokens, setTokens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchTokens();
  }, []);

  function fetchTokens() {
    setLoading(true);
    setError(null);

    const token = localStorage.getItem('token');

    fetch(`${API_URL}/github/tokens`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Request failed with status ${res.status}`);
        }
        return res.json();
      })
      .then((data) => {
        const list = Array.isArray(data) ? data : data.tokens || [];
        setTokens(list);
      })
      .catch((err) => {
        console.error('Failed to fetch tokens:', err);
        setError('Could not load your tokens.');
      })
      .finally(() => setLoading(false));
  }

  function handleDelete(id) {
    if (!window.confirm('Revoke and delete this PAT token? This action cannot be undone.')) return;

    const authToken = localStorage.getItem('token');

    fetch(`${API_URL}/github/tokens/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${authToken}` },
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Request failed with status ${res.status}`);
        }
        setTokens((prev) => prev.filter((t) => (t.id || t._id) !== id));
      })
      .catch((err) => {
        console.error('Failed to delete token:', err);
        setError('Could not delete the token.');
      });
  }

  return (
    <div className='projects-shell'>
      <Breadcrumb crumbs={[
        { label: 'Home', to: '/home' },
        { label: 'GitHub Tokens' },
      ]} />

      <header className='projects-header'>
        <div>
          <h1 className='projects-title'>GitHub Access Tokens</h1>
          <p className='projects-subtitle'>Manage Personal Access Tokens (PAT) for automated manifest and workflow commits.</p>
        </div>
      </header>

      <div className='callout callout--info' style={{ marginBottom: 'var(--space-5)' }}>
        <i className='fa-solid fa-shield-halved callout__icon' aria-hidden='true' />
        <div className='callout__body'>
          <strong>Token Security Notice:</strong> Tokens are encrypted at rest using AES-256 and used strictly for committing Dockerfiles, GitHub Actions workflows, and Kubernetes manifests to your designated repositories.
        </div>
      </div>

      {loading && (
        <div className='projects-state'>
          <p>Loading security tokens...</p>
        </div>
      )}

      {!loading && error && (
        <div className='projects-state projects-state--error'>
          <i className='fa-solid fa-circle-exclamation projects-state__icon' aria-hidden='true' />
          <p>{error}</p>
          <button type='button' className='project-button project-button--primary' onClick={fetchTokens}>
            Try again
          </button>
        </div>
      )}

      {!loading && !error && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
          <AddNewToken onCreated={fetchTokens} />

          {tokens.length > 0 ? (
            <div className='projects-table-container'>
              <table className='enterprise-table'>
                <thead>
                  <tr>
                    <th>Token Name</th>
                    <th>Permissions Scope</th>
                    <th>Created Date</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {tokens.map((tokenData) => {
                    const id = tokenData.id || tokenData._id;
                    const name = tokenData.name || 'Personal Access Token';
                    const desc = tokenData.description || 'repo, workflow';
                    const date = tokenData.createdAt ? new Date(tokenData.createdAt).toLocaleDateString() : '—';

                    return (
                      <tr key={id}>
                        <td>
                          <div className='table-link-title'>
                            <i className='fa-brands fa-github table-icon' aria-hidden='true' />
                            <strong>{name}</strong>
                          </div>
                        </td>
                        <td className='table-desc'>{desc}</td>
                        <td>
                          <span className='table-badge'>{date}</span>
                        </td>
                        <td>
                          <StatusBadge status='healthy' customLabel='Active &amp; Verified' size='sm' />
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            type='button'
                            className='project-button project-button--danger project-button--sm'
                            onClick={() => handleDelete(id)}
                          >
                            <i className='fa-solid fa-trash-can' aria-hidden='true' style={{ marginRight: '4px' }} />
                            Revoke
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className='projects-state projects-state--empty-hero'>
              <div className='empty-hero__icon'>
                <i className='fa-solid fa-key' aria-hidden='true' />
              </div>
              <h3 className='empty-hero__title'>No GitHub Tokens Saved</h3>
              <p className='empty-hero__subtitle'>Add a Personal Access Token above to enable automated pipeline commits.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}