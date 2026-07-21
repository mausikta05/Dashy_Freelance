import React, { useState, useEffect } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { Briefcase, DollarSign, Users, Globe, Plus, ExternalLink, TrendingUp, Home, Settings, Shield, Trash2, Clock, CheckCircle, AlertCircle, AlertTriangle, X, History, Info } from 'lucide-react';
import FaqTabContent from '../components/FaqTabContent';
import RedeemShop from './RedeemShop';
import JobDetailsModal from '../components/JobDetailsModal';
import { useWallet } from '../context/WalletContext';
import { db } from '../firebase';
import { collection, query, where, getDocs, addDoc, serverTimestamp, updateDoc, doc } from 'firebase/firestore';
import { getReputationInfo, TIERS } from '../utils/reputation';

const ESCROW_CONTRACT_ID = "CACN5PFTVFJHGAFZ47MB5FXQPDN7QM4RNP5OVFBQ64B2VULWONFS5VAH"; // fresh redeployed
const PROOFWORK_CONTRACT_ID = "CDS6J5XMEGDJPQ4XEKJFJOCHB6NFC732K4SXDPSQHUDQKJAR757I6UZE";

const DashCompany = () => {
  const { publicKey, balance, callContract } = useWallet();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedJobId, setSelectedJobId] = useState(null);
  const [showRepTiers, setShowRepTiers] = useState(false);
  const [companyData, setCompanyData] = useState(null);
  const [isPosting, setIsPosting] = useState(false);
  const [newJob, setNewJob] = useState({
    title: '',
    description: '',
    deadline: '',
    skills: '',
    budget: ''
  });

  // Convert the formatted context balance (e.g., "37,349.45") back to a numeric value for math
  const numericBalance = Number(balance?.replace(/,/g, '') || 0);
  const [stats, setStats] = useState({
    escrowed: '0.00',
    payouts: '0.00',
    active: 0,
    completed: 0,
    disputed: 0
  });
  const [jobs, setJobs] = useState([]);
  const [applications, setApplications] = useState([]);
  const [disputeModal, setDisputeModal] = useState(null); // { job }
  const [disputeReason, setDisputeReason] = useState('');

  const fetchJobsData = async () => {
    if (!publicKey) return;
    try {
      const q = query(collection(db, 'jobs'), where('companyAddress', '==', publicKey));
      const snap = await getDocs(q);
      const fetchedJobs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setJobs(fetchedJobs);

      const aq = query(collection(db, 'applications'), where('companyAddress', '==', publicKey));
      const aSnap = await getDocs(aq);
      setApplications(aSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) {
      console.error("Error fetching jobs/apps:", e);
    }
  };

  useEffect(() => {
    if (activeTab === 'active' || activeTab === 'dashboard') fetchJobsData();
  }, [publicKey, activeTab]);

  const fetchCompanyData = async () => {
    if (!publicKey) return;
    try {
      const q = query(collection(db, 'companies'), where('walletAddress', '==', publicKey));
      const snap = await getDocs(q);
      let companyDoc = null;
      if (!snap.empty) {
        companyDoc = snap.docs[0];
        setCompanyData(companyDoc.data());
      }

      const jq = query(collection(db, 'jobs'), where('companyAddress', '==', publicKey));
      const jSnap = await getDocs(jq);
      let active = 0, completed = 0, disputed = 0, escrowed = 0, payouts = 0;
      
      jSnap.forEach(doc => {
        const data = doc.data();
        if (data.status === 'ACTIVE') active++;
        if (data.status === 'COMPLETED') {
          completed++;
          payouts += Number(data.budget || 0) * 0.95; // actual payout after 5% fee
        }
        if (data.status === 'DISPUTED') disputed++;
        if (data.status === 'ACTIVE' || data.status === 'OPEN') {
          escrowed += Number(data.budget || 0);
        }
      });

      setStats({ 
        escrowed: escrowed.toLocaleString(), 
        payouts: payouts.toFixed(2), 
        active, 
        completed, 
        disputed,
        rpt: companyDoc?.data()?.rpt || 0 
      });

      // Fetch live RPT from ProofWork contract (source of truth)
      try {
        const rptRes = await callContract(PROOFWORK_CONTRACT_ID, 'get_rpt', [publicKey], true);
        const liveRpt = Number(rptRes?.result ?? 0);
        // Update local state immediately
        setCompanyData(prev => prev ? { ...prev, rpt: liveRpt } : prev);
        setStats(prev => ({ ...prev, rpt: liveRpt }));
        // Write back to Firestore if changed
        if (companyDoc && liveRpt !== (companyDoc.data().rpt || 0)) {
          await updateDoc(doc(db, 'companies', companyDoc.id), { rpt: liveRpt });
        }
      } catch (rptErr) {
        console.warn('Live RPT fetch from ProofWork failed, using cached value:', rptErr.message);
      }

    } catch (e) {
      console.error("Error fetching company data:", e);
    }
  };

  useEffect(() => {
    fetchCompanyData();
  }, [publicKey]);

  const repInfo = getReputationInfo(companyData?.rpt || 0);

  const handleRaiseDispute = async () => {
    if (!disputeModal || !disputeReason.trim()) return;
    const { job } = disputeModal;
    setIsPosting(true);
    try {
      try {
        await callContract(ESCROW_CONTRACT_ID, 'dispute', [
          { type: 'u64', value: BigInt(job.onChainId) },
          publicKey
        ]);
      } catch (chainErr) {
        console.warn('On-chain dispute call failed:', chainErr.message);
      }
      await updateDoc(doc(db, 'jobs', job.id), {
        status: 'DISPUTED',
        disputeReason,
        disputeRaisedBy: publicKey,
        disputeRaisedByRole: 'company',
        disputedAt: serverTimestamp()
      });
      alert('Conflict raised. Admin will mediate within 24 hours.');
      setDisputeModal(null);
      setDisputeReason('');
      fetchJobsData();
    } catch (e) {
      alert('Failed to raise conflict: ' + e.message);
    } finally {
      setIsPosting(false);
    }
  };

  const handlePostJob = async (e) => {
    e.preventDefault();
    if (!publicKey) return;
    setIsPosting(true);
    try {
      // Fetch latest profile snapshot
      const q = query(collection(db, 'companies'), where('walletAddress', '==', publicKey));
      const snap = await getDocs(q);
      const profile = !snap.empty ? snap.docs[0].data() : {};

      const budgetRaw = BigInt(Math.floor(Number(newJob.budget) * 10_000_000));

      // Attempt on-chain escrow — create_job(company: Address, amount: i128) → u64 job_id
      // If this fails (contract not initialized, low balance, etc.) we still save to Firestore
      let onChainJobId = null;
      let hasEscrow = false;
      let chainErrMsg = null;
      try {
        const tx = await callContract(ESCROW_CONTRACT_ID, 'create_job', [
          publicKey,
          { type: 'i128', value: budgetRaw }
        ]);
        onChainJobId = tx?.result;
        if (typeof onChainJobId === 'bigint') onChainJobId = Number(onChainJobId);
        if (onChainJobId) hasEscrow = true;
      } catch (chainErr) {
        chainErrMsg = chainErr.message || 'Unknown contract error';
        console.warn('create_job on-chain failed (job saved without escrow):', chainErrMsg);
        onChainJobId = `LOCAL_${Date.now()}`; // Firestore-only fallback ID
      }

      // Always save to Firestore — chain success or not
      await addDoc(collection(db, 'jobs'), {
        ...newJob,
        onChainId: onChainJobId,
        hasEscrow,
        companyAddress: publicKey,
        status: 'OPEN',
        createdAt: serverTimestamp(),
        workerAddress: null,
        githubHash: null,
        // Bundled Profile Snapshot
        companyName: profile.name || '',
        companyImage: profile.profilePhoto || '',
        companyBio: profile.credibility || '',
        companyEmail: profile.email || '',
        companyMobile: profile.mobile || '',
        companyLocation: profile.address || '',
        companyWebsite: profile.website || '',
        companyLinkedIn: profile.linkedIn || '',
        companyRole: profile.role || 'company'
      });

      if (hasEscrow) {
        alert(`Job Posted! Funds secured in Escrow (Job #${onChainJobId}).`);
      } else {
        alert(
          `Job saved to the marketplace.\n\n⚠ On-chain escrow was NOT created:\n${chainErrMsg}\n\nTo enable escrow: go to Admin → SET_PROOFWORK_LINK then BOOT_ESCROW_VAULT_V2 (if not yet initialized).`
        );
      }

      setActiveTab('active');
      setNewJob({ title: '', description: '', deadline: '', skills: '', budget: '' });
      fetchJobsData();
    } catch (e) {
      console.error("Post job error:", e);
      alert(`Failed to post job: ${e.message}`);
    } finally {
      setIsPosting(false);
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    if (!publicKey) return;
    setIsPosting(true);
    try {
      const q = query(collection(db, 'companies'), where('walletAddress', '==', publicKey));
      const snap = await getDocs(q);
      if (!snap.empty) {
      await updateDoc(doc(db, 'companies', snap.docs[0].id), {
          name: companyData.name,
          credibility: companyData.credibility,
          profilePhoto: companyData.profilePhoto,
          mobile: companyData.mobile,
          address: companyData.address,
          website: companyData.website || '',
          linkedIn: companyData.linkedIn || '',
          updatedAt: serverTimestamp()
        });
        alert("Company Node Synced.");
      }
    } catch (e) {
      console.error(e);
      alert("Sync failed.");
    } finally {
      setIsPosting(false);
    }
  };

  const handleWithdrawJob = async (jobId, onChainId) => {
    if (!window.confirm("Are you sure you want to withdraw this job? This will reclaim any vaulted funds.")) return;
    
    setIsPosting(true);
    try {
      try {
        // withdraw_job(job_id: u64)
        await callContract(ESCROW_CONTRACT_ID, 'withdraw_job', [{ type: 'u64', value: BigInt(onChainId) }]);
      } catch (onChainErr) {
        console.warn("On-chain withdrawal failed, cleaning Firebase...", onChainErr);
      }
      
      await updateDoc(doc(db, 'jobs', jobId), {
        status: 'WITHDRAWN',
        withdrawnAt: serverTimestamp()
      });
      
      alert("Job withdrawn successfully!");
      fetchJobsData();
    } catch (err) {
      console.error("Withdrawal failed:", err);
      alert("Failed to withdraw job.");
    } finally {
      setIsPosting(false);
    }
  };

  const handleAssignWorker = async (jobId, onChainId, workerAddress) => {
    setIsPosting(true);
    try {
      // 1. On-chain assignment — job_id is u64, worker is Address
      //    If this fails (job created on old contract / stale ID), we still update Firestore
      try {
        await callContract(ESCROW_CONTRACT_ID, 'assign_worker', [
          { type: 'u64', value: BigInt(onChainId) },
          workerAddress
        ]);
      } catch (chainErr) {
        console.warn('On-chain assign_worker failed (Firestore will still update):', chainErr.message);
      }
      
      // 2. Update Job Doc
      await updateDoc(doc(db, 'jobs', jobId), {
        workerAddress,
        status: 'ACTIVE',
        assignedAt: serverTimestamp()
      });

      // 3. Handle Applications Status
      const q = query(collection(db, 'applications'), where('jobId', '==', jobId));
      const snap = await getDocs(q);
      for (const appDoc of snap.docs) {
        const isSelected = appDoc.data().workerAddress === workerAddress;
        await updateDoc(doc(db, 'applications', appDoc.id), {
          status: isSelected ? 'ACCEPTED' : 'REJECTED'
        });
      }

      alert("Pact Finalized! Work terminal is now active for the executor.");
      fetchJobsData();
    } catch (e) {
      console.error("Assignment Failure:", e);
      alert(`Assignment Failed: ${e.message || "Unknown error"}.`);
    } finally {
      setIsPosting(false);
    }
  };

  const handleReleasePayment = async (jobId, onChainId) => {
    // Find which job is being released so we know the worker address
    const jobDoc = jobs.find(j => j.id === jobId);
    const workerAddress = jobDoc?.workerAddress;

    if (!window.confirm("Are you sure you want to release the vaulted funds? This action is irreversible and will finalize the Pact.")) return;
    
    setIsPosting(true);
    let chainSuccess = false;
    try {
      // 1. On-chain release (job_id is u64; triggers XLM payment + RPT grant via ICC to ProofWork)
      try {
        await callContract(ESCROW_CONTRACT_ID, 'release_payment', [
          { type: 'u64', value: BigInt(onChainId) }
        ]);
        chainSuccess = true;
      } catch (chainErr) {
        console.warn('On-chain release_payment failed (Firestore will still finalize):', chainErr.message);
      }

      // 2. Update Firebase job status
      await updateDoc(doc(db, 'jobs', jobId), {
        status: 'COMPLETED',
        completedAt: serverTimestamp()
      });

      // 3. RPT sync — deterministic +1 increment (no chain read timing issues)
      //    release_payment always calls grant_rpt(company,1) + grant_rpt(worker,1) atomically.
      //    We mirror that exactly in Firestore instead of racing against ledger settlement.
      if (chainSuccess) {
        const companyAddr = jobDoc?.companyAddress || publicKey;
        try {
          // Increment company RPT by 1
          const cq = query(collection(db, 'companies'), where('walletAddress', '==', companyAddr));
          const cSnap = await getDocs(cq);
          if (!cSnap.empty) {
            const currentRpt = cSnap.docs[0].data().rpt || 0;
            await updateDoc(doc(db, 'companies', cSnap.docs[0].id), { rpt: currentRpt + 1 });
            console.log(`Company RPT: ${currentRpt} → ${currentRpt + 1} for ${companyAddr}`);
          }
        } catch (rptErr) {
          console.warn('Company RPT Firestore increment failed:', rptErr.message);
        }

        if (workerAddress) {
          try {
            // Increment worker RPT by 1
            const wq = query(collection(db, 'users'), where('walletAddress', '==', workerAddress));
            const wSnap = await getDocs(wq);
            if (!wSnap.empty) {
              const currentRpt = wSnap.docs[0].data().rpt || 0;
              await updateDoc(doc(db, 'users', wSnap.docs[0].id), { rpt: currentRpt + 1 });
              console.log(`Worker RPT: ${currentRpt} → ${currentRpt + 1} for ${workerAddress}`);
            }
          } catch (rptErr) {
            console.warn('Worker RPT Firestore increment failed:', rptErr.message);
          }
        }
      }

      alert("Pact Completed! XLM released (95% to worker, 5% to treasury) and RPT tokens granted to both parties.");
      fetchJobsData();
      fetchCompanyData(); // Re-reads rpt from Firestore (now updated)
    } catch (e) {
      console.error("Release error:", e);
      alert(`Payment release failed: ${e.message}`);
    } finally {
      setIsPosting(false);
    }
  };

  const renderPostJob = () => (
    <div style={{ padding: '19px' }}>
      <div className="cyber-card" style={{ padding: '30px', maxWidth: '800px', margin: '0 auto', border: '1px solid rgba(255, 107, 0, 0.2)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px', borderBottom: '1px solid var(--border-ghost)', paddingBottom: '15px' }}>
          <div>
            <h2 style={{ fontSize: '1.2rem', textTransform: 'uppercase', letterSpacing: '2px', margin: 0 }}>Initialize New Pact</h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginTop: '5px' }}>Funds will be vaulted in the Soroban Escrow Smart Contract</p>
          </div>
          <Shield size={24} color="var(--primary)" />
        </div>
        
        <form onSubmit={handlePostJob} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="input-group">
            <label style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '1px' }}>Project Designation</label>
            <input 
              type="text" 
              required
              value={newJob.title}
              onChange={(e) => setNewJob({...newJob, title: e.target.value})}
              placeholder="e.g. Network Upgrade Phase 1" 
              style={{ width: '100%', background: 'var(--bg-section)', border: '1px solid var(--border-ghost)', padding: '16px', color: 'var(--text-main)', marginTop: '5px', outline: 'none', fontSize: '1.05rem' }} 
            />
          </div>

          <div className="input-group">
            <label style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '1px' }}>Technical Requirements & Scope</label>
            <textarea 
              required
              value={newJob.description}
              onChange={(e) => setNewJob({...newJob, description: e.target.value})}
              placeholder="Provide exhaustive technical specifications..." 
              style={{ width: '100%', background: 'var(--bg-section)', border: '1px solid var(--border-ghost)', padding: '16px', color: 'var(--text-main)', marginTop: '5px', minHeight: '100px', outline: 'none', resize: 'none', fontSize: '1.05rem' }} 
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div className="input-group">
              <label style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '1px' }}>Execution Deadline</label>
              <input 
                type="date" 
                required
                value={newJob.deadline}
                onChange={(e) => setNewJob({...newJob, deadline: e.target.value})}
                style={{ width: '100%', background: 'var(--bg-section)', border: '1px solid var(--border-ghost)', padding: '16px', color: 'var(--text-main)', marginTop: '5px', outline: 'none' }} 
              />
            </div>
            <div className="input-group">
              <label style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                XLM Bounty 
                <span style={{ marginLeft: '8px', color: numericBalance < Number(newJob.budget) + 1 ? '#ff4444' : 'var(--primary)' }}>
                  [{balance} Available]
                </span>
              </label>
              <input 
                type="number" 
                required
                value={newJob.budget}
                onChange={(e) => setNewJob({...newJob, budget: e.target.value})}
                placeholder="0.00" 
                style={{ width: '100%', background: 'var(--bg-section)', border: '1px solid var(--border-ghost)', padding: '16px', color: 'var(--text-main)', marginTop: '5px', outline: 'none' }} 
              />
            </div>
          </div>

          <div className="input-group">
            <label style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '1px' }}>Required Technical Stack</label>
            <input 
              type="text" 
              required
              value={newJob.skills}
              onChange={(e) => setNewJob({...newJob, skills: e.target.value})}
              placeholder="e.g. Rust, C++, Soroban, Web3.js" 
              style={{ width: '100%', background: 'var(--bg-section)', border: '1px solid var(--border-ghost)', padding: '16px', color: 'var(--text-main)', marginTop: '5px', outline: 'none', fontSize: '1.05rem' }} 
            />
          </div>

          <div style={{ background: 'rgba(255, 107, 0, 0.02)', border: '1px solid rgba(255, 107, 0, 0.1)', padding: '19px', borderRadius: '4px' }}>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', margin: 0, lineHeight: '1.4' }}>
              ℹ️ <strong>Note:</strong> Upon initialization, the specified bounty will be transferred to the 
              Escrow Smart Contract. Funds are only released upon your final approval or system resolution.
            </p>
          </div>

          <button type="submit" className="btn-luxury" disabled={isPosting} style={{ padding: '19px', fontSize: '1rem', letterSpacing: '2px' }}>
            {isPosting ? 'TRANSMITTING TO CHAIN...' : 'DEPLOY SMART CONTRACT ESCROW'}
          </button>
        </form>
      </div>
    </div>
  );

  const renderActiveJobs = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <h2 style={{ fontSize: '1.2rem', textTransform: 'uppercase', letterSpacing: '2px', margin: 0, display: 'flex', alignItems: 'center', gap: '15px' }}>
          <Briefcase size={20} color="var(--primary)" />
          Active Mission Pacts
        </h2>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '1px' }}>
          Total Active: {jobs.filter(j => j.status !== 'COMPLETED' && j.status !== 'DISPUTED' && j.status !== 'CANCELLED').length}
        </div>
      </div>

      {jobs.filter(j => j.status !== 'COMPLETED' && j.status !== 'DISPUTED' && j.status !== 'CANCELLED').length === 0 ? (
        <div className="cyber-card" style={{ padding: '60px', textAlign: 'center', border: '1px dashed var(--border-ghost)' }}>
          <Globe size={40} color="var(--text-dim)" style={{ marginBottom: '20px', opacity: 0.3 }} />
          <div style={{ color: 'var(--text-dim)', fontSize: '1rem', letterSpacing: '1px' }}>NO ACTIVE PACTS DETECTED IN THE REGISTRY</div>
          <button onClick={() => setActiveTab('post')} className="btn-outline" style={{ marginTop: '20px', padding: '8px 20px', fontSize: '0.8rem' }}>INITIALIZE NEW PACT</button>
        </div>
      ) : (
        jobs.filter(j => j.status !== 'COMPLETED' && j.status !== 'DISPUTED' && j.status !== 'CANCELLED').map((job) => (
          <div key={job.id} className="cyber-card" style={{ 
            padding: '0', 
            border: job.status === 'ACTIVE' ? '1px solid rgba(0, 255, 136, 0.2)' : '1px solid rgba(255, 107, 0, 0.1)',
            background: 'linear-gradient(180deg, rgba(20,20,25,0.8) 0%, rgba(10,10,15,0.9) 100%)'
          }}>
            {/* Header Section */}
            <div style={{ 
              padding: '20px 30px', 
              borderBottom: '1px solid rgba(255,255,255,0.05)', 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              background: job.status === 'ACTIVE' ? 'rgba(0, 255, 136, 0.03)' : 'rgba(255, 107, 0, 0.02)'
            }}>
              <div style={{ flex: 1, cursor: 'pointer' }} onClick={() => setSelectedJobId(job.id)}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '17px' }}>
                  <h3 style={{ fontSize: '1.2rem', margin: 0, fontWeight: '800', color: 'var(--text-main)', letterSpacing: '0.5px' }}>{job.title}</h3>
                  <div style={{ 
                    padding: '3px 12px', 
                    fontSize: '0.75rem', 
                    background: job.status === 'ACTIVE' ? 'rgba(0, 255, 136, 0.1)' : 'rgba(255, 107, 0, 0.1)',
                    color: job.status === 'ACTIVE' ? '#00ff88' : 'var(--primary)',
                    border: `1px solid ${job.status === 'ACTIVE' ? 'rgba(0, 255, 136, 0.3)' : 'rgba(255, 107, 0, 0.3)'}`,
                    textTransform: 'uppercase',
                    letterSpacing: '1.5px',
                    fontWeight: '900',
                    borderRadius: '2px'
                  }}>
                    {job.status}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '20px', marginTop: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '11px', fontSize: '0.85rem', color: 'var(--text-dim)' }}>
                    <Shield size={14} color="var(--primary)" />
                    <span>ID: <span style={{ color: 'var(--text-main)', fontFamily: 'monospace' }}>{job.onChainId}</span></span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '11px', fontSize: '0.85rem', color: 'var(--text-dim)' }}>
                    <DollarSign size={14} color="#00ff88" />
                    <span>BOUNTY: <span style={{ color: '#00ff88', fontWeight: 'bold' }}>{job.budget} XLM</span></span>
                  </div>
                  {job.deadline && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '11px', fontSize: '0.85rem', color: 'var(--text-dim)' }}>
                      <Clock size={14} color="var(--primary)" />
                      <span>DEADLINE: <span style={{ color: 'var(--text-main)' }}>{job.deadline}</span></span>
                    </div>
                  )}
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                {job.status === 'OPEN' && (
                  <button 
                    onClick={() => handleWithdrawJob(job.id, job.onChainId)}
                    style={{ 
                      background: 'rgba(255, 68, 68, 0.05)', 
                      border: '1px solid rgba(255, 68, 68, 0.2)', 
                      color: '#ff4444', 
                      padding: '12px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.2s ease'
                    }}
                    title="Withdraw Mission"
                    onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(255, 68, 68, 0.1)'; e.currentTarget.style.borderColor = '#ff4444'; }}
                    onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(255, 68, 68, 0.05)'; e.currentTarget.style.borderColor = 'rgba(255, 68, 68, 0.2)'; }}
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </div>

            {/* Body Content */}
            <div style={{ padding: '30px' }}>
              {job.status === 'OPEN' ? (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '17px', marginBottom: '25px' }}>
                    <Users size={18} color="var(--primary)" />
                    <span style={{ fontSize: '1rem', fontWeight: '900', letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--primary)' }}>Candidate Registry</span>
                    <div style={{ flex: 1, height: '1px', background: 'linear-gradient(90deg, rgba(255, 107, 0, 0.2), transparent)' }}></div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {applications.filter(a => a.jobId === job.id).length > 0 ? (
                      applications.filter(a => a.jobId === job.id).map((app, i) => (
                        <div key={i} style={{ 
                          padding: '25px', 
                          background: 'rgba(255,255,255,0.02)', 
                          border: '1px solid rgba(255,255,255,0.05)',
                          position: 'relative',
                          overflow: 'hidden'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative', zIndex: 2 }}>
                            <div style={{ display: 'flex', gap: '25px' }}>
                              <div style={{ position: 'relative' }}>
                                  <img 
                                    src={app.workerImage || `https://api.dicebear.com/7.x/identicon/svg?seed=${app.workerAddress}`} 
                                    alt="Worker" 
                                    style={{ width: '45px', height: '45px', borderRadius: '4px', border: '1px solid var(--border-ghost)', objectFit: 'cover', background: 'var(--bg-section)' }} 
                                  />
                                <div style={{ 
                                  position: 'absolute', 
                                  bottom: '-4px', 
                                  right: '-4px', 
                                  background: 'var(--primary)', 
                                  width: '16px', 
                                  height: '16px', 
                                  borderRadius: '50%', 
                                  display: 'flex', 
                                  alignItems: 'center', 
                                  justifyContent: 'center',
                                  border: '2px solid #000',
                                  boxShadow: '0 0 5px rgba(255, 107, 0, 0.4)'
                                }}>
                                  <Shield size={8} color="#000" />
                                </div>
                              </div>
                              <div>
                                <div style={{ fontSize: '1rem', fontWeight: '900', color: 'var(--text-main)', textTransform: 'uppercase' }}>{app.workerName || 'Anonymous Executor'}</div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--primary)', fontFamily: 'monospace', marginTop: '2px', letterSpacing: '0.5px' }}>{app.workerAddress.slice(0, 20)}...</div>
                                
                                <div style={{ display: 'flex', gap: '15px', marginTop: '8px' }}>
                                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                    <span style={{ fontSize: '0.65rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Exp:</span>
                                    <span style={{ fontSize: '0.8rem', color: 'var(--text-main)', fontWeight: 'bold' }}>{app.workerExperience || 0}y</span>
                                  </div>
                                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                    <span style={{ fontSize: '0.65rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Role:</span>
                                    <span style={{ fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 'bold' }}>{app.workerSkills || 'Generalist'}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                            
                            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                              {app.workerResume && (
                                <a 
                                  href={app.workerResume} 
                                  target="_blank" 
                                  rel="noreferrer" 
                                  style={{ 
                                    fontSize: '0.7rem', 
                                    color: '#00d4ff', 
                                    textDecoration: 'none', 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    gap: '6px',
                                    fontWeight: 'bold',
                                    letterSpacing: '1px',
                                    background: 'rgba(0, 212, 255, 0.05)',
                                    padding: '4px 10px',
                                    border: '1px solid rgba(0, 212, 255, 0.2)',
                                    borderRadius: '2px'
                                  }}
                                >
                                  DOSSIER <ExternalLink size={10} />
                                </a>
                              )}
                              <button 
                                className="btn-luxury" 
                                style={{ padding: '8px 20px', fontSize: '0.8rem', letterSpacing: '1px' }}
                                onClick={() => handleAssignWorker(job.id, job.onChainId, app.workerAddress)}
                              >
                                APPROVE
                              </button>
                            </div>
                          </div>
                          
                          {app.workerBio && (
                            <div style={{ 
                              marginTop: '12px', 
                              padding: '10px 15px', 
                              background: 'rgba(0,0,0,0.2)', 
                              borderLeft: '2px solid var(--primary)', 
                              fontSize: '0.85rem', 
                              color: 'rgba(255,255,255,0.6)', 
                              lineHeight: '1.4',
                              fontStyle: 'italic'
                            }}>
                              {app.workerBio.length > 150 ? app.workerBio.slice(0, 150) + '...' : app.workerBio}
                            </div>
                          )}
                        </div>
                      ))
                    ) : (
                      <div style={{ padding: '60px', textAlign: 'center', background: 'rgba(0,0,0,0.2)', border: '1px dashed rgba(255,255,255,0.05)', borderRadius: '4px' }}>
                        <div style={{ display: 'inline-block', padding: '19px', borderRadius: '50%', background: 'rgba(255, 107, 0, 0.02)', marginBottom: '15px' }}>
                          <Clock size={32} color="var(--primary)" style={{ opacity: 0.3 }} />
                        </div>
                        <div style={{ fontSize: '1rem', color: 'var(--text-dim)', letterSpacing: '2px', textTransform: 'uppercase' }}>Scanning Network for Candidates...</div>
                        <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.2)', marginTop: '8px' }}>Pact Signal is active on the global grid.</div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
                  <div style={{ background: 'rgba(0,0,0,0.3)', padding: '25px', border: '1px solid rgba(255,255,255,0.05)', borderLeft: '4px solid #00ff88' }}>
                    <div style={{ fontSize: '0.9rem', color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '15px', letterSpacing: '1.5px', fontWeight: 'bold' }}>Assigned Executor</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                      <div style={{ position: 'relative' }}>
                        <img 
                          src={`https://api.dicebear.com/7.x/identicon/svg?seed=${job.workerAddress}`} 
                          alt="Worker" 
                          style={{ width: '50px', height: '50px', borderRadius: '4px', border: '1px solid rgba(0, 255, 136, 0.4)', background: 'var(--bg-section)' }} 
                        />
                        <div style={{ position: 'absolute', top: '-5px', right: '-5px', background: '#00ff88', width: '12px', height: '12px', borderRadius: '50%', border: '2px solid #000' }}></div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.9rem', color: 'var(--text-main)', fontFamily: 'monospace', fontWeight: 'bold' }}>{job.workerAddress}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px' }}>
                          <Globe size={10} color="#00ff88" />
                          <span style={{ fontSize: '0.8rem', color: '#00ff88', textTransform: 'uppercase', fontWeight: '900', letterSpacing: '0.5px' }}>Link Active</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div style={{ background: 'rgba(0,0,0,0.3)', padding: '25px', border: '1px solid rgba(255,255,255,0.05)', borderLeft: job.githubHash ? '4px solid #00ff88' : '4px solid #ff4444' }}>
                    <div style={{ fontSize: '0.9rem', color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '15px', letterSpacing: '1.5px', fontWeight: 'bold' }}>Transmission Status</div>
                    <div style={{ 
                      padding: '19px', 
                      background: job.githubHash ? 'rgba(0, 255, 136, 0.05)' : 'rgba(255, 68, 68, 0.05)', 
                      border: `1px solid ${job.githubHash ? 'rgba(0, 255, 136, 0.2)' : 'rgba(255, 68, 68, 0.2)'}`,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '13px' }}>
                          {job.githubHash ? <CheckCircle size={14} color="#00ff88" /> : <AlertCircle size={14} color="#ff4444" />}
                          <div style={{ fontSize: '1rem', color: job.githubHash ? '#00ff88' : '#ff4444', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1px' }}>
                            {job.githubHash ? 'Evidence Received' : 'Awaiting Signal'}
                          </div>
                        </div>
                        {job.githubHash && (
                          <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace', marginTop: '6px', background: 'rgba(0,0,0,0.3)', padding: '4px 8px' }}>
                            HASH: {job.githubHash.slice(0, 20)}...
                          </div>
                        )}
                      </div>
                      
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '13px' }}>
                        {job.githubHash && job.status === 'ACTIVE' && (
                          <button 
                            className="btn-luxury" 
                            style={{ padding: '8px 20px', fontSize: '0.9rem', background: '#00ff88', color: '#000', boxShadow: '0 0 20px rgba(0, 255, 136, 0.4)', fontWeight: '900', border: 'none' }}
                            onClick={() => handleReleasePayment(job.id, job.onChainId)}
                          >
                            RELEASE FUNDS
                          </button>
                        )}
                        {job.status === 'ACTIVE' && (
                          <button
                            style={{ padding: '6px 14px', background: 'rgba(255,68,68,0.08)', border: '1px solid rgba(255,68,68,0.3)', color: '#ff4444', cursor: 'pointer', fontSize: '0.8rem', textTransform: 'uppercase', fontWeight: '900', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: '11px' }}
                            onClick={() => setDisputeModal({ job })}
                            onMouseOver={e => { e.currentTarget.style.background='rgba(255,68,68,0.18)'; }}
                            onMouseOut={e => { e.currentTarget.style.background='rgba(255,68,68,0.08)'; }}
                          >
                            <AlertTriangle size={12} /> RAISE CONFLICT
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            {/* Decoration Bar */}
            <div style={{ height: '3px', background: 'rgba(255,255,255,0.05)', position: 'relative' }}>
               <div style={{ 
                 position: 'absolute', 
                 left: 0, 
                 top: 0, 
                 height: '100%', 
                 width: job.status === 'ACTIVE' ? (job.githubHash ? '100%' : '50%') : '15%', 
                 background: job.status === 'ACTIVE' ? (job.githubHash ? '#00ff88' : '#00ff8888') : 'var(--primary)',
                 boxShadow: `0 0 10px ${job.status === 'ACTIVE' ? '#00ff88' : 'var(--primary)'}`,
                 transition: 'width 1.5s cubic-bezier(0.4, 0, 0.2, 1)'
               }}></div>
            </div>
          </div>
        ))
      )}
    </div>
  );

  const renderDisputes = () => {
    const disputed = jobs.filter(j => j.status === 'DISPUTED');
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '1.2rem', textTransform: 'uppercase', letterSpacing: '2px', margin: 0, display: 'flex', alignItems: 'center', gap: '15px' }}>
            <AlertTriangle size={20} color="#ff4444" /> Active Disputes
          </h2>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '1px' }}>
            {disputed.length} Conflict{disputed.length !== 1 ? 's' : ''} Under Review
          </div>
        </div>
        {disputed.length > 0 ? disputed.map((job) => (
          <div key={job.id} className="cyber-card" style={{ padding: '0', borderLeft: '4px solid #ff4444', background: 'linear-gradient(180deg,rgba(25,10,10,0.9) 0%,rgba(10,10,15,0.95) 100%)' }}>
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
                <div style={{ fontSize: '0.8rem', color: '#ff4444', textTransform: 'uppercase', fontWeight: '900', marginBottom: '12px', letterSpacing: '1px' }}>Dispute Reason</div>
                <div style={{ fontSize: '1rem', color: 'var(--text-dim)', lineHeight: '1.6' }}>{job.disputeReason || 'No reason provided.'}</div>
                <div style={{ marginTop: '10px', fontSize: '0.8rem', color: 'rgba(255,255,255,0.3)' }}>Raised by: {job.disputeRaisedByRole === 'worker' ? '⚙ Worker' : '🏢 Company'}</div>
              </div>
              <div style={{ background: 'rgba(0,0,0,0.3)', padding: '20px', borderLeft: '3px solid rgba(255,255,255,0.1)' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: '900', marginBottom: '12px', letterSpacing: '1px' }}>Worker Evidence</div>
                {job.githubHash ? <a href={`https://github.com/commit/${job.githubHash}`} target="_blank" rel="noreferrer" style={{ fontFamily: 'monospace', fontSize: '0.9rem', color: '#00ff88', background: 'rgba(0,0,0,0.4)', padding: '12px', wordBreak: 'break-all', display: 'block', textDecoration: 'none' }}>{job.githubHash}</a> : <div style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.2)', fontStyle: 'italic' }}>No evidence submitted.</div>}
                {job.docLink && <a href={job.docLink} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '11px', marginTop: '10px', fontSize: '0.85rem', color: '#00d4ff', textDecoration: 'none' }}><ExternalLink size={12} /> View Documentation</a>}
              </div>
            </div>
            <div style={{ padding: '15px 30px', background: 'rgba(255,68,68,0.04)', borderTop: '1px solid rgba(255,68,68,0.1)', display: 'flex', alignItems: 'center', gap: '15px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ff4444', boxShadow: '0 0 10px #ff4444' }}></div>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>Under administrative review — Admin will execute a fair payout split on-chain. Funds are secure in EscrowVault.</span>
            </div>
          </div>
        )) : (
          <div className="cyber-card" style={{ padding: '60px', textAlign: 'center' }}>
            <CheckCircle size={40} color="#00ff88" style={{ marginBottom: '15px', opacity: 0.3 }} />
            <div style={{ color: 'var(--text-dim)', fontSize: '1.05rem' }}>NO ACTIVE CONFLICTS DETECTED IN THE SYSTEM</div>
          </div>
        )}
      </div>
    );
  };

  const renderDashboard = () => (
    <div style={{ padding: '19px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
        <div>
          <h1 style={{ fontSize: '2.4rem', fontFamily: "'Satisfy', cursive", margin: 0, background: 'linear-gradient(to right, #fff, var(--primary))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Hello, {companyData?.name || 'Partner'}</h1>
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
              {repInfo.currentTier.label} Partner
            </div>
            <span style={{ fontSize: '0.9rem', color: 'var(--text-main)', fontWeight: 'bold', fontFamily: 'monospace' }}>RPT SCORE: {stats.rpt || 0}</span>
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
              {showRepTiers ? 'HIDE REQUIREMENTS' : 'VIEW ALL REQUIREMENTS'}
            </span>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>{repInfo.nextTier ? `${repInfo.nextTier.minRpt - (stats.rpt || 0)} RPT to next tier` : 'Grandmaster Rank'}</span>
          </div>
        </div>

        <div className="cyber-card" style={{ padding: '20px', background: 'linear-gradient(135deg, rgba(0,212,255,0.05) 0%, rgba(0,0,0,0) 100%)', border: '1px solid rgba(0,212,255,0.1)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: '#00d4ff', textTransform: 'uppercase', marginBottom: '2px' }}>RPT Token Balance</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: 'var(--text-main)' }}>{stats.rpt || 0} <span style={{ fontSize: '0.9rem', color: '#00d4ff' }}>Tokens</span></div>
            </div>
            <TrendingUp size={20} color="#00d4ff" />
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' }}>
        <div className="cyber-card" style={{ padding: '19px', background: 'rgba(255,255,255,0.01)' }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Pacts Vaulted</div>
          <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--primary)', marginTop: '5px' }}>{stats.escrowed} <span style={{ fontSize: '0.8rem' }}>XLM</span></div>
        </div>
        <div className="cyber-card" style={{ padding: '19px', background: 'rgba(255,255,255,0.01)' }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Total Payouts</div>
          <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#00ff88', marginTop: '5px' }}>{stats.payouts} <span style={{ fontSize: '0.8rem' }}>XLM</span></div>
        </div>
        <div className="cyber-card" style={{ padding: '19px', background: 'rgba(255,255,255,0.01)' }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Active Jobs</div>
          <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--text-main)', marginTop: '5px' }}>{stats.active}</div>
        </div>
        <div className="cyber-card" style={{ padding: '19px', background: 'rgba(255,68,68,0.02)', border: '1px solid rgba(255,68,68,0.1)' }}>
          <div style={{ fontSize: '0.7rem', color: '#ff4444', textTransform: 'uppercase' }}>Disputes</div>
          <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#ff4444', marginTop: '5px' }}>{stats.disputed}</div>
        </div>
      </div>

      {showRepTiers && (
        <div className="cyber-card" style={{ marginTop: '20px', padding: '25px', border: '1px solid var(--border-ghost)', background: 'rgba(0,0,0,0.3)' }}>
          <h3 style={{ fontSize: '1rem', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '20px', color: 'var(--primary)' }}>Trust Hierarchy (Partners)</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '20px' }}>
            {TIERS.map(tier => (
              <div key={tier.level} style={{ 
                padding: '19px', 
                background: 'rgba(255,255,255,0.02)', 
                border: `1px solid ${(stats.rpt || 0) >= tier.minRpt ? tier.color : 'rgba(255,255,255,0.05)'}`,
                opacity: (stats.rpt || 0) >= tier.minRpt ? 1 : 0.4,
                position: 'relative',
                overflow: 'hidden'
              }}>
                {(stats.rpt || 0) >= tier.minRpt && <div style={{ position: 'absolute', top: '-10px', right: '-10px', background: tier.color, padding: '19px', transform: 'rotate(45deg)', fontSize: '0.6rem', fontWeight: 'bold', color: '#000' }}>VERIFIED</div>}
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

  const renderSettings = () => (
    <div style={{ padding: '19px' }}>
      <div className="cyber-card" style={{ padding: '25px', maxWidth: '800px', margin: '0 auto' }}>
        <h2 style={{ fontSize: '1.2rem', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '20px', borderBottom: '1px solid var(--border-ghost)', paddingBottom: '10px' }}>Company Configuration</h2>
        <form onSubmit={handleUpdateProfile} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '17px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', background: 'rgba(255,255,255,0.02)', padding: '19px', borderRadius: '8px' }}>
              <img 
                src={companyData?.profilePhoto || `https://api.dicebear.com/7.x/identicon/svg?seed=${publicKey}`} 
                alt="Profile" 
                style={{ width: '60px', height: '60px', borderRadius: '12px', border: '2px solid var(--primary)', objectFit: 'cover', flexShrink: 0 }} 
              />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Company Logo / Avatar</div>
                <div style={{ fontSize: '0.8rem', color: '#666', marginTop: '2px' }}>Linked to: {publicKey?.slice(0,12)}...</div>
              </div>
            </div>
            <div className="input-group">
              <label style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Profile Photo / Logo URL</label>
              <input 
                placeholder="https://example.com/logo.png"
                value={companyData?.profilePhoto || ''} 
                onChange={(e) => setCompanyData({...companyData, profilePhoto: e.target.value})}
                style={{ width: '100%', background: 'var(--bg-section)', border: '1px solid var(--border-ghost)', padding: '14px', color: 'var(--text-main)', fontSize: '0.95rem', marginTop: '4px' }} 
              />
            </div>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div className="input-group">
              <label style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Company Name</label>
              <input 
                value={companyData?.name || ''} 
                onChange={(e) => setCompanyData({...companyData, name: e.target.value})}
                style={{ width: '100%', background: 'var(--bg-section)', border: '1px solid var(--border-ghost)', padding: '14px', color: 'var(--text-main)', fontSize: '0.95rem', marginTop: '4px' }} 
              />
            </div>
            <div className="input-group">
              <label style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Industry / Bio</label>
              <input 
                placeholder="Web3 Solutions"
                value={companyData?.bio || companyData?.credibility || ''} 
                onChange={(e) => setCompanyData({...companyData, credibility: e.target.value, bio: e.target.value})}
                style={{ width: '100%', background: 'var(--bg-section)', border: '1px solid var(--border-ghost)', padding: '14px', color: 'var(--text-main)', fontSize: '0.95rem', marginTop: '4px' }} 
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div className="input-group">
              <label style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Mobile Number</label>
              <input 
                placeholder="+1 555 000 0000"
                value={companyData?.mobile || ''} 
                onChange={(e) => setCompanyData({...companyData, mobile: e.target.value})}
                style={{ width: '100%', background: 'var(--bg-section)', border: '1px solid var(--border-ghost)', padding: '14px', color: 'var(--text-main)', fontSize: '0.95rem', marginTop: '4px' }} 
              />
            </div>
            <div className="input-group">
              <label style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Location / Address</label>
              <input 
                placeholder="New York, USA"
                value={companyData?.address || ''} 
                onChange={(e) => setCompanyData({...companyData, address: e.target.value})}
                style={{ width: '100%', background: 'var(--bg-section)', border: '1px solid var(--border-ghost)', padding: '14px', color: 'var(--text-main)', fontSize: '0.95rem', marginTop: '4px' }} 
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div className="input-group">
              <label style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Company Website URL</label>
              <input 
                placeholder="https://yourcompany.com"
                value={companyData?.website || ''} 
                onChange={(e) => setCompanyData({...companyData, website: e.target.value})}
                style={{ width: '100%', background: 'var(--bg-section)', border: '1px solid var(--border-ghost)', padding: '14px', color: 'var(--text-main)', fontSize: '0.95rem', marginTop: '4px' }} 
              />
            </div>
            <div className="input-group">
              <label style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>LinkedIn URL</label>
              <input 
                placeholder="https://linkedin.com/company/..."
                value={companyData?.linkedIn || ''} 
                onChange={(e) => setCompanyData({...companyData, linkedIn: e.target.value})}
                style={{ width: '100%', background: 'var(--bg-section)', border: '1px solid var(--border-ghost)', padding: '14px', color: 'var(--text-main)', fontSize: '0.95rem', marginTop: '4px' }} 
              />
            </div>
          </div>

          <div style={{ padding: '19px', background: 'rgba(255,68,68,0.03)', border: '1px solid rgba(255,68,68,0.1)', borderRadius: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span style={{ fontSize: '0.75rem', color: '#ff4444', textTransform: 'uppercase' }}>Security Access</span>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>Session Active</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '15px' }}>
              <input type="password" placeholder="New Admin Access Key" style={{ width: '100%', background: 'var(--bg-section)', border: '1px solid var(--border-ghost)', padding: '12px', color: 'var(--text-main)', fontSize: '0.9rem' }} />
              <button type="button" className="btn-luxury" style={{ background: 'rgba(255,68,68,0.1)', border: '1px solid #ff4444', color: '#ff4444', fontSize: '0.8rem', padding: '0 15px' }}>Update</button>
            </div>
          </div>

          <button type="submit" disabled={isPosting} className="btn-luxury" style={{ padding: '16px', fontSize: '0.9rem', letterSpacing: '1px' }}>
            {isPosting ? 'SYNCHRONIZING...' : 'UPDATE_COMPANY_NODE'}
          </button>
        </form>
      </div>
    </div>
  );


  const renderHistory = () => {
    const past = jobs.filter(j => j.status === 'COMPLETED');
    return (
      <div style={{ padding: '20px' }}>
        <h2 style={{ fontSize: '1.5rem', textTransform: 'uppercase', marginBottom: '30px', display: 'flex', alignItems: 'center', gap: '15px' }}>
          <History size={22} color="var(--primary)" /> Corporate Pact History
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
                  <div style={{ color: '#00ff88', fontWeight: 'bold' }}>-{job.budget} XLM</div>
                  <div style={{ fontSize: '0.8rem', color: 'rgba(0,255,136,0.5)', textTransform: 'uppercase' }}>Funds Released</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ color: 'var(--text-dim)', textAlign: 'center', padding: '60px' }}>No completed pacts found in corporate records.</div>
        )}
      </div>
    );
  };

  const renderPastDisputes = () => {
    const pastDisputes = jobs.filter(j => j.status === 'COMPLETED' && (j.disputeReason || j.disputeResolvedAt));
    return (
      <div style={{ padding: '20px' }}>
        <h2 style={{ fontSize: '1.5rem', textTransform: 'uppercase', marginBottom: '30px', display: 'flex', alignItems: 'center', gap: '15px' }}>
          <AlertTriangle size={22} color="#ff4444" /> Resolved Corporate Conflicts
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
          <div style={{ color: 'var(--text-dim)', textAlign: 'center', padding: '60px' }}>No resolved corporate conflicts found.</div>
        )}
      </div>
    );
  };

  const renderFaq = () => (
    <div style={{ padding: '20px' }}>
      <h2 style={{ fontSize: '1.5rem', textTransform: 'uppercase', marginBottom: '30px', display: 'flex', alignItems: 'center', gap: '15px' }}>
        <Info size={22} color="var(--primary)" /> FAQ
      </h2>
      <FaqTabContent role="company" />
    </div>
  );


  return (
    <DashboardLayout role="company" activeTab={activeTab} onTabChange={setActiveTab}>
      <div style={{ padding: '20px 0' }}>
        {activeTab === 'dashboard' && renderDashboard()}
        {activeTab === 'post' && renderPostJob()}
        {activeTab === 'active' && renderActiveJobs()}
        {activeTab === 'disputes' && renderDisputes()}
        {activeTab === 'history' && renderHistory()}
        {activeTab === 'past_disputes' && renderPastDisputes()}
        {activeTab === 'redeem' && <RedeemShop role="company" />}
        {activeTab === 'faq' && renderFaq()}
        {activeTab === 'settings' && renderSettings()}
      </div>

      {selectedJobId && (
        <JobDetailsModal 
          jobId={selectedJobId} 
          onClose={() => setSelectedJobId(null)} 
        />
      )}

      {/* Company Dispute Modal */}
      {disputeModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9000, backdropFilter: 'blur(10px)' }}>
          <div style={{ background: '#0d0d0d', border: '1px solid rgba(255,68,68,0.3)', padding: '40px', maxWidth: '560px', width: '90%', position: 'relative' }}>
            <button onClick={() => { setDisputeModal(null); setDisputeReason(''); }} style={{ position: 'absolute', top: '15px', right: '15px', background: 'transparent', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}><X size={20} /></button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '17px', marginBottom: '25px' }}>
              <AlertTriangle size={24} color="#ff4444" />
              <h2 style={{ fontSize: '1.1rem', textTransform: 'uppercase', letterSpacing: '2px', margin: 0 }}>Raise Conflict — Company</h2>
            </div>
            <div style={{ padding: '19px', background: 'rgba(255,68,68,0.05)', border: '1px solid rgba(255,68,68,0.15)', marginBottom: '25px', fontSize: '0.95rem', color: 'var(--text-dim)', lineHeight: '1.6' }}>
              <strong style={{ color: '#ff4444' }}>Pact:</strong> {disputeModal.job.title}<br />
              <strong style={{ color: '#ff4444' }}>Vaulted Bounty:</strong> {disputeModal.job.budget} XLM — funds remain locked until admin resolution.
            </div>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '1px', display: 'block', marginBottom: '8px' }}>Conflict Reason *</label>
              <textarea
                value={disputeReason}
                onChange={e => setDisputeReason(e.target.value)}
                placeholder="Describe why you are disputing. Include the requirements vs. what was delivered..."
                style={{ width: '100%', background: 'var(--bg-section)', border: '1px solid rgba(255,68,68,0.3)', padding: '16px', color: 'var(--text-main)', fontSize: '1rem', minHeight: '120px', resize: 'none', outline: 'none', fontFamily: 'inherit', lineHeight: '1.6' }}
              />
            </div>
            <div style={{ display: 'flex', gap: '20px' }}>
              <button onClick={() => { setDisputeModal(null); setDisputeReason(''); }} style={{ flex: 1, padding: '16px', background: 'transparent', border: '1px solid var(--border-ghost)', color: 'var(--text-dim)', cursor: 'pointer', fontSize: '0.95rem', textTransform: 'uppercase' }}>CANCEL</button>
              <button
                onClick={handleRaiseDispute}
                disabled={isPosting || !disputeReason.trim()}
                style={{ flex: 2, padding: '16px', background: disputeReason.trim() ? 'rgba(255,68,68,0.15)' : 'rgba(255,68,68,0.04)', border: '1px solid #ff4444', color: '#ff4444', cursor: disputeReason.trim() ? 'pointer' : 'not-allowed', fontSize: '0.95rem', textTransform: 'uppercase', fontWeight: '900', letterSpacing: '2px' }}
              >
                {isPosting ? 'TRANSMITTING...' : 'CONFIRM_CONFLICT'}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default DashCompany;
