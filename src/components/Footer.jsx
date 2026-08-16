import React from 'react';
import { Globe, Users, ExternalLink } from 'lucide-react';

const Footer = () => {
  return (
    <footer style={{ padding: '40px 20px', borderTop: '1px solid var(--border-ghost)', background: '#0d2117' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '40px' }}>
        <div style={{ gridColumn: 'span 1' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ color: 'var(--primary)' }}>
              <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span style={{ 
              fontFamily: 'var(--font-luxury)', 
              fontSize: '1.3rem', 
              fontWeight: '900', 
              letterSpacing: '2px', 
              background: 'var(--luxury-gradient)', 
              WebkitBackgroundClip: 'text', 
              WebkitTextFillColor: 'transparent'
            }}>
              DASHY
            </span>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)', marginBottom: '15px' }}>© 2026 Dashy. <br/>All rights reserved.</p>
          <div style={{ display: 'flex', gap: '15px', marginTop: '10px' }}>
            <a href="https://github.com/Dark-97o" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text-dim)', transition: 'color 0.3s' }} onMouseOver={e => e.currentTarget.style.color = 'var(--primary)'} onMouseOut={e => e.currentTarget.style.color = 'var(--text-dim)'}>
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"/><path d="M9 18c-4.51 2-5-2-7-2"/></svg>
            </a>
            <a href="https://www.linkedin.com/in/subhranil-baul-b4802a287/" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text-dim)', transition: 'color 0.3s' }} onMouseOver={e => e.currentTarget.style.color = 'var(--primary)'} onMouseOut={e => e.currentTarget.style.color = 'var(--text-dim)'}>
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect width="4" height="12" x="2" y="9"/><circle cx="4" cy="4" r="2"/></svg>
            </a>
          </div>
        </div>
        <div>
          <h4 style={{ marginBottom: '20px', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Resources</h4>
          <a href="/faq" style={{ fontSize: '0.8rem', color: 'var(--text-dim)', textDecoration: 'none', display: 'block', marginBottom: '10px' }} onMouseOver={e => e.target.style.color = 'var(--primary)'} onMouseOut={e => e.target.style.color = 'var(--text-dim)'}>FAQ</a>
          <a href="#" style={{ fontSize: '0.8rem', color: 'var(--text-dim)', textDecoration: 'none', display: 'block' }} onMouseOver={e => e.target.style.color = 'var(--primary)'} onMouseOut={e => e.target.style.color = 'var(--text-dim)'}>Audit Reports</a>
        </div>
        <div style={{ gridColumn: 'span 2' }}>
          <h4 style={{ marginBottom: '20px', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Technology Stack</h4>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px' }}>
            {[ 'Stellar Testnet', 'Soroban Contracts', 'Firebase Cloud', 'React 18', 'Vite 6', 'Lucide Engine' ].map(tech => (
              <span key={tech} style={{ padding: '6px 14px', border: '1px solid var(--border-ghost)', fontSize: '0.7rem', textTransform: 'uppercase', fontFamily: 'monospace', color: 'var(--text-dim)' }}>
                {tech}
              </span>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

/* Social media icons grid & 2026 copyright notice */

