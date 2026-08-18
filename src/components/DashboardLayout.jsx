import React, { useState, useEffect } from 'react';
import { Layout, Globe, Users, Shield, Zap, TrendingUp, Cpu, Database, X, MessageSquare, Star, Home, Briefcase, ShoppingBag, Settings, LogOut, Plus, Info, History, AlertTriangle, Gift } from 'lucide-react';
import Header from './Header';
import Footer from './Footer';
import { useWallet } from '../context/WalletContext';

const sidebarItems = {
  worker: [
    { icon: <Home size={20} />, label: 'Dashboard', id: 'dashboard' },
    { icon: <Briefcase size={20} />, label: 'Job Board', id: 'jobs' },
    { icon: <Shield size={20} />, label: 'Active Jobs', id: 'active' },
    { icon: <TrendingUp size={20} />, label: 'Active Disputes', id: 'disputes' },
    { icon: <History size={20} />, label: 'Past Jobs', id: 'history' },
    { icon: <AlertTriangle size={20} />, label: 'Past Disputes', id: 'past_disputes' },
    { icon: <Gift size={20} />, label: 'Redeem', id: 'redeem' },
    { icon: <Info size={20} />, label: 'FAQ', id: 'faq' },
    { icon: <Settings size={20} />, label: 'Settings', id: 'settings' },
  ],
  company: [
    { icon: <Home size={20} />, label: 'Dashboard', id: 'dashboard' },
    { icon: <Plus size={20} />, label: 'Post Job', id: 'post' },
    { icon: <Briefcase size={20} />, label: 'Active Jobs', id: 'active' },
    { icon: <TrendingUp size={20} />, label: 'Active Disputes', id: 'disputes' },
    { icon: <History size={20} />, label: 'Past Jobs', id: 'history' },
    { icon: <AlertTriangle size={20} />, label: 'Past Disputes', id: 'past_disputes' },
    { icon: <Gift size={20} />, label: 'Redeem', id: 'redeem' },
    { icon: <Info size={20} />, label: 'FAQ', id: 'faq' },
    { icon: <Settings size={20} />, label: 'Settings', id: 'settings' },
  ],
  admin: [
    { icon: <Home size={20} />, label: 'Dashboard', id: 'dashboard' },
    { icon: <Briefcase size={20} />, label: 'All Jobs', id: 'all_jobs' },
    { icon: <TrendingUp size={20} />, label: 'All Disputes', id: 'all_disputes' },
    { icon: <Info size={20} />, label: 'FAQ', id: 'faq' },
    { icon: <Database size={20} />, label: 'Database', id: 'database' },
  ]
};

const DashboardLayout = ({ children, role, activeTab, onTabChange }) => {
  const { publicKey, isInitializing } = useWallet();
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);

  // Wallet connection check is now handled inline in the main content container to prevent routing locks and allow admin login

  return (
    <div style={{ 
      display: 'flex', flexDirection: 'column', minHeight: '100vh', color: 'var(--text-main)',
      backgroundImage: 'url("/assets/img/hero_ghibli.png")',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundAttachment: 'fixed',
      backgroundColor: 'var(--bg-main)',
    }}>
      {/* Light cream overlay for readability */}
      <div style={{
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(253, 250, 242, 0.9)',
        zIndex: 0,
        pointerEvents: 'none'
      }}></div>

      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <Header 
          onFeedbackClick={() => setIsFeedbackOpen(true)} 
          onAuthClick={() => setIsAuthOpen(true)} 
        />

        <div style={{ display: 'flex', flex: 1, position: 'relative' }}>
        {/* Sidebar - Vertically Aligned Left */}
        <aside style={{ 
          width: '260px',
          minWidth: '260px',
          maxWidth: '260px',
          flexShrink: 0,
          borderRight: '1px solid var(--border-ghost)', 
          padding: '40px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '30px',
          height: 'calc(100vh - 80px)',
          position: 'fixed',
          top: '80px',
          left: 0,
          background: 'var(--bg-section)',
          overflowY: 'auto',
          scrollbarGutter: 'stable',
          zIndex: 100
        }}>
          <div style={{ marginBottom: '20px' }}></div>
          
          <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '13px' }}>
            {sidebarItems[role]?.map((item) => (
              <div 
                key={item.id} 
                onClick={() => onTabChange(item.id)}
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '20px', 
                  padding: '12px 15px',
                  cursor: 'pointer',
                  color: (item.id === activeTab) ? 'var(--primary)' : 'var(--text-main)',
                  opacity: (item.id === activeTab) ? 1 : 0.65,
                  background: (item.id === activeTab) ? 'rgba(27, 67, 50, 0.07)' : 'transparent',
                  borderLeft: (item.id === activeTab) ? '3px solid var(--primary)' : '3px solid transparent',
                  transition: 'all 0.3s',
                  textTransform: 'uppercase',
                  fontSize: '0.95rem',
                  fontWeight: 'bold',
                  letterSpacing: '1px'
                }}
              >
                {React.cloneElement(item.icon, { size: 18 })}
                {item.label}
              </div>
            ))}
          </nav>

          <div style={{ padding: '20px 0', borderTop: '1px solid var(--border-ghost)' }}>
            <div 
              onClick={() => window.location.href = '/'}
              style={{ display: 'flex', alignItems: 'center', gap: '20px', color: 'var(--text-main)', opacity: 0.65, cursor: 'pointer', fontSize: '0.95rem', fontWeight: 'bold' }}
            >
              <LogOut size={18} />
              DISCONNECT
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main style={{ flex: 1, padding: '40px 60px', marginLeft: '260px', marginTop: '80px' }}>
          {!publicKey && role !== 'admin' ? (
            <div className="luxury-panel" style={{ padding: '50px', textAlign: 'center', maxWidth: '600px', margin: '40px auto', border: '1px solid var(--primary)', background: 'var(--bg-card)' }}>
              <AlertTriangle size={48} color="var(--primary)" style={{ marginBottom: '20px' }} />
              <h2 style={{ fontSize: '1.8rem', fontWeight: '900', color: 'var(--primary)', textTransform: 'uppercase', marginBottom: '15px' }}>
                Wallet Connection Required
              </h2>
              <p style={{ color: 'var(--text-dim)', fontSize: '0.95rem', lineHeight: '1.6', marginBottom: '30px' }}>
                To access your secure on-chain dashboard and execute contracts on the Stellar network, please connect a Stellar wallet.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', maxWidth: '300px', margin: '0 auto' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 'bold', letterSpacing: '1px', textTransform: 'uppercase' }}>Session Management</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                  <button onClick={() => window.location.reload()} className="btn-luxury" style={{ padding: '12px', fontSize: '0.8rem' }}>REFRESH</button>
                  <button onClick={() => window.location.href = '/'} className="btn-outline" style={{ padding: '12px', fontSize: '0.8rem' }}>LANDING</button>
                </div>
              </div>
            </div>
          ) : (
            children
          )}
        </main>
      </div>

        <div style={{ marginLeft: '260px' }}>
          <Footer />
        </div>
      </div>
    </div>
  );
};

// Activity icon missing from lucide imports in some versions
const Activity = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
);

export default DashboardLayout;

// CSV export integration placeholder


// Apply useDebounce to search query filter


// Integrate PaginationControl into job feed


// StatusBadge rendering for job status

