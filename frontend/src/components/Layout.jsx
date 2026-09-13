import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import ParticleSphere from './ParticleSphere';

export default function Layout() {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--black)' }}>
      {/* 1. The Living Background */}
      <ParticleSphere />
      
      {/* 2. The Navigation */}
      <Sidebar />
      
      {/* 3. The Content Canvas */}
      <main style={{
        flex: 1,
        marginLeft: '220px', // Exactly matches sidebar width
        padding: '1rem 4rem', // Generous breathing room
        position: 'relative',
        zIndex: 1, // Crucial: Puts content ABOVE the particle sphere
        maxWidth: '1200px' // Keeps typography highly readable on ultra-wides
      }}>
        {/* React Router injects the active page here */}
        <Outlet /> 
      </main>
    </div>
  );
}