import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'; 
import API from '../config/api';

const CommentCard = ({ comment, delay, onFeedbackSubmit }) => {
  const [feedback, setFeedback] = useState(comment.feedback_type || null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFeedback = async (type) => {
    if (feedback || isSubmitting) return;
    setIsSubmitting(true);

    try {
      const res = await fetch(`${API.BASE}/api/v1/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comment_id: comment.id, feedback_type: type }) 
      });

      if (res.ok) {
        setFeedback(type);
        // Tell the parent to re-fetch the review so the UI updates
        onFeedbackSubmit(); 
      }
    } catch (err) {
      console.error("Error submitting feedback:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="void-card animate-in" style={{ animationDelay: `${delay}ms`, padding: '1.25rem', position: 'relative' }}>
      <div style={{ position: 'absolute', left: 0, top: '1rem', bottom: '1rem', width: '2px', background: `var(--${comment.severityColor})`, borderRadius: '0 2px 2px 0' }} />
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', paddingLeft: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span className="text-mono text-muted">Line {comment.line_number}</span>
          <span className={`dot dot-${comment.severityColor}`} style={{ marginLeft: '0.5rem' }}/>
          <span className="text-muted" style={{ textTransform: 'capitalize', fontSize: '0.75rem' }}>{comment.severity}</span>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button 
            onClick={() => handleFeedback('accepted')} disabled={feedback !== null}
            style={{ 
              background: feedback === 'accepted' ? 'rgba(34, 197, 94, 0.15)' : 'transparent', color: feedback === 'accepted' ? '#22c55e' : 'var(--gray-600)',
              border: `1px solid ${feedback === 'accepted' ? 'rgba(34, 197, 94, 0.3)' : 'transparent'}`,
              borderRadius: '4px', padding: '0.5rem 1.5rem', cursor: feedback ? 'default' : 'pointer', transition: 'all 0.2s', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.3rem'
            }}
            onMouseOver={(e) => { if (!feedback) { e.currentTarget.style.color = '#22c55e'; e.currentTarget.style.background = 'rgba(34, 197, 94, 0.05)'; } }}
            onMouseOut={(e) => { if (!feedback) { e.currentTarget.style.color = 'var(--gray-600)'; e.currentTarget.style.background = 'transparent'; } }}
          >
            ✓ <span style={{ fontSize: '0.7rem', textTransform: 'uppercase' }}>Accept</span>
          </button>
          
          <button 
            onClick={() => handleFeedback('rejected')} disabled={feedback !== null}
            style={{ 
              background: feedback === 'rejected' ? 'rgba(239, 68, 68, 0.15)' : 'transparent', color: feedback === 'rejected' ? '#ef4444' : 'var(--gray-600)',
              border: `1px solid ${feedback === 'rejected' ? 'rgba(239, 68, 68, 0.3)' : 'transparent'}`,
              borderRadius: '4px', padding: '0.5rem 1.5rem', cursor: feedback ? 'default' : 'pointer', transition: 'all 0.2s', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.3rem'
            }}
            onMouseOver={(e) => { if (!feedback) { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.background = 'rgba(239, 68, 68, 0.05)'; } }}
            onMouseOut={(e) => { if (!feedback) { e.currentTarget.style.color = 'var(--gray-600)'; e.currentTarget.style.background = 'transparent'; } }}
          >
            ✗ <span style={{ fontSize: '0.7rem', textTransform: 'uppercase' }}>Reject</span>
          </button>
        </div>
      </div>

      <div style={{ paddingLeft: '1rem', color: 'var(--gray-100)', lineHeight: 1.6, fontSize: '0.9rem', opacity: feedback === 'rejected' ? 0.5 : 1, transition: 'opacity 0.3s' }}>
        <p style={{ marginBottom: comment.code_snippet ? '1rem' : '0' }}>
          {(comment.comment_text || '').split('`').map((chunk, i) => 
            i % 2 !== 0 ? <span key={i} className="text-mono" style={{ background: 'rgba(255,255,255,0.06)', padding: '0.1rem 0.3rem', borderRadius: '4px', color: 'var(--white)' }}>{chunk}</span> : chunk
          )}
        </p>
        
        {comment.code_snippet && (
          <div style={{ marginTop: '1rem', borderRadius: '6px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)' }}>
            <SyntaxHighlighter 
              language="python" 
              style={vscDarkPlus} 
              customStyle={{ margin: 0, padding: '1rem', fontSize: '0.85rem', background: '#0d0d0d' }}
            >
              {comment.code_snippet}
            </SyntaxHighlighter>
          </div>
        )}
      </div>
    </div>
  );
};

export default function ReviewDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [dbData, setDbData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedFiles, setExpandedFiles] = useState({});

  const fetchReviewData = () => {
    const token = localStorage.getItem('void_token');
    fetch(`${API.BASE}/api/v1/reviews/${id}`, {
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
    })
      .then(res => res.json())
      .then(data => {
        setDbData(data);
        const initialExpanded = {};
        if (data.comments) {
          data.comments.forEach(c => { initialExpanded[c.file_path] = true; });
        }
        // Only set expanded state if it hasn't been set yet (prevents collapsing files when a button is clicked)
        setExpandedFiles(prev => Object.keys(prev).length === 0 ? initialExpanded : prev);
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to fetch review detail:", err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchReviewData();
  }, [id]);

  const toggleFile = (file) => setExpandedFiles(prev => ({ ...prev, [file]: !prev[file] }));

  if (loading) return <div className="text-mono text-muted" style={{ marginTop: '4rem', textAlign: 'center' }}>Loading review matrix...</div>;
  if (!dbData || !dbData.review) return <div className="text-mono text-muted" style={{ marginTop: '4rem', textAlign: 'center' }}>Review not found in database.</div>;

  const { review, comments } = dbData;
  const severities = { error: 0, warning: 0, info: 0 };
  const groupedFiles = {};

  if (comments) {
    comments.forEach(c => {
      const sev = (c.severity || 'info').toLowerCase();
      if (severities[sev] !== undefined) severities[sev]++;
      let color = 'blue';
      if (sev === 'error') color = 'red';
      if (sev === 'warning') color = 'amber';
      c.severityColor = color;
      const file = c.file_path || 'unknown_file';
      if (!groupedFiles[file]) groupedFiles[file] = [];
      groupedFiles[file].push(c);
    });
  }

  const formattedDate = new Date(review.created_at).toLocaleString('en-US', { 
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' 
  });

  return (
    <div style={{ maxWidth: '900px' }}>
      <button onClick={() => navigate('/reviews')} className="text-muted text-mono animate-in" style={{ background: 'transparent', border: 'none', cursor: 'pointer', marginBottom: '2rem' }}>← Back to Inbox</button>
      
      <header className="animate-in" style={{ marginBottom: '3rem', animationDelay: '80ms' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
          <div style={{ color: 'var(--gray-400)' }}>{review.repo_full_name}</div>
          <div className="text-mono text-muted" style={{ fontSize: '0.8rem' }}>{formattedDate}</div>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '1.5rem' }}>
          <h1 className="text-huge">#{review.pr_number}</h1>
          
          {/* DYNAMIC PROGRESS BADGE (Reads from the Go DB state machine) */}
          {review.user_read_status === 'reviewed' ? (
             <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(34,197,94,0.1)', padding: '0.25rem 0.75rem', borderRadius: '4px', border: '1px solid rgba(34,197,94,0.2)' }}>
               <span className="dot dot-green" style={{ boxShadow: '0 0 10px rgba(34,197,94,0.8)' }} /> 
               <span style={{ color: '#22c55e', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase' }}>REVIEWED</span>
             </div>
          ) : (
             <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(6,182,212,0.1)', padding: '0.25rem 0.75rem', borderRadius: '4px', border: '1px solid rgba(6,182,212,0.2)' }}>
               <span className="dot" style={{ background: 'var(--accent-3)', boxShadow: '0 0 10px rgba(6,182,212,0.8)' }} /> 
               <span style={{ color: 'var(--accent-3)', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase' }}>ACTION REQUIRED</span>
             </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: '1.5rem', borderBottom: '1px solid var(--border-invisible)', paddingBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><span className="dot dot-red" /> <span className="text-large">{severities.error}</span></div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><span className="dot dot-amber" /> <span className="text-large">{severities.warning}</span></div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><span className="dot dot-blue" /> <span className="text-large">{severities.info}</span></div>
        </div>
      </header>

      <div className="stagger">
        {Object.entries(groupedFiles).map(([fileName, fileComments], index) => (
          <div key={fileName} className="animate-in" style={{ marginBottom: '2rem', animationDelay: `${160 + (index * 80)}ms` }}>
            <div onClick={() => toggleFile(fileName)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 0', cursor: 'pointer', borderBottom: '1px solid var(--border-invisible)', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span className="text-muted" style={{ transform: expandedFiles[fileName] ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>▶</span>
                <span className="text-mono">{fileName}</span>
              </div>
              <span className="text-muted text-mono">{fileComments.length} issues</span>
            </div>
            <div className={`void-collapse ${expandedFiles[fileName] ? 'open' : ''}`}>
              <div className="void-collapse-inner">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', paddingLeft: '1.5rem', paddingBottom: '1rem', paddingTop: '0.5rem' }}>
                  {fileComments.map((comment, i) => (
                    <CommentCard 
                      key={comment.id} 
                      comment={comment} 
                      delay={240 + (i * 80)} 
                      onFeedbackSubmit={fetchReviewData} // Refetches the API silently to update the top badge
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}