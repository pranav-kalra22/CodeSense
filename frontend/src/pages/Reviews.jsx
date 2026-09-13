import React, { useState, useEffect, useTransition, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../config/api';

// 1. PERFORMANCE FIX: Extract CSS outside the component lifecycle to prevent CSSOM thrashing
const reviewStyles = `
  .repo-header {
    cursor: pointer;
    padding: 0.85rem 1.25rem;
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 6px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    position: relative;
    overflow: hidden;
  }
  .repo-header:hover {
    background: rgba(255, 255, 255, 0.04);
    border-color: rgba(168, 85, 247, 0.4);
  }
  
  @keyframes neonActivePulse {
    0% { box-shadow: 0 0 10px rgba(99, 102, 241, 0.2), inset 0 0 5px rgba(99, 102, 241, 0.1); border-color: var(--accent-1); }
    50% { box-shadow: 0 0 15px rgba(139, 92, 246, 0.3), inset 0 0 8px rgba(139, 92, 246, 0.15); border-color: var(--accent-2); }
    100% { box-shadow: 0 0 20px rgba(6, 182, 212, 0.4), inset 0 0 10px rgba(6, 182, 212, 0.2); border-color: var(--accent-3); }
  }
  .repo-header.active {
    background: rgba(0, 0, 0, 0.4);
    animation: neonActivePulse 3s infinite alternate;
  }
  
  .chevron {
    transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    font-size: 0.8rem;
    color: var(--gray-400);
  }
  .repo-header.active .chevron {
    transform: rotate(90deg);
    color: var(--white);
  }

  .dropdown-wrapper {
    display: grid;
    grid-template-rows: 0fr;
    transition: grid-template-rows 0.35s cubic-bezier(0.16, 1, 0.3, 1);
  }
  .dropdown-wrapper.open {
    grid-template-rows: 1fr;
  }
  .dropdown-inner {
    overflow: hidden;
  }
  
  .review-item {
    transition: transform 0.2s, background 0.2s, border-color 0.2s;
    border-left: 2px solid transparent;
  }
  .review-item:hover {
    transform: translateX(6px);
    background: rgba(255, 255, 255, 0.05) !important;
    border-left: 2px solid var(--accent-3);
  }

  @keyframes matrixPulse {
    0% { opacity: 0.3; text-shadow: 0 0 5px var(--accent-3); }
    50% { opacity: 1; text-shadow: 0 0 20px var(--accent-3); }
    100% { opacity: 0.3; text-shadow: 0 0 5px var(--accent-3); }
  }
  .matrix-loader {
    color: var(--accent-3);
    font-family: var(--font-mono);
    text-align: center;
    padding: 4rem 0;
    animation: matrixPulse 1.5s infinite;
  }
`;

export default function Reviews() {
  const navigate = useNavigate();
  
  // 2. PERFORMANCE FIX: Detect if this is a "Back" navigation instantly
  const isBackNav = useRef(!!sessionStorage.getItem('reviews_cache'));
  
  const [isPending, startTransition] = useTransition();
  
  const [groupedReviews, setGroupedReviews] = useState(() => {
    const cached = sessionStorage.getItem('reviews_cache');
    return cached ? JSON.parse(cached) : {};
  });
  
  const [loading, setLoading] = useState(() => {
    return !sessionStorage.getItem('reviews_cache');
  });

  const [expandedRepos, setExpandedRepos] = useState(() => {
    const saved = sessionStorage.getItem('expandedRepos');
    return saved ? JSON.parse(saved) : {};
  });

  useEffect(() => {
    const token = localStorage.getItem('void_token');
    
    fetch(`${API.BASE}/api/v1/reviews`, {
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
    })
      .then((res) => res.json())
      .then((data) => {
        const grouped = (data || []).reduce((acc, review) => {
          const repo = review.repo_full_name;
          const date = new Date(review.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
          
          const state = review.user_read_status || 'unread';
          const category = state === 'reviewed' ? 'Completed' : 'Action Required';
          
          if (!acc[repo]) acc[repo] = { 'Action Required': {}, 'Completed': {} };
          if (!acc[repo][category][date]) acc[repo][category][date] = [];
          
          acc[repo][category][date].push(review);
          return acc;
        }, {});
        
        startTransition(() => {
          setGroupedReviews(prev => {
            const nextStr = JSON.stringify(grouped);
            if (JSON.stringify(prev) === nextStr) return prev; 
            
            sessionStorage.setItem('reviews_cache', nextStr);
            return grouped;
          });
        });
      })
      .catch((err) => console.error("Failed to fetch reviews:", err))
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const toggleRepo = (repo) => {
    setExpandedRepos(prev => {
      const next = { ...prev, [repo]: !prev[repo] };
      sessionStorage.setItem('expandedRepos', JSON.stringify(next));
      return next;
    });
  };

  const handleReviewClick = (review) => {
    navigate(`/reviews/${review.id}`);
  };

  const renderBadge = (review) => {
    const errs = review.error_count || 0;
    const warns = review.warning_count || 0;
    const total = review.total_comments || 0;
    const badgeStyle = { padding: '0.15rem 0.4rem', borderRadius: '4px', fontSize: '0.6rem', fontWeight: 'bold', letterSpacing: '0.05em' };

    if (errs > 0) return <span style={{ ...badgeStyle, color: 'var(--red)', border: '1px solid var(--red)' }}>{errs} ERRORS</span>;
    if (warns > 0) return <span style={{ ...badgeStyle, color: 'var(--amber)', border: '1px solid var(--amber)' }}>{warns} WARNS</span>;
    if (total > 0) return <span style={{ ...badgeStyle, color: 'var(--blue)', border: '1px solid var(--blue)' }}>{total} ISSUES</span>;
    return <span style={{ ...badgeStyle, color: '#22c55e', border: '1px solid rgba(34, 197, 94, 0.4)' }}>LGTM</span>;
  };

  const renderStatusIndicator = (status) => {
    if (status === 'unread') return <div title="Unread" style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent-3)', boxShadow: '0 0 8px var(--accent-3)' }} />;
    if (status === 'read') return <div title="Read" style={{ width: 8, height: 8, borderRadius: '50%', border: '2px solid var(--gray-500)', background: 'transparent' }} />;
    return <div title="Reviewed" style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 8px rgba(34,197,94,0.5)' }} />;
  };

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', paddingBottom: '4rem' }}>
      
      {/* Injecting the extracted CSS string */}
      <style>{reviewStyles}</style>

      <header className={isBackNav.current ? '' : 'animate-in'} style={{ marginBottom: '2.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <h1 className="text-huge" style={{ fontSize: '2.2rem', fontFamily: 'var(--mono)', margin: 0 }}>Review Inbox</h1>
          
          {isPending && (
            <span className="text-mono" style={{ fontSize: '0.75rem', color: 'var(--accent-3)', animation: 'matrixPulse 1.5s infinite' }}>
              [syncing...]
            </span>
          )}
        </div>
        <p className="text-muted" style={{ fontSize: '0.85rem', marginTop: '0.5rem' }}>Track, resolve, and archive codebase violations.</p>
      </header>

      {loading ? (
        <div className="matrix-loader">Decrypting Matrices...</div>
      ) : Object.keys(groupedReviews).length === 0 ? (
        <div className="text-muted text-mono animate-in" style={{ padding: '2rem 0', textAlign: 'center', fontSize: '0.9rem' }}>
          No reviews recorded yet.
        </div>
      ) : (
        Object.keys(groupedReviews).map((repo, idx) => {
          const isActive = expandedRepos[repo];

          return (
            <div 
              key={repo} 
              // 3. PERFORMANCE FIX: Kill the animation if navigating backwards
              className={isBackNav.current ? '' : 'animate-in'} 
              style={{ 
                marginBottom: '1rem', 
                animationDelay: isBackNav.current ? '0ms' : `${idx * 40}ms` 
              }}
            >
              <div className={`repo-header ${isActive ? 'active' : ''}`} onClick={() => toggleRepo(repo)}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div className={`dot ${isActive ? 'dot-purple' : 'dot-blue'}`} style={{ backgroundColor: isActive ? 'var(--accent-2)' : '', transform: isActive ? 'scale(1.2)' : 'scale(1)' }} />
                  <h2 className="text-mono" style={{ fontSize: '0.95rem', color: 'var(--white)', margin: 0 }}>
                    {repo}
                  </h2>
                </div>
                <span className="chevron">▶</span>
              </div>

              <div className={`dropdown-wrapper ${isActive ? 'open' : ''}`}>
                <div className="dropdown-inner">
                  <div style={{ padding: '1rem 0.5rem 0.5rem 2.5rem' }}>
                    {['Action Required', 'Completed'].map(category => {
                      const dates = groupedReviews[repo][category];
                      if (!dates || Object.keys(dates).length === 0) return null;

                      return (
                        <div key={category} style={{ marginBottom: '2rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                            <span className="text-mono" style={{ color: category === 'Completed' ? '#22c55e' : 'var(--accent-1)', fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                              {category}
                            </span>
                            <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.05)' }} />
                          </div>

                          {Object.entries(dates).map(([date, reviews]) => (
                            <div key={date} style={{ marginBottom: '1rem', paddingLeft: '0.5rem' }}>
                              <h3 className="text-mono" style={{ color: 'var(--gray-400)', fontSize: '0.7rem', marginBottom: '0.75rem' }}>{date}</h3>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                {reviews.map(review => (
                                  <div 
                                    key={review.id} 
                                    onClick={() => handleReviewClick(review)} 
                                    className="void-row review-item" 
                                    style={{ cursor: 'pointer', padding: '0.75rem 1rem', background: 'rgba(0,0,0,0.2)' }}
                                  >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                        {renderStatusIndicator(review.user_read_status)}
                                        <span className="text-mono" style={{ color: review.user_read_status === 'unread' ? 'var(--white)' : 'var(--gray-300)', fontWeight: review.user_read_status === 'unread' ? 'bold' : 'normal', fontSize: '0.85rem' }}>
                                          #{review.pr_number}
                                        </span>
                                        {renderBadge(review)}
                                      </div>
                                      <span className="text-muted text-mono" style={{ fontSize: '0.7rem' }}>
                                        {new Date(review.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}