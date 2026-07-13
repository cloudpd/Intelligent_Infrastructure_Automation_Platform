import React, { useEffect, useState } from 'react';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
const LANGUAGES = [
  { value: 'node', label: 'Node.js' },
  { value: 'python', label: 'Python' },
];

export default function GenerateDockerfileForm({ serviceId, onBack, onDone }) {
  const [language, setLanguage] = useState('');
  const [dockerfileContent, setDockerfileContent] = useState('');
  const [targetPath, setTargetPath] = useState('Dockerfile');
  const [tokens, setTokens] = useState([]);
  const [githubTokenId, setGithubTokenId] = useState('');
  const [loadingTemplate, setLoadingTemplate] = useState(false);
  const [loadingTokens, setLoadingTokens] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [reloadTokens, setReloadTokens] = useState(false);

  useEffect(() => {
    fetchTokens();
  }, [reloadTokens]);

  function fetchTokens() {
    const token = localStorage.getItem('token');
    setLoadingTokens(true);

    fetch(`${API_URL}/github/tokens`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => setTokens(data.tokens || []))
      .catch((err) => console.error('Failed to fetch tokens:', err))
      .finally(() => setLoadingTokens(false));
  }

  function handleLanguageSelect(lang) {
    setLanguage(lang);
    setError('');
    setLoadingTemplate(true);

    const token = localStorage.getItem('token');

    fetch(`${API_URL}/dockerize/template/${lang}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load default Dockerfile');
        return res.json();
      })
      .then((data) => setDockerfileContent(data.dockerfile))
      .catch((err) => {
        console.error('Failed to fetch template:', err);
        setError('Could not load the default Dockerfile for this language.');
      })
      .finally(() => setLoadingTemplate(false));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSubmitting(true);

    const token = localStorage.getItem('token');

    try {
      const response = await fetch(`${API_URL}/dockerize/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          service_id: serviceId,
          github_token_id: githubTokenId,
          language,
          dockerfile_content: dockerfileContent,
          target_path: targetPath,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.message || `Request failed with status ${response.status}`);
      }

      onDone();
    } catch (err) {
      setError(err.message || 'Could not push the Dockerfile to your repo.');
      console.error('Generate dockerfile failed:', err);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className='add-project-modal__content dockerize-form-panel'>
      <h2>Generate a Dockerfile</h2>

      {/* Step: pick a language */}
      {!language && (
        <div className='dockerize-language-grid'>
          {LANGUAGES.map((lang) => (
            <article
              key={lang.value}
              className='project-card dockerize-choice-card'
              onClick={() => handleLanguageSelect(lang.value)}
            >
              <p className='project-title'>{lang.label}</p>
            </article>
          ))}
        </div>
      )}

      {/* Step: review/edit + pick a token + confirm target path */}
      {language && (
        <form className='add-project-form' onSubmit={handleSubmit}>
          <label>
            Language
            <input type='text' value={LANGUAGES.find((l) => l.value === language)?.label} disabled />
          </label>

          <label>
            Dockerfile (edit if you'd like to customize it)
            {loadingTemplate ? (
              <p className='project-label'>Loading default template...</p>
            ) : (
              <textarea
                className='dockerize-editor'
                value={dockerfileContent}
                onChange={(e) => setDockerfileContent(e.target.value)}
                rows={18}
                spellCheck={false}
              />
            )}
          </label>

          <label>
            Path in repo to push to
            <input
              type='text'
              value={targetPath}
              onChange={(e) => setTargetPath(e.target.value)}
              required
              placeholder='Dockerfile'
            />
          </label>

          <label>
            <div className='dockerize-token-label-row'>
              <span style={{ marginRight: '0.5rem' }}>GitHub token to use</span>
              
            </div>

            {loadingTokens ? (
              <p className='project-label'>Loading your tokens...</p>
            ) : tokens.length === 0 ? (
              <p className='project-alert project-alert--error'>
                You have no saved GitHub tokens yet. Add one from the GitHub Tokens page first.
              </p>
            ) : (
              <div>
                <select value={githubTokenId} onChange={(e) => setGithubTokenId(e.target.value)} required style={{width: '300px', marginRight: '0.5rem', height: '2rem'}}>
                  <option value=''>Select a token...</option>
                  {tokens.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
                <button
                  type='button'
                  className='dockerize-reload-btn'
                  title='Refresh token list'
                  onClick={() => setReloadTokens((prev) => !prev)}
                >
                  <i className='fa-solid fa-rotate'></i>
                </button>
              </div>
              
            )}

            <div>
              <a href='/github-tokens' target='_blank' rel='noopener noreferrer'>
                Create One?
              </a>
            </div>
          </label>

          {error && <div className='project-alert project-alert--error'>{error}</div>}

          <div className='add-project-form__actions'>
            <button type='button' className='project-button project-button--ghost' onClick={() => setLanguage('')} disabled={submitting}>
              Change language
            </button>
            <button
              type='submit'
              className='project-button project-button--primary'
              disabled={submitting || !dockerfileContent.trim() || !githubTokenId}
            >
              {submitting ? 'Pushing to GitHub...' : 'Push Dockerfile & Continue'}
            </button>
          </div>
        </form>
      )}

      <div className='add-project-form__actions' style={{ marginTop: '1rem' }}>
        <button type='button' className='project-button project-button--ghost' onClick={onBack} disabled={submitting}>
          Back
        </button>
      </div>
    </div>
  );
}