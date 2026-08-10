import React from 'react';
import { Shield, Zap, Users, AlertTriangle, CheckCircle, Database, Cpu, Lock } from 'lucide-react';
import { FAQ_DATA } from '../utils/faqData';

const FaqTabContent = ({ role }) => {
  const content = FAQ_DATA[role];
  const color = role === 'worker' ? '#00ff88' : role === 'company' ? 'var(--primary)' : '#ff4444';

  return (
    <div className="luxury-panel" style={{ padding: '40px', borderLeft: `4px solid ${color}` }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '50px' }}>
        {/* Left: Steps */}
        <div>
          <h3 style={{ fontSize: '1rem', color: 'var(--text-main)', marginBottom: '30px', textTransform: 'uppercase', letterSpacing: '2px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Cpu size={18} color={color} /> Execution Steps
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
            {content.steps.map((step, i) => (
              <div key={i} style={{ display: 'flex', gap: '20px' }}>
                <div style={{ 
                  width: '30px', 
                  height: '30px', 
                  borderRadius: '50%', 
                  border: `1px solid ${color}`, 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  fontSize: '0.7rem',
                  fontWeight: 'bold',
                  flexShrink: 0,
                  color: color,
                  background: 'var(--bg-section)'
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
          <div style={{ background: 'var(--bg-section)', padding: '25px', border: '1px solid var(--border-ghost)' }}>
            <h3 style={{ fontSize: '0.8rem', color: 'var(--text-main)', marginBottom: '20px', textTransform: 'uppercase', letterSpacing: '1.5px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Database size={16} color={color} /> Requirements
            </h3>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {content.requirements.map((req, i) => (
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
              {content.disputes}
            </p>
          </div>

          {/* Security Notice */}
          <div style={{ marginTop: 'auto', padding: '15px', border: '1px dashed var(--border-ghost)', textAlign: 'center' }}>
            <Lock size={20} color="var(--primary)" style={{ opacity: 0.3, marginBottom: '10px' }} />
            <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '1px' }}>
              Security Protocol: All transactions are logged on the Stellar Ledger and monitored by the Overseer Network.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FaqTabContent;

/* FAQ accordion height smooth animation */


/* Payment and payouts FAQ entries added */

