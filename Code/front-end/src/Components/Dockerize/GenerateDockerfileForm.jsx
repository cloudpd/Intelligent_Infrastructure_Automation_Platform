import React, { useEffect, useState } from 'react';
import { baseUrl as API_URL } from '../Shared/baseUrl';

const LANGUAGES = [
  { value: 'node', label: 'Node.js' },
  { value: 'python', label: 'Python' },
];

export default function GenerateDockerfileForm({ serviceId, onBack, onDone }) {
  // language is no longer chosen up front — it's inferred by the AI suggestion,
  // with a small inline toggle as a fallback for manual entry.
  const [language, setLanguage] = useState('');

  const [baseImage, setBaseImage] = useState('');
  const [port, setPort] = useState('');
  const [runCommand, setRunCommand] = useState('');
  const [targetPath, setTargetPath] = useState('Dockerfile');

  const [tokens, setTokens] = useState([]);
  const [githubTokenId, setGithubTokenId] = useState('');

  const [loadingTokens, setLoadingTokens] = useState(true);
  const [suggesting, setSuggesting] = useState(false);
  const [suggestError, setSuggestError] = useState('');
  const [hasSuggested, setHasSuggested] = useState(false);

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

  async function handleSuggest() {
    setSuggestError('');
    setSuggesting(true);

    const token = localStorage.getItem('token');

    try {
      const response = await fetch(`${API_URL}/dockerize/suggest`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ service_id: serviceId, github_token_id: githubTokenId }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        // AI couldn't produce a valid suggestion (or the model call failed) —
        // this is not a dead end, the user can still fill everything in below.
        throw new Error(data?.message || 'Could not generate a suggestion — you can still fill this in yourself.');
      }

      setLanguage(data.suggestion.language);
      setBaseImage(data.suggestion.base_image);
      setPort(String(data.suggestion.port));
      setRunCommand(data.suggestion.run_command);
      setHasSuggested(true);
    } catch (err) {
      setSuggestError(err.message);
      console.error('Suggest dockerfile config failed:', err);
    } finally {
      setSuggesting(false);
    }
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
      <p className='project-label'>
        We'll read your repo and suggest a setup — or you can fill it in yourself below.
      </p>

      <form className='add-project-form' onSubmit={handleSubmit}>
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
            <div className='dockerize-token-controls'>
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

        <div className='dockerize-suggest-panel'>
          <div className='dockerize-suggest-copy'>
            <strong>Not sure what to enter?</strong>
            <span>
              {hasSuggested
                ? 'Suggested from your repo — review and edit anything below.'
                : "We'll read your repo and fill in the fields below."}
            </span>
          </div>
          <button
            type='button'
            className='dockerize-suggest-btn'
            onClick={handleSuggest}
            disabled={!githubTokenId || suggesting}
            title={!githubTokenId ? 'Select a GitHub token first' : undefined}
          >
            <i className={`fa-solid ${suggesting ? 'fa-spinner fa-spin' : 'fa-wand-magic-sparkles'}`}></i>
            {suggesting ? 'Analyzing your repo...' : hasSuggested ? 'Re-analyze repo' : 'Suggest with AI'}
          </button>
        </div>

        {suggestError && (
          <div className='project-alert project-alert--error'>
            <i className='fa-solid fa-circle-exclamation'></i>
            {suggestError}
          </div>
        )}

        <label>
          Runtime
          <div className='dockerize-runtime-toggle'>
            {LANGUAGES.map((lang) => (
              <button
                type='button'
                key={lang.value}
                className={`dockerize-runtime-pill${language === lang.value ? ' dockerize-runtime-pill--active' : ''}`}
                onClick={() => setLanguage(lang.value)}
              >
                {lang.label}
              </button>
            ))}
          </div>
        </label>

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

        {error && (
          <div className='project-alert project-alert--error'>
            <i className='fa-solid fa-circle-exclamation'></i>
            {error}
          </div>
        )}

        <div className='add-project-form__actions'>
          <button type='button' className='project-button project-button--ghost' onClick={onBack} disabled={submitting}>
            Back
          </button>
          <button
            type='submit'
            className='project-button project-button--primary'
            disabled={
              submitting || !language || !baseImage.trim() || !port || !runCommand.trim() || !githubTokenId
            }
          >
            {submitting ? 'Pushing to GitHub...' : 'Push Dockerfile & Continue'}
          </button>
        </div>
      </form>
    </div>
  );
}