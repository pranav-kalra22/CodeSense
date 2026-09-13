import React from 'react';
import { useNavigate } from 'react-router-dom';
import LandingSphere from '../components/LandingSphere';

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden', background: '#020202' }}>
      
      {/* 3D Breathing Particle Matrix */}
      <LandingSphere />

      {/* Scoped CSS Injector */}
      <style>{`
        /* The Massive, Glowing Matrix Green Button */
        @keyframes matrixPulse {
    0% {
      box-shadow:
        0 0 8px #22c55e,
        0 0 20px #22c55e,
        0 0 40px rgba(34,197,94,0.4),
        inset 0 0 12px rgba(34,197,94,0.15);
      border-color: rgba(34,197,94,0.7);
      text-shadow: 0 0 8px rgba(34,197,94,0.6);
    }
    50% {
      box-shadow:
        0 0 16px #22c55e,
        0 0 50px #22c55e,
        0 0 90px rgba(34,197,94,0.6),
        0 0 140px rgba(34,197,94,0.2),
        inset 0 0 25px rgba(34,197,94,0.3);
      border-color: #4ade80;
      text-shadow: 0 0 16px rgba(34,197,94,1), 0 0 30px rgba(34,197,94,0.5);
    }
    100% {
      box-shadow:
        0 0 8px #22c55e,
        0 0 20px #22c55e,
        0 0 40px rgba(34,197,94,0.4),
        inset 0 0 12px rgba(34,197,94,0.15);
      border-color: rgba(34,197,94,0.7);
      text-shadow: 0 0 8px rgba(34,197,94,0.6);
    }
  }

  @keyframes scanline {
    0% { top: -100%; }
    100% { top: 200%; }
  }

  .matrix-neon-btn {
    background: rgba(0, 0, 0, 0.55);
    color: #22c55e;
    border: 1.5px solid rgba(34,197,94,0.8);
    padding: 1.5rem 5rem;
    font-size: 1.4rem;
    font-family: monospace;
    font-weight: 300;
    letter-spacing: 0.25em;
    text-transform: uppercase;
    cursor: pointer;
    border-radius: 2px;
    outline: none;
    position: relative;
    overflow: hidden;
    transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1),
                box-shadow 0.15s ease;
    animation: matrixPulse 2.5s ease-in-out infinite;
  }

  .matrix-neon-btn::before {
    content: '';
    position: absolute;
    left: 0;
    width: 100%;
    height: 40%;
    background: linear-gradient(
      to bottom,
      transparent,
      rgba(34,197,94,0.06),
      transparent
    );
    animation: scanline 3s linear infinite;
    pointer-events: none;
  }

  .matrix-neon-btn:hover {
    background: rgba(34, 197, 94, 0.08);
    color: #86efac;
    border-color: #4ade80;
    transform: translateY(-2px);
    box-shadow:
      0 0 20px #22c55e,
      0 0 60px #22c55e,
      0 0 120px rgba(34,197,94,0.7),
      0 0 200px rgba(34,197,94,0.3),
      inset 0 0 30px rgba(34,197,94,0.25) !important;
    animation: none;
    text-shadow: 0 0 20px #22c55e, 0 0 40px rgba(34,197,94,0.7);
  }

  .matrix-neon-btn:active {
    transform: translateY(0px) scale(0.99);
  }

        /* The Thunderbird Repeating Text Effect */
        .thunderbird-text {
          font-size: clamp(4rem, 6vw, 8rem);
          font-weight: 900;
          line-height: 0.85;
          text-transform: uppercase;
          font-family: var(--font, sans-serif);
          letter-spacing: -0.02em;
          white-space: nowrap;
          transition: all 0.3s ease;
        }
        .text-faded-extreme { color: rgba(255, 255, 255, 0.2); }
        .text-faded-heavy { color: rgba(255, 255, 255, 0.3); }
        .text-faded-medium { color: rgba(255, 255, 255, 0.4); }
        .text-active { 
          color: var(--white); 
          text-shadow: 0 0 30px rgba(255,255,255,0.15); 
          z-index: 2;
        }
      `}</style>

      {/* UI Split Grid Frame - Now a perfect 50/50 horizontal row */}
      <div style={{ position: 'relative', zIndex: 10, display: 'flex', width: '100%', height: '100%' }}>
        
        {/* === LEFT 50%: Thunderbird Text === */}
        <div style={{ 
          flex: 1, 
          display: 'flex', 
          flexDirection: 'column', 
          justifyContent: 'center', 
          alignItems: 'center',
          borderRight: '1px solid rgba(255,255,255,0.05)',
          background: 'linear-gradient(90deg, rgba(0,0,0,0.8) 0%, transparent 100%)',
          overflow: 'hidden'
        }}>
          <div className="thunderbird-text text-faded-extreme">CODESENSE</div>
          <div className="thunderbird-text text-faded-heavy">CODESENSE</div>
          <div className="thunderbird-text text-faded-medium">CODESENSE</div>
          <div className="thunderbird-text text-active">CODESENSE</div>
          <div className="thunderbird-text text-faded-medium">CODESENSE</div>
          <div className="thunderbird-text text-faded-heavy">CODESENSE</div>
          <div className="thunderbird-text text-faded-extreme">CODESENSE</div>
        </div>

        {/* === RIGHT 50%: Description & Button === */}
        <div style={{ 
          flex: 1, 
          display: 'flex', 
          flexDirection: 'column', 
          justifyContent: 'center', 
          padding: '8%',
          background: 'rgba(0,0,0,0.3)'
        }}>
          <div className="dot dot-accent-1" style={{ transform: 'scale(1.4)', marginBottom: '2rem', animation: 'skeletonBreathe 2s infinite' }} />
          
          <h2 className="text-mono" style={{ fontSize: '2.2rem', color: 'var(--white)', marginBottom: '1.5rem', fontWeight: 600, letterSpacing: '-0.02em' }}>
            AI Code Review Assistant
          </h2>
          
          <p className="text-mono" style={{ maxWidth: '550px', fontSize: '1.05rem', lineHeight: '1.8', marginBottom: '3.5rem' }}>
            Automated PR review system with codebase-aware context. Parses repository source into AST structural trees for code intelligence, uses hybrid semantic + keyword RAG to surface similar patterns from repo history, and generates inline review comments via an agentic assistant — learning from accepted/rejected feedback over time.
          </p>

          <div style={{ display: 'flex', justifyContent: 'center', width: '100%', marginTop: '1rem' }}>
            <button 
              className="matrix-neon-btn"
              onClick={() => navigate('/dashboard')}
            >
              Enter Matrix
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}