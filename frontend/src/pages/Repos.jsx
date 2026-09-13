import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../config/api';

export default function Repos() {
  const navigate = useNavigate();
  
  // NEW: Added Loading State
  const [loading, setLoading] = useState(true);
  
  const [isAdding, setIsAdding] = useState(false);
  const [newRepo, setNewRepo] = useState('');
  const [newSecret, setNewSecret] = useState('');
  const [newInstructions, setNewInstructions] = useState('');
  const [repos, setRepos] = useState([]);
  const [indexingRepos, setIndexingRepos] = useState({});
  
  // Custom Modal State
  const [repoToDelete, setRepoToDelete] = useState(null); 
  const [deletePassphrase, setDeletePassphrase] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const token = localStorage.getItem('void_token');
  const isAdmin = !!token;

  const forceLogout = () => {
    localStorage.removeItem('void_token');
    navigate('/login');
  };

  useEffect(() => {
    fetchRepos();
  }, []);

  const fetchRepos = async () => {
    try {
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      
      const res = await fetch(`${API.BASE}/api/v1/repos`, { headers });
      if (res.status === 401) return forceLogout();
      if (!res.ok) throw new Error('Failed to fetch repos');
      
      const data = await res.json();
      setRepos(data || []);
    } catch (error) {
      console.error("Error fetching repos:", error);
    } finally {
      // NEW: Turn off loading once the network request settles
      setLoading(false);
    }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newRepo.trim() || !newSecret.trim()) return;
    if (!token) return forceLogout();
    
    try {
      const res = await fetch(`${API.BASE}/api/v1/repos`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ github_full_name: newRepo, webhook_secret: newSecret, custom_instructions: newInstructions })
      });

      if (res.status === 401) return forceLogout();
      if (!res.ok) throw new Error('Failed to add repo');

      setNewRepo('');
      setNewSecret('');
      setNewInstructions('');
      setIsAdding(false);
      fetchRepos(); 
      
    } catch (error) {
      console.error("Error adding repo:", error);
    }
  };

  const handleTogglePause = async (id) => {
    if (!isAdmin) return;
    try {
      const res = await fetch(`${API.BASE}/api/v1/repos/${id}/toggle-pause`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
      });
      
      if (res.status === 401) return forceLogout();
      if (!res.ok) throw new Error('Failed to toggle status');
      
      const data = await res.json();
      setRepos(repos.map(r => r.id === id ? { ...r, is_paused: data.is_paused } : r));
    } catch (err) {
      alert("Failed to toggle repository status.");
    }
  };

  const handleReindex = async (repoName) => {
    if (!isAdmin) return;
    setIndexingRepos(prev => ({ ...prev, [repoName]: true }));
    try {
      const res = await fetch(`${API.CODE_INTEL}/api/index`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repo_name: repoName })
      });
      
      if (res.status === 401) return forceLogout();
      if (!res.ok) throw new Error("Failed to trigger indexing");
      
      setTimeout(() => {
        setIndexingRepos(prev => ({ ...prev, [repoName]: false }));
      }, 3000);
    } catch (error) {
      console.error(error);
      alert("Failed to trigger AI Engine.");
      setIndexingRepos(prev => ({ ...prev, [repoName]: false }));
    }
  };

  const confirmDelete = async (e) => {
    e.preventDefault();
    if (!isAdmin || !repoToDelete) return;
    
    setDeleteError('');
    setIsDeleting(true);

    try {
      const res = await fetch(`${API.BASE}/api/v1/repos/${repoToDelete.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ passphrase: deletePassphrase }) 
      });

      if (res.status === 401) return forceLogout();
      if (res.status === 403) {
        setDeleteError("ACCESS DENIED: Incorrect passphrase.");
        setIsDeleting(false);
        return;
      }
      if (!res.ok) {
        setDeleteError(`API Error: ${res.status}`);
        setIsDeleting(false);
        return;
      }

      setRepos(repos.filter(r => r.id !== repoToDelete.id));
      closeModal();
      
    } catch (error) {
      console.error("Failed to delete repo:", error);
      setDeleteError("System Error: Failed to purge repository.");
      setIsDeleting(false);
    }
  };

  const closeModal = () => {
    setRepoToDelete(null);
    setDeletePassphrase('');
    setDeleteError('');
    setIsDeleting(false);
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', position: 'relative' }}>
      
      {repoToDelete && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(5px)'
        }}>
          <div className="void-card animate-in" style={{ 
            background: '#0a0a0a', border: '1px solid #ef4444', width: '100%', maxWidth: '450px', 
            padding: '2rem', boxShadow: '0 0 40px rgba(239, 68, 68, 0.15)' 
          }}>
            <h2 className="text-huge" style={{ color: '#ef4444', fontSize: '1.5rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span className="dot dot-red" style={{ transform: 'scale(1.5)' }}/> CRITICAL ACTION
            </h2>
            <p className="text-muted text-mono" style={{ fontSize: '0.9rem', marginBottom: '1.5rem', lineHeight: '1.6' }}>
              You are about to permanently purge <span style={{ color: 'var(--white)' }}>{repoToDelete.name}</span> and all associated code reviews, comments, and telemetry from the database. 
              <br/><br/>This action cannot be undone.
            </p>

            <form onSubmit={confirmDelete}>
              <input 
                type="password" 
                placeholder="Enter Admin Passphrase" 
                value={deletePassphrase} 
                onChange={(e) => { setDeletePassphrase(e.target.value); setDeleteError(''); }}
                autoFocus
                className="text-mono"
                style={{ 
                  width: '100%', background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.4)', 
                  color: 'var(--white)', padding: '0.8rem', outline: 'none', fontSize: '1rem', borderRadius: '4px', marginBottom: '0.5rem' 
                }} 
              />
              
              <div style={{ minHeight: '20px', marginBottom: '1.5rem' }}>
                {deleteError && <span className="text-mono" style={{ color: '#ef4444', fontSize: '0.8rem' }}>{deleteError}</span>}
              </div>

              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                <button 
                  type="button" 
                  onClick={closeModal}
                  className="text-mono" 
                  disabled={isDeleting}
                  style={{ background: 'transparent', color: 'var(--gray-400)', border: 'none', cursor: 'pointer', padding: '0.6rem 1rem' }}
                >
                  CANCEL
                </button>
                <button 
                  type="submit" 
                  disabled={!deletePassphrase || isDeleting}
                  className="text-mono" 
                  style={{ 
                    background: '#ef4444', color: 'var(--white)', border: 'none', padding: '0.6rem 1.5rem', 
                    borderRadius: '4px', cursor: (!deletePassphrase || isDeleting) ? 'not-allowed' : 'pointer', fontWeight: 600,
                    opacity: (!deletePassphrase || isDeleting) ? 0.5 : 1
                  }}
                >
                  {isDeleting ? 'PURGING...' : 'PURGE REPOSITORY'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <header className="animate-in" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '3rem' }}>
        <div>
          <h1 className="text-huge" style={{fontFamily: 'var(--mono)'}}>Repositories</h1>
          <p className="text-muted" style={{ marginTop: '0.5rem' }}>Monitored codebases.</p>
        </div>
        
        {!isAdding && isAdmin && (
          <button onClick={() => setIsAdding(true)} className="text-mono"
            style={{ 
              background: 'rgba(255, 255, 255, 0.04)', border: '1px solid var(--border-visible)', 
              color: 'var(--white)', cursor: 'pointer', padding: '0.6rem 1.25rem', borderRadius: '6px', transition: 'all 0.2s ease'
            }}>
            + Add Repo
          </button>
        )}
      </header>

      <div className={`void-collapse ${isAdding ? 'open' : ''}`} style={{ marginBottom: isAdding ? '2rem' : '0' }}>
        <div className="void-collapse-inner">
          <form onSubmit={handleAdd} style={{ display: 'flex', flexDirection: 'column', paddingBottom: '1rem' }}>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <input type="text" placeholder="owner/repo-name" value={newRepo} onChange={(e) => setNewRepo(e.target.value)} className="text-mono" autoFocus={isAdding}
                style={{ flex: 1, background: 'transparent', border: 'none', borderBottom: '1px solid var(--border-visible)', color: 'var(--white)', padding: '0.5rem 0', outline: 'none', fontSize: '1rem' }} />
              <input type="password" placeholder="Webhook Secret" value={newSecret} onChange={(e) => setNewSecret(e.target.value)} className="text-mono"
                style={{ flex: 1, background: 'transparent', border: 'none', borderBottom: '1px solid var(--border-visible)', color: 'var(--white)', padding: '0.5rem 0', outline: 'none', fontSize: '1rem' }} />
              <button type="submit" className="text-mono" style={{ background: 'var(--white)', color: 'var(--black)', border: 'none', padding: '0.6rem 1.5rem', borderRadius: '4px', cursor: 'pointer', fontWeight: 600 }}>
                Connect
              </button>
            </div>
            
            <textarea 
              placeholder="Custom Review Instructions (e.g., 'Always enforce strict typing. Ignore line length limits.')" 
              value={newInstructions} 
              onChange={(e) => setNewInstructions(e.target.value)} 
              className="text-mono"
              style={{ 
                width: '100%', background: 'transparent', border: '1px solid var(--border-visible)', 
                color: 'var(--white)', padding: '0.75rem', outline: 'none', fontSize: '0.9rem', 
                borderRadius: '4px', marginTop: '1.5rem', minHeight: '80px', resize: 'vertical'
              }} 
            />
          </form>
        </div>
      </div>

      {/* NEW: Clean Render Logic for Loading vs Empty vs Data */}
      <div className="stagger">
        {loading ? (
          <div className="text-muted text-mono animate-in" style={{ padding: '2rem 0', textAlign: 'center' }}>
            Syncing telemetry...
          </div>
        ) : repos.length === 0 && !isAdding ? (
          <div className="text-muted text-mono animate-in" style={{ padding: '2rem 0', textAlign: 'center' }}>
            No repositories connected.
          </div>
        ) : (
          repos.map((repo, i) => (
            <div key={repo.id} className="void-row animate-in" style={{ animationDelay: `${(i * 60)}ms`, opacity: repo.is_paused ? 0.6 : 1, transition: 'opacity 0.3s' }}>
              <div style={{ flex: 1 }}>
                <span className="text-mono" style={{ color: 'var(--white)', fontSize: '1.1rem' }}>
                  {repo.github_full_name}
                </span>
              </div>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <span className="text-muted text-mono" style={{ marginRight: '1rem' }}>{repo.total_reviews || 0} reviews</span>
                
                <span className="text-mono" style={{ width: '70px', textAlign: 'right', marginRight: '1rem', color: repo.is_paused ? 'var(--gray-500)' : (repo.total_reviews > 0 ? 'var(--accent-1)' : 'var(--blue)') }}>
                  {repo.is_paused ? 'PAUSED' : (repo.total_reviews > 0 ? 'ACTIVE' : 'NEW')}
                </span>
                
                {isAdmin && (
                  <>
                    <button 
                      onClick={() => handleReindex(repo.github_full_name)} 
                      className="text-mono" 
                      disabled={indexingRepos[repo.github_full_name]}
                      style={{ 
                        background: 'rgba(99, 102, 241, 0.1)', 
                        color: indexingRepos[repo.github_full_name] ? 'var(--white)' : 'var(--accent-1)', 
                        border: '1px solid rgba(99, 102, 241, 0.3)', 
                        padding: '0.4rem 0.8rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem', width: '100px',
                        animation: indexingRepos[repo.github_full_name] ? 'pulse 1.5s infinite' : 'none'
                      }}
                    >
                      {indexingRepos[repo.github_full_name] ? 'INDEXING...' : 'REINDEX'}
                    </button>

                    <button 
                      onClick={() => handleTogglePause(repo.id)} 
                      className="text-mono" 
                      style={{ 
                        background: repo.is_paused ? 'var(--accent-1)' : 'transparent', 
                        color: repo.is_paused ? 'black' : 'var(--white)', 
                        border: repo.is_paused ? '1px solid var(--accent-1)' : '1px solid var(--border-visible)', 
                        padding: '0.4rem 0.8rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem', width: '90px' 
                      }}
                    >
                      {repo.is_paused ? 'RESUME' : 'PAUSE'}
                    </button>

                    <button 
                      onClick={() => setRepoToDelete({ id: repo.id, name: repo.github_full_name })} 
                      className="text-mono" 
                      title="Permanently Delete Repo"
                      style={{ 
                        background: 'rgba(239, 68, 68, 0.1)', 
                        color: '#ef4444', 
                        border: '1px solid rgba(239, 68, 68, 0.3)', 
                        padding: '0.4rem 0.8rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem'
                      }}
                    >
                      DELETE
                    </button>
                  </>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}