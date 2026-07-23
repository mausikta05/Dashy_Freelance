import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useWallet } from '../context/WalletContext';
import { db } from '../firebase';
import {
  collection, query, where, getDocs, addDoc, doc, getDoc, serverTimestamp
} from 'firebase/firestore';
import {
  ArrowLeft, Globe, Mail, Phone, MapPin, Briefcase, DollarSign,
  Calendar, Code, Shield, ExternalLink, User, FileText, CheckCircle, Link
} from 'lucide-react';

const JobDetails = () => {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const { publicKey } = useWallet();

  const [job, setJob] = useState(null);
  const [company, setCompany] = useState(null);
  const [hasApplied, setHasApplied] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        // 1. Fetch job document
        const jobRef = doc(db, 'jobs', jobId);
        const jobSnap = await getDoc(jobRef);
        if (!jobSnap.exists()) { setLoading(false); return; }
        const jobData = { id: jobSnap.id, ...jobSnap.data() };
        setJob(jobData);

        // 2. Fetch company profile from 'companies' collection
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
        console.error('JobDetails load error:', e);
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
      // Fetch worker profile snapshot
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

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg-section)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: 'var(--primary)', fontFamily: 'monospace', fontSize: '1rem', letterSpacing: '2px' }}>
          LOADING_JOB_DATA...
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg-section)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '20px' }}>
        <div style={{ color: '#ff4444', fontSize: '1rem', letterSpacing: '2px' }}>JOB_NOT_FOUND</div>
        <button onClick={() => navigate(-1)} className="btn-luxury" style={{ fontSize: '0.7rem', padding: '10px 20px' }}>
          GO BACK
        </button>
      </div>
    );
  }

  const skillsArray = job.skills ? job.skills.split(',').map(s => s.trim()).filter(Boolean) : [];
  // Prefer live company Firestore data; skip stale 'Unknown' snapshot names
  const snapshotName = job.companyName && job.companyName !== 'Unknown' ? job.companyName : '';
  const companyName = company?.name || snapshotName || 'Dashy Partner';
  const companyImage = company?.profilePhoto || job.companyImage || `https://api.dicebear.com/7.x/identicon/svg?seed=${job.companyAddress}`;
  const companyBio = company?.credibility || job.companyBio || '';
  const companyWebsite = company?.website || job.companyWebsite || '';
  const companyLinkedIn = company?.linkedIn || job.companyLinkedIn || '';
  const companyEmail = company?.email || job.companyEmail || '';
  const companyMobile = company?.mobile || job.companyMobile || '';
  const companyLocation = company?.address || job.companyLocation || '';

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-section)', color: 'var(--text-main)', fontFamily: "'Space Grotesk', 'Inter', sans-serif" }}>
      {/* Top Bar */}
      <div style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', padding: '16px 40px', display: 'flex', alignItems: 'center', gap: '20px', background: 'rgba(5,5,5,0.95)', position: 'sticky', top: 0, zIndex: 100, backdropFilter: 'blur(10px)' }}>
        <button
          onClick={() => navigate(-1)}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-dim)', padding: '8px 16px', cursor: 'pointer', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '1px' }}
        >
          <ArrowLeft size={14} /> Back
        </button>
        <div style={{ flex: 1 }} />
        <div style={{ fontSize: '0.55rem', color: 'var(--text-dim)', fontFamily: 'monospace' }}>
          JOB_ID: {jobId.slice(0, 16)}...
        </div>
        <div style={{
          padding: '4px 14px',
          fontSize: '0.6rem',
          background: job.status === 'OPEN' ? 'rgba(0,255,136,0.1)' : 'rgba(255,68,68,0.1)',
          color: job.status === 'OPEN' ? '#00ff88' : '#ff4444',
          border: `1px solid ${job.status === 'OPEN' ? '#00ff88' : '#ff4444'}`,
          letterSpacing: '1px',
          fontWeight: 'bold'
        }}>
          {job.status}
        </div>
      </div>

      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '40px 20px', display: 'grid', gridTemplateColumns: '1fr 360px', gap: '30px', alignItems: 'start' }}>

        {/* LEFT — Job Details */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

          {/* Job Header */}
          <div style={{ padding: '30px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderLeft: '4px solid var(--primary)' }}>
            <div style={{ fontSize: '0.55rem', color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '10px' }}>
              Open Pact
            </div>
            <h1 style={{ fontSize: '2rem', fontWeight: '900', textTransform: 'uppercase', marginBottom: '16px', lineHeight: '1.1' }}>{job.title}</h1>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                <DollarSign size={14} color="var(--primary)" />
                <span style={{ color: 'var(--text-main)', fontWeight: 'bold', fontSize: '1rem' }}>{job.budget} XLM</span>
                <span>Bounty</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                <Calendar size={14} color="var(--primary)" />
                <span>Deadline: <span style={{ color: 'var(--text-main)' }}>{job.deadline || 'N/A'}</span></span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                <Shield size={14} color="var(--primary)" />
                <span>Escrow Secured</span>
              </div>
            </div>
          </div>

          {/* Description */}
          <div style={{ padding: '30px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ fontSize: '0.55rem', color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '16px' }}>
              Project Brief
            </div>
            <p style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.8)', lineHeight: '1.8', whiteSpace: 'pre-wrap' }}>{job.description}</p>
          </div>

          {/* Skills Required */}
          {skillsArray.length > 0 && (
            <div style={{ padding: '30px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                <Code size={16} color="var(--primary)" />
                <div style={{ fontSize: '0.55rem', color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '2px' }}>
                  Required Tech Stack
                </div>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                {skillsArray.map((skill, i) => (
                  <span key={i} style={{
                    padding: '6px 14px',
                    background: 'rgba(243,243,5,0.07)',
                    border: '1px solid rgba(243,243,5,0.2)',
                    color: 'var(--primary)',
                    fontSize: '0.7rem',
                    fontWeight: 'bold',
                    letterSpacing: '1px',
                    fontFamily: 'monospace'
                  }}>{skill}</span>
                ))}
              </div>
            </div>
          )}

          {/* On-chain info */}
          <div style={{ padding: '20px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.04)', display: 'flex', gap: '30px', flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: '0.5rem', color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '4px' }}>On-Chain ID</div>
              <div style={{ fontSize: '0.8rem', fontFamily: 'monospace', color: 'var(--primary)' }}>{job.onChainId ?? 'N/A'}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.5rem', color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '4px' }}>Posted By</div>
              <div style={{ fontSize: '0.7rem', fontFamily: 'monospace', color: 'var(--text-main)' }}>
                {job.companyAddress?.slice(0, 10)}...{job.companyAddress?.slice(-8)}
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT — Company Card + Apply */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', position: 'sticky', top: '80px' }}>

          {/* Apply Button */}
          {job.status === 'OPEN' && (
            <div style={{ padding: '24px', background: 'rgba(243,243,5,0.04)', border: '1px solid rgba(243,243,5,0.15)' }}>
              {hasApplied ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#00ff88', fontSize: '0.8rem', fontWeight: 'bold' }}>
                  <CheckCircle size={18} /> Application Transmitted
                </div>
              ) : (
                <>
                  <div style={{ fontSize: '0.55rem', color: 'var(--text-dim)', marginBottom: '12px', textTransform: 'uppercase' }}>
                    Your profile snapshot will be sent to the company upon application.
                  </div>
                  <button
                    className="btn-luxury"
                    onClick={handleApply}
                    disabled={isApplying || !publicKey}
                    style={{ width: '100%', padding: '14px', fontSize: '0.8rem', letterSpacing: '2px' }}
                  >
                    {isApplying ? 'TRANSMITTING...' : 'APPLY FOR PACT'}
                  </button>
                  {!publicKey && (
                    <div style={{ fontSize: '0.6rem', color: '#ff4444', marginTop: '8px', textAlign: 'center' }}>
                      Wallet not connected
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Company Card */}
          <div style={{ padding: '24px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <div style={{ fontSize: '0.5rem', color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '16px' }}>
              Hiring Entity
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '20px' }}>
              <img
                src={companyImage}
                alt={companyName}
                style={{ width: '56px', height: '56px', borderRadius: '12px', border: '2px solid rgba(243,243,5,0.3)', objectFit: 'cover' }}
              />
              <div>
                <div style={{ fontSize: '1.05rem', fontWeight: '800' }}>{companyName}</div>
                <div style={{ fontSize: '0.6rem', color: 'var(--primary)', fontFamily: 'monospace', marginTop: '2px' }}>
                  {job.companyAddress?.slice(0, 8)}...{job.companyAddress?.slice(-8)}
                </div>
              </div>
            </div>

            {companyBio && (
              <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.65)', lineHeight: '1.6', marginBottom: '20px', borderLeft: '2px solid rgba(243,243,5,0.2)', paddingLeft: '12px' }}>
                {companyBio}
              </p>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {companyEmail && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Mail size={14} color="var(--primary)" />
                  <a href={`mailto:${companyEmail}`} style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.75)', textDecoration: 'none' }}>
                    {companyEmail}
                  </a>
                </div>
              )}
              {companyMobile && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Phone size={14} color="var(--primary)" />
                  <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.75)' }}>{companyMobile}</span>
                </div>
              )}
              {companyLocation && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <MapPin size={14} color="var(--primary)" />
                  <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.75)' }}>{companyLocation}</span>
                </div>
              )}
              {companyWebsite && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Globe size={14} color="var(--primary)" />
                  <a href={companyWebsite} target="_blank" rel="noreferrer" style={{ fontSize: '0.75rem', color: 'var(--primary)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    Company Website <ExternalLink size={11} />
                  </a>
                </div>
              )}
              {companyLinkedIn && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Link size={14} color="var(--primary)" />
                  <a href={companyLinkedIn} target="_blank" rel="noreferrer" style={{ fontSize: '0.75rem', color: 'var(--primary)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    LinkedIn Profile <ExternalLink size={11} />
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Escrow Notice */}
          <div style={{ padding: '16px', background: 'rgba(0,255,136,0.03)', border: '1px solid rgba(0,255,136,0.1)', fontSize: '0.65rem', color: 'rgba(255,255,255,0.5)', lineHeight: '1.5' }}>
            <span style={{ color: '#00ff88', fontWeight: 'bold' }}>✓ Escrow Secured</span><br />
            Funds are locked in the Soroban Smart Contract and released only upon company approval.
          </div>
        </div>
      </div>
    </div>
  );
};

export default JobDetails;
