import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import { useWallet } from '../context/WalletContext';
import { getReputationInfo, TIERS } from '../utils/reputation';
import { db } from '../firebase';
import { collection, query, where, getDocs, addDoc, serverTimestamp, updateDoc, doc, getDoc } from 'firebase/firestore';
import { TrendingUp, Briefcase, DollarSign, Users, Shield, Settings, Info, ArrowRight, Globe, Mail, MapPin, ExternalLink, AlertTriangle, X, CheckCircle, History } from 'lucide-react';
import FaqTabContent from '../components/FaqTabContent';
import RedeemShop from './RedeemShop';
import JobDetailsModal from '../components/JobDetailsModal';

const PROOFWORK_CONTRACT_ID = "CDS6J5XMEGDJPQ4XEKJFJOCHB6NFC732K4SXDPSQHUDQKJAR757I6UZE";
const ESCROW_CONTRACT_ID = "CACN5PFTVFJHGAFZ47MB5FXQPDN7QM4RNP5OVFBQ64B2VULWONFS5VAH";

const DashWorker = () => {
  const navigate = useNavigate();
  const { publicKey, balance, callContract } = useWallet();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedJobId, setSelectedJobId] = useState(null);
  const [userData, setUserData] = useState(null);
  const [allJobs, setAllJobs] = useState([]);
  const [myApplications, setMyApplications] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showRepTiers, setShowRepTiers] = useState(false);
  const [companies, setCompanies] = useState({});
  const [rpt, setRpt] = useState(0);
  const [disputeModal, setDisputeModal] = useState(null); // { job }
  const [disputeReason, setDisputeReason] = useState('');

  const fetchData = async () => {
    if (!publicKey) return;
    try {
      // Always get the latest profile if multiple exist
      const uq = query(
        collection(db, 'users'), 
        where('walletAddress', '==', publicKey)
      );
      const uSnap = await getDocs(uq);
      let latestUserDoc = null;
      
      if (!uSnap.empty) {
        latestUserDoc = uSnap.docs.sort((a, b) => (b.data().timestamp || 0) - (a.data().timestamp || 0))[0];
        setUserData(latestUserDoc.data());
        // Seed RPT from Firestore immediately (updated by chain sync below)
        setRpt(latestUserDoc.data().rpt || 0);
      }

      const jSnap = await getDocs(collection(db, 'jobs'));
      setAllJobs(jSnap.docs.map(d => ({ id: d.id, ...d.data() })));

      const cSnap = await getDocs(collection(db, 'companies'));
      const cMap = {};
      cSnap.docs.forEach(d => {
        const data = d.data();
        if (data.walletAddress) cMap[data.walletAddress] = data;
      });
      setCompanies(cMap);

      const aq = query(collection(db, 'applications'), where('workerAddress', '==', publicKey));
      const aSnap = await getDocs(aq);
      setMyApplications(aSnap.docs.map(d => ({ id: d.id, ...d.data() })));

      // Fetch live RPT from ProofWork contract (source of truth)
      try {
        const rptRes = await callContract(PROOFWORK_CONTRACT_ID, 'get_rpt', [publicKey], true);
        const liveRpt = Number(rptRes?.result ?? 0);
        setRpt(liveRpt);
        // Write back to Firestore so it's available offline / next load
        if (latestUserDoc && liveRpt !== (latestUserDoc.data().rpt || 0)) {
          await updateDoc(doc(db, 'users', latestUserDoc.id), { rpt: liveRpt });
        }
      } catch (rptErr) {
        console.warn('Live RPT fetch from ProofWork failed, using cached value:', rptErr.message);
      }
    } catch (e) {
      console.error("Data fetch error:", e);
    }
  };

  useEffect(() => {
    fetchData();
  }, [publicKey, activeTab]);

  const activeJobs = allJobs.filter(j => j.workerAddress === publicKey && j.status === 'ACTIVE');
  // Actual payout = 95% of budget (contract takes 5% treasury fee)
  const earnedXLM = allJobs
    .filter(j => j.workerAddress === publicKey && j.status === 'COMPLETED')
    .reduce((sum, j) => sum + (Number(j.budget) || 0) * 0.95, 0);
  const pendingXLM = activeJobs.reduce((sum, j) => sum + (Number(j.budget) || 0) * 0.95, 0);

  // RPT is fetched live from ProofWork contract in fetchData(), with Firestore cache fallback
  const repInfo = getReputationInfo(rpt);

  const handleApply = async (job) => {
    if (myApplications.find(a => a.jobId === job.id)) return alert("Applied already.");
    setIsProcessing(true);
    try {
      // Fetch latest profile to avoid stale/anonymous data
      const q = query(collection(db, 'users'), where('walletAddress', '==', publicKey));
      const snap = await getDocs(q);
      const profile = !snap.empty ? snap.docs[0].data() : {};

      await addDoc(collection(db, 'applications'), {
        jobId: job.id,
        onChainId: job.onChainId,
        workerAddress: publicKey,
        // Bundled Profile Snapshot
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
      alert("Application transmitted.");
      setActiveTab('dashboard');
    } catch (e) {
      console.error(e);
      alert("Transmission failed.");
    } finally {
      setIsProcessing(false);
    }
  };

  const renderDashboard = () => (
    <div style={{ padding: '19px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
        <div>
          <h1 style={{ color: 'var(--text-main)', fontSize: '2.4rem', fontFamily: "'Satisfy', cursive", margin: 0, background: 'linear-gradient(to right, #fff, var(--primary))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Hello, {userData?.name || 'Executor'}</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginTop: '5px' }}>
            <div 
              className="trust-badge-glow"
              style={{ 
                background: repInfo.currentTier.color, 
                color: '#000', 
                padding: '4px 14px', 
                borderRadius: '4px', 
                fontSize: '0.85rem', 
                fontWeight: '900',
                textTransform: 'uppercase',
                '--glow-color': repInfo.currentTier.color,
                clipPath: 'polygon(10% 0, 100% 0, 100% 70%, 90% 100%, 0 100%, 0 30%)'
              }}
            >
              {repInfo.currentTier.label} Badge
            </div>
            <span style={{ fontSize: '0.9rem', color: 'var(--text-main)', fontWeight: 'bold', fontFamily: 'monospace' }}>RPT SCORE: {rpt}</span>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px', marginBottom: '20px' }}>
        <div className="cyber-card" style={{ padding: '25px', background: 'rgba(255,255,255,0.02)', borderLeft: `4px solid ${repInfo.currentTier.color}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 'bold', textTransform: 'uppercase', color: 'var(--text-dim)', letterSpacing: '1.5px' }}>
              Trust Progression : <span style={{ color: repInfo.nextTier?.color || repInfo.currentTier.color }}>{repInfo.nextTier ? repInfo.nextTier.label : 'Max Level'}</span>
            </span>
            <span style={{ fontSize: '0.9rem', color: 'var(--text-main)', fontFamily: 'monospace', fontWeight: '900' }}>{repInfo.progress.toFixed(0)}%</span>
          </div>
          <div className="fancy-progress-bar" style={{ height: '12px' }}>
            <div 
              className="fancy-progress-fill"
              style={{ 
                width: `${repInfo.progress}%`, 
                background: `linear-gradient(90deg, ${repInfo.currentTier.color}, ${repInfo.nextTier ? repInfo.nextTier.color : repInfo.currentTier.color})`, 
                boxShadow: `0 0 15px ${repInfo.currentTier.color}aa`, 
              }}
            ></div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px' }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>{repInfo.currentTier.label}</span>
            <span 
              onClick={() => setShowRepTiers(!showRepTiers)}
              style={{ fontSize: '0.7rem', color: 'var(--primary)', cursor: 'pointer', fontWeight: 'bold', textDecoration: 'underline' }}
            >
              {showRepTiers ? 'HIDE_REQUIREMENTS' : 'VIEW_ALL_REQUIREMENTS'}
            </span>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>{repInfo.nextTier ? `${repInfo.nextTier.minRpt - rpt} RPT to next rank` : 'Ultimate Rank'}</span>
          </div>
        </div>

        <div className="cyber-card" style={{ padding: '20px', background: 'linear-gradient(135deg, rgba(0,212,255,0.05) 0%, rgba(0,0,0,0) 100%)', border: '1px solid rgba(0,212,255,0.1)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: '#00d4ff', textTransform: 'uppercase', marginBottom: '2px' }}>RPT Assets</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: 'var(--text-main)' }}>{rpt} <span style={{ fontSize: '0.9rem', color: '#00d4ff' }}>Tokens</span></div>
            </div>
            <TrendingUp size={20} color="#00d4ff" />
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
        <div className="cyber-card" style={{ padding: '19px', background: 'rgba(255,255,255,0.01)' }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>XLM Earned</div>
          <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#00ff88', marginTop: '5px' }}>{earnedXLM.toFixed(2)}</div>
        </div>
        <div className="cyber-card" style={{ padding: '19px', background: 'rgba(255,255,255,0.01)' }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Active Pacts</div>
          <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--primary)', marginTop: '5px' }}>{activeJobs.length}</div>
        </div>
        <div className="cyber-card" style={{ padding: '19px', background: 'rgba(255,255,255,0.01)' }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Completion Rate</div>
          <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--text-main)', marginTop: '5px' }}>100%</div>
        </div>
      </div>

      {showRepTiers && (
        <div className="cyber-card" style={{ marginTop: '20px', padding: '25px', border: '1px solid var(--border-ghost)', background: 'rgba(0,0,0,0.3)' }}>
          <h3 style={{ fontSize: '1rem', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '20px', color: 'var(--primary)' }}>Trust Hierarchy</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '20px' }}>
            {TIERS.map(tier => (
              <div key={tier.level} style={{ 
                padding: '19px', 
                background: 'rgba(255,255,255,0.02)', 
                border: `1px solid ${rpt >= tier.minRpt ? tier.color : 'rgba(255,255,255,0.05)'}`,
                opacity: rpt >= tier.minRpt ? 1 : 0.4,
                position: 'relative',
                overflow: 'hidden'
              }}>
                {rpt >= tier.minRpt && <div style={{ position: 'absolute', top: '-10px', right: '-10px', background: tier.color, padding: '19px', transform: 'rotate(45deg)', fontSize: '0.6rem', fontWeight: 'bold', color: '#000' }}>ACTIVE</div>}
                <div style={{ color: tier.color, fontSize: '0.9rem', fontWeight: '900', textTransform: 'uppercase' }}>{tier.label}</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 'bold', margin: '5px 0' }}>{tier.minRpt} <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>RPT</span></div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', lineHeight: '1.4' }}>{tier.description}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const renderJobBoard = () => (
    <div style={{ padding: '20px' }}>
      <h2 style={{ fontSize: '1.5rem', textTransform: 'uppercase', marginBottom: '30px' }}>Available Jobs</h2>
      {allJobs.filter(j => j.status === 'OPEN').length === 0 && (
        <div style={{ color: 'var(--text-dim)', textAlign: 'center', padding: '60px', fontSize: '1.05rem' }}>No open pacts available right now.</div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        {allJobs.filter(j => j.status === 'OPEN').map((job) => {
          const company = companies[job.companyAddress] || {};
          // Prefer live company data, fall back to job snapshot (skip stale 'Unknown' snapshots)
          const snapshotName = job.companyName && job.companyName !== 'Unknown' ? job.companyName : '';
          const snapshotImage = job.companyImage || '';
          const companyName = company.name || snapshotName || 'Dashy Partner';
          const companyImage = company.profilePhoto || snapshotImage || `https://api.dicebear.com/7.x/identicon/svg?seed=${job.companyAddress}`;
          const companyBio = company.credibility || job.companyBio || '';
          const companyWebsite = company.website || job.companyWebsite || '';
          const alreadyApplied = !!myApplications.find(a => a.jobId === job.id);
          return (
            <div
              key={job.id}
              className="cyber-card"
              style={{ padding: '28px', cursor: 'pointer', transition: 'border-color 0.2s', position: 'relative', overflow: 'hidden' }}
              onClick={() => setSelectedJobId(job.id)}
            >
              {/* Company header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '19px', marginBottom: '18px', padding: '18px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-ghost)' }}>
                <img
                  src={companyImage}
                  alt={companyName}
                  style={{ width: '48px', height: '48px', borderRadius: '10px', border: '1px solid var(--border-ghost)', objectFit: 'cover' }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '1px' }}>Hiring Entity</div>
                  <div style={{ fontSize: '0.95rem', fontWeight: '800', color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{companyName}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--primary)', fontFamily: 'monospace', marginTop: '2px' }}>{job.companyAddress?.slice(0, 8)}...{job.companyAddress?.slice(-8)}</div>
                </div>
                {companyWebsite && (
                  <a href={companyWebsite} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} style={{ color: 'var(--primary)' }}>
                    <Globe size={14} />
                  </a>
                )}
              </div>

              <h3 style={{ color: 'var(--primary)', fontSize: '1rem', marginBottom: '8px', textTransform: 'uppercase' }}>{job.title}</h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginBottom: '18px', lineHeight: '1.5', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                {job.description}
              </p>

              {/* Skills preview */}
              {job.skills && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '11px', marginBottom: '18px' }}>
                  {job.skills.split(',').slice(0, 3).map((s, i) => (
                    <span key={i} style={{ padding: '3px 10px', background: 'rgba(243,243,5,0.06)', border: '1px solid rgba(243,243,5,0.15)', color: 'var(--primary)', fontSize: '0.8rem', fontFamily: 'monospace' }}>
                      {s.trim()}
                    </span>
                  ))}
                  {job.skills.split(',').length > 3 && (
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>+{job.skills.split(',').length - 3} more</span>
                  )}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Bounty</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--text-main)' }}>{job.budget} <span style={{ fontSize: '0.85rem', color: 'var(--primary)' }}>XLM</span></div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '13px' }}>
                  {alreadyApplied && (
                    <span style={{ fontSize: '0.8rem', color: '#00ff88', fontWeight: 'bold' }}>✓ Applied</span>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '11px', color: 'var(--primary)', fontSize: '0.9rem', fontWeight: 'bold' }}>
                    View Details <ArrowRight size={14} />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  const handleRaiseDispute = async () => {
    if (!disputeModal || !disputeReason.trim()) return;
    const { job } = disputeModal;
    setIsProcessing(true);
    try {
      // On-chain: mark job as disputed
      try {
        await callContract(ESCROW_CONTRACT_ID, 'dispute', [
          { type: 'u64', value: BigInt(job.onChainId) },
          publicKey
        ]);
      } catch (chainErr) {
        console.warn('On-chain dispute call failed (Firestore will still update):', chainErr.message);
      }
      // Off-chain: update Firestore
      await updateDoc(doc(db, 'jobs', job.id), {
        status: 'DISPUTED',
        disputeReason,
        disputeRaisedBy: publicKey,
        disputeRaisedByRole: 'worker',
        disputedAt: serverTimestamp()
      });
      alert('Dispute raised. The admin will review within 24 hours.');
      setDisputeModal(null);
      setDisputeReason('');
      fetchData();
    } catch (e) {
      alert('Failed to raise dispute: ' + e.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSubmitWork = async (jobId, data) => {
    setIsProcessing(true);
    try {
      const jobRef = doc(db, 'jobs', jobId);
      await updateDoc(jobRef, {
        githubHash: data.hash,
        docLink: data.doc,
        workerNote: data.note,
        workSubmitted: true,
        submittedAt: serverTimestamp()
      });
      alert("Work evidence transmitted.");
      fetchData(); // Refresh local state
    } catch (e) {
      console.error(e);
      alert("Transmission failed.");
    } finally {
      setIsProcessing(false);
    }
  };

  const renderActiveJobs = () => (
    <div style={{ padding: '20px' }}>
      <h2 style={{ fontSize: '1.5rem', textTransform: 'uppercase', marginBottom: '30px', display: 'flex', alignItems: 'center', gap: '15px' }}>
        <Briefcase size={22} color="var(--primary)" /> Active Projects
      </h2>
      {activeJobs.length > 0 ? activeJobs.map((job) => {
        const company = companies[job.companyAddress] || {};
        return (
          <div key={job.id} className="cyber-card" style={{ padding: '0', borderLeft: '4px solid var(--primary)', marginBottom: '30px', background: 'linear-gradient(180deg,rgba(20,20,25,0.9) 0%,rgba(10,10,15,0.95) 100%)' }}>
            {/* Header */}
            <div style={{ padding: '20px 30px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(243,243,5,0.02)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                <img src={company.profilePhoto || `https://api.dicebear.com/7.x/identicon/svg?seed=${job.companyAddress}`} alt="Co" style={{ width: '42px', height: '42px', borderRadius: '6px', border: '1px solid var(--border-ghost)' }} />
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Hiring Entity</div>
                  <div style={{ fontSize: '0.9rem', fontWeight: '800' }}>{company.name || 'Hiring Partner'}</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <div style={{ padding: '3px 12px', fontSize: '0.75rem', background: 'rgba(0,255,136,0.1)', color: '#00ff88', border: '1px solid rgba(0,255,136,0.3)', textTransform: 'uppercase', letterSpacing: '1.5px', fontWeight: '900' }}>ACTIVE</div>
                {job.workSubmitted && (
                  <button
                    onClick={() => setDisputeModal({ job })}
                    style={{ background: 'rgba(255,68,68,0.08)', border: '1px solid rgba(255,68,68,0.3)', color: '#ff4444', padding: '6px 14px', cursor: 'pointer', fontSize: '0.8rem', textTransform: 'uppercase', fontWeight: '900', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: '11px', transition: 'all 0.2s' }}
                    onMouseOver={e => { e.currentTarget.style.background='rgba(255,68,68,0.18)'; e.currentTarget.style.borderColor='#ff4444'; }}
                    onMouseOut={e => { e.currentTarget.style.background='rgba(255,68,68,0.08)'; e.currentTarget.style.borderColor='rgba(255,68,68,0.3)'; }}
                  >
                    <AlertTriangle size={12} /> RAISE DISPUTE
                  </button>
                )}
              </div>
            </div>
            {/* Body */}
            <div style={{ padding: '30px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px' }}>
              <div>
                <h3 style={{ fontSize: '1.2rem', color: 'var(--primary)', marginBottom: '15px', textTransform: 'uppercase' }}>{job.title}</h3>
                <div style={{ fontSize: '1rem', color: 'var(--text-dim)', lineHeight: '1.7', marginBottom: '20px' }}>{job.description}</div>
                <div style={{ display: 'flex', gap: '20px', fontSize: '0.9rem' }}>
                  <span style={{ color: 'var(--primary)' }}>⏱ Deadline: {job.deadline}</span>
                  <span style={{ color: '#00ff88', fontWeight: 'bold' }}>💰 {job.budget} XLM</span>
                </div>
                {!job.workSubmitted && <div style={{ marginTop: '15px', padding: '8px 12px', background: 'rgba(243,243,5,0.04)', border: '1px solid rgba(243,243,5,0.1)', fontSize: '0.8rem', color: 'var(--primary)' }}>⚠ Submit your work evidence before raising a dispute.</div>}
              </div>
              <div style={{ background: 'rgba(0,0,0,0.25)', padding: '20px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <h4 style={{ fontSize: '0.9rem', textTransform: 'uppercase', marginBottom: '15px', color: 'var(--primary)', letterSpacing: '1px' }}>📤 Submit Work Evidence</h4>
                <form onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.target); handleSubmitWork(job.id, { hash: fd.get('hash'), doc: fd.get('doc'), note: fd.get('note') }); }} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  <input name="hash" placeholder="GitHub Commit Hash" defaultValue={job.githubHash} style={{ width: '100%', background: 'var(--bg-section)', border: '1px solid var(--border-ghost)', padding: '14px', color: 'var(--text-main)', fontSize: '0.9rem' }} />
                  <input name="doc" placeholder="Documentation Link" defaultValue={job.docLink} style={{ width: '100%', background: 'var(--bg-section)', border: '1px solid var(--border-ghost)', padding: '14px', color: 'var(--text-main)', fontSize: '0.9rem' }} />
                  <textarea name="note" placeholder="Executor Notes" defaultValue={job.workerNote} style={{ width: '100%', background: 'var(--bg-section)', border: '1px solid var(--border-ghost)', padding: '14px', color: 'var(--text-main)', fontSize: '0.9rem', minHeight: '60px' }} />
                  <button type="submit" disabled={isProcessing} className="btn-luxury" style={{ padding: '14px' }}>{job.workSubmitted ? 'Update Submission' : 'Submit Work'}</button>
                </form>
              </div>
            </div>
          </div>
        );
      }) : (
        <div style={{ color: 'var(--text-dim)', textAlign: 'center', padding: '60px' }}>No active pacts assigned to this node.</div>
      )}
    </div>
  );

  const renderDisputes = () => {
    const disputed = allJobs.filter(j => j.workerAddress === publicKey && j.status === 'DISPUTED');
    return (
      <div style={{ padding: '20px' }}>
        <h2 style={{ fontSize: '1.5rem', textTransform: 'uppercase', marginBottom: '30px', display: 'flex', alignItems: 'center', gap: '15px' }}>
          <AlertTriangle size={22} color="#ff4444" /> Conflict Resolution
        </h2>
        {disputed.length > 0 ? disputed.map((job) => (
          <div key={job.id} className="cyber-card" style={{ padding: '0', borderLeft: '4px solid #ff4444', marginBottom: '25px', background: 'linear-gradient(180deg,rgba(25,10,10,0.9) 0%,rgba(10,10,15,0.95) 100%)' }}>
            <div style={{ padding: '20px 30px', borderBottom: '1px solid rgba(255,68,68,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,68,68,0.03)' }}>
              <div>
                <div style={{ color: '#ff4444', fontSize: '0.8rem', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '4px' }}>⚡ Conflict Active</div>
                <h3 style={{ fontSize: '1.2rem', margin: 0 }}>{job.title}</h3>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: '#ff4444' }}>{job.budget} <span style={{ fontSize: '0.9rem', color: 'var(--text-dim)' }}>XLM at stake</span></div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginTop: '4px' }}>Locked in EscrowVault</div>
              </div>
            </div>
            <div style={{ padding: '25px 30px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '25px' }}>
              <div style={{ background: 'rgba(0,0,0,0.3)', padding: '20px', borderLeft: '3px solid #ff4444' }}>
                <div style={{ fontSize: '0.8rem', color: '#ff4444', textTransform: 'uppercase', fontWeight: '900', marginBottom: '12px', letterSpacing: '1px' }}>Your Dispute Reason</div>
                <div style={{ fontSize: '1rem', color: 'var(--text-dim)', lineHeight: '1.6' }}>{job.disputeReason || 'No reason provided.'}</div>
              </div>
              <div style={{ background: 'rgba(0,0,0,0.3)', padding: '20px', borderLeft: '3px solid rgba(255,255,255,0.1)' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: '900', marginBottom: '12px', letterSpacing: '1px' }}>Submitted Evidence</div>
                {job.githubHash ? <div style={{ fontFamily: 'monospace', fontSize: '0.9rem', color: '#00ff88', background: 'rgba(0,0,0,0.4)', padding: '12px', wordBreak: 'break-all' }}>{job.githubHash}</div> : <div style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.2)', fontStyle: 'italic' }}>No evidence submitted.</div>}
              </div>
            </div>
            <div style={{ padding: '15px 30px', background: 'rgba(255,68,68,0.04)', borderTop: '1px solid rgba(255,68,68,0.1)', display: 'flex', alignItems: 'center', gap: '15px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ff4444', boxShadow: '0 0 10px #ff4444', animation: 'pulse 2s infinite' }}></div>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>Under administrative review. The admin will mediate and execute a fair payout split on-chain. Funds are safe in escrow.</span>
            </div>
          </div>
        )) : (
          <div style={{ color: 'var(--text-dim)', textAlign: 'center', padding: '60px' }}>
            <CheckCircle size={40} color="#00ff88" style={{ marginBottom: '15px', opacity: 0.3 }} />
            <div style={{ fontSize: '1.05rem' }}>No active conflicts detected. All pacts are running smoothly.</div>
          </div>
        )}
      </div>
    );
  };

  const renderHistory = () => {
    const past = allJobs.filter(j => j.workerAddress === publicKey && j.status === 'COMPLETED');
    return (
      <div style={{ padding: '20px' }}>
        <h2 style={{ fontSize: '1.5rem', textTransform: 'uppercase', marginBottom: '30px', display: 'flex', alignItems: 'center', gap: '15px' }}>
          <History size={22} color="var(--primary)" /> Pact Execution History
        </h2>
        {past.length > 0 ? (
          <div style={{ display: 'grid', gap: '20px' }}>
            {past.map(job => (
              <div 
                key={job.id} 
                className="cyber-card" 
                style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                onClick={() => setSelectedJobId(job.id)}
                onMouseOver={(e) => e.currentTarget.style.borderColor = 'var(--primary)'}
                onMouseOut={(e) => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'}
              >
                <div>
                  <h3 style={{ fontSize: '1rem', marginBottom: '5px' }}>{job.title}</h3>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>ID: {job.id} | Completed: {job.completedAt?.toDate?.()?.toLocaleDateString() || 'N/A'}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ color: '#00ff88', fontWeight: 'bold' }}>+{job.budget} XLM</div>
                  <div style={{ fontSize: '0.8rem', color: 'rgba(0,255,136,0.5)', textTransform: 'uppercase' }}>Settled</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ color: 'var(--text-dim)', textAlign: 'center', padding: '60px' }}>No completed pacts found in this node.</div>
        )}
      </div>
    );
  };

  const renderPastDisputes = () => {
    const pastDisputes = allJobs.filter(j => j.workerAddress === publicKey && j.status === 'COMPLETED' && (j.disputeReason || j.disputeResolvedAt));
    return (
      <div style={{ padding: '20px' }}>
        <h2 style={{ fontSize: '1.5rem', textTransform: 'uppercase', marginBottom: '30px', display: 'flex', alignItems: 'center', gap: '15px' }}>
          <AlertTriangle size={22} color="#ff4444" /> Resolved Conflicts
        </h2>
        {pastDisputes.length > 0 ? (
          <div style={{ display: 'grid', gap: '20px' }}>
            {pastDisputes.map(job => (
              <div key={job.id} className="cyber-card" style={{ padding: '20px', borderLeft: '4px solid #ff4444' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' }}>
                  <div>
                    <h3 style={{ fontSize: '1rem', marginBottom: '5px' }}>{job.title}</h3>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>Resolved: {job.disputeResolvedAt?.toDate?.()?.toLocaleDateString() || 'N/A'}</div>
                  </div>
                  <div style={{ padding: '4px 10px', background: 'rgba(255,68,68,0.1)', color: '#ff4444', fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase' }}>RESOLVED</div>
                </div>
                <div style={{ padding: '16px', background: 'rgba(0,0,0,0.2)', fontSize: '0.95rem', color: 'var(--text-dim)', borderLeft: '2px solid rgba(255,68,68,0.3)', marginBottom: '15px' }}>
                  <div style={{ fontSize: '0.75rem', color: '#ff4444', textTransform: 'uppercase', marginBottom: '5px', fontWeight: 'bold' }}>Conflict Note</div>
                  {job.disputeReason}
                </div>
                <div style={{ fontSize: '0.9rem', color: 'var(--primary)' }}>
                   {job.disputeResolution || 'Admin settled the payout allocation.'}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ color: 'var(--text-dim)', textAlign: 'center', padding: '60px' }}>No resolved conflicts found.</div>
        )}
      </div>
    );
  };

  const renderFaq = () => (
    <div style={{ padding: '20px' }}>
      <h2 style={{ fontSize: '1.5rem', textTransform: 'uppercase', marginBottom: '30px', display: 'flex', alignItems: 'center', gap: '15px' }}>
        <Info size={22} color="var(--primary)" /> FAQ
      </h2>
      <FaqTabContent role="worker" />
    </div>
  );

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setIsProcessing(true);
    try {
      const uq = query(collection(db, 'users'), where('walletAddress', '==', publicKey));
      const snap = await getDocs(uq);
      if (!snap.empty) {
        // Find the latest one to update
        const latestDoc = snap.docs.sort((a, b) => (b.data().timestamp || 0) - (a.data().timestamp || 0))[0];
        await updateDoc(doc(db, 'users', latestDoc.id), {
          name: userData.name,
          profession: userData.profession || '',
          skills: userData.skills || '',
          profilePhoto: userData.profilePhoto || '',
          updatedAt: serverTimestamp()
        });
        alert("Profile updated successfully.");
        fetchData(); // Refresh header
      }
    } catch (e) {
      console.error(e);
      alert("Update failed.");
    } finally {
      setIsProcessing(false);
    }
  };

  const renderSettings = () => (
    <div style={{ padding: '19px' }}>
      <div className="cyber-card" style={{ padding: '25px', maxWidth: '800px', margin: '0 auto' }}>
        <h2 style={{ fontSize: '1.2rem', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '20px', borderBottom: '1px solid var(--border-ghost)', paddingBottom: '10px' }}>Node Configuration</h2>
        <form onSubmit={handleUpdateProfile} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', background: 'rgba(255,255,255,0.02)', padding: '19px', borderRadius: '8px' }}>
            <img 
              src={userData?.profilePhoto || `https://api.dicebear.com/7.x/identicon/svg?seed=${publicKey}`} 
              alt="Profile" 
              style={{ width: '60px', height: '60px', borderRadius: '12px', border: '2px solid var(--primary)' }} 
            />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Profile Avatar</div>
              <div style={{ fontSize: '0.8rem', color: '#666', marginTop: '2px' }}>Linked to: {publicKey?.slice(0,12)}...</div>
            </div>
            <button type="button" className="btn-luxury" style={{ padding: '6px 12px', fontSize: '0.75rem' }}>Change</button>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div className="input-group">
              <label style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Display Name</label>
              <input 
                value={userData?.name || ''} 
                onChange={(e) => setUserData({...userData, name: e.target.value})}
                style={{ width: '100%', background: 'var(--bg-section)', border: '1px solid var(--border-ghost)', padding: '14px', color: 'var(--text-main)', fontSize: '0.95rem', marginTop: '4px' }} 
              />
            </div>
            <div className="input-group">
              <label style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Professional Title</label>
              <input 
                placeholder="Senior Dev"
                value={userData?.profession || ''} 
                onChange={(e) => setUserData({...userData, profession: e.target.value})}
                style={{ width: '100%', background: 'var(--bg-section)', border: '1px solid var(--border-ghost)', padding: '14px', color: 'var(--text-main)', fontSize: '0.95rem', marginTop: '4px' }} 
              />
            </div>
          </div>

          <div className="input-group">
            <label style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Technical Skills</label>
            <input 
              placeholder="Rust, Soroban..."
              value={userData?.skills || ''} 
              onChange={(e) => setUserData({...userData, skills: e.target.value})}
              style={{ width: '100%', background: 'var(--bg-section)', border: '1px solid var(--border-ghost)', padding: '14px', color: 'var(--text-main)', fontSize: '0.95rem', marginTop: '4px' }} 
            />
          </div>

          <div style={{ padding: '19px', background: 'rgba(255,68,68,0.03)', border: '1px solid rgba(255,68,68,0.1)', borderRadius: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span style={{ fontSize: '0.75rem', color: '#ff4444', textTransform: 'uppercase' }}>Security Access</span>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>Session Active</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '15px' }}>
              <input type="password" placeholder="New Access Key" style={{ width: '100%', background: 'var(--bg-section)', border: '1px solid var(--border-ghost)', padding: '12px', color: 'var(--text-main)', fontSize: '0.9rem' }} />
              <button type="button" className="btn-luxury" style={{ background: 'rgba(255,68,68,0.1)', border: '1px solid #ff4444', color: '#ff4444', fontSize: '0.8rem', padding: '0 15px' }}>Update</button>
            </div>
          </div>

          <button type="submit" disabled={isProcessing} className="btn-luxury" style={{ padding: '16px', fontSize: '0.9rem', letterSpacing: '1px' }}>
            {isProcessing ? 'SYNCHRONIZING...' : 'COMMIT CHANGES'}
          </button>
        </form>
      </div>
    </div>
  );

  return (
    <DashboardLayout role="worker" activeTab={activeTab} onTabChange={setActiveTab}>
      <div style={{ marginTop: '20px' }}>
        {activeTab === 'dashboard' && renderDashboard()}
        {activeTab === 'jobs' && renderJobBoard()}
        {activeTab === 'active' && renderActiveJobs()}
        {activeTab === 'disputes' && renderDisputes()}
        {activeTab === 'history' && renderHistory()}
        {activeTab === 'past_disputes' && renderPastDisputes()}
        {activeTab === 'redeem' && <RedeemShop role="worker" />}
        {activeTab === 'faq' && renderFaq()}
        {activeTab === 'settings' && renderSettings()}
      </div>

      {selectedJobId && (
        <JobDetailsModal 
          jobId={selectedJobId} 
          onClose={() => setSelectedJobId(null)} 
        />
      )}

      {/* Dispute Modal */}
      {disputeModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9000, backdropFilter: 'blur(10px)' }}>
          <div style={{ background: '#0d0d0d', border: '1px solid rgba(255,68,68,0.3)', padding: '40px', maxWidth: '560px', width: '90%', position: 'relative' }}>
            <button onClick={() => { setDisputeModal(null); setDisputeReason(''); }} style={{ position: 'absolute', top: '15px', right: '15px', background: 'transparent', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}><X size={20} /></button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '17px', marginBottom: '25px' }}>
              <AlertTriangle size={24} color="#ff4444" />
              <h2 style={{ fontSize: '1.1rem', textTransform: 'uppercase', letterSpacing: '2px', margin: 0 }}>Raise Conflict</h2>
            </div>
            <div style={{ padding: '19px', background: 'rgba(255,68,68,0.05)', border: '1px solid rgba(255,68,68,0.15)', marginBottom: '25px', fontSize: '0.95rem', color: 'var(--text-dim)', lineHeight: '1.6' }}>
              <strong style={{ color: '#ff4444' }}>Pact:</strong> {disputeModal.job.title}<br />
              <strong style={{ color: '#ff4444' }}>Vaulted Bounty:</strong> {disputeModal.job.budget} XLM — funds will remain locked until admin resolution.
            </div>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '1px', display: 'block', marginBottom: '8px' }}>Conflict Reason *</label>
              <textarea
                value={disputeReason}
                onChange={e => setDisputeReason(e.target.value)}
                placeholder="Describe the conflict in detail. Include what was agreed upon, what was delivered, and what the issue is..."
                style={{ width: '100%', background: 'var(--bg-section)', border: '1px solid rgba(255,68,68,0.3)', padding: '16px', color: 'var(--text-main)', fontSize: '1rem', minHeight: '120px', resize: 'none', outline: 'none', fontFamily: 'inherit', lineHeight: '1.6' }}
              />
            </div>
            <div style={{ display: 'flex', gap: '20px' }}>
              <button onClick={() => { setDisputeModal(null); setDisputeReason(''); }} style={{ flex: 1, padding: '16px', background: 'transparent', border: '1px solid var(--border-ghost)', color: 'var(--text-dim)', cursor: 'pointer', fontSize: '0.95rem', textTransform: 'uppercase' }}>CANCEL</button>
              <button
                onClick={handleRaiseDispute}
                disabled={isProcessing || !disputeReason.trim()}
                style={{ flex: 1, padding: '16px', background: '#ff4444', border: 'none', color: '#000', cursor: 'pointer', fontSize: '0.95rem', textTransform: 'uppercase', fontWeight: '900', boxShadow: '0 0 20px rgba(255,68,68,0.2)' }}
              >
                {isProcessing ? 'TRANSMITTING...' : 'CONFIRM CONFLICT'}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default DashWorker;
