import React, { useState, useEffect } from 'react';
import { useWallet } from '../context/WalletContext';
import { db } from '../firebase';
import {
  collection, query, where, getDocs, addDoc, doc, getDoc, serverTimestamp
} from 'firebase/firestore';
import {
  X, Globe, Mail, Phone, MapPin, Briefcase, DollarSign,
  Calendar, Code, Shield, ExternalLink, User, FileText, CheckCircle, Link, RefreshCw
} from 'lucide-react';

const JobDetailsModal = ({ jobId, onClose }) => {
  const { publicKey } = useWallet();

  const [job, setJob] = useState(null);
  const [company, setCompany] = useState(null);
  const [hasApplied, setHasApplied] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!jobId) return;
      setLoading(true);
      try {
        // 1. Fetch job document
        const jobRef = doc(db, 'jobs', jobId);
        const jobSnap = await getDoc(jobRef);
        if (!jobSnap.exists()) { setLoading(false); return; }
        const jobData = { id: jobSnap.id, ...jobSnap.data() };
        setJob(jobData);

        // 2. Fetch company profile
        if (jobData.companyAddress) {
          const cq = query(
            collection(db, 'companies'),
            where('walletAddress', '==', jobData.companyAddress)
          );
          const cSnap = await getDocs(cq);
          if (!cSnap.empty) {
            setCompany(cSnap.docs[0].data());
          }
        }

        // 3. Check if current user already applied
        if (publicKey) {
          const aq = query(
            collection(db, 'applications'),
            where('jobId', '==', jobId),
            where('workerAddress', '==', publicKey)
          );
          const aSnap = await getDocs(aq);
          setHasApplied(!aSnap.empty);
        }
      } catch (e) {
        console.error('JobDetailsModal load error:', e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [jobId, publicKey]);

  const handleApply = async () => {
    if (!publicKey) return alert('Connect your wallet first.');
    if (hasApplied) return;
    setIsApplying(true);
    try {
      const uq = query(collection(db, 'users'), where('walletAddress', '==', publicKey));
      const uSnap = await getDocs(uq);
      const profile = !uSnap.empty ? uSnap.docs[0].data() : {};

      await addDoc(collection(db, 'applications'), {
        jobId,
        onChainId: job.onChainId,
        workerAddress: publicKey,
        workerName: profile.name || 'Anonymous',
        workerImage: profile.profilePhoto || '',
        workerBio: profile.profession || '',
        workerSkills: profile.skills || '',
        workerEmail: profile.email || '',
        workerMobile: profile.mobile || '',
        workerExperience: profile.experience || '',
        workerResume: profile.resume || '',
        workerLocation: profile.address || '',
        companyAddress: job.companyAddress,
        status: 'PENDING',
        appliedAt: serverTimestamp()
      });

      setHasApplied(true);
      alert('Application transmitted successfully.');
    } catch (e) {
      console.error(e);
      alert('Application failed: ' + e.message);
    } finally {
      setIsApplying(false);
    }
  };

  if (!jobId) return null;

  const skillsArray = job?.skills ? job.skills.split(',').map(s => s.trim()).filter(Boolean) : [];
  const snapshotName = job?.companyName && job.companyName !== 'Unknown' ? job.companyName : '';
  const companyName = company?.name || snapshotName || 'Dashy Partner';
  const companyImage = company?.profilePhoto || job?.companyImage || `https://api.dicebear.com/7.x/identicon/svg?seed=${job?.companyAddress}`;
  const companyBio = company?.credibility || job?.companyBio || '';
  const companyWebsite = company?.website || job?.companyWebsite || '';
  const companyLinkedIn = company?.linkedIn || job?.companyLinkedIn || '';
  const companyEmail = company?.email || job?.companyEmail || '';
  const companyMobile = company?.mobile || job?.companyMobile || '';
  const companyLocation = company?.address || job?.companyLocation || '';

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(5,5,10,0.92)',
      backdropFilter: 'blur(12px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10000,
      padding: '40px 20px',
      overflowY: 'auto'
    }} onClick={onClose}>
      <div 
        style={{
          width: '100%',
          maxWidth: '1000px',
          background: '#0a0a0c',
          border: '1px solid rgba(243,243,5,0.2)',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '90vh',
          boxShadow: '0 0 50px rgba(0,0,0,0.8), 0 0 20px rgba(243,243,5,0.05)',
          animation: 'fadeIn 0.2s ease-out'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header / Close */}
        <div style={{
          padding: '20px 30px',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'rgba(255,255,255,0.02)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <div style={{
              padding: '4px 12px',
              fontSize: '0.6rem',
              background: job?.status === 'OPEN' ? 'rgba(0,255,136,0.1)' : 'rgba(255,68,68,0.1)',
              color: job?.status === 'OPEN' ? '#00ff88' : '#ff4444',
              border: `1px solid ${job?.status === 'OPEN' ? '#00ff88' : '#ff4444'}`,
              letterSpacing: '1px',
              fontWeight: 'bold',
              textTransform: 'uppercase'
            }}>
              {job?.status || 'LOADING'}
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', fontFamily: 'monospace' }}>
              PACT_ID: {jobId.slice(0, 8)}...
            </div>
          </div>
          <button 
            onClick={onClose}
            style={{ 
              background: 'transparent', 
              border: 'none', 
              color: 'var(--text-dim)', 
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '0.7rem',
              textTransform: 'uppercase',
              letterSpacing: '1px'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '40px', scrollbarWidth: 'thin' }}>
          {loading ? (
            <div style={{ height: '300px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '20px' }}>
              <RefreshCw size={40} color="var(--primary)" className="spin" />
              <div style={{ color: 'var(--text-dim)', fontSize: '0.8rem', letterSpacing: '2px' }}>FETCHING_CONTRACT_METADATA...</div>
            </div>
          ) : !job ? (
            <div style={{ textAlign: 'center', padding: '60px' }}>
              <div style={{ color: '#ff4444', fontSize: '1rem', letterSpacing: '2px', marginBottom: '20px' }}>DATA_CORRUPT: JOB_NOT_FOUND</div>
              <button onClick={onClose} className="btn-luxury" style={{ padding: '10px 25px' }}>DISMISS</button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '40px', alignItems: 'start' }}>
              {/* Left Column */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
                <div>
                  <h1 style={{ fontSize: '2.2rem', fontWeight: '900', textTransform: 'uppercase', marginBottom: '15px', lineHeight: '1', color: 'var(--text-main)' }}>{job.title}</h1>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '25px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <DollarSign size={16} color="var(--primary)" />
                      <span style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--text-main)' }}>{job.budget} XLM</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-dim)', fontSize: '0.85rem' }}>
                      <Calendar size={16} />
                      <span>Deadline: <span style={{ color: 'var(--text-main)' }}>{job.deadline || 'N/A'}</span></span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-dim)', fontSize: '0.85rem' }}>
                      <Shield size={16} />
                      <span>Escrow Secured</span>
                    </div>
                  </div>
                </div>

                <div style={{ padding: '25px', background: 'var(--bg-section)', border: '1px solid var(--border-ghost)', borderLeft: '3px solid var(--primary)' }}>
                  <div style={{ fontSize: '0.6rem', color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '15px' }}>Mission Description</div>
                  <p style={{ fontSize: '0.95rem', color: 'var(--text-main)', lineHeight: '1.7', whiteSpace: 'pre-wrap' }}>{job.description}</p>
                </div>

                {skillsArray.length > 0 && (
                  <div>
                    <div style={{ fontSize: '0.6rem', color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '15px' }}>Required Tech Implants</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                      {skillsArray.map((skill, i) => (
                        <span key={i} style={{
                          padding: '6px 14px',
                          background: 'rgba(243,243,5,0.05)',
                          border: '1px solid rgba(243,243,5,0.2)',
                          color: 'var(--primary)',
                          fontSize: '0.75rem',
                          fontWeight: 'bold',
                          fontFamily: 'monospace'
                        }}>{skill}</span>
                      ))}
                    </div>
                  </div>
                )}

                <div style={{ padding: '15px 20px', background: 'var(--bg-section)', border: '1px solid var(--border-ghost)', display: 'flex', gap: '40px' }}>
                  <div>
                    <div style={{ fontSize: '0.5rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>On-Chain ID</div>
                    <div style={{ fontSize: '0.85rem', fontFamily: 'monospace', color: 'var(--primary)' }}>{job.onChainId ?? 'N/A'}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.5rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Hiring Node</div>
                    <div style={{ fontSize: '0.85rem', fontFamily: 'monospace', color: 'var(--text-main)' }}>
                      {job.companyAddress?.slice(0, 12)}...
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
                {/* Apply Actions */}
                {job.status === 'OPEN' && (
                  <div style={{ padding: '25px', background: 'rgba(243,243,5,0.03)', border: '1px solid rgba(243,243,5,0.1)', position: 'relative' }}>
                    {hasApplied ? (
                      <div style={{ textAlign: 'center', color: '#00ff88' }}>
                        <CheckCircle size={30} style={{ marginBottom: '10px' }} />
                        <div style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>APPLICATION TRANSMITTED</div>
                        <div style={{ fontSize: '0.7rem', opacity: 0.7, marginTop: '5px' }}>Awaiting company response</div>
                      </div>
                    ) : (
                      <>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)', marginBottom: '15px', lineHeight: '1.5' }}>
                          Your decrypted profile metadata will be shared with the recruiter upon clicking apply.
                        </div>
                        <button
                          className="btn-luxury"
                          onClick={handleApply}
                          disabled={isApplying || !publicKey}
                          style={{ width: '100%', padding: '16px', fontSize: '0.85rem', fontWeight: '900', letterSpacing: '2px' }}
                        >
                          {isApplying ? 'TRANSMITTING...' : 'INITIATE APPLICATION'}
                        </button>
                        {!publicKey && (
                          <div style={{ fontSize: '0.65rem', color: '#ff4444', textAlign: 'center', marginTop: '10px' }}>
                            [WALLET_DISCONNECTED]
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}

                {/* Company Profile */}
                <div style={{ padding: '25px', background: 'var(--bg-section)', border: '1px solid var(--border-ghost)' }}>
                  <div style={{ fontSize: '0.6rem', color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '20px' }}>Hiring Entity</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '20px' }}>
                    <img src={companyImage} style={{ width: '60px', height: '60px', borderRadius: '4px', border: '2px solid var(--border-ghost)', objectFit: 'cover' }} alt="" />
                    <div>
                      <div style={{ fontSize: '1.1rem', fontWeight: '900', color: 'var(--text-main)' }}>{companyName}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--primary)', fontFamily: 'monospace' }}>TRUSTED_NODE</div>
                    </div>
                  </div>
                  {companyBio && (
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)', lineHeight: '1.6', marginBottom: '20px', borderLeft: '2px solid var(--primary)', paddingLeft: '15px' }}>{companyBio}</p>
                  )}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {companyEmail && <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.8rem', color: 'var(--text-main)' }}><Mail size={14} color="var(--primary)" /> {companyEmail}</div>}
                    {companyLocation && <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.8rem', color: 'var(--text-main)' }}><MapPin size={14} color="var(--primary)" /> {companyLocation}</div>}
                    {companyWebsite && (
                      <a href={companyWebsite} target="_blank" rel="noreferrer" style={{ color: 'var(--primary)', textDecoration: 'none', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Globe size={14} /> Official Comms <ExternalLink size={10} />
                      </a>
                    )}
                  </div>
                </div>

                <div style={{ padding: '15px', background: 'rgba(0,255,136,0.03)', border: '1px solid rgba(0,255,136,0.1)', fontSize: '0.7rem', color: 'var(--text-dim)', lineHeight: '1.5' }}>
                  <span style={{ color: '#00ff88', fontWeight: 'bold' }}>✓ ESCROW_ENABLED</span><br />
                  Funds are cryptographically locked in the Soroban ledger until verified completion.
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default JobDetailsModal;
