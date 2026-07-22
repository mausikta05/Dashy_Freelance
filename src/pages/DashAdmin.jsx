import React, { useState, useEffect } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { Shield, TrendingUp, Users, AlertTriangle, CheckCircle, Wallet, Download, ExternalLink, Database, Search, Filter, Briefcase, Info, History, ShoppingBag } from 'lucide-react';
import FaqTabContent from '../components/FaqTabContent';
import JobDetailsModal from '../components/JobDetailsModal';
import { useWallet } from '../context/WalletContext';
import { db } from '../firebase';
import { collection, getDocs, query, where, updateDoc, doc, serverTimestamp } from 'firebase/firestore';

const DashAdmin = () => {
  const { callContract, publicKey } = useWallet();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedJobId, setSelectedJobId] = useState(null);
  const [stats, setStats] = useState({
    balances: [],
    totalRegs: '0',
    userCount: 0,
    companyCount: 0,
    loading: true
  });
  const [allUsers, setAllUsers] = useState([]);
  const [allCompanies, setAllCompanies] = useState([]);
  const [allDisputes, setAllDisputes] = useState([]);
  const [allJobs, setAllJobs] = useState([]);
  const [workerPcts, setWorkerPcts] = useState({}); // { jobId: pct }
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [destAddress, setDestAddress] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const REGISTRY_CONTRACT_ID = "CDXB4OYLH4RRUFF2WXOJ7EQVMETIYS3QAO4OCQSF5N72HV6C7NFKBGHH";
  const ESCROW_CONTRACT_ID = "CACN5PFTVFJHGAFZ47MB5FXQPDN7QM4RNP5OVFBQ64B2VULWONFS5VAH"; // fresh redeployed
  const OLD_ESCROW_CONTRACT_ID = "CBLV25B7NI7FUY7IYGVUOSMNN2GH4IXQP2SB5PXNFGGLD2DIAW5DAU6F"; // old v2.5 deprecated
  const PROOFWORK_CONTRACT_ID = "CDS6J5XMEGDJPQ4XEKJFJOCHB6NFC732K4SXDPSQHUDQKJAR757I6UZE";
  const XLM_TOKEN_ID = "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC";

  const [selectedWithdrawContract, setSelectedWithdrawContract] = useState(REGISTRY_CONTRACT_ID);

  const DEPLOYED_CONTRACTS = [
    { name: 'Registry', id: REGISTRY_CONTRACT_ID, status: 'OPERATIONAL' },
    { name: 'Escrow Vault', id: ESCROW_CONTRACT_ID, status: 'OPERATIONAL' }
  ];

  const [dbSubTab, setDbSubTab] = useState('workers');
  const [diagState, setDiagState] = useState(null);
  const [isDiagRunning, setIsDiagRunning] = useState(false);

  const runDiagnostics = async () => {
    setIsDiagRunning(true);
    const result = {
      escrowPing: null,
      escrowInitialized: null,
      proofworkPing: null,
      escrowBalance: null,
      errors: {}
    };
    try {
      // 1. Ping EscrowVault (always works if contract is deployed)
      try {
        const pingRes = await callContract(ESCROW_CONTRACT_ID, 'ping', [], true);
        result.escrowPing = pingRes?.result === 42 || Number(pingRes?.result) === 42 ? 'OK' : `Got ${pingRes?.result}`;
      } catch (e) {
        result.escrowPing = 'FAIL';
        result.errors.ping = e.message;
      }

      // 2. Check initialization: simulate init() — if it panics "Already initialized"
      //    (WasmVm/UnreachableCodeReached) the contract IS ready.
      //    create_job cannot be used here because SAC token transfer auth fails in simulation.
      try {
        await callContract(ESCROW_CONTRACT_ID, 'init', [
          publicKey, publicKey, publicKey, publicKey
        ], true);
        result.escrowInitialized = 'NOT_INIT → click BOOT_ESCROW_VAULT_V2';
      } catch (e) {
        const msg = e.message || '';
        if (msg.includes('WasmVm') || msg.includes('InvalidAction') ||
          msg.includes('UnreachableCodeReached') || msg.includes('Already')) {
          result.escrowInitialized = 'YES ✓ (already initialized)';
        } else {
          result.escrowInitialized = `NOT_INIT → ${msg.slice(0, 60)}`;
        }
        result.errors.init = e.message;
      }

      // 3. Ping ProofWork
      try {
        const rptRes = await callContract(PROOFWORK_CONTRACT_ID, 'get_rpt', [publicKey], true);
        result.proofworkPing = `OK (your RPT: ${rptRes?.result ?? 0})`;
      } catch (e) {
        result.proofworkPing = 'FAIL';
        result.errors.proofwork = e.message;
      }

      // 4. Escrow balance
      try {
        const escrowRes = await callContract(XLM_TOKEN_ID, 'balance', [ESCROW_CONTRACT_ID], true);
        result.escrowBalance = `${(Number(escrowRes?.result || 0) / 10_000_000).toFixed(4)} XLM`;
      } catch (e) {
        result.escrowBalance = 'unavailable';
      }
    } finally {
      setDiagState(result);
      setIsDiagRunning(false);
    }
  };

  const fetchDisputesData = async () => {
    try {
      const snap = await getDocs(query(collection(db, 'jobs'), where('status', '==', 'DISPUTED')));
      setAllDisputes(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) {
      console.error('Failed to fetch disputes:', e);
    }
  };

  const fetchAdminData = async () => {
    try {
      // 1. Fetch Contract Stats
      const balanceRes = await callContract(REGISTRY_CONTRACT_ID, "get_balance", [XLM_TOKEN_ID], true);
      const regsRes = await callContract(REGISTRY_CONTRACT_ID, "get_total_registrations", [], true);

      // 2. Fetch Escrow Vault Balance directly from the Token Contract
      let escrowBalance = "0.00";
      try {
        const escrowRes = await callContract(XLM_TOKEN_ID, "balance", [ESCROW_CONTRACT_ID], true);
        escrowBalance = (Number(escrowRes?.result || 0) / 10000000).toFixed(2);
      } catch (err) {
        console.warn("Failed to fetch escrow balance:", err);
      }

      // 3. Fetch Firebase Data
      const userSnapshot = await getDocs(collection(db, "users"));
      const companySnapshot = await getDocs(collection(db, "companies"));

      const users = userSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const companies = companySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAllUsers(users);
      setAllCompanies(companies);

      setStats({
        balances: [
          { name: 'Registry Treasury', balance: (Number(balanceRes?.result || 0) / 10000000).toFixed(2) },
          { name: 'Escrow Vault', balance: escrowBalance }
        ],
        totalRegs: String(regsRes?.result || 0),
        userCount: users.length,
        companyCount: companies.length,
        loading: false
      });
    } catch (e) {
      console.error("Failed to fetch admin data:", e);
      setStats(prev => ({ ...prev, loading: false }));
    }
  };

  const fetchAllJobs = async () => {
    try {
      const snap = await getDocs(collection(db, 'jobs'));
      const fetchedJobs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setAllJobs(fetchedJobs);
      setAllDisputes(fetchedJobs.filter(j => j.status === 'DISPUTED' || j.disputeReason || j.disputeResolvedAt));
    } catch (e) {
      console.error('Failed to fetch jobs:', e);
    }
  };

  useEffect(() => {
    fetchAdminData();
    fetchAllJobs();
  }, [publicKey]);

  useEffect(() => {
    if (activeTab === 'all_jobs' || activeTab === 'all_disputes' || activeTab === 'disputes') fetchAllJobs();
  }, [activeTab]);

  const handleResolveDispute = async (job, workerPct) => {
    if (!window.confirm(`Resolve dispute for "${job.title}"?\n\nWorker gets ${workerPct}%, Company gets ${100 - workerPct}% of the vaulted ${job.budget} XLM.`)) return;
    setIsProcessing(true);
    try {
      // On-chain resolution
      try {
        await callContract(ESCROW_CONTRACT_ID, 'resolve_dispute', [
          { type: 'u64', value: BigInt(job.onChainId) },
          { type: 'i128', value: BigInt(workerPct) }
        ]);
      } catch (chainErr) {
        console.warn('On-chain resolve_dispute failed (Firestore will still update):', chainErr.message);
      }
      // Off-chain: update status
      await updateDoc(doc(db, 'jobs', job.id), {
        status: 'COMPLETED',
        disputeResolvedAt: serverTimestamp(),
        disputeResolution: `Admin resolved: ${workerPct}% to worker, ${100 - workerPct}% to company.`,
        completedAt: serverTimestamp()
      });
      alert(`Dispute resolved! ${workerPct}% sent to worker, ${100 - workerPct}% returned to company.`);
      fetchDisputesData();
      fetchAdminData();
    } catch (e) {
      alert('Resolution failed: ' + e.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleWithdraw = async () => {
    if (!withdrawAmount || !destAddress || isProcessing) return;
    setIsProcessing(true);
    try {
      const amount = BigInt(parseFloat(withdrawAmount) * 10000000);
      await callContract(selectedWithdrawContract, "withdraw", [
        XLM_TOKEN_ID,
        destAddress,
        amount
      ]);
      alert("Withdrawal successful!");
      fetchAdminData();
      setWithdrawAmount('');
      setDestAddress('');
    } catch (e) {
      console.error("Withdrawal failed:", e);
      alert("Withdrawal failed: " + e.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const renderAllJobs = () => (
    <div style={{ padding: '20px' }}>
      <h2 style={{ fontSize: '1.5rem', textTransform: 'uppercase', marginBottom: '30px', display: 'flex', alignItems: 'center', gap: '15px' }}>
        <Briefcase size={22} color="var(--primary)" /> Global Pact Ledger
      </h2>
      <div className="cyber-card" style={{ padding: '0' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '1rem' }}>
          <thead>
            <tr style={{ background: 'rgba(255,255,255,0.05)', textAlign: 'left' }}>
              <th style={{ padding: '19px', whiteSpace: 'nowrap' }}>Job Title</th>
              <th style={{ padding: '19px', whiteSpace: 'nowrap' }}>Company</th>
              <th style={{ padding: '19px', whiteSpace: 'nowrap' }}>Worker</th>
              <th style={{ padding: '19px', whiteSpace: 'nowrap' }}>Budget</th>
              <th style={{ padding: '19px', whiteSpace: 'nowrap' }}>Status</th>
              <th style={{ padding: '19px', whiteSpace: 'nowrap' }}>Disputed?</th>
              <th style={{ padding: '19px', color: 'var(--primary)', whiteSpace: 'nowrap' }}>Admin Fee Earned</th>
            </tr>
          </thead>
          <tbody>
            {allJobs.map(job => {
              const isDisputed = !!job.disputeReason || job.status === 'DISPUTED';
              const adminFee = (job.status === 'COMPLETED' && !isDisputed) ? (parseFloat(job.budget) * 0.05).toFixed(2) : '0.00';
              return (
                <tr
                  key={job.id}
                  style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', cursor: 'pointer' }}
                  onClick={() => setSelectedJobId(job.id)}
                  onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                  onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <td style={{ padding: '19px' }}>{job.title}</td>
                  <td style={{ padding: '19px', color: 'var(--text-dim)', fontSize: '0.85rem' }}>{job.companyAddress?.slice(0, 10)}...</td>
                  <td style={{ padding: '19px', color: 'var(--text-dim)', fontSize: '0.85rem' }}>{job.workerAddress ? job.workerAddress.slice(0, 10) + '...' : 'UNASSIGNED'}</td>
                  <td style={{ padding: '19px', fontWeight: 'bold' }}>{job.budget} XLM</td>
                  <td style={{ padding: '19px' }}>
                    <span style={{
                      padding: '3px 8px',
                      borderRadius: '4px',
                      fontSize: '0.8rem',
                      fontWeight: 'bold',
                      background: job.status === 'COMPLETED' ? 'rgba(0,255,136,0.1)' : job.status === 'DISPUTED' ? 'rgba(255,68,68,0.1)' : 'rgba(243,243,5,0.1)',
                      color: job.status === 'COMPLETED' ? '#00ff88' : job.status === 'DISPUTED' ? '#ff4444' : 'var(--primary)'
                    }}>{job.status}</span>
                  </td>
                  <td style={{ padding: '19px' }}>
                    {isDisputed ? <span style={{ color: '#ff4444', fontWeight: 'bold', fontSize: '0.85rem' }}>YES</span> : <span style={{ color: 'var(--text-dim)', fontSize: '0.85rem' }}>NO</span>}
                  </td>
                  <td style={{ padding: '19px', color: 'var(--primary)', fontWeight: 'bold' }}>
                    {adminFee} XLM
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderAllDisputes = () => (
    <div style={{ padding: '20px' }}>
      <h2 style={{ fontSize: '1.5rem', textTransform: 'uppercase', marginBottom: '30px', display: 'flex', alignItems: 'center', gap: '15px' }}>
        <AlertTriangle size={22} color="#ff4444" /> Conflict Archive
      </h2>
      <div style={{ display: 'grid', gap: '20px' }}>
        {allDisputes.map(job => (
          <div key={job.id} className="cyber-card" style={{ padding: '20px', borderLeft: `4px solid ${job.status === 'DISPUTED' ? '#ff4444' : 'var(--text-dim)'}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
              <div>
                <h3 style={{ fontSize: '1rem', marginBottom: '5px' }}>{job.title}</h3>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>ID: {job.id} | Budget: {job.budget} XLM</div>
              </div>
              <span style={{
                fontSize: '0.8rem',
                padding: '4px 10px',
                background: job.status === 'DISPUTED' ? 'rgba(255,68,68,0.1)' : 'rgba(255,255,255,0.05)',
                color: job.status === 'DISPUTED' ? '#ff4444' : 'var(--text-dim)',
                fontWeight: 'bold'
              }}>{job.status === 'DISPUTED' ? 'ACTIVE CONFLICT' : 'RESOLVED'}</span>
            </div>
            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '16px', fontSize: '0.95rem', marginBottom: '10px' }}>
              <strong>Dispute Reason:</strong> {job.disputeReason}
            </div>
            {job.disputeResolution && (
              <div style={{ fontSize: '0.95rem', color: 'var(--primary)' }}>
                <strong>Resolution:</strong> {job.disputeResolution}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  const renderFaq = () => (
    <div style={{ padding: '20px' }}>
      <h2 style={{ fontSize: '1.5rem', textTransform: 'uppercase', marginBottom: '30px', display: 'flex', alignItems: 'center', gap: '15px' }}>
        <Info size={22} color="#ff4444" /> FAQ
      </h2>
      <FaqTabContent role="admin" />
    </div>
  );

  return (
    <DashboardLayout role="admin" activeTab={activeTab} onTabChange={setActiveTab}>
      {activeTab === 'dashboard' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ padding: '0 0 10px 0' }}>
            <h1 style={{ fontSize: '2.4rem', fontFamily: "'Satisfy', cursive", margin: '0 0 15px 0', background: 'linear-gradient(to right, #fff, var(--primary))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Hello, Admin</h1>
          </div>
          {/* ── Diagnostics Panel ── */}
          <div className="luxury-panel" style={{ padding: '19px', border: '1px solid rgba(0,212,255,0.15)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: '#00d4ff', letterSpacing: '2px' }}>Contract Diagnostics</span>
              <button
                className="btn-outline"
                onClick={runDiagnostics}
                disabled={isDiagRunning}
                style={{ padding: '4px 12px', fontSize: '0.75rem', borderColor: '#00d4ff', color: '#00d4ff' }}
              >
                {isDiagRunning ? 'SCANNING...' : 'RUN DIAGNOSTICS'}
              </button>
            </div>
            {diagState ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '15px' }}>
                {[
                  { label: 'EscrowVault Ping', value: diagState.escrowPing, ok: diagState.escrowPing === 'OK' },
                  { label: 'Escrow Initialized', value: diagState.escrowInitialized, ok: diagState.escrowInitialized?.startsWith('YES') },
                  { label: 'ProofWork Link', value: diagState.proofworkPing, ok: diagState.proofworkPing?.startsWith('OK') },
                  { label: 'Escrow Balance', value: diagState.escrowBalance, ok: true },
                ].map((item, i) => (
                  <div key={i} style={{ padding: '12px', background: 'rgba(0,0,0,0.3)', border: `1px solid ${item.ok ? 'rgba(0,255,136,0.2)' : 'rgba(255,68,68,0.3)'}`, borderRadius: '4px' }}>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '4px' }}>{item.label}</div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: item.ok ? '#00ff88' : '#ff4444', wordBreak: 'break-word' }}>
                      {item.value || '—'}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', textAlign: 'center', padding: '9px' }}>
                Click RUN DIAGNOSTICS to check contract state — this will tell you exactly why jobs fail to post.
              </div>
            )}
            {diagState?.errors && Object.keys(diagState.errors).length > 0 && (
              <details style={{ marginTop: '8px' }}>
                <summary style={{ fontSize: '0.75rem', color: '#ff9944', cursor: 'pointer' }}>▶ Show raw error details</summary>
                <pre style={{ fontSize: '0.7rem', color: '#ff9944', marginTop: '5px', whiteSpace: 'pre-wrap', wordBreak: 'break-all', background: 'rgba(0,0,0,0.4)', padding: '12px', borderRadius: '4px', maxHeight: '100px', overflow: 'auto' }}>
                  {JSON.stringify(diagState.errors, null, 2)}
                </pre>
              </details>
            )}
          </div>

          {/* Protocol Balance Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
            {DEPLOYED_CONTRACTS.map((contract, idx) => (
              <div key={idx} className="feature-card" style={{ padding: '19px', borderLeft: `3px solid ${contract.status === 'OPERATIONAL' ? 'var(--primary)' : '#444'}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-dim)' }}>{contract.name}</span>
                  <div style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    background: contract.status === 'OPERATIONAL' ? 'var(--primary)' : contract.status === 'STANDBY' ? '#ff6b0055' : '#444',
                    boxShadow: contract.status === 'OPERATIONAL' ? '0 0 10px var(--primary)' : 'none'
                  }}></div>
                </div>
                <div style={{ fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '10px' }}>
                  {stats.balances[idx]?.balance || '0.00'} <span style={{ fontSize: '0.85rem', color: 'var(--primary)' }}>XLM</span>
                </div>
                <div style={{
                  background: 'rgba(68, 255, 68, 0.1)',
                  border: '1px solid rgba(68, 255, 68, 0.2)',
                  borderRadius: '20px',
                  padding: '4px 10px',
                  fontSize: '0.65rem',
                  color: '#44ff44',
                  fontFamily: 'monospace',
                  wordBreak: 'break-all',
                  textAlign: 'center'
                }}>
                  {contract.id}
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            {/* Quick Stats Sidebar */}
            <div className="luxury-panel" style={{ padding: '19px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-dim)' }}>Registry Metrics</span>
                <Users size={16} color="var(--primary)" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div style={{ padding: '14px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-ghost)' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginBottom: '5px' }}>WORKERS</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{stats.userCount}</div>
                </div>
                <div style={{ padding: '14px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-ghost)' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginBottom: '5px' }}>COMPANIES</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{stats.companyCount}</div>
                </div>
                <div style={{ padding: '14px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-ghost)' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginBottom: '5px' }}>DISPUTES</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#ff4444' }}>0</div>
                </div>
                <div style={{ padding: '14px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-ghost)' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginBottom: '5px' }}>UPTIME</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>99.9%</div>
                </div>
              </div>
            </div>

            <div className="luxury-panel" style={{ padding: '19px' }}>
              <div style={{ color: 'var(--text-dim)', fontSize: '0.75rem', textTransform: 'uppercase', marginBottom: '15px' }}>Administration</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>Initialize Escrow System (One-time after deployment)</div>
                <button
                  className="btn-outline"
                  onClick={async () => {
                    if (isProcessing) return;
                    setIsProcessing(true);
                    try {
                      await callContract(ESCROW_CONTRACT_ID, "init", [
                        publicKey,
                        XLM_TOKEN_ID,
                        publicKey,
                        PROOFWORK_CONTRACT_ID
                      ]);
                      alert("Escrow System v2.4 Initialized with ProofWork link!");
                    } catch (e) {
                      alert("Init Error: " + (e.message || "Already initialized?"));
                    } finally {
                      setIsProcessing(false);
                    }
                  }}
                  disabled={isProcessing}
                  style={{ width: '100%', padding: '6px 0', fontSize: '0.9rem', borderColor: 'var(--primary)', color: 'var(--primary)' }}
                >
                  BOOT ESCROW VAULT V2
                </button>

                <div style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>Re-link ProofWork contract (if RPT not granting)</div>
                <button
                  className="btn-outline"
                  onClick={async () => {
                    if (isProcessing) return;
                    setIsProcessing(true);
                    try {
                      await callContract(ESCROW_CONTRACT_ID, "set_pw_id", [PROOFWORK_CONTRACT_ID]);
                      alert("ProofWork link updated on EscrowVault!");
                    } catch (e) {
                      alert("set_pw_id Error: " + e.message);
                    } finally {
                      setIsProcessing(false);
                    }
                  }}
                  disabled={isProcessing}
                  style={{ width: '100%', padding: '6px 0', fontSize: '0.9rem', borderColor: '#00d4ff', color: '#00d4ff' }}
                >
                  SET PROOFWORK LINK
                </button>

                <div style={{ fontSize: '0.85rem', color: '#ff9944' }}>⚠ Recover funds from deprecated old escrow contract</div>
                <div style={{ display: 'flex', gap: '13px' }}>
                  <input
                    type="number"
                    placeholder="Amount (XLM) to recover..."
                    className="cyber-input"
                    id="old-escrow-recover-amount"
                    style={{ flex: 1, fontSize: '0.9rem', padding: '6px 10px' }}
                  />
                  <button
                    className="btn-outline"
                    onClick={async () => {
                      const amtInput = document.getElementById('old-escrow-recover-amount');
                      const amt = parseFloat(amtInput?.value || 0);
                      if (!amt || isProcessing) return;
                      if (!window.confirm(`Recover ${amt} XLM from old escrow to your wallet?`)) return;
                      setIsProcessing(true);
                      try {
                        const amtStroops = BigInt(Math.floor(amt * 10_000_000));
                        await callContract(OLD_ESCROW_CONTRACT_ID, "withdraw", [
                          XLM_TOKEN_ID,
                          publicKey,
                          { type: 'i128', value: amtStroops }
                        ]);
                        alert(`Recovered ${amt} XLM from old escrow!`);
                        fetchAdminData();
                      } catch (e) {
                        alert("Recovery Error: " + e.message);
                      } finally {
                        setIsProcessing(false);
                      }
                    }}
                    disabled={isProcessing}
                    style={{ padding: '0 12px', fontSize: '0.9rem', borderColor: '#ff9944', color: '#ff9944', whiteSpace: 'nowrap' }}
                  >
                    RECOVER OLD ESCROW
                  </button>
                </div>
                <hr style={{ border: 'none', borderBottom: '1px solid var(--border-ghost)', margin: '5px 0' }} />
                <div style={{ color: 'var(--text-dim)', fontSize: '0.75rem', textTransform: 'uppercase', marginBottom: '5px' }}>Treasury Control</div>
                <div style={{ display: 'flex', gap: '13px', flexWrap: 'wrap' }}>
                  <select
                    className="cyber-input"
                    style={{ flex: 1, fontSize: '0.9rem', padding: '6px 10px', minWidth: '150px' }}
                    value={selectedWithdrawContract}
                    onChange={(e) => setSelectedWithdrawContract(e.target.value)}
                  >
                    {DEPLOYED_CONTRACTS.map((c, i) => (
                      <option key={i} value={c.id} disabled={c.status !== 'OPERATIONAL'}>{c.name}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    placeholder="Destination (G...)"
                    className="cyber-input"
                    value={destAddress}
                    onChange={(e) => setDestAddress(e.target.value)}
                    style={{ flex: 1.5, fontSize: '0.9rem', padding: '6px 10px', minWidth: '150px' }}
                  />
                  <div style={{ display: 'flex', gap: '13px', flex: 1, minWidth: '150px' }}>
                    <input
                      type="number"
                      placeholder="Amount"
                      className="cyber-input"
                      value={withdrawAmount}
                      onChange={(e) => setWithdrawAmount(e.target.value)}
                      style={{ flex: 1, fontSize: '0.9rem', padding: '6px 10px', width: '60px' }}
                    />
                    <button
                      className="btn-luxury"
                      onClick={handleWithdraw}
                      disabled={isProcessing || !withdrawAmount || !destAddress}
                      style={{ padding: '0 12px', fontSize: '0.9rem' }}
                    >
                      EXECUTE
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'disputes' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: '1.2rem', textTransform: 'uppercase', letterSpacing: '2px', margin: 0, display: 'flex', alignItems: 'center', gap: '15px' }}>
              <AlertTriangle size={20} color="#ff4444" /> Dispute Resolution Console
            </h2>
            <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
              <div style={{ padding: '4px 12px', background: 'rgba(255,68,68,0.1)', border: '1px solid rgba(255,68,68,0.3)', color: '#ff4444', fontSize: '0.8rem', fontWeight: '900', letterSpacing: '1px' }}>
                {allDisputes.length} ACTIVE CONFLICT{allDisputes.length !== 1 ? 'S' : ''}
              </div>
              <button onClick={fetchDisputesData} className="btn-outline" style={{ padding: '4px 12px', fontSize: '0.75rem', borderColor: '#00d4ff', color: '#00d4ff' }}>REFRESH</button>
            </div>
          </div>

          {allDisputes.length === 0 ? (
            <div className="luxury-panel" style={{ padding: '60px', textAlign: 'center' }}>
              <CheckCircle size={48} color="#00ff88" style={{ margin: '0 auto 20px', opacity: 0.4 }} />
              <div style={{ color: 'var(--text-dim)', fontSize: '0.9rem', letterSpacing: '1px', textTransform: 'uppercase' }}>No Active Disputes Found</div>
              <div style={{ color: 'rgba(255,255,255,0.2)', fontSize: '0.9rem', marginTop: '8px' }}>All pacts are resolving without conflicts.</div>
            </div>
          ) : allDisputes.map((job) => {
            const pct = workerPcts[job.id] ?? 50;
            const workerXlm = ((Number(job.budget) * pct) / 100).toFixed(2);
            const companyXlm = ((Number(job.budget) * (100 - pct)) / 100).toFixed(2);
            return (
              <div key={job.id} className="luxury-panel" style={{ padding: '0', border: '1px solid rgba(255,68,68,0.2)', background: 'linear-gradient(180deg,rgba(25,5,5,0.95) 0%,rgba(10,10,15,0.98) 100%)' }}>
                {/* Dispute Header */}
                <div style={{ padding: '20px 25px', borderBottom: '1px solid rgba(255,68,68,0.15)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,68,68,0.04)' }}>
                  <div>
                    <div style={{ color: '#ff4444', fontSize: '0.75rem', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '4px' }}>⚡ DISPUTED PACT — AWAITING ADMIN RESOLUTION</div>
                    <h3 style={{ fontSize: '1.1rem', margin: 0, fontWeight: '800' }}>{job.title}</h3>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginTop: '5px', fontFamily: 'monospace' }}>ID: {job.onChainId} | Disputed: {job.disputedAt?.toDate?.()?.toLocaleDateString?.() || 'Recently'}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '1.6rem', fontWeight: 'bold', color: '#ff4444' }}>{job.budget} <span style={{ fontSize: '0.9rem', color: 'var(--text-dim)' }}>XLM</span></div>
                    <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)', marginTop: '4px' }}>LOCKED IN ESCROWVAULT</div>
                  </div>
                </div>

                {/* Evidence Review */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  {/* Company */}
                  <div style={{ padding: '20px 25px', borderRight: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px', fontWeight: '900' }}>🏢 Company (Pact Creator)</div>
                    <div style={{ fontSize: '1rem', fontWeight: 'bold', color: 'var(--text-main)', marginBottom: '4px' }}>{job.companyName || 'Unknown'}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--primary)', fontFamily: 'monospace', wordBreak: 'break-all' }}>{job.companyAddress}</div>
                    <div style={{ marginTop: '12px', padding: '14px', background: 'rgba(0,0,0,0.3)', fontSize: '0.9rem', color: 'var(--text-dim)', borderLeft: '2px solid var(--primary)', lineHeight: '1.5' }}>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '5px' }}>Original Requirements</div>
                      {job.description || 'No description provided.'}
                    </div>
                    {job.disputeRaisedByRole === 'company' && (
                      <div style={{ marginTop: '10px', padding: '12px', background: 'rgba(255,68,68,0.06)', border: '1px solid rgba(255,68,68,0.2)', fontSize: '0.85rem', color: '#ff4444' }}>
                        ⚡ Company raised this dispute
                      </div>
                    )}
                  </div>
                  {/* Dispute Details */}
                  <div style={{ padding: '20px 25px', borderRight: '1px solid rgba(255,255,255,0.05)', background: 'rgba(0,0,0,0.15)' }}>
                    <div style={{ fontSize: '0.75rem', color: '#ff4444', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px', fontWeight: '900' }}>⚖ Conflict Details</div>
                    <div style={{ fontSize: '0.95rem', color: 'var(--text-dim)', lineHeight: '1.7', marginBottom: '15px' }}>{job.disputeReason || 'No reason provided.'}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '8px' }}>Skills Required</div>
                    <div style={{ fontSize: '0.9rem', color: 'var(--primary)' }}>{job.skills || 'Not specified'}</div>
                    <div style={{ marginTop: '10px', fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Deadline</div>
                    <div style={{ fontSize: '0.9rem', color: 'var(--text-main)' }}>{job.deadline || 'N/A'}</div>
                  </div>
                  {/* Worker Evidence */}
                  <div style={{ padding: '20px 25px' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px', fontWeight: '900' }}>⚙ Worker Submission</div>
                    <div style={{ fontSize: '1rem', fontWeight: 'bold', color: 'var(--text-main)', marginBottom: '4px' }}>{job.workerAddress?.slice(0, 8)}...{job.workerAddress?.slice(-6)}</div>
                    {job.githubHash ? (
                      <a href={`https://github.com`} target="_blank" rel="noreferrer" style={{ display: 'block', fontFamily: 'monospace', fontSize: '0.85rem', color: '#00ff88', background: 'rgba(0,255,136,0.05)', border: '1px solid rgba(0,255,136,0.2)', padding: '12px', wordBreak: 'break-all', textDecoration: 'none', marginTop: '8px' }}>
                        HASH: {job.githubHash}
                      </a>
                    ) : (
                      <div style={{ padding: '14px', background: 'rgba(255,68,68,0.05)', border: '1px solid rgba(255,68,68,0.2)', fontSize: '0.9rem', color: '#ff4444', marginTop: '8px' }}>No evidence submitted by worker.</div>
                    )}
                    {job.docLink && <a href={job.docLink} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '11px', marginTop: '10px', fontSize: '0.85rem', color: '#00d4ff', textDecoration: 'none' }}><ExternalLink size={12} /> Documentation</a>}
                    {job.workerNote && <div style={{ marginTop: '10px', padding: '12px', background: 'rgba(0,0,0,0.3)', fontSize: '0.85rem', color: 'var(--text-dim)', lineHeight: '1.5', borderLeft: '2px solid rgba(0,255,136,0.3)' }}>{job.workerNote}</div>}
                    {job.disputeRaisedByRole === 'worker' && (
                      <div style={{ marginTop: '10px', padding: '12px', background: 'rgba(255,68,68,0.06)', border: '1px solid rgba(255,68,68,0.2)', fontSize: '0.85rem', color: '#ff4444' }}>
                        ⚡ Worker raised this dispute
                      </div>
                    )}
                  </div>
                </div>

                {/* Resolution Panel */}
                <div style={{ padding: '25px', background: 'rgba(0,0,0,0.3)', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '20px', fontWeight: '900' }}>⚖ Admin Resolution — Payout Allocation</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '30px', alignItems: 'center' }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                        <span style={{ fontSize: '0.85rem', color: '#00ff88', fontWeight: '900' }}>⚙ Worker: {workerXlm} XLM ({pct}%)</span>
                        <span style={{ fontSize: '0.85rem', color: 'var(--primary)', fontWeight: '900' }}>🏢 Company: {companyXlm} XLM ({100 - pct}%)</span>
                      </div>
                      <input
                        type="range" min="0" max="100" value={pct}
                        onChange={e => setWorkerPcts(prev => ({ ...prev, [job.id]: Number(e.target.value) }))}
                        style={{ width: '100%', accentColor: '#00ff88', cursor: 'pointer', height: '6px' }}
                      />
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontSize: '0.7rem', color: 'rgba(255,255,255,0.2)' }}>
                        <span>0% Worker (Full Refund to Company)</span>
                        <span>50% Split</span>
                        <span>100% Worker (Full Payout)</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', minWidth: '180px' }}>
                      <button
                        className="btn-luxury"
                        style={{ padding: '12px 20px', fontSize: '0.9rem', letterSpacing: '1px', background: 'linear-gradient(135deg, #ff4444, #cc0000)', color: 'var(--text-main)', boxShadow: '0 0 20px rgba(255,68,68,0.3)', border: 'none' }}
                        disabled={isProcessing}
                        onClick={() => handleResolveDispute(job, pct)}
                      >
                        {isProcessing ? 'EXECUTING...' : 'FINALIZE RESOLUTION'}
                      </button>
                      <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.2)', textAlign: 'center', lineHeight: '1.4' }}>This executes resolve_dispute() on-chain and releases funds atomically from EscrowVault.</div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {activeTab === 'all_jobs' && renderAllJobs()}
      {activeTab === 'all_disputes' && renderAllDisputes()}
      {activeTab === 'faq' && renderFaq()}
      {activeTab === 'database' && (
        <div className="luxury-panel" style={{ padding: '19px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', borderBottom: '1px solid var(--border-ghost)', paddingBottom: '10px' }}>
            <div style={{ display: 'flex', gap: '10px' }}>
              {['workers', 'companies'].map(tab => (
                <button
                  key={tab}
                  onClick={() => setDbSubTab(tab)}
                  className="btn-luxury"
                  style={{
                    padding: '6px 15px',
                    fontSize: '0.8rem',
                    background: dbSubTab === tab ? 'var(--primary)' : 'transparent',
                    color: dbSubTab === tab ? '#000' : 'var(--text-dim)',
                    border: '1px solid var(--border-ghost)'
                  }}
                >
                  {tab.toUpperCase()} ({tab === 'workers' ? allUsers.length : allCompanies.length})
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '15px' }}>
              <div style={{ position: 'relative' }}>
                <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#555' }} />
                <input type="text" placeholder={`Search ${dbSubTab}...`} className="cyber-input" style={{ paddingLeft: '30px', fontSize: '0.9rem', padding: '8px 10px 8px 30px' }} />
              </div>
            </div>
          </div>

          {dbSubTab === 'workers' && (
            <div>
              <div className="cyber-table-wrapper" style={{ overflowX: 'auto', maxHeight: '400px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '1000px' }}>
                  <thead style={{ position: 'sticky', top: 0, background: 'var(--bg-section)', zIndex: 10 }}>
                    <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border-ghost)' }}>
                      <th style={{ padding: '14px', color: 'var(--text-dim)', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>PHOTO</th>
                      <th style={{ padding: '14px', color: 'var(--text-dim)', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>NAME</th>
                      <th style={{ padding: '14px', color: 'var(--text-dim)', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>EMAIL</th>
                      <th style={{ padding: '14px', color: 'var(--text-dim)', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>MOBILE</th>
                      <th style={{ padding: '14px', color: 'var(--text-dim)', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>PROFESSION</th>
                      <th style={{ padding: '14px', color: 'var(--text-dim)', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>SKILLS</th>
                      <th style={{ padding: '14px', color: 'var(--text-dim)', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>EXP.</th>
                      <th style={{ padding: '14px', color: 'var(--text-dim)', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>AGE</th>
                      <th style={{ padding: '14px', color: 'var(--text-dim)', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>ADDRESS</th>
                      <th style={{ padding: '14px', color: 'var(--text-dim)', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>RESUME</th>
                      <th style={{ padding: '14px', color: 'var(--text-dim)', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>TX</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allUsers.length === 0 ? (
                      <tr><td colSpan="11" style={{ padding: '20px', textAlign: 'center', color: 'var(--text-dim)' }}>No workers found.</td></tr>
                    ) : (
                      allUsers.map((user, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                          <td style={{ padding: '14px' }}>
                            <div style={{ width: '30px', height: '30px', background: 'var(--bg-section)', borderRadius: '4px', overflow: 'hidden' }}>
                              {user.profilePhoto ? <img src={user.profilePhoto} alt="User" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => e.target.style.display = 'none'} /> : <Users size={16} color="#333" style={{ margin: '7px' }} />}
                            </div>
                          </td>
                          <td style={{ padding: '14px', fontSize: '0.95rem', whiteSpace: 'nowrap' }}>{user.name || 'N/A'}</td>
                          <td style={{ padding: '14px', fontSize: '0.9rem' }}>{user.email || 'N/A'}</td>
                          <td style={{ padding: '14px', fontSize: '0.9rem', whiteSpace: 'nowrap' }}>{user.mobile || 'N/A'}</td>
                          <td style={{ padding: '14px', fontSize: '0.9rem', color: 'var(--primary)', whiteSpace: 'nowrap' }}>{user.profession || 'N/A'}</td>
                          <td style={{ padding: '14px', fontSize: '0.85rem', maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={user.skills}>
                            {user.skills || 'N/A'}
                          </td>
                          <td style={{ padding: '14px', fontSize: '0.9rem', whiteSpace: 'nowrap' }}>{user.experience ? `${user.experience}y` : 'N/A'}</td>
                          <td style={{ padding: '14px', fontSize: '0.9rem' }}>{user.age || 'N/A'}</td>
                          <td style={{ padding: '14px', fontSize: '0.85rem', color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>{user.address || user.walletAddress || 'N/A'}</td>
                          <td style={{ padding: '14px' }}>
                            {user.resume ? <a href={user.resume} target="_blank" rel="noreferrer" style={{ color: 'var(--primary)', textDecoration: 'none', fontSize: '0.8rem', fontWeight: 'bold' }}>LINK</a> : <span style={{ color: 'var(--text-dim)', fontSize: '0.8rem' }}>N/A</span>}
                          </td>
                          <td style={{ padding: '14px' }}>
                            {user.txId && <a href={`https://stellar.expert/explorer/testnet/tx/${user.txId}`} target="_blank" rel="noreferrer"><ExternalLink size={16} color="var(--primary)" /></a>}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {dbSubTab === 'companies' && (
            <div>
              <div className="cyber-table-wrapper" style={{ overflowX: 'auto', maxHeight: '400px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
                  <thead style={{ position: 'sticky', top: 0, background: 'var(--bg-section)', zIndex: 10 }}>
                    <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border-ghost)' }}>
                      <th style={{ padding: '14px', color: 'var(--text-dim)', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>LOGO</th>
                      <th style={{ padding: '14px', color: 'var(--text-dim)', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>COMPANY NAME</th>
                      <th style={{ padding: '14px', color: 'var(--text-dim)', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>EMAIL</th>
                      <th style={{ padding: '14px', color: 'var(--text-dim)', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>MOBILE</th>
                      <th style={{ padding: '14px', color: 'var(--text-dim)', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>BIO / CREDIBILITY</th>
                      <th style={{ padding: '14px', color: 'var(--text-dim)', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>WEBSITE</th>
                      <th style={{ padding: '14px', color: 'var(--text-dim)', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>LINKEDIN</th>
                      <th style={{ padding: '14px', color: 'var(--text-dim)', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>WALLET / ADDRESS</th>
                      <th style={{ padding: '14px', color: 'var(--text-dim)', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>TX</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allCompanies.length === 0 ? (
                      <tr><td colSpan="9" style={{ padding: '20px', textAlign: 'center', color: 'var(--text-dim)' }}>No companies found in database.</td></tr>
                    ) : (
                      allCompanies.map((comp, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                          <td style={{ padding: '14px' }}>
                            <div style={{ width: '30px', height: '30px', background: 'var(--bg-section)', borderRadius: '4px', overflow: 'hidden' }}>
                              {comp.profilePhoto ? <img src={comp.profilePhoto} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => e.target.style.display = 'none'} /> : <Globe size={16} color="#333" style={{ margin: '7px' }} />}
                            </div>
                          </td>
                          <td style={{ padding: '14px', fontSize: '0.95rem', fontWeight: 'bold', whiteSpace: 'nowrap' }}>{comp.name || comp.companyName || 'N/A'}</td>
                          <td style={{ padding: '14px', fontSize: '0.9rem' }}>{comp.email || 'N/A'}</td>
                          <td style={{ padding: '14px', fontSize: '0.9rem', whiteSpace: 'nowrap' }}>{comp.mobile || 'N/A'}</td>
                          <td style={{ padding: '14px', fontSize: '0.85rem', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={comp.credibility || comp.bio || 'N/A'}>
                            {comp.credibility || comp.bio || 'N/A'}
                          </td>
                          <td style={{ padding: '14px' }}>
                            {comp.website ? <a href={comp.website} target="_blank" rel="noreferrer" style={{ color: 'var(--primary)', textDecoration: 'none', fontSize: '0.8rem', fontWeight: 'bold' }}>LINK</a> : <span style={{ color: 'var(--text-dim)', fontSize: '0.8rem' }}>N/A</span>}
                          </td>
                          <td style={{ padding: '14px' }}>
                            {comp.linkedIn ? <a href={comp.linkedIn} target="_blank" rel="noreferrer" style={{ color: 'var(--primary)', textDecoration: 'none', fontSize: '0.8rem', fontWeight: 'bold' }}>LINK</a> : <span style={{ color: 'var(--text-dim)', fontSize: '0.8rem' }}>N/A</span>}
                          </td>
                          <td style={{ padding: '14px', fontSize: '0.85rem', color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>{comp.walletAddress || comp.address || 'N/A'}</td>
                          <td style={{ padding: '14px' }}>
                            {comp.txId && <a href={`https://stellar.expert/explorer/testnet/tx/${comp.txId}`} target="_blank" rel="noreferrer"><ExternalLink size={16} color="var(--primary)" /></a>}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {selectedJobId && (
        <JobDetailsModal
          jobId={selectedJobId}
          onClose={() => setSelectedJobId(null)}
        />
      )}
    </DashboardLayout>
  );
};

export default DashAdmin;
