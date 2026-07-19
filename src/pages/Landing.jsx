import React, { useState, useEffect } from 'react';
import { Shield, Zap, TrendingUp, Cpu, Database, Layout, Globe, Users, MessageSquare, Star, Home, Info, BookOpen, Layers, X, Wallet, Key, ShieldCheck, CheckCircle, Download, ExternalLink, Plus, ShoppingBag } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { useWallet } from '../context/WalletContext';
import { db, auth } from '../firebase';
import { collection, addDoc, getDocs, query, where, updateDoc } from 'firebase/firestore';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { generateReceipt } from '../utils/receiptGenerator';

const Landing = () => {
  const { isConnected, connectWallet, publicKey, balance, callContract } = useWallet();
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('worker');
  const [onboardingRole, setOnboardingRole] = useState('worker');

  // Auth Form State
  const [authMode, setAuthMode] = useState('login'); // 'login' or 'signup'
  const [authData, setAuthData] = useState({
    email: '', password: '', name: '', age: '', mobile: '', address: '',
    profession: '', skills: '', experience: '', profilePhoto: '', resume: '', credibility: ''
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [uiError, setUiError] = useState(null);
  const [successTxHash, setSuccessTxHash] = useState(null);
  
  const REGISTRY_CONTRACT_ID = "CDXB4OYLH4RRUFF2WXOJ7EQVMETIYS3QAO4OCQSF5N72HV6C7NFKBGHH";
  const XLM_TOKEN_ID = "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC"; // Native token on testnet

  const handleAuthChange = (e) => {
    if (uiError) setUiError(null);
    setAuthData({ ...authData, [e.target.name]: e.target.value });
  };

  const handleSignup = async () => {
    setUiError(null);
    if (!isConnected) {
      setUiError("Please link your Stellar wallet to authorize payment.");
      return;
    }

    setIsProcessing(true);
    try {
      // 1. On-Chain Transaction
      const regType = activeTab === 'worker' ? 'user' : 'company';
      const fee = activeTab === 'worker' ? 1000 : 10000;
      
      const { hash } = await callContract(REGISTRY_CONTRACT_ID, "register", [
        publicKey,
        XLM_TOKEN_ID,
        regType
      ]);
      
      // 2. Save to Firestore
      const collectionName = activeTab === 'worker' ? 'users' : 'companies';
      const docData = { 
        ...authData, 
        walletAddress: publicKey, 
        role: activeTab, 
        txId: hash, 
        timestamp: Date.now() 
      };
      delete docData.password;
      docData.password = authData.password;
      
      await addDoc(collection(db, collectionName), docData);
      
      // 3. Success state
      setSuccessTxHash(hash);
      
      // 4. Generate Receipt
      generateReceipt({
        type: activeTab,
        name: authData.name,
        amount: fee,
        txId: hash,
        timestamp: Date.now()
      });

    } catch (e) {
      console.error("Signup error:", e);
      setUiError("Registration failed: " + e.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleLogin = async () => {
    setUiError(null);
    
    if (!isConnected && activeTab !== 'admin') {
      setUiError("Please connect your Stellar wallet to authenticate.");
      return;
    }

    setIsProcessing(true);
    try {
      if (activeTab === 'admin') {
        console.log("Initiating Overseer Firebase Authentication...");
        try {
          const result = await signInWithEmailAndPassword(auth, authData.email, authData.password);
          console.log("Admin Login Success:", result.user);
          window.location.href = `/dashboard/admin`;
          return;
        } catch (authError) {
          console.error("Firebase Auth Error:", authError);
          setUiError("Authentication failed: " + authError.message);
          return;
        }
      }

      const collectionName = activeTab === 'worker' ? 'users' : 'companies';
      
      // Basic login logic as requested
      const q = query(collection(db, collectionName), where("email", "==", authData.email), where("password", "==", authData.password));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const userDoc = querySnapshot.docs[0];
        const userData = userDoc.data();
        
        // AUTO-REPAIR: If walletAddress is missing, link it now
        if (!userData.walletAddress && publicKey) {
          console.log("Auto-Repair: Linking wallet to profile...");
          await updateDoc(userDoc.ref, { walletAddress: publicKey });
        } else if (userData.walletAddress && userData.walletAddress !== publicKey) {
          setUiError(`Security Alert: This account is linked to a different wallet. Please connect the registered wallet.`);
          setIsProcessing(false);
          return;
        }

        console.log("Login Success:", userData);
        window.location.href = `/dashboard/${activeTab}`;
      } else {
        setUiError("Invalid email or password. Please try again.");
      }
    } catch (e) {
      console.error("Login error:", e);
      setUiError("System error: Unable to connect. Please check your internet.");
    } finally {
      setIsProcessing(false);
    }
  };
  const wallets = [
    { name: 'Freighter', icon: <ShieldCheck size={20} />, id: 'freighter' },
    { name: 'Albedo', icon: <Zap size={20} />, id: 'albedo' },
    { name: 'Rabe', icon: <Zap size={20} />, id: 'rabe' },
    { name: 'xBull', icon: <Database size={20} />, id: 'xbull' },
    { name: 'Private Key', icon: <Key size={20} />, id: 'privatekey' }
  ];

  const handleWalletSelect = (walletId) => {
    connectWallet(walletId);
    setIsWalletModalOpen(false);
  };

  const handleFeedbackSubmit = async (e) => {
    e.preventDefault();
    if (!feedback.trim()) return;
    
    setIsProcessing(true);
    try {
      await addDoc(collection(db, 'feedback'), {
        message: feedback,
        timestamp: Date.now(),
        sender: publicKey || 'anonymous'
      });
      alert('Feedback received. Thank you for your contribution.');
      setIsFeedbackOpen(false);
      setFeedback('');
    } catch (error) {
      console.error("Feedback error:", error);
      alert('Transmission failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    // Always prompt to connect wallet on load if not connected
    if (!isConnected) {
      const timer = setTimeout(() => setIsWalletModalOpen(true), 1000);
      return () => clearTimeout(timer);
    }
  }, [isConnected]);

  return (
    <div className="vibrant-bg" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Header
        onFeedbackClick={() => setIsFeedbackOpen(true)}
        onAuthClick={() => setIsAuthOpen(true)}
        onConnectClick={() => setIsWalletModalOpen(true)}
      />

      <div style={{ position: 'relative' }}>
        {/* Main Content Area */}
        <div>

          {/* Wallet Connection Modal */}
          {isWalletModalOpen && (
            <div className="modal-overlay" style={{ zIndex: 1000 }}>
              <div className="modal-content luxury-panel" style={{ maxWidth: '450px', border: '1px solid var(--primary)' }}>
                <button className="modal-close" onClick={() => setIsWalletModalOpen(false)}><X /></button>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                  <Wallet size={20} color="var(--primary)" />
                  <div className="tech-tag" style={{ margin: 0 }}>Wallet Initialize</div>
                </div>
                <h2 className="cyber-headline" style={{ fontSize: '1.5rem', marginBottom: '10px' }}>Connect Wallet</h2>
                <p style={{ color: 'var(--text-dim)', fontSize: '0.8rem', marginBottom: '30px' }}>
                  Select your Stellar authority provider to initialize access.
                </p>
                
                <div style={{ display: 'grid', gap: '12px' }}>
                  {wallets.map((w) => (
                    <button 
                      key={w.id} 
                      onClick={() => handleWalletSelect(w.id)}
                      className="cyber-card"
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '15px', 
                        padding: '15px 20px', 
                        width: '100%', 
                        textAlign: 'left',
                        cursor: 'pointer',
                        background: 'var(--bg-section)',
                        border: '1px solid var(--border-ghost)'
                      }}
                    >
                      <div style={{ color: 'var(--primary)' }}>{w.icon}</div>
                      <span style={{ fontWeight: 'bold', fontSize: '0.9rem', color: 'var(--text-main)' }}>{w.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Auth Modal */}
          {isAuthOpen && (
            <div className="modal-overlay" style={{ zIndex: 2000 }}>
              <div className="modal-content luxury-panel" style={{ 
                maxWidth: '950px', 
                width: '95%',
                maxHeight: '90vh', 
                overflow: 'hidden',
                display: 'grid',
                gridTemplateColumns: '1fr 1.2fr',
                padding: 0,
                border: '1px solid var(--primary)',
                background: 'var(--bg-main)'
              }}>
                <div style={{ 
                  position: 'relative', 
                  background: 'linear-gradient(rgba(19, 48, 35, 0.4), rgba(19, 48, 35, 0.85)), url("/assets/img/login_ghibli.png")', 
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  backgroundRepeat: 'no-repeat',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'flex-end',
                  padding: '40px',
                  borderRight: '1px solid var(--border-ghost)'
                }}>
                  <div style={{ position: 'relative', zIndex: 2 }}>
                    <h2 style={{ fontSize: '2.5rem', fontWeight: '900', color: '#fff', textTransform: 'uppercase', lineHeight: '1', marginBottom: '15px' }}>
                      Welcome to <br /><span style={{ color: 'var(--accent)' }}>Dashy</span>
                    </h2>
                    <p style={{ color: '#faf5e6', opacity: 0.9, fontSize: '0.85rem', maxWidth: '300px', lineHeight: '1.4' }}>
                      Sign in to manage your freelance projects and payments securely on the Stellar network.
                    </p>
                  </div>
                  {/* Decorative Scanline */}
                  <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: 'linear-gradient(rgba(199, 146, 62, 0.05) 50%, transparent 50%)', backgroundSize: '100% 4px', pointerEvents: 'none' }}></div>
                </div>

                {/* Right Side: Form */}
                <div className="custom-scrollbar" style={{ 
                  padding: '40px', 
                  overflowY: 'auto', 
                  position: 'relative',
                  maxHeight: '90vh',
                  display: 'flex',
                  flexDirection: 'column'
                }}>
                  <button className="modal-close" onClick={() => setIsAuthOpen(false)} style={{ top: '20px', right: '20px' }}><X /></button>
                  
                  <div style={{ marginBottom: '30px' }}>
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                      {[...Array(3)].map((_, i) => <div key={i} style={{ width: '4px', height: '4px', background: 'var(--primary)' }}></div>)}
                    </div>
                    <h3 style={{ color: '#fff', fontSize: '0.75rem', letterSpacing: '2px', fontWeight: 'bold' }}>USER ACCESS PORTAL</h3>
                  </div>

                  {uiError && (
                    <div style={{ 
                      background: 'rgba(255, 0, 0, 0.1)', 
                      border: '1px solid #ff4444', 
                      color: '#ff4444', 
                      padding: '12px 15px', 
                      fontSize: '0.7rem', 
                      fontWeight: 'bold',
                      marginBottom: '20px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px'
                    }}>
                      <div style={{ width: '6px', height: '6px', background: '#ff4444', borderRadius: '50%' }}></div>
                      {uiError}
                    </div>
                  )}

                  {/* Role Selection */}
                  <div style={{ display: 'flex', gap: '10px', marginBottom: '30px' }}>
                    {['worker', 'company', 'admin'].map((role) => (
                      <button
                        key={role}
                        onClick={() => { 
                          setActiveTab(role); 
                          if(role === 'admin') setAuthMode('login'); 
                          setSuccessTxHash(null);
                        }}
                        style={{
                          flex: 1,
                          padding: '10px',
                          background: activeTab === role ? 'rgba(255, 107, 0, 0.1)' : 'transparent',
                          border: activeTab === role ? '1px solid var(--primary)' : '1px solid var(--border-ghost)',
                          color: activeTab === role ? 'var(--primary)' : 'var(--text-dim)',
                          textTransform: 'uppercase',
                          fontSize: '0.65rem',
                          fontWeight: 'bold',
                          cursor: 'pointer',
                          transition: 'all 0.3s'
                        }}
                      >
                        {role === 'admin' ? 'Overseer' : role}
                      </button>
                    ))}
                  </div>

                  {/* Login/Signup Toggle */}
                  {activeTab !== 'admin' && (
                    <div style={{ display: 'flex', gap: '30px', marginBottom: '25px', borderBottom: '1px solid var(--border-ghost)' }}>
                      <button 
                        onClick={() => setAuthMode('login')}
                        style={{ 
                          padding: '10px 0',
                          background: 'transparent', 
                          border: 'none', 
                          color: authMode === 'login' ? 'var(--primary)' : 'var(--text-dim)', 
                          fontSize: '0.75rem', 
                          fontWeight: 'bold',
                          cursor: 'pointer', 
                          borderBottom: authMode === 'login' ? '2px solid var(--primary)' : 'none' 
                        }}
                      >
                        LOGIN
                      </button>
                      <button 
                        onClick={() => setAuthMode('signup')}
                        style={{ 
                          padding: '10px 0',
                          background: 'transparent', 
                          border: 'none', 
                          color: authMode === 'signup' ? 'var(--primary)' : 'var(--text-dim)', 
                          fontSize: '0.75rem', 
                          fontWeight: 'bold',
                          cursor: 'pointer', 
                          borderBottom: authMode === 'signup' ? '2px solid var(--primary)' : 'none' 
                        }}
                      >
                        SIGN UP
                      </button>
                    </div>
                  )}

                  {/* Form Rendering */}
                  <div className="cyber-form" style={{ display: 'grid', gap: '20px', flex: 1 }}>
                    {successTxHash ? (
                      <div style={{ textAlign: 'center', padding: '20px 0' }}>
                        <CheckCircle size={60} color="var(--primary)" style={{ marginBottom: '20px', margin: '0 auto' }} />
                        <h3 style={{ fontSize: '1.5rem', marginBottom: '10px', color: '#fff' }}>REGISTRATION SUCCESSFUL</h3>
                        <p style={{ color: 'var(--text-dim)', fontSize: '0.85rem', marginBottom: '30px' }}>
                          Your authority has been established on the Stellar network.
                        </p>
                        
                        <div style={{ background: 'rgba(255, 107, 0, 0.05)', padding: '20px', border: '1px solid rgba(255, 107, 0, 0.2)', marginBottom: '30px', textAlign: 'left' }}>
                          <div style={{ fontSize: '0.6rem', color: 'var(--primary)', fontWeight: 'bold', marginBottom: '10px', textTransform: 'uppercase' }}>Transaction Proof</div>
                          <div style={{ fontSize: '0.7rem', color: '#fff', wordBreak: 'break-all', fontFamily: 'monospace', marginBottom: '15px' }}>{successTxHash}</div>
                          <a 
                            href={`https://stellar.expert/explorer/testnet/tx/${successTxHash}`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--primary)', fontSize: '0.75rem', textDecoration: 'none', fontWeight: 'bold' }}
                          >
                            VERIFY ON EXPLORER <ExternalLink size={12} />
                          </a>
                        </div>

                        <div style={{ display: 'grid', gap: '15px' }}>
                          <button 
                            className="btn-luxury" 
                            onClick={() => {
                              const fee = activeTab === 'worker' ? 1000 : 10000;
                              generateReceipt({
                                type: activeTab,
                                name: authData.name,
                                amount: fee,
                                txId: successTxHash,
                                timestamp: Date.now()
                              });
                            }}
                            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}
                          >
                            <Download size={18} /> DOWNLOAD RECEIPT
                          </button>
                          <button 
                            className="cyber-input" 
                            style={{ width: '100%', background: 'transparent' }}
                            onClick={() => { setSuccessTxHash(null); setAuthMode('login'); }}
                          >
                            PROCEED TO LOGIN
                          </button>
                        </div>
                      </div>
                    ) : authMode === 'signup' ? (
                      <>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                          <div className="input-wrapper">
                            <label style={{ fontSize: '0.6rem', color: 'var(--primary)', fontWeight: 'bold' }}>FULL NAME</label>
                            <input name="name" placeholder="John Doe" className="cyber-input" onChange={handleAuthChange} />
                          </div>
                          <div className="input-wrapper">
                            <label style={{ fontSize: '0.6rem', color: 'var(--primary)', fontWeight: 'bold' }}>MOBILE NUMBER</label>
                            <input name="mobile" placeholder="+1..." className="cyber-input" onChange={handleAuthChange} />
                          </div>
                        </div>
                        <div className="input-wrapper">
                          <label style={{ fontSize: '0.6rem', color: 'var(--primary)', fontWeight: 'bold' }}>EMAIL ADDRESS</label>
                          <input name="email" placeholder="email@example.com" className="cyber-input" onChange={handleAuthChange} />
                        </div>
                        <div className="input-wrapper">
                          <label style={{ fontSize: '0.6rem', color: 'var(--primary)', fontWeight: 'bold' }}>PASSWORD</label>
                          <input name="password" type="password" placeholder="••••••••" className="cyber-input" onChange={handleAuthChange} />
                        </div>
                        <div className="input-wrapper">
                          <label style={{ fontSize: '0.6rem', color: 'var(--primary)', fontWeight: 'bold' }}>PHYSICAL ADDRESS</label>
                          <input name="address" placeholder="Your City, Country" className="cyber-input" onChange={handleAuthChange} />
                        </div>
                        <div className="input-wrapper">
                          <label style={{ fontSize: '0.6rem', color: 'var(--primary)', fontWeight: 'bold' }}>PROFILE PHOTO LINK</label>
                          <input name="profilePhoto" placeholder="https://..." className="cyber-input" onChange={handleAuthChange} />
                        </div>
                        
                        {activeTab === 'worker' ? (
                          <>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                              <div className="input-wrapper">
                                <label style={{ fontSize: '0.6rem', color: 'var(--primary)', fontWeight: 'bold' }}>AGE</label>
                                <input name="age" placeholder="25" className="cyber-input" onChange={handleAuthChange} />
                              </div>
                              <div className="input-wrapper">
                                <label style={{ fontSize: '0.6rem', color: 'var(--primary)', fontWeight: 'bold' }}>EXPERIENCE (YEARS)</label>
                                <input name="experience" placeholder="5" className="cyber-input" onChange={handleAuthChange} />
                              </div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                              <div className="input-wrapper">
                                <label style={{ fontSize: '0.6rem', color: 'var(--primary)', fontWeight: 'bold' }}>PROFESSION</label>
                                <input name="profession" placeholder="e.g. Developer" className="cyber-input" onChange={handleAuthChange} />
                              </div>
                              <div className="input-wrapper">
                                <label style={{ fontSize: '0.6rem', color: 'var(--primary)', fontWeight: 'bold' }}>SKILLS</label>
                                <input name="skills" placeholder="e.g. React, Node.js" className="cyber-input" onChange={handleAuthChange} />
                              </div>
                            </div>
                            <div className="input-wrapper">
                              <label style={{ fontSize: '0.6rem', color: 'var(--primary)', fontWeight: 'bold' }}>RESUME LINK</label>
                              <input name="resume" placeholder="https://..." className="cyber-input" onChange={handleAuthChange} />
                            </div>
                            <div className="cyber-notice" style={{ fontSize: '0.65rem' }}>PAYMENT REQUIRED: 1,000 XLM</div>
                          </>
                        ) : (
                          <>
                            <div className="input-wrapper">
                              <label style={{ fontSize: '0.6rem', color: 'var(--primary)', fontWeight: 'bold' }}>COMPANY CREDIBILITY / BIO</label>
                              <input name="credibility" placeholder="e.g. Leading Web3 Development Firm" className="cyber-input" onChange={handleAuthChange} />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                              <div className="input-wrapper">
                                <label style={{ fontSize: '0.6rem', color: 'var(--primary)', fontWeight: 'bold' }}>WEBSITE URL</label>
                                <input name="website" placeholder="https://yourcompany.com" className="cyber-input" onChange={handleAuthChange} />
                              </div>
                              <div className="input-wrapper">
                                <label style={{ fontSize: '0.6rem', color: 'var(--primary)', fontWeight: 'bold' }}>LINKEDIN URL</label>
                                <input name="linkedIn" placeholder="https://linkedin.com/company/..." className="cyber-input" onChange={handleAuthChange} />
                              </div>
                            </div>
                            <div className="cyber-notice" style={{ fontSize: '0.65rem' }}>PAYMENT REQUIRED: 10,000 XLM</div>
                          </>
                        )}
                        
                        <button className="btn-luxury" style={{ width: '100%', marginTop: '10px', height: '50px' }} onClick={handleSignup} disabled={isProcessing}>
                          {isProcessing ? 'PROCESSING...' : `SIGN UP`}
                        </button>
                      </>
                    ) : (
                      <>
                        <div className="input-wrapper">
                          <label style={{ fontSize: '0.6rem', color: 'var(--primary)', fontWeight: 'bold' }}>EMAIL ADDRESS</label>
                          <input name="email" placeholder="email@example.com" className="cyber-input" onChange={handleAuthChange} />
                        </div>
                        <div className="input-wrapper">
                          <label style={{ fontSize: '0.6rem', color: 'var(--primary)', fontWeight: 'bold' }}>PASSWORD</label>
                          <input name="password" type="password" placeholder="••••••••" className="cyber-input" onChange={handleAuthChange} />
                        </div>
                        <button className="btn-luxury" style={{ width: '100%', marginTop: '20px', height: '50px' }} onClick={handleLogin} disabled={isProcessing}>
                          {isProcessing ? 'LOGGING IN...' : 'LOGIN'}
                        </button>
                        <p style={{ textAlign: 'center', fontSize: '0.65rem', color: 'var(--text-dim)', marginTop: '15px' }}>
                          Warning: Access attempts are monitored and logged.
                        </p>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Feedback Modal */}
          {isFeedbackOpen && (
            <div className="modal-overlay" style={{ zIndex: 3000 }}>
              <div className="modal-content luxury-panel" style={{ 
                maxWidth: '900px', 
                width: '95%',
                padding: 0,
                display: 'grid',
                gridTemplateColumns: '1fr 1.2fr',
                overflow: 'hidden',
                background: 'var(--bg-main)',
                border: '1px solid var(--primary)'
              }}>
                <div style={{ 
                  background: 'linear-gradient(rgba(19, 48, 35, 0.4), rgba(19, 48, 35, 0.85)), url("/assets/img/feedback_ghibli.png")', 
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  padding: '40px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'flex-end',
                  borderRight: '1px solid var(--border-ghost)'
                }}>
                  <h2 style={{ fontSize: '2rem', fontWeight: '900', color: '#fff', textTransform: 'uppercase', lineHeight: '1.1' }}>
                    Improve <br /><span style={{ color: 'var(--accent)' }}>Dashy</span>
                  </h2>
                </div>

                <div style={{ padding: '40px', position: 'relative' }}>
                  <button className="modal-close" onClick={() => setIsFeedbackOpen(false)} style={{ top: '20px', right: '20px' }}><X /></button>
                  <h3 style={{ color: 'var(--primary)', fontSize: '0.75rem', letterSpacing: '2px', fontWeight: 'bold', marginBottom: '15px' }}>FEEDBACK TRANSMISSION</h3>
                  <p style={{ color: 'var(--text-dim)', fontSize: '0.85rem', marginBottom: '25px', lineHeight: '1.4' }}>
                    Share your thoughts to help us evolve the platform.
                  </p>

                  <form onSubmit={handleFeedbackSubmit} style={{ display: 'grid', gap: '20px' }}>
                    <textarea
                      className="cyber-input custom-scrollbar"
                      placeholder="What can we improve? (Features, UI, Performance...)"
                      value={feedback}
                      onChange={(e) => setFeedback(e.target.value)}
                      required
                      style={{ minHeight: '150px', resize: 'none' }}
                    />
                    <button type="submit" className="btn-luxury" style={{ width: '100%', height: '50px' }} disabled={isProcessing}>
                      {isProcessing ? 'TRANSMITTING...' : 'SEND FEEDBACK'}
                    </button>
                  </form>
                </div>
              </div>
            </div>
          )}

          <header style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '120px 20px 40px',
            position: 'relative',
            zIndex: 1,
            overflow: 'hidden',
            borderBottom: '1px solid var(--border-ghost)'
          }}>
            {/* Background Image */}
            <img
              src="/assets/img/hero_ghibli.png"
              alt="Ghibli Background"
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                zIndex: -2,
                opacity: 0.75
              }}
            />

            {/* Video Overlay Gradient */}
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              background: 'linear-gradient(to right, rgba(253, 250, 242, 0.95) 30%, rgba(253, 250, 242, 0.2) 100%)',
              zIndex: -1
            }}></div>

            {/* Bottom Fade-Up Overlay */}
            <div style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              width: '100%',
              height: '40%',
              background: 'linear-gradient(to top, rgba(253, 250, 242, 1) 0%, rgba(253, 250, 242, 0) 100%)',
              zIndex: -1
            }}></div>

            {/* Cyber Frames & Strokes */}
            <div className="cyber-frame-container">
              <div className="cyber-corner-stroke stroke-tl"></div>
              <div className="cyber-corner-stroke stroke-tr"></div>
              <div className="cyber-corner-stroke stroke-bl"></div>
              <div className="cyber-corner-stroke stroke-br"></div>

              <div className="cyber-glitch-line" style={{ top: '20%', left: '40px' }}></div>
              <div className="cyber-glitch-line" style={{ bottom: '20%', right: '40px' }}></div>
            </div>

            <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '80px', alignItems: 'center', width: '100%', position: 'relative', zIndex: 10 }}>
              <div style={{ position: 'relative', zIndex: 2 }}>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '12px', 
                  marginBottom: '20px',
                  background: 'rgba(255, 107, 0, 0.05)',
                  padding: '6px 15px',
                  borderLeft: '2px solid var(--primary)',
                  width: 'fit-content'
                }}>
                  <img src="https://cryptologos.cc/logos/stellar-xlm-logo.png?v=024" alt="Stellar" style={{ width: '18px', height: '18px', filter: 'brightness(0) saturate(100%) invert(88%) sepia(82%) saturate(3731%) hue-rotate(359deg) brightness(103%) contrast(106%)' }} />
                  <span style={{ 
                    fontSize: '0.7rem', 
                    fontWeight: '800', 
                    color: 'var(--primary)', 
                    letterSpacing: '2px',
                    textTransform: 'uppercase'
                  }}>
                    Powered by Stellar Network
                  </span>
                </div>
                <h1 className="cyber-headline glitch" data-text="HIGH-STAKES FREELANCING, SECURED." style={{ fontSize: '4.5rem', marginBottom: '30px', lineHeight: '1.1', textTransform: 'uppercase' }}>HIGH-STAKES <br />FREELANCING, SECURED.</h1>
                <p style={{ fontSize: '1.2rem', color: 'var(--text-dim)', marginBottom: '40px', maxWidth: '500px' }}>
                  Experience the absolute authority of automated escrow and decentralized reputation on the Stellar network. No intermediaries, just code.
                </p>
                <div style={{ display: 'flex', gap: '20px' }}>
                  <button className="btn-luxury" onClick={() => setIsAuthOpen(true)}>Get started &rarr;</button>
                </div>
              </div>

              <div style={{ position: 'relative', display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
                {/* Review Pills */}
                <div className="review-pill" style={{ top: '-40px', right: '100px', animationDelay: '0.5s' }}>
                  <div style={{ display: 'flex', gap: '2px' }}>
                    {[...Array(5)].map((_, i) => <Star key={i} size={10} fill="var(--primary)" color="var(--primary)" />)}
                  </div>
                  <div>
                    <div className="review-pill-text">"Flawless escrow execution."</div>
                    <div className="review-pill-author">CyberNaut_01</div>
                  </div>
                </div>

                <div className="review-pill" style={{ bottom: '20px', right: '350px', animationDelay: '1.5s' }}>
                  <div style={{ display: 'flex', gap: '2px' }}>
                    {[...Array(5)].map((_, i) => <Star key={i} size={10} fill="var(--primary)" color="var(--primary)" />)}
                  </div>
                  <div>
                    <div className="review-pill-text">"The Stellar UI we needed."</div>
                    <div className="review-pill-author">Stellar_Dev_X</div>
                  </div>
                </div>

                <div className="review-pill" style={{ top: '150px', right: '-40px', animationDelay: '2.5s' }}>
                  <div style={{ display: 'flex', gap: '2px' }}>
                    {[...Array(5)].map((_, i) => <Star key={i} size={10} fill="var(--primary)" color="var(--primary)" />)}
                  </div>
                  <div>
                    <div className="review-pill-text">"Absolute authority in escrow."</div>
                    <div className="review-pill-author">DApp_Hunter</div>
                  </div>
                </div>

                {/* Overlay stats card for depth */}
                <div className="floating-card" style={{
                  width: '240px',
                  animationDelay: '1s',
                  zIndex: 2,
                  background: 'var(--bg-card)',
                  borderRight: '2px solid var(--primary)',
                  backdropFilter: 'blur(10px)'
                }}>
                  <TrendingUp style={{ color: 'var(--primary)', marginBottom: '10px' }} size={24} />
                  <div style={{ fontSize: '0.7rem', color: 'var(--primary)', fontWeight: 'bold', marginBottom: '5px', textTransform: 'uppercase' }}>Network Telemetry</div>
                  <h3 style={{ fontSize: '1.8rem', marginBottom: '2px' }}>$2.4M+</h3>
                  <p style={{ color: 'var(--text-dim)', fontSize: '0.75rem' }}>Total Value Locked (TVL)</p>
                </div>
              </div>
            </div>

            {/* Trusted By Carousel */}
            <div style={{ 
              position: 'absolute', 
              bottom: '40px', 
              left: '25%', 
              width: '50%', 
              background: 'rgba(253, 250, 242, 0.8)', 
              borderTop: '1px solid var(--border-ghost)',
              borderBottom: '1px solid var(--border-ghost)',
              padding: '15px 0',
              overflow: 'hidden',
              zIndex: 20,
              borderRadius: '100px',
              backdropFilter: 'blur(5px)'
            }}>
              <div className="carousel-track">
                {[...Array(2)].map((_, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '60px', paddingRight: '60px' }}>
                    {[
                      'amazon.png', 'steam.png', 'starbucks.png', 'uber.png', 
                      'bestbuy.png', 'ikea.png', 'sephora.png', 'playstation.png'
                    ].map((file, idx) => (
                      <div key={idx} style={{ display: 'flex', alignItems: 'center', opacity: 0.5, filter: 'brightness(0) opacity(0.35)', transition: 'all 0.3s' }} onMouseOver={e => { e.currentTarget.style.opacity = 1; e.currentTarget.style.filter = 'none'; }} onMouseOut={e => { e.currentTarget.style.opacity = 0.5; e.currentTarget.style.filter = 'brightness(0) opacity(0.35)'; }}>
                        <img src={`/assets/img/company/${file}`} alt="brand" style={{ height: '22px', width: 'auto' }} />
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </header>

      {/* Unified Features & Onboarding Section */}
      <section className="animated-section-wrapper" style={{ 
        padding: '80px 20px 0', 
        backgroundImage: 'linear-gradient(rgba(253, 250, 242, 0.95), rgba(253, 250, 242, 0.95)), url("/assets/img/cyber_bg_v2.png")',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed'
      }}>
        <div className="moving-grid"></div>
        <div className="particles-container">
          {[...Array(20)].map((_, i) => (
            <div 
              key={i} 
              className="particle" 
              style={{
                width: Math.random() * 3 + 'px',
                height: Math.random() * 3 + 'px',
                left: Math.random() * 100 + '%',
                top: Math.random() * 100 + '%',
                animationDuration: Math.random() * 15 + 15 + 's',
                animationDelay: Math.random() * 5 + 's'
              }}
            ></div>
          ))}
        </div>


        <div style={{ maxWidth: '1200px', margin: '0 auto', position: 'relative', zIndex: 2 }}>
          {/* Features Section */}
          <div id="features" style={{ marginBottom: '80px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.8fr', gap: '60px', alignItems: 'flex-start' }}>
              <div>
                <h2 className="cyber-headline glitch" data-text="Industrial Escrow Infrastructure" style={{ fontSize: '2.5rem', marginBottom: '20px', textTransform: 'uppercase' }}>Industrial Escrow <br />Infrastructure</h2>
                <p style={{ color: 'var(--text-dim)', fontSize: '0.95rem', marginBottom: '30px', maxWidth: '400px' }}>
                  Institutional-grade security for the global talent economy via Soroban's smart contracts.
                </p>
                <div style={{ padding: '20px', background: 'rgba(27, 67, 50, 0.03)', borderLeft: '4px solid var(--primary)' }}>
                  <Shield style={{ color: 'var(--primary)', marginBottom: '10px' }} size={20} />
                  <h4 style={{ color: 'var(--text-main)', marginBottom: '5px', textTransform: 'uppercase', fontSize: '0.8rem' }}>On-Chain Verification</h4>
                  <p style={{ color: 'var(--text-dim)', fontSize: '0.75rem' }}>Automated validation of project deliverables against cryptographic benchmarks.</p>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                {[
                  { icon: <Zap size={20} />, title: 'Atomic Payouts', desc: 'Instant settlement upon milestone approval.' },
                  { icon: <Shield size={20} />, title: 'Multi-Sig Vaults', desc: 'Secure fund locking with multisig authorization.' },
                  { icon: <TrendingUp size={20} />, title: 'RPT Tiers', desc: 'Reputation-based access control for corporate contracts.' },
                  { icon: <Cpu size={20} />, title: 'Self-Executing', desc: 'Autonomous conflict resolution via contract parameters.' },
                  { icon: <Globe size={20} />, title: 'Global Compliance', desc: 'Support for international regulatory standards.' },
                  { icon: <Users size={20} />, title: 'Talent Liquidity', desc: 'Frictionless movement of capital via USDC/XLM.' }
                ].map((feat, i) => (
                  <div key={i} className="cyber-card">
                    <div style={{ color: 'var(--primary)', marginBottom: '15px' }}>{feat.icon}</div>
                    <h3 style={{ textTransform: 'uppercase', marginBottom: '10px', fontSize: '0.85rem' }}>{feat.title}</h3>
                    <p style={{ color: 'var(--text-dim)', fontSize: '0.75rem', lineHeight: '1.4' }}>{feat.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

        {/* Lifecycle Section */}
        <div id="lifecycle" style={{ marginTop: '100px', marginBottom: '120px' }}>
          <div style={{ textAlign: 'center', marginBottom: '60px' }}>
            <h2 className="cyber-headline glitch" data-text="Lifecycle" style={{ fontSize: '2.5rem', textTransform: 'uppercase' }}>Lifecycle</h2>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginTop: '30px' }}>
              <button 
                onClick={() => setOnboardingRole('worker')}
                style={{ 
                  padding: '12px 30px', 
                  background: onboardingRole === 'worker' ? 'var(--primary)' : 'transparent', 
                  border: '1px solid var(--primary)', 
                  color: onboardingRole === 'worker' ? '#fff' : 'var(--primary)',
                  fontWeight: 'bold',
                  textTransform: 'uppercase',
                  letterSpacing: '2px',
                  cursor: 'pointer',
                  transition: 'all 0.3s'
                }}
              >
                The Worker Path
              </button>
              <button 
                onClick={() => setOnboardingRole('company')}
                style={{ 
                  padding: '12px 30px', 
                  background: onboardingRole === 'company' ? 'var(--primary)' : 'transparent', 
                  border: '1px solid var(--primary)', 
                  color: onboardingRole === 'company' ? '#fff' : 'var(--primary)',
                  fontWeight: 'bold',
                  textTransform: 'uppercase',
                  letterSpacing: '2px',
                  cursor: 'pointer',
                  transition: 'all 0.3s'
                }}
              >
                The Corporate Path
              </button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '20px', position: 'relative' }}>
            {/* Connecting Line */}
            <div style={{ 
              position: 'absolute', 
              top: '50px', 
              left: '50px', 
              right: '50px', 
              height: '2px', 
              background: 'rgba(255, 107, 0, 0.1)', 
              zIndex: 1 
            }}></div>

            {(onboardingRole === 'worker' ? [
              { icon: <Wallet size={24} />, title: '01. AUTH SYNC', desc: 'Link Stellar wallet & transmit 1,000 XLM entry fee to the registry.' },
              { icon: <Layout size={24} />, title: '02. SCAN BOARD', desc: 'Identify verified bounties that match your skill telemetry.' },
              { icon: <Cpu size={24} />, title: '03. COMMITS', desc: 'Securely submit GitHub hashes as cryptographic evidence of work.' },
              { icon: <Shield size={24} />, title: '04. CONFLICTS', desc: 'Funds stay locked in EscrowVault if conflict is detected.' },
              { icon: <Star size={24} />, title: '05. PRESTIGE', desc: 'Spend RPT in the Redeem Shop for gift cards, steam wallets and more.' }
            ] : [
              { icon: <Globe size={24} />, title: '01. NODE UP', desc: 'Register corporate identity & fund treasury with 10,000 XLM.' },
              { icon: <Plus size={24} />, title: '02. PACT DEPLOY', desc: 'Vault mission bounties in smart-escrows with precise parameters.' },
              { icon: <Database size={24} />, title: '03. AUDIT WORK', desc: 'Review worker activity logs and evidence via dashboard.' },
              { icon: <CheckCircle size={24} />, title: '04. RELEASE', desc: 'Approve mission finalization to transmit funds to the executor.' },
              { icon: <ShoppingBag size={24} />, title: '05. MARKET', desc: 'Redeem RPT rewards to fund corporate bounty multipliers and vouchers.' }
            ]).map((step, i) => (
              <div key={i} className="cyber-card" style={{ 
                position: 'relative', 
                zIndex: 2, 
                padding: '30px 20px', 
                textAlign: 'center',
                background: 'var(--bg-card)',
                border: '1px solid var(--border-ghost)',
                transform: `translateY(${i % 2 === 0 ? '0' : '20px'})`,
                transition: 'all 0.5s ease'
              }}>
                <div style={{ 
                  width: '60px', 
                  height: '60px', 
                  borderRadius: '50%', 
                  background: 'rgba(255, 107, 0, 0.05)', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  margin: '0 auto 20px',
                  border: '1px solid var(--primary)',
                  boxShadow: '0 0 15px rgba(255, 107, 0, 0.2)'
                }}>
                  <div style={{ color: 'var(--primary)' }}>{step.icon}</div>
                </div>
                <h3 style={{ fontSize: '0.8rem', color: 'var(--text-main)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px' }}>{step.title}</h3>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', lineHeight: '1.5' }}>{step.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Onboarding Section */}
        <div id="onboarding" style={{ marginBottom: '0' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '60px', alignItems: 'flex-start', position: 'relative' }}>
            <div>
              <div style={{ textAlign: 'left', marginBottom: '40px' }}>
                <h2 className="cyber-headline glitch" data-text="Onboarding Steps" style={{ fontSize: '2.2rem', textTransform: 'uppercase' }}>Onboarding Steps</h2>
                <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem', marginTop: '10px' }}>
                  A streamlined, 4-step process to establish your authority on the Stellar network.
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                {[
                  { num: '01', title: 'Wallet Sync', desc: 'Securely link your Stellar wallet.' },
                  { num: '02', title: 'Verification', desc: 'Authenticate via GitHub/Portfolio.' },
                  { num: '03', title: 'Contract Lock', desc: 'Secure funds in the Escrow Vault.' },
                  { num: '04', title: 'Settlement', desc: 'Automated milestone payouts.' }
                ].map((step, i) => (
                  <div key={i} className="cyber-card">
                    <div style={{ fontSize: '1.2rem', fontWeight: '900', color: 'var(--primary)', marginBottom: '10px' }}>{step.num}</div>
                    <h3 style={{ textTransform: 'uppercase', marginBottom: '10px', color: 'var(--text-main)', fontSize: '0.8rem' }}>{step.title}</h3>
                    <p style={{ color: 'var(--text-dim)', fontSize: '0.7rem', lineHeight: '1.4' }}>{step.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ position: 'relative', height: '450px', alignSelf: 'flex-end' }}>
              <div style={{ 
                position: 'absolute', 
                width: '100%', 
                height: '100%', 
                background: 'var(--primary)', 
                borderRadius: '50%', 
                filter: 'blur(120px)', 
                opacity: 0.1,
                zIndex: 1,
                bottom: '-50px'
              }}></div>
              <img 
                src="/assets/img/person_ghibli.png" 
                alt="Verified Agent" 
                style={{ 
                  height: '125%', 
                  width: 'auto', 
                  position: 'absolute', 
                  right: '-120px',
                  bottom: '-40px',
                  zIndex: 2,
                  filter: 'drop-shadow(0 0 20px rgba(27,67,50,0.25))'
                }} 
              />
            </div>
          </div>
        </div>
      </div>
    </section>

        </div>
      </div>

      <Footer />
    </div>
  );
};

export default Landing;
