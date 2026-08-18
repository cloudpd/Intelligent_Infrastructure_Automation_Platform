import React, { useEffect, useRef, useState } from 'react';
import { baseUrl as API_URL } from '../Shared/baseUrl';

const LANGUAGES = [
  { value: 'node', label: 'Node.js' },
  { value: 'python', label: 'Python' },
];

function CustomTokenDropdown({ tokens, selectedId, onSelect }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const selectedToken = tokens.find((t) => String(t.id) === String(selectedId));

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className='custom-token-dropdown' ref={dropdownRef} style={{ position: 'relative', flex: 1 }}>
      <input type='hidden' name='github_token_id' value={selectedId || ''} required />
      <div
        className={`custom-token-trigger ${isOpen ? 'custom-token-trigger--open' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
          <i className='fa-brands fa-github' style={{ color: '#38bdf8', fontSize: '1.2rem' }} />
          <span style={{ color: selectedToken ? '#f8fafc' : '#94a3b8', fontWeight: 600, fontSize: '0.95rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {selectedToken ? selectedToken.name : 'Select a GitHub token...'}
          </span>
        </div>
        <i className={`fa-solid fa-chevron-down custom-token-chevron ${isOpen ? 'custom-token-chevron--open' : ''}`} />
      </div>

      {isOpen && (
        <div className='custom-token-popover'>
          <div className='custom-token-popover__header'>
            <span>SAVED GITHUB TOKENS ({tokens.length})</span>
          </div>
          <div className='custom-token-popover__list'>
            {tokens.map((t) => {
              const isSelected = String(t.id) === String(selectedId);
              return (
                <div
                  key={t.id}
                  className={`custom-token-choice-item ${isSelected ? 'custom-token-choice-item--selected' : ''}`}
                  onClick={() => {
                    onSelect(t.id);
                    setIsOpen(false);
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div className='custom-token-choice-icon'>
                      <i className='fa-brands fa-github' />
                    </div>
                    <div>
                      <div className='custom-token-choice-title'>{t.name}</div>
                      <div className='custom-token-choice-sub'>Personal Access Token</div>
                    </div>
                  </div>
                  {isSelected && <i className='fa-solid fa-check' style={{ color: '#38bdf8', fontWeight: 900 }} />}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

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
      .then((data) => {
        const list = data.tokens || [];
        setTokens(list);
        if (list.length > 0) {
          setGithubTokenId((prev) => prev || list[0].id);
        }
      })
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
        <div className='dockerize-form-group' style={{ marginBottom: '16px' }}>
          <div className='dockerize-token-label-row' style={{ marginBottom: '6px', fontWeight: '600', fontSize: '0.95rem' }}>
            <span>GitHub token to use</span>
          </div>
          {loadingTokens ? (
            <p className='project-label'>Loading your saved tokens...</p>
          ) : tokens.length === 0 ? (
            <div className='dockerize-no-tokens-box'>
              <p className='project-alert project-alert--error' style={{ margin: 0 }}>
                <i className='fa-solid fa-triangle-exclamation' />
                No GitHub Access Tokens found. Save a token to analyze your repos.
              </p>
              <a href='/github-tokens' target='_blank' rel='noopener noreferrer' className='project-button project-button--primary mt-2' style={{ width: 'fit-content' }}>
                <i className='fa-solid fa-key' /> Manage GitHub Tokens
              </a>
            </div>
          ) : (
            <div className='dockerize-select-wrapper' style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '8px', marginBottom: '8px' }}>
              <CustomTokenDropdown tokens={tokens} selectedId={githubTokenId} onSelect={setGithubTokenId} />
              <button
                type='button'
                className='dockerize-reload-btn'
                title='Refresh token list'
                onClick={fetchTokens}
                style={{ height: '50px', width: '50px', flexShrink: 0, borderRadius: 'var(--radius-md)' }}
              >
                <i className='fa-solid fa-rotate' />
              </button>
            </div>
          )}
          <div style={{ marginTop: '4px' }}>
            <a href='/github-tokens' target='_blank' rel='noopener noreferrer' style={{ color: '#38bdf8', fontSize: '0.85rem', textDecoration: 'none', fontWeight: '600' }}>
              + Create or Manage Tokens
            </a>
          </div>
        </div>

        <div className='dockerize-suggest-panel'>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className='dockerize-suggest-badge'>
              <i className='fa-solid fa-wand-magic-sparkles' />
            </div>
            <div className='dockerize-suggest-copy'>
              <strong>Analyze repository with AI</strong>
              <span>
                {hasSuggested
                  ? 'Suggested from your repo — review and edit anything below.'
                  : "We'll read your repo structure and auto-fill your container settings."}
              </span>
            </div>
          </div>
          <button
            type='button'
            className='dockerize-suggest-btn'
            onClick={handleSuggest}
            disabled={!githubTokenId || suggesting}
            title={!githubTokenId ? 'Select a GitHub token first' : undefined}
          >
            <i className={`fa-solid ${suggesting ? 'fa-spinner fa-spin' : 'fa-wand-magic-sparkles'}`}></i>
            {suggesting ? 'Analyzing Repo...' : hasSuggested ? 'Re-analyze Repo' : 'Auto-Fill with AI'}
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