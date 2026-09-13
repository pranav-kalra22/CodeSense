import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import API from '../config/api';

export default function Assistant() {
  const navigate = useNavigate();
  const [repos, setRepos] = useState([]);
  const [selectedRepo, setSelectedRepo] = useState('');
  const [question, setQuestion] = useState('');
  const [response, setResponse] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingType, setLoadingType] = useState('');

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const selectWrapperRef = useRef(null);

  const token = localStorage.getItem('void_token');

  const forceLogout = () => {
    localStorage.removeItem('void_token');
    navigate('/login');
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (selectWrapperRef.current && !selectWrapperRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    fetchRepos();
  }, []);

  const fetchRepos = async () => {
    try {
      const res = await fetch(`${API.BASE}/api/v1/repos`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.status === 401) return forceLogout();
      if (res.ok) {
        const data = await res.json();
        setRepos(data || []);
        if (data && data.length > 0) setSelectedRepo(data[0].github_full_name);
      }
    } catch (err) {
      console.error("Failed to fetch repos", err);
    }
  };

  const handleUnderstandRepo = async () => {
    if (!selectedRepo) return;
    setIsLoading(true);
    setLoadingType('summary');
    setResponse(null);

    try {
      const repoObj = repos.find(r => r.github_full_name === selectedRepo);
      const res = await fetch(`${API.BASE}/api/v1/repos/${repoObj.id}/summary`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.status === 401) return forceLogout();

      const data = await res.json();
      setResponse({ answer: data.summary, type: 'summary' });
    } catch (err) {
      setResponse({ answer: "Failed to generate summary.", type: 'error' });
    }
    setIsLoading(false);
  };

  const handleAskQuestion = async (e) => {
    e.preventDefault();
    if (!question.trim() || !selectedRepo) return;

    setIsLoading(true);
    setLoadingType('question');
    setResponse(null);

    try {
      const res = await fetch(`${API.BASE}/api/v1/repos/explain`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          repo_name: selectedRepo,
          question: question
        })
      });
      if (res.status === 401) return forceLogout();

      const data = await res.json();
      setResponse({ ...data, type: 'qa' });
    } catch (err) {
      setResponse({ answer: "Failed to query the codebase.", type: 'error' });
    }

    setIsLoading(false);
    // FIX: Removed setQuestion('') so the user's prompt remains in the search bar!
  };

  // ─── MARKDOWN RENDERER ───────────────────────────────────────────────────────
  const renderMarkdown = (text) => {
    if (!text) return null;

    return (
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{

          // ── Code blocks & inline code ──────────────────────────────────────
          code({ node, inline, className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '');
            const lang = match ? match[1] : 'javascript';

            return !inline ? (
              <div style={{
                margin: '1.5rem 0',
                borderRadius: '6px',
                overflow: 'hidden',
                border: '1px solid rgba(255,255,255,0.1)',
                background: '#0a0a0a'
              }}>
                <SyntaxHighlighter
                  language={lang}
                  style={atomDark}
                  customStyle={{ margin: 0, padding: '1.25rem', fontSize: '0.85rem', background: 'transparent' }}
                >
                  {String(children).replace(/\n$/, '')}
                </SyntaxHighlighter>
              </div>
            ) : (
              <code
                style={{
                  background: 'rgba(6, 182, 212, 0.15)',
                  color: 'var(--accent-3)',
                  padding: '0.15rem 0.35rem',
                  borderRadius: '4px',
                  fontSize: '0.85em',
                  fontFamily: 'var(--font-mono)'
                }}
                {...props}
              >
                {children}
              </code>
            );
          },

          // ── Tables ─────────────────────────────────────────────────────────
          table({ children }) {
            return (
              <div style={{ overflowX: 'auto', margin: '1.5rem 0' }}>
                <table style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: '0.9rem',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '6px',
                  overflow: 'hidden'
                }}>
                  {children}
                </table>
              </div>
            );
          },
          thead({ children }) {
            return (
              <thead style={{ background: 'rgba(6, 182, 212, 0.06)', borderBottom: '1px solid rgba(6, 182, 212, 0.25)' }}>
                {children}
              </thead>
            );
          },
          tbody({ children }) {
            return <tbody>{children}</tbody>;
          },
          th({ children }) {
            return (
              <th style={{
                padding: '0.65rem 1rem',
                textAlign: 'left',
                color: 'var(--accent-3)',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.78rem',
                textTransform: 'uppercase',
                letterSpacing: '0.07em',
                whiteSpace: 'nowrap',
                fontWeight: 600,
                borderRight: '1px solid rgba(255,255,255,0.04)'
              }}>
                {children}
              </th>
            );
          },
          td({ children }) {
            return (
              <td style={{
                padding: '0.6rem 1rem',
                color: 'var(--gray-300)',
                borderBottom: '1px solid rgba(255,255,255,0.04)',
                borderRight: '1px solid rgba(255,255,255,0.04)',
                verticalAlign: 'top'
              }}>
                {children}
              </td>
            );
          },
          tr({ children }) {
            return (
              <tr
                style={{ transition: 'background 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.025)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                {children}
              </tr>
            );
          },

          // ── Headings ───────────────────────────────────────────────────────
          h1({ children }) {
            return (
              <h1 className="text-mono" style={{
                color: 'var(--white)',
                fontSize: '1.6rem',
                borderBottom: '1px solid rgba(255,255,255,0.1)',
                paddingBottom: '0.5rem',
                marginTop: '2rem',
                marginBottom: '1rem'
              }}>
                {children}
              </h1>
            );
          },
          h2({ children }) {
            return (
              <h2 className="text-mono" style={{
                color: 'var(--accent-2)',
                fontSize: '1.3rem',
                marginTop: '1.75rem',
                marginBottom: '0.75rem'
              }}>
                {children}
              </h2>
            );
          },
          h3({ children }) {
            return (
              <h3 className="text-mono" style={{
                color: 'var(--accent-1)',
                fontSize: '1.1rem',
                marginTop: '1.5rem',
                marginBottom: '0.5rem',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}>
                {children}
              </h3>
            );
          },
          h4({ children }) {
            return (
              <h4 className="text-mono" style={{
                color: 'var(--accent-1)',
                fontSize: '1rem',
                marginTop: '1.25rem',
                marginBottom: '0.4rem',
                opacity: 0.85
              }}>
                {children}
              </h4>
            );
          },

          // ── Paragraph ──────────────────────────────────────────────────────
          p({ children }) {
            return (
              <p style={{ marginBottom: '0.75rem', lineHeight: 1.7, color: 'var(--gray-300)' }}>
                {children}
              </p>
            );
          },

          // ── Inline formatting ──────────────────────────────────────────────
          strong({ children }) {
            return (
              <strong style={{ color: 'var(--white)', fontWeight: 700 }}>
                {children}
              </strong>
            );
          },
          em({ children }) {
            return (
              <em style={{ color: 'var(--gray-300)', fontStyle: 'italic' }}>
                {children}
              </em>
            );
          },
          del({ children }) {
            return (
              <del style={{ color: 'var(--gray-500)', textDecoration: 'line-through' }}>
                {children}
              </del>
            );
          },

          // ── Lists ──────────────────────────────────────────────────────────
          ul({ children }) {
            return (
              <ul style={{ listStyle: 'none', padding: '0 0 0 0.5rem', margin: '0 0 0.75rem' }}>
                {children}
              </ul>
            );
          },
          ol({ children }) {
            return (
              <ol style={{
                paddingLeft: '1.5rem',
                color: 'var(--gray-300)',
                marginBottom: '0.75rem',
                lineHeight: 1.7
              }}>
                {children}
              </ol>
            );
          },
          li({ children, ordered }) {
            // Ordered list items use the browser default number; unordered get the ▹ marker
            if (ordered) {
              return (
                <li style={{ marginBottom: '0.45rem', color: 'var(--gray-300)', lineHeight: 1.6 }}>
                  {children}
                </li>
              );
            }
            return (
              <li style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.5rem',
                marginBottom: '0.5rem',
                lineHeight: 1.6,
                color: 'var(--gray-300)',
                listStyle: 'none'
              }}>
                <span style={{ color: 'var(--accent-3)', marginTop: '0.25rem', flexShrink: 0 }}>▹</span>
                <span style={{ flex: 1 }}>{children}</span>
              </li>
            );
          },

          // ── Blockquote ─────────────────────────────────────────────────────
          blockquote({ children }) {
            return (
              <blockquote style={{
                borderLeft: '3px solid var(--accent-2)',
                paddingLeft: '1rem',
                margin: '1rem 0',
                color: 'var(--gray-400)',
                fontStyle: 'italic',
                background: 'rgba(255,255,255,0.02)',
                borderRadius: '0 4px 4px 0',
                padding: '0.75rem 1rem'
              }}>
                {children}
              </blockquote>
            );
          },

          // ── Horizontal rule ────────────────────────────────────────────────
          hr() {
            return (
              <hr style={{
                border: 'none',
                borderTop: '1px solid rgba(255,255,255,0.08)',
                margin: '2rem 0'
              }} />
            );
          },

          // ── Links ──────────────────────────────────────────────────────────
          a({ href, children }) {
            return (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  color: 'var(--accent-3)',
                  textDecoration: 'underline',
                  textUnderlineOffset: '3px',
                  textDecorationColor: 'rgba(6, 182, 212, 0.4)',
                  transition: 'text-decoration-color 0.2s'
                }}
                onMouseEnter={e => e.currentTarget.style.textDecorationColor = 'var(--accent-3)'}
                onMouseLeave={e => e.currentTarget.style.textDecorationColor = 'rgba(6, 182, 212, 0.4)'}
              >
                {children}
              </a>
            );
          },
        }}
      >
        {text}
      </ReactMarkdown>
    );
  };
  // ─────────────────────────────────────────────────────────────────────────────

  const selectedLabel = repos.find(r => r.github_full_name === selectedRepo)?.github_full_name ?? 'No repositories found';

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', paddingBottom: '4rem' }}>

      <style>{`
        .neon-select-trigger {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.8rem 1.25rem;
          background: rgba(0, 0, 0, 0.4);
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
          user-select: none;
          animation: neonActivePulse 4s infinite alternate;
        }

        .neon-select-trigger:hover {
          background: rgba(255,255,255,0.02);
        }

        .neon-select-label {
          flex: 1;
          font-family: var(--font-mono);
          font-size: 0.95rem;
          color: var(--white);
          font-weight: 600;
        }

        .query-button {
          background: rgba(6, 182, 212, 0.1);
          color: var(--accent-3);
          border: 1px solid rgba(6, 182, 212, 0.4);
          border-radius: 8px;
          padding: 0 2rem;
          font-weight: bold;
          cursor: pointer;
          transition: all 0.2s;
        }
        .query-button:hover:not(:disabled) {
          background: rgba(6, 182, 212, 0.2);
          box-shadow: 0 0 15px rgba(6, 182, 212, 0.4);
        }
        .query-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          background: transparent;
          border-color: var(--border-visible);
          color: var(--gray-500);
          box-shadow: none;
        }

        /* Scoped table styles to avoid bleed */
        .md-body table {
          width: 100%;
          border-collapse: collapse;
        }
      `}</style>

      <header className="animate-in" style={{ marginBottom: '3rem' }}>
        <h1 className="text-huge" style={{ fontFamily: 'var(--mono)' }}>Assistant</h1>
        <p className="text-muted" style={{ marginTop: '0.5rem' }}>Query your indexed codebase.</p>
      </header>

      <div className="animate-in" style={{ position: 'relative', zIndex: 50, animationDelay: '100ms', display: 'flex', gap: '1rem', marginBottom: '2.5rem' }}>
        <div className="custom-select-wrapper" ref={selectWrapperRef} style={{ flex: 1, zIndex: 50 }}>
          <div className="neon-select-trigger" onClick={() => setDropdownOpen(prev => !prev)}>
            <span className="dot" style={{ background: 'var(--accent-2)', boxShadow: '0 0 8px var(--accent-2)' }} />
            <span className="neon-select-label">{selectedLabel}</span>
            <span className={`custom-select-chevron ${dropdownOpen ? 'open' : ''}`}>▼</span>
          </div>

          <div className={`custom-select-dropdown ${dropdownOpen ? 'open' : ''}`} style={{ top: 'calc(100% + 8px)', border: '1px solid rgba(139, 92, 246, 0.4)' }}>
            {repos.length === 0 ? (
              <div className="custom-select-option">No repositories found</div>
            ) : repos.map(r => (
              <div
                key={r.id}
                className={`custom-select-option ${r.github_full_name === selectedRepo ? 'selected' : ''}`}
                onClick={() => { setSelectedRepo(r.github_full_name); setDropdownOpen(false); }}
              >
                <span className="custom-select-option-dot" style={{ background: 'var(--accent-2)' }} />
                {r.github_full_name}
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={handleUnderstandRepo}
          disabled={isLoading}
          className="text-mono"
          style={{
            background: 'var(--white)', color: 'var(--black)', border: 'none',
            padding: '0 1.5rem', borderRadius: '8px', cursor: isLoading ? 'not-allowed' : 'pointer', fontWeight: 600,
            opacity: isLoading ? 0.5 : 1
          }}
        >
          {isLoading && loadingType === 'summary' ? 'ANALYZING...' : 'SUMMARIZE ARCHITECTURE'}
        </button>
      </div>

      <form onSubmit={handleAskQuestion} className="animate-in" style={{ animationDelay: '150ms', marginBottom: '3rem', display: 'flex', gap: '1rem' }}>
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask a question... (e.g. 'How are user tokens verified?')"
          className="assistant-input"
          disabled={isLoading}
          style={{ flex: 1 }}
        />
        <button type="submit" disabled={isLoading || !question.trim()} className="text-mono query-button">
          INITIALIZE QUERY
        </button>
      </form>

      {isLoading && (
        <div className="assistant-response animate-in" style={{ border: '1px solid rgba(6, 182, 212, 0.3)' }}>
          <div className="text-muted text-mono" style={{ marginBottom: '1.5rem', color: 'var(--accent-3)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span className="dot dot-blue" style={{ animation: 'pulse 1s infinite' }} />
            {loadingType === 'summary' ? 'Synthesizing repository architecture...' : 'Traversing vector embeddings...'}
          </div>
          <div className="breathing-skeleton" style={{ width: '100%' }}></div>
          <div className="breathing-skeleton" style={{ width: '85%' }}></div>
          <div className="breathing-skeleton" style={{ width: '92%' }}></div>
          <div className="breathing-skeleton" style={{ width: '60%' }}></div>
        </div>
      )}

      {response && !isLoading && (
        <div
          className="assistant-response animate-in"
          style={{ border: response.type === 'error' ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(255,255,255,0.1)' }}
        >
          {response.type === 'qa' && response.confidence > 0 && (
            <div className="text-mono" style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.05)'
            }}>
              <span style={{ color: 'var(--gray-400)', fontSize: '0.8rem' }}>AI ANALYSIS COMPLETED</span>
              <span style={{
                color: 'var(--accent-3)', fontSize: '0.85rem',
                background: 'rgba(6, 182, 212, 0.1)', padding: '0.3rem 0.8rem', borderRadius: '4px'
              }}>
                Confidence: {response.confidence}%
              </span>
            </div>
          )}

          {/* md-body scopes markdown styles cleanly */}
          <div className="md-body" style={{ fontSize: '0.95rem' }}>
            {renderMarkdown(response.answer)}
          </div>

          {response.type === 'qa' && response.referenced_functions?.length > 0 && (
            <div style={{ marginTop: '2.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-invisible)' }}>
              <div className="text-muted text-mono" style={{ fontSize: '0.75rem', marginBottom: '1rem', letterSpacing: '0.05em' }}>REFERENCED VECTORS:</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {response.referenced_functions.map((ref, idx) => (
                  <span key={idx} className="text-mono" style={{
                    fontSize: '0.8rem', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)',
                    padding: '0.4rem 0.75rem', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '0.5rem'
                  }}>
                    <span style={{ color: 'var(--accent-1)' }}>ƒ</span>
                    <span style={{ color: 'var(--white)' }}>{ref.name}</span>
                    <span style={{ color: 'var(--gray-500)' }}>{ref.file}</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}