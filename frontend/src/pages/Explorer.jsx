import React, { useState, useEffect, useRef } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark } from 'react-syntax-highlighter/dist/esm/styles/prism'; 
import API from '../config/api';

export default function Explorer() {
  const [repos, setRepos] = useState([]);
  const [selectedRepo, setSelectedRepo] = useState('');
  const [fileTree, setFileTree] = useState({}); 
  const [expandedNodes, setExpandedNodes] = useState({}); 
  const [selectedFunc, setSelectedFunc] = useState(null);
  const [similarFuncs, setSimilarFuncs] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [expandedMatches, setExpandedMatches] = useState({});

  // Custom Dropdown State & Refs
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const selectWrapperRef = useRef(null);

  const token = localStorage.getItem('void_token');

  // Handle clicking outside the custom dropdown to close it
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (selectWrapperRef.current && !selectWrapperRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const buildNestedTree = (flatData) => {
    const root = {};
    flatData.forEach(item => {
      const parts = item.file.split('/');
      let current = root;
      parts.forEach((part, i) => {
        if (i === parts.length - 1) {
          current[part] = { _isFile: true, path: item.file, functions: item.functions };
        } else {
          if (!current[part]) current[part] = {};
          current = current[part];
        }
      });
    });
    return root;
  };

  useEffect(() => {
    fetch(`${API.BASE}/api/v1/repos`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (data && data.length > 0) {
          setRepos(data);
          setSelectedRepo(data[0].id);
        }
      })
      .catch(err => console.error("Failed to fetch repos", err));
  }, [token]);

  useEffect(() => {
    if (!selectedRepo) return;

    fetch(`${API.BASE}/api/v1/repos/${selectedRepo}/indexed-files`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => {
        if (!res.ok) throw new Error("Endpoint not ready");
        return res.json();
      })
      .then(data => setFileTree(buildNestedTree(data)))
      .catch(() => {
        const mockData = [
          { file: "handlers/api/auth.go", functions: [{ name: "ValidateJWT", lines: "12-45" }, { name: "GenerateToken", lines: "47-80" }] },
          { file: "db/postgres.go", functions: [{ name: "ConnectDB", lines: "10-25" }, { name: "QueryUser", lines: "27-60" }] },
          { file: "services/rag/embedder.py", functions: [{ name: "embed_code", lines: "15-30" }, { name: "search_chroma", lines: "32-50" }] }
        ];
        setFileTree(buildNestedTree(mockData));
      });
  }, [selectedRepo, token]);

  const toggleNode = (path) => setExpandedNodes(prev => ({ ...prev, [path]: !prev[path] }));
  const toggleMatch = (idx) => setExpandedMatches(prev => ({ ...prev, [idx]: !prev[idx] }));

  const handleFunctionClick = (func, fileName) => {
    setSelectedFunc({ ...func, file: fileName });
    setIsSearching(true);
    setExpandedMatches({}); 

    fetch(`${API.BASE}/api/v1/search-similar`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ repo_id: selectedRepo, query: func.name })
    })
      .then(res => {
        if (!res.ok) throw new Error("Endpoint not ready");
        return res.json();
      })
      .then(data => {
        setSimilarFuncs(data);
        setExpandedMatches({ 0: true }); 
        setIsSearching(false);
      })
      .catch(() => {
        setTimeout(() => {
          setSimilarFuncs([
            { name: "verify_token", file: "middleware/auth.py", similarity: 92, snippet: "def verify_token(req):\n  token = extract(req)\n  # Verify signature using high-contrast logic\n  if not token:\n    return None\n  return decode(token)" },
            { name: "CheckAuth", file: "utils/security.go", similarity: 85, snippet: "func CheckAuth(ctx Context) error {\n  // 500 lines of auth logic avoided thanks to collapsible UI\n  return nil\n}" }
          ]);
          setExpandedMatches({ 0: true }); 
          setIsSearching(false);
        }, 600);
      });
  };

  const renderTree = (nodes, currentPath = "") => {
    return Object.entries(nodes).map(([name, node]) => {
      const nodePath = currentPath ? `${currentPath}/${name}` : name;
      const isExpanded = expandedNodes[nodePath];

      if (node._isFile) {
        return (
          <div key={nodePath} style={{ marginBottom: '0.2rem', marginLeft: '1rem' }}>
            <div onClick={() => toggleNode(nodePath)} className="text-mono"
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 0.5rem', cursor: 'pointer', borderRadius: '4px', transition: 'background 0.2s' }}
              onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
              onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
            >
              <span className="text-muted" style={{ fontSize: '0.6rem', transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>▶</span>
              <span style={{ color: 'var(--accent-3)', fontSize: '0.85rem' }}>📄 {name}</span>
            </div>
            
            <div className={`void-collapse ${isExpanded ? 'open' : ''}`}>
              <div className="void-collapse-inner" style={{ paddingLeft: '1.5rem', paddingBottom: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                {node.functions.map((func, j) => (
                  <div key={j} onClick={() => handleFunctionClick(func, node.path)} className="text-mono"
                    style={{ 
                      padding: '0.4rem 0.75rem', cursor: 'pointer', borderRadius: '4px', fontSize: '0.8rem',
                      color: selectedFunc?.name === func.name ? 'var(--white)' : 'var(--gray-400)',
                      background: selectedFunc?.name === func.name ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                      borderLeft: selectedFunc?.name === func.name ? '2px solid var(--accent-1)' : '2px solid transparent',
                      transition: 'all 0.2s'
                    }}
                    onMouseOver={(e) => { if (selectedFunc?.name !== func.name) { e.currentTarget.style.color = 'var(--white)'; e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; } }}
                    onMouseOut={(e) => { if (selectedFunc?.name !== func.name) { e.currentTarget.style.color = 'var(--gray-400)'; e.currentTarget.style.background = 'transparent'; } }}
                  >
                    <span style={{ color: selectedFunc?.name === func.name ? 'var(--accent-2)' : 'var(--gray-500)' }}>ƒ</span> {func.name}
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      } else {
        return (
          <div key={nodePath} style={{ marginBottom: '0.2rem', marginLeft: currentPath ? '1rem' : '0' }}>
            <div onClick={() => toggleNode(nodePath)} className="text-mono"
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 0.5rem', cursor: 'pointer', borderRadius: '4px' }}
              onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
              onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
            >
              <span className="text-muted" style={{ fontSize: '0.6rem', transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>▶</span>
              <span style={{ color: 'var(--white)', fontSize: '0.9rem', fontWeight: 'bold' }}>📁 {name}</span>
            </div>
            
            <div className={`void-collapse ${isExpanded ? 'open' : ''}`}>
              <div className="void-collapse-inner">
                {renderTree(node, nodePath)}
              </div>
            </div>
          </div>
        );
      }
    });
  };

  const selectedLabel = repos.find(r => r.id === selectedRepo)?.github_full_name ?? 'No repositories found';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 5rem)', paddingBottom: '2rem' }}>
      
      {/* HEADER: Title and Custom Dropdown on the Left, Subtitle on the Right */}
      <header className="animate-in" style={{ position: 'relative', zIndex: 50, display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>        <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
          <h1 style={{ fontFamily: 'var(--mono)', color: 'var(--white)', fontSize: '2.2rem', fontWeight: 600, letterSpacing: '-0.03em', margin: 0 }}>
            Explorer
          </h1>
          
          {/* Custom Select Component */}
          <div className="custom-select-wrapper" ref={selectWrapperRef}>
            <div
              className={`custom-select-trigger ${dropdownOpen ? 'open' : ''}`}
              onClick={() => setDropdownOpen(prev => !prev)}
            >
              <span className="custom-select-dot" />
              <span className="custom-select-label">{selectedLabel}</span>
              <span className={`custom-select-chevron ${dropdownOpen ? 'open' : ''}`}>▼</span>
            </div>

            <div className={`custom-select-dropdown ${dropdownOpen ? 'open' : ''}`}>
              {repos.length === 0 ? (
                <div className="custom-select-option">No repositories found</div>
              ) : repos.map(r => (
                <div
                  key={r.id}
                  className={`custom-select-option ${r.id === selectedRepo ? 'selected' : ''}`}
                  onClick={() => { setSelectedRepo(r.id); setDropdownOpen(false); }}
                >
                  <span className="custom-select-option-dot" />
                  {r.github_full_name}
                </div>
              ))}
            </div>
          </div>

        </div>
        
        <div style={{ textAlign: 'right' }}>
          <p className="text-muted text-mono" style={{ margin: 0, fontSize: '0.85rem' }}>Visualizing the ChromaDB vector embeddings.</p>
        </div>
      </header>

      <div style={{ display: 'flex', gap: '1.5rem', flex: 1, minHeight: 0 }}>
        
        {/* LEFT PANE: NESTED AST TREE */}
        <div className="void-card animate-in" style={{ flex: 1, display: 'flex', flexDirection: 'column', animationDelay: '100ms', overflow: 'hidden' }}>
          <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-invisible)', background: 'rgba(255,255,255,0.02)' }}>
            <h2 className="text-mono text-muted" style={{ fontSize: '0.85rem', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Abstract Syntax Tree</h2>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
            {Object.keys(fileTree).length === 0 ? (
              <div className="text-muted text-mono" style={{ fontSize: '0.8rem', textAlign: 'center', marginTop: '2rem' }}>No AST data mapped.</div>
            ) : (
              renderTree(fileTree)
            )}
          </div>
        </div>

        {/* RIGHT PANE: VECTOR MATCHES */}
        <div className="void-card animate-in" style={{ flex: 1.5, display: 'flex', flexDirection: 'column', animationDelay: '200ms', overflow: 'hidden' }}>
          <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-invisible)', background: 'rgba(255,255,255,0.02)' }}>
            <h2 className="text-mono text-muted" style={{ fontSize: '0.85rem', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Vector Match Analysis</h2>
          </div>
          
          <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
            {!selectedFunc ? (
              <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span className="text-muted text-mono" style={{ background: 'rgba(255,255,255,0.03)', padding: '0.75rem 1.5rem', borderRadius: '20px' }}>Select a function to query ChromaDB</span>
              </div>
            ) : isSearching ? (
              <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                 <div className="text-mono neon-pulse" style={{ padding: '0.75rem 1.5rem', borderRadius: '20px', color: 'var(--accent-1)', fontSize: '0.9rem' }}>Searching Vector Space...</div>
              </div>
            ) : (
              <div className="stagger">
                
                <div style={{ marginBottom: '2rem', paddingBottom: '1.5rem', borderBottom: '1px solid var(--border-visible)' }}>
                  <div className="text-mono text-muted" style={{ fontSize: '0.75rem', marginBottom: '0.5rem', letterSpacing: '0.05em' }}>QUERY TARGET</div>
                  <div className="text-mono text-large" style={{ color: 'var(--white)' }}>{selectedFunc.name}</div>
                  <div className="text-mono text-muted" style={{ fontSize: '0.85rem', marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span className="dot dot-blue" style={{ width: '6px', height: '6px' }}/> {selectedFunc.file} (Lines {selectedFunc.lines})
                  </div>
                </div>

                <div className="text-mono text-muted" style={{ fontSize: '0.75rem', marginBottom: '1rem', letterSpacing: '0.05em' }}>NEAREST NEIGHBORS</div>
                
                {similarFuncs.map((match, i) => (
                  <div key={i} className="animate-in" style={{ animationDelay: `${i * 100}ms`, background: 'rgba(255,255,255,0.015)', border: '1px solid var(--border-visible)', borderRadius: '8px', overflow: 'hidden', marginBottom: '1rem' }}>
                    
                    {/* Collapsible Header */}
                    <div 
                      onClick={() => toggleMatch(i)}
                      style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.25rem', borderBottom: expandedMatches[i] ? '1px solid rgba(255,255,255,0.05)' : 'none', cursor: 'pointer', background: expandedMatches[i] ? 'rgba(0,0,0,0.4)' : 'transparent', transition: 'background 0.2s' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <span className="text-muted" style={{ fontSize: '0.7rem', transform: expandedMatches[i] ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>▶</span>
                        <div>
                          <div className="text-mono" style={{ color: 'var(--white)', fontSize: '1.05rem', marginBottom: '0.25rem' }}>{match.name}</div>
                          <div className="text-mono text-muted" style={{ fontSize: '0.75rem' }}>{match.file}</div>
                        </div>
                      </div>
                      <div className="text-mono" style={{ color: 'var(--green)', fontSize: '0.85rem', background: 'rgba(34,197,94,0.1)', padding: '0.3rem 0.75rem', borderRadius: '4px', border: '1px solid rgba(34,197,94,0.2)' }}>
                        {match.similarity}% Match
                      </div>
                    </div>
                    
                    {/* Collapsible Code Block with Syntax Highlighting */}
                    <div className={`void-collapse ${expandedMatches[i] ? 'open' : ''}`}>
                      <div className="void-collapse-inner" style={{ background: '#0a0a0a' }}>
                        <SyntaxHighlighter 
                          language={match.file.endsWith('.go') ? 'go' : (match.file.endsWith('.js')||match.file.endsWith('.jsx')) ? 'javascript' : match.file.endsWith('.ts') ? 'typescript' : 'python'}                          style={atomDark} 
                          showLineNumbers={true}
                          lineNumberStyle={{ color: 'rgba(255,255,255,0.15)', minWidth: '2.5em', paddingRight: '1em', textAlign: 'right' }}
                          customStyle={{ margin: 0, padding: '1.5rem', fontSize: '0.85rem', background: 'transparent' }}
                        >
                          {match.snippet}
                        </SyntaxHighlighter>
                      </div>
                    </div>

                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}