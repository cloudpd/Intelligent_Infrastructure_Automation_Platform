import React, { useEffect, useState } from 'react';
import reloadIcon from '../../finalProject assets/reload.jpg';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
const LANGUAGES = [
  { value: 'node', label: 'Node.js' },
  { value: 'python', label: 'Python' },
];

export default function GenerateDockerfileForm({ serviceId, onBack, onDone }) {
  const [language, setLanguage] = useState('');

  const [baseImage, setBaseImage] = useState('');
  const [port, setPort] = useState('');
  const [runCommand, setRunCommand] = useState('');
  const [targetPath, setTargetPath] = useState('Dockerfile');

  const [tokens, setTokens] = useState([]);
  const [githubTokenId, setGithubTokenId] = useState('');

  const [loadingDefaults, setLoadingDefaults] = useState(false);
  const [loadingTokens, setLoadingTokens] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchTokens();
  }, []);

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
    setLoadingDefaults(true);

    const token = localStorage.getItem('token');

    fetch(`${API_URL}/dockerize/defaults/${lang}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load defaults');
        return res.json();
      })
      .then((data) => {
        setBaseImage(data.defaults.BASE_IMAGE);
        setPort(data.defaults.PORT);
        // defaults come back as `"node", "index.js"` — show the user a plain command instead
        setRunCommand(data.defaults.RUN_COMMAND.replace(/"/g, '').replaceAll(', ', ' '));
      })
      .catch((err) => {
        console.error('Failed to fetch defaults:', err);
        setError('Could not load defaults for this language.');
      })
      .finally(() => setLoadingDefaults(false));
  }

  function handleChangeLanguage() {
    setLanguage('');
    setBaseImage('');
    setPort('');
    setRunCommand('');
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
          base_image: baseImage,
          port: Number(port),
          run_command: runCommand,
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

      {language && (
        <form className='add-project-form' onSubmit={handleSubmit}>
          <label>
            Language
            <input type='text' value={LANGUAGES.find((l) => l.value === language)?.label} disabled />
          </label>

          {loadingDefaults ? (
            <p className='project-label'>Loading defaults...</p>
          ) : (
            <>
              <label>
                Base image
                <input
                  type='text'
                  value={baseImage}
                  onChange={(e) => setBaseImage(e.target.value)}
                  required
                  placeholder='e.g. node:22-alpine'
                />
              </label>

              <label>
                Port
                <input
                  type='number'
                  value={port}
                  onChange={(e) => setPort(e.target.value)}
                  required
                  min={1}
                  max={65535}
                  placeholder='e.g. 3000'
                />
              </label>

              <label>
                Run command
                <input
                  type='text'
                  value={runCommand}
                  onChange={(e) => setRunCommand(e.target.value)}
                  required
                  placeholder='e.g. node index.js'
                />
              </label>
            </>
          )}

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
              <span>GitHub token to use</span>
              
            </div>
            {loadingTokens ? (
              <p className='project-label'>Loading your tokens...</p>
            ) : tokens.length === 0 ? (
              <p className='project-alert project-alert--error'>
                You have no saved GitHub tokens yet. Add one from the GitHub Tokens page first.
              </p>
            ) : (
              <div>
                <select value={githubTokenId} onChange={(e) => setGithubTokenId(e.target.value)} required>
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
                  onClick={fetchTokens}
                >
                  {/* <img src={reloadIcon} alt='Reload' width='20' height='20' /> */}
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
            <button type='button' className='project-button project-button--ghost' onClick={handleChangeLanguage} disabled={submitting}>
              Change language
            </button>
            <button
              type='submit'
              className='project-button project-button--primary'
              disabled={submitting || !baseImage.trim() || !port || !runCommand.trim() || !githubTokenId}
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