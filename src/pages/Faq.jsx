import React, { useState } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { Shield, Zap, Users, AlertTriangle, CheckCircle, HelpCircle, ArrowRight, Database, Cpu, Globe, Key, Lock, Search } from 'lucide-react';
import { FAQ_DATA } from '../utils/faqData';

const Faq = () => {
  const [activeRole, setActiveRole] = useState('worker');

  const roles = [
    { id: 'worker', title: 'Worker Path', icon: <Users size={20} />, color: '#00ff88' },
    { id: 'company', title: 'Company Path', icon: <Zap size={20} />, color: 'var(--primary)' },
    { id: 'admin', title: 'Overseer Path', icon: <Shield size={20} />, color: '#ff4444' }
  ];

  const content = FAQ_DATA;

  return (
    <div className="vibrant-bg" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header />
      
      <main style={{ flex: 1, padding: '120px 20px 80px', maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: '60px' }}>
          <div className="tech-tag" style={{ margin: '0 auto 20px' }}>Knowledge Base</div>
          <h1 className="cyber-headline" style={{ fontSize: '3rem', marginBottom: '15px' }}>System FAQ</h1>
          <p style={{ color: 'var(--text-dim)', maxWidth: '600px', margin: '0 auto' }}>
            Comprehensive guide to the Dashy decentralized escrow infrastructure and resolution systems.
          </p>
        </div>

        {/* Role Selector Tabs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '50px' }}>
          {roles.map(role => (
            <button
              key={role.id}
              onClick={() => setActiveRole(role.id)}
              style={{
                background: activeRole === role.id ? 'rgba(255,255,255,0.05)' : 'transparent',
                border: `1px solid ${activeRole === role.id ? role.color : 'rgba(255,255,255,0.1)'}`,
                padding: '25px',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '12px',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              {activeRole === role.id && (
                <div style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: '2px', background: role.color }}></div>
              )}
              <div style={{ color: activeRole === role.id ? role.color : 'var(--text-dim)' }}>
                {role.icon}
              </div>
              <div style={{ 
                fontSize: '0.8rem', 
                fontWeight: '900', 
                textTransform: 'uppercase', 
                letterSpacing: '1.5px',
                color: activeRole === role.id ? '#fff' : 'var(--text-dim)'
              }}>
                {role.title}
              </div>
            </button>
          ))}
        </div>

        {/* Dynamic Content Area */}
        <div className="luxury-panel" style={{ padding: '40px', borderLeft: `4px solid ${roles.find(r => r.id === activeRole).color}` }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '50px' }}>
            {/* Left: Steps */}
            <div>
              <h3 style={{ fontSize: '1rem', color: 'var(--text-main)', marginBottom: '30px', textTransform: 'uppercase', letterSpacing: '2px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Cpu size={18} color={roles.find(r => r.id === activeRole).color} /> Execution Steps
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
                {content[activeRole].steps.map((step, i) => (
                  <div key={i} style={{ display: 'flex', gap: '20px' }}>
                    <div style={{ 
                      width: '30px', 
                      height: '30px', 
                      borderRadius: '50%', 
                      border: `1px solid ${roles.find(r => r.id === activeRole).color}`, 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      fontSize: '0.7rem',
                      fontWeight: 'bold',
                      flexShrink: 0,
                      color: roles.find(r => r.id === activeRole).color,
                      background: 'rgba(0,0,0,0.3)'
                    }}>
                      0{i+1}
                    </div>
                    <div>
                      <h4 style={{ fontSize: '0.9rem', color: 'var(--text-main)', marginBottom: '8px' }}>{step.title}</h4>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)', lineHeight: '1.5' }}>{step.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Requirements & Disputes */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
              {/* Requirements */}
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '25px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <h3 style={{ fontSize: '0.8rem', color: 'var(--text-main)', marginBottom: '20px', textTransform: 'uppercase', letterSpacing: '1.5px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Database size={16} color={roles.find(r => r.id === activeRole).color} /> Requirements
                </h3>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {content[activeRole].requirements.map((req, i) => (
                    <li key={i} style={{ fontSize: '0.75rem', color: 'var(--text-dim)', display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                      <CheckCircle size={14} color="#00ff88" style={{ marginTop: '2px', flexShrink: 0 }} />
                      {req}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Disputes */}
              <div style={{ background: 'rgba(255,68,68,0.02)', padding: '25px', border: '1px solid rgba(255,68,68,0.1)' }}>
                <h3 style={{ fontSize: '0.8rem', color: '#ff4444', marginBottom: '20px', textTransform: 'uppercase', letterSpacing: '1.5px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <AlertTriangle size={16} color="#ff4444" /> Dispute Handling
                </h3>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', lineHeight: '1.6' }}>
                  {content[activeRole].disputes}
                </p>
              </div>

              {/* Security Notice */}
              <div style={{ marginTop: 'auto', padding: '15px', border: '1px dashed rgba(255,255,255,0.1)', textAlign: 'center' }}>
                <Lock size={20} color="var(--primary)" style={{ opacity: 0.3, marginBottom: '10px' }} />
                <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                  Security System: All transactions are logged on the Stellar Ledger and monitored by the Overseer Network.
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Faq;
