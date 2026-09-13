import React, { useState, useEffect } from 'react';
import API from '../config/api';

export default function LiveFeed() {
  const [events, setEvents] = useState([]);

  useEffect(() => {
    // 1. Open the WebSocket connection to your Go API
    const token = localStorage.getItem('void_token');
    const ws = new WebSocket(`${API.WS}?token=${token}`);

    ws.onopen = () => {
      console.log(' Connected to Void Matrix (WebSocket)');
    };

    // 2. Listen for messages from Redis (via Go Hub)
    ws.onmessage = (event) => {
      try {
        const incomingData = JSON.parse(event.data);
        console.log("Incoming WebSocket Event:", incomingData);
        
        // Push the new event to the top of our list
        setEvents((prev) => [incomingData, ...prev]);
      } catch (err) {
        console.error('Failed to parse WS message', err);
      }
    };

    ws.onclose = () => {
      console.log(' Disconnected from Matrix');
    };

    // Cleanup when component unmounts
    return () => ws.close();
  }, []);

  return (
    <div style={{ marginTop: '3rem' }}>
      <h3 className="text-mono text-muted" style={{ marginBottom: '1rem' }}>
        Live Matrix Feed <span style={{ color: '#00ff00' }}>●</span>
      </h3>
      
      <div 
        style={{ 
          background: 'rgba(0,0,0,0.5)', 
          border: '1px solid var(--border-visible)', 
          borderRadius: '8px',
          padding: '1rem',
          minHeight: '200px',
          maxHeight: '400px',
          overflowY: 'auto'
        }}
      >
        {events.length === 0 ? (
          <div className="text-muted text-mono" style={{ textAlign: 'center', marginTop: '4rem' }}>
            Awaiting transmission...
          </div>
        ) : (
          events.map((evt, idx) => (
            <div 
              key={idx} 
              className="animate-in" 
              style={{ 
                borderBottom: '1px solid rgba(255,255,255,0.05)', 
                padding: '0.75rem 0',
                display: 'flex',
                justifyContent: 'space-between'
              }}
            >
              <span className="text-mono" style={{ color: 'var(--white)' }}>
                [PR #{evt.pr_number}] {evt.repo}
              </span>
              <span className="text-mono" style={{ color: evt.status === 'success' ? '#00ff00' : 'var(--muted)' }}>
                {evt.comments_count} vulnerabilities found
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}