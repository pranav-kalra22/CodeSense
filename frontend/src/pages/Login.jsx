import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ParticleSphere from '../components/ParticleSphere'; 
import API from '../config/api';

export default function Login() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [buttonText, setButtonText] = useState('AUTHORIZE SESSION');

  const handleLogin = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    
    if (!password.trim()) {
      setError('PLEASE ENTER A PASSPHRASE.');
      return;
    }
    
    setError(''); 
    setButtonText('VERIFYING...');

    console.log("1. Vault Door: Initiating secure handshake...");

    try {
      const res = await fetch(`${API.BASE}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });

      console.log("2. Vault Door: API responded with status", res.status);

      if (res.ok) {
        const data = await res.json();
        console.log("3. Vault Door: Token acquired. Routing to Matrix.");
        localStorage.setItem('void_token', data.token);
        navigate('/dashboard');
      } else {
        setButtonText('AUTHORIZE SESSION');
        if (res.status === 401) {
          setError('ACCESS DENIED: INCORRECT PASSPHRASE.');
        } else {
          setError(`AUTHENTICATION FAILURE: STATUS ${res.status}`);
        }
      }
    } catch (err) {
      console.error("Vault Door Crash:", err);
      setButtonText('AUTHORIZE SESSION');
      setError('SECURITY ARCHITECTURE OFFLINE: NETWORK FAILURE.');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleLogin(e);
    }
  };

  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', flexDirection: 'column', background: 'var(--black)', overflow: 'hidden' }}>
      
      {/* IMPORTED BACKGROUND COMPONENT */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
        <ParticleSphere />
      </div>

      {/* FIXED DASHBOARD BUTTON */}
      <button 
        type="button"
        onClick={() => navigate('/dashboard')}
        className="text-mono text-muted"
        style={{ 
          position: 'absolute', top: '2rem', left: '2rem', 
          background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '0.9rem',
          zIndex: 10, transition: 'color 0.2s'
        }}
        onMouseOver={(e) => e.currentTarget.style.color = 'var(--white)'}
        onMouseOut={(e) => e.currentTarget.style.color = 'var(--gray-400)'}
      >
        ← RETURN TO DASHBOARD
      </button>

      {/* LOGIN CARD */}
      <div className="void-card" style={{ width: '100%', maxWidth: '400px', padding: '3rem 2rem', textAlign: 'center', zIndex: 10, background: 'rgba(10, 10, 10, 0.85)', backdropFilter: 'blur(10px)' }}>
        <div className="dot dot-red" style={{ marginBottom: '1.5rem', transform: 'scale(1.5)', display: 'inline-block', animation: 'pulse 2s infinite' }} />
        <h1 className="text-large text-mono" style={{ marginBottom: '0.5rem', color: 'var(--white)' }}>RESTRICTED AREA</h1>
        <p className="text-muted text-mono" style={{ marginBottom: '2.5rem', fontSize: '0.85rem' }}>ENTER ACCESS KEY</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={handleKeyDown} 
            placeholder="Passphrase"
            autoFocus
            style={{
              background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.1)',
              padding: '0.75rem', color: 'var(--white)', 
              borderRadius: '4px', fontFamily: 'monospace', textAlign: 'center', outline: 'none',
              transition: 'border-color 0.2s'
            }}
            onFocus={(e) => e.target.style.borderColor = 'rgba(99, 102, 241, 0.5)'}
            onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
          />
          <button
            type="button" 
            onClick={handleLogin} 
            style={{
              background: 'var(--accent-1)', 
              color: 'black', border: 'none', padding: '0.75rem', borderRadius: '4px', 
              cursor: 'pointer', fontWeight: 'bold', fontFamily: 'monospace', marginTop: '0.5rem',
              boxShadow: '0 0 15px rgba(99, 102, 241, 0.3)',
              transition: 'all 0.2s'
            }}
            onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-1px)'}
            onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
          >
            {buttonText}
          </button>
        </div>

        {error && (
          <div className="text-mono animate-in" style={{ color: 'var(--red)', marginTop: '1.5rem', fontSize: '0.8rem', lineHeight: 1.4, fontWeight: 'bold' }}>
            {error}
          </div>
        )}
      </div>
    </div>
  );
}