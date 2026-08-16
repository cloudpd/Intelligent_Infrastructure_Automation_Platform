import React, { useEffect, useState } from 'react';
import '../Projects/Projects.css'; // reuse the same visual style as Projects
import AddNewToken from './AddNewToken';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

function TokenCard({ tokenData, onDelete }) {
  const id = tokenData.id || tokenData._id;
  const name = tokenData.name || 'Untitled token';
  const description = tokenData.description || '';
  const date = tokenData.createdAt ? new Date(tokenData.createdAt).toLocaleDateString() : '';

  return (
    <div className='project-card'>
      <div>
        <div className='project-title'>{name}</div>
        <p className='project-label'>{description}</p>
        {date && <p className='project-label'>Added {date}</p>}
      </div>
      <button
        type='button'
        className='project-button project-button--ghost'
        onClick={() => onDelete(id)}
      >
        Remove
      </button>
    </div>
  );
}

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
        const list = Array.isArray(data) ? data : (data.tokens || []);
        setTokens(list);
      })
      .catch((err) => {
        console.error('Failed to fetch tokens:', err);
        setError('Could not load your tokens. Is the backend running on localhost:5000?');
      })
      .finally(() => setLoading(false));
  }

  function handleDelete(id) {
    if (!window.confirm('Remove this token? This cannot be undone.')) return;

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
      <header className='projects-header'>
        <div>
          <h1 className='projects-title'>GitHub Tokens</h1>
          <p className='projects-subtitle'>Save a token to let DeployHub push Dockerfiles and workflows to your repos.</p>
        </div>
      </header>

      <div className='projects-grid'>
        <AddNewToken onCreated={fetchTokens} />

        {!loading && !error && tokens.map((tokenData) => (
          <TokenCard
            key={tokenData.id || tokenData._id}
            tokenData={tokenData}
            onDelete={handleDelete}
          />
        ))}
      </div>

      {loading && (
        <div className='projects-state'>
          <p>Loading your tokens...</p>
        </div>
      )}

      {!loading && error && (
        <div className='projects-state projects-state--error'>
          <p>{error}</p>
          <button type='button' onClick={fetchTokens}>Try again</button>
        </div>
      )}

      {!loading && !error && tokens.length === 0 && (
        <div className='projects-state'>
          <p>No tokens yet. Add one to start pushing Dockerfiles to your repos.</p>
        </div>
      )}
    </div>
  );
}