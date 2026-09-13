import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useWebSocket } from '../hooks/useWebSocket';
import API from '../config/api';

export default function Sidebar() {
  const navigate = useNavigate();
  const { isConnected } = useWebSocket(API.WS);
  const isAdmin = !!localStorage.getItem('void_token');

  const navItems = [
    { path: '/dashboard', label: 'Dashboard' },
    { path: '/reviews', label: 'Reviews' },
    { path: '/repos', label: 'Repositories' },
    { path: '/explorer', label: 'Explorer' },
    { path: '/assistant', label: 'Assistant' },
  ];

  const handleAdminToggle = () => {
    if (isAdmin) {
      localStorage.removeItem('void_token');
      window.location.reload();
    } else {
      navigate('/login');
    }
  };

  return (
    <>
      <style>{`
        .glass-sidebar::before {
          content: '';
          position: absolute;
          inset: 0;
          background:
            radial-gradient(ellipse at 30% 15%, rgba(255,255,255,0.06) 0%, transparent 55%),
            radial-gradient(ellipse at 85% 85%, rgba(120,180,255,0.04) 0%, transparent 50%);
          pointer-events: none;
        }
        .glass-sidebar::after {
          content: '';
          position: absolute;
          top: -50%;
          left: -10%;
          width: 70%;
          height: 45%;
          background: linear-gradient(135deg, rgba(255,255,255,0.06) 0%, transparent 60%);
          transform: rotate(-12deg);
          pointer-events: none;
          filter: blur(6px);
          border-radius: 50%;
        }
        .sidebar-nav-link {
          transition: all 0.25s ease !important;
        }
        .sidebar-nav-link:hover {
          color: rgba(255,255,255,0.65) !important;
          background: rgba(255,255,255,0.03) !important;
        }
        .admin-glass-btn:hover {
          background: ${isAdmin ? 'rgba(255,50,50,0.1)' : 'rgba(255,255,255,0.07)'} !important;
          border-color: ${isAdmin ? 'rgba(255,50,50,0.3)' : 'rgba(255,255,255,0.15)'} !important;
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.08) !important;
        }
        @keyframes sidebarBreathe {
          0%, 100% { box-shadow: 0 0 6px rgba(34,197,94,0.3); }
          50%       { box-shadow: 0 0 14px rgba(34,197,94,0.7); }
        }
      `}</style>

      <div
        className="glass-sidebar"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '220px',
          height: '100vh',
          // --- Liquid Glass core ---
          background: 'rgba(255, 255, 255, 0)',
          backdropFilter: 'blur(2px) saturate(160%)',
          WebkitBackdropFilter: 'blur(2px) saturate(160%)',
          borderRight: '1px solid rgba(255,255,255,0.08)',
          boxShadow: `
            inset 1px 0 0 rgba(255,255,255,0.06),
            inset 0 1px 0 rgba(255,255,255,0.08),
            4px 0 40px rgba(0,0,0,0.35)
          `,
          // -------------------------
          display: 'flex',
          flexDirection: 'column',
          padding: '2.5rem 2rem',
          zIndex: 50,
          overflow: 'hidden',
          position: 'fixed',
        }}
      >
        <div style={{
          marginBottom: '3.5rem',
          letterSpacing: '-0.03em',
          fontSize: '1.5rem',
          position: 'relative',
          zIndex: 1,
        }}>
          <span style={{ fontFamily:'var(--mono)',fontWeight: 800, color: 'rgba(255,255,255,0.92)' }}>CodeSense</span>
          <span style={{ fontWeight: 800, color: 'rgba(255,255,255,0.28)' }}>AI</span>
        </div>

        <nav style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '0.25rem',
          flex: 1,
          position: 'relative',
          zIndex: 1,
        }}>
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className="sidebar-nav-link"
              style={({ isActive }) => ({
                position: 'relative',
                display: 'block',
                padding: '0.5rem 0.75rem',
                textDecoration: 'none',
                fontSize: '0.9rem',
                fontWeight: 500,
                borderRadius: '6px',
                color: isActive ? 'rgba(255,255,255,0.92)' : 'rgba(255,255,255,0.35)',
                background: isActive ? 'rgba(255,255,255,0.06)' : 'transparent',
                boxShadow: isActive
                  ? 'inset 0 1px 0 rgba(255,255,255,0.10), inset 0 -1px 0 rgba(0,0,0,0.10), 0 2px 12px rgba(0,0,0,0.2)'
                  : 'none',
                backdropFilter: isActive ? 'blur(8px)' : 'none',
              })}
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <span style={{
                      position: 'absolute',
                      left: 0,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      height: '60%',
                      width: '2px',
                      background: 'linear-gradient(to bottom, #4ade80, #22c55e)',
                      opacity: 1,
                      borderRadius: '0 2px 2px 0',
                      boxShadow: '0 0 8px rgba(34,197,94,0.7)',
                    }} />
                  )}
                  {item.label}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div style={{
          marginTop: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.5rem',
          position: 'relative',
          zIndex: 1,
        }}>
          <button
            onClick={handleAdminToggle}
            className="admin-glass-btn text-mono"
            style={{
              background: isAdmin ? 'rgba(255,50,50,0.05)' : 'rgba(255,255,255,0.03)',
              color: isAdmin ? 'var(--red)' : 'rgba(255,255,255,0.4)',
              border: '1px solid',
              borderColor: isAdmin ? 'rgba(255,50,50,0.2)' : 'rgba(255,255,255,0.07)',
              padding: '0.6rem',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '0.75rem',
              textAlign: 'center',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              backdropFilter: 'blur(8px)',
              transition: 'all 0.2s ease',
            }}
          >
            {isAdmin ? 'End Admin Session' : 'Admin Login'}
          </button>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.2)' }}>
              Darshan © 2026
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.25)' }} className="text-mono">
                {isConnected ? 'LIVE' : 'SYNCING'}
              </span>
              <div style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: isConnected ? '#22c55e' : 'rgba(255,255,255,0.2)',
                animation: isConnected ? 'sidebarBreathe 2s infinite' : 'none',
              }} />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}