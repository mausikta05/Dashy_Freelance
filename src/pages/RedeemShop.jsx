import React, { useState, useEffect } from 'react';
import { Gift, CreditCard, Tag, Sparkles, CheckCircle, X, Search, Clock, ChevronRight } from 'lucide-react';
import { db } from '../firebase';
import { doc, getDoc, updateDoc, arrayUnion, serverTimestamp } from 'firebase/firestore';
import { useWallet } from '../context/WalletContext';

const PROOFWORK_CONTRACT_ID = "CDS6J5XMEGDJPQ4XEKJFJOCHB6NFC732K4SXDPSQHUDQKJAR757I6UZE";

const REDEEMABLES = [
  // Gift Cards (5)
  { id: 'gc_amazon', type: 'Gift Card', brand: 'Amazon', value: '$50 Credit', cost: 281, color: '#FF9900', logo: '/assets/img/company/amazon.png' },
  { id: 'gc_netflix', type: 'Gift Card', brand: 'Netflix', value: '3 Months Sub', cost: 141, color: '#E50914', logo: '/assets/img/company/netflix.png' },
  { id: 'gc_steam', type: 'Gift Card', brand: 'Steam', value: '$30 Wallet', cost: 169, color: '#1b2838', logo: '/assets/img/company/steam.png' },
  { id: 'gc_starbucks', type: 'Gift Card', brand: 'Starbucks', value: '$10 Card', cost: 56, color: '#00704A', logo: '/assets/img/company/starbucks.png' },
  { id: 'gc_uber', type: 'Gift Card', brand: 'Uber', value: '$15 Credit', cost: 85, color: '#000000', logo: '/assets/img/company/uber.png' },
  
  // Vouchers (8)
  { id: 'v_nike', type: 'Voucher', brand: 'Nike', value: '25% Discount', cost: 113, color: '#000000', logo: '/assets/img/company/nike.png' },
  { id: 'v_adidas', type: 'Voucher', brand: 'Adidas', value: '20% Discount', cost: 101, color: '#000000', logo: '/assets/img/company/adidas.png' },
  { id: 'v_hm', type: 'Voucher', brand: 'H&M', value: '$10 Off', cost: 56, color: '#CF1126', logo: '/assets/img/company/hnm.png' },
  { id: 'v_walmart', type: 'Voucher', brand: 'Walmart', value: '$25 Voucher', cost: 169, color: '#0071CE', logo: '/assets/img/company/walmart.png' },
  { id: 'v_bestbuy', type: 'Voucher', brand: 'Best Buy', value: '$50 Voucher', cost: 281, color: '#FFF200', logo: '/assets/img/company/bestbuy.png' },
  { id: 'v_ikea', type: 'Voucher', brand: 'IKEA', value: '$40 Voucher', cost: 225, color: '#0058AB', logo: '/assets/img/company/ikea.png' },
  { id: 'v_sephora', type: 'Voucher', brand: 'Sephora', value: '15% Discount', cost: 113, color: '#000000', logo: '/assets/img/company/sephora.png' },
  { id: 'v_psn', type: 'Voucher', brand: 'PlayStation', value: '$25 Credit', cost: 197, color: '#003087', logo: '/assets/img/company/ps.png' },
];

const generateKey = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const part = () => Array.from({length: 4}, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `PF-${part()}-${part()}-${part()}`;
};

const RedeemShop = ({ role }) => {
  const { publicKey, callContract } = useWallet();
  const [spentRpt, setSpentRpt] = useState(0);
  const [onChainRpt, setOnChainRpt] = useState(0);
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [showInventory, setShowInventory] = useState(false);
  const [successModal, setSuccessModal] = useState(null); // { item, key }

  const collectionName = role === 'company' ? 'companies' : 'users';

  const fetchData = async () => {
    if (!publicKey) return;
    setLoading(true);
    try {
      // Find doc by walletAddress
      const docRef = doc(db, collectionName, publicKey); // Using publicKey as ID if possible, or query
      // Note: In DashWorker/DashCompany, we query collection(db, 'users'), where('walletAddress', '==', publicKey)
      // I'll stick to that logic to be safe
      const { collection, query, where, getDocs } = await import('firebase/firestore');
      const q = query(collection(db, collectionName), where('walletAddress', '==', publicKey));
      const snap = await getDocs(q);
      
      if (!snap.empty) {
        const userDoc = snap.docs[0];
        const data = userDoc.data();
        setSpentRpt(data.spentRpt || 0);
        setInventory(data.inventory || []);
        
        // Fetch live RPT from ProofWork
        try {
          const rptRes = await callContract(PROOFWORK_CONTRACT_ID, 'get_rpt', [publicKey], true);
          const liveRpt = Number(rptRes?.result ?? 0);
          setOnChainRpt(liveRpt);
          
          // Sync back to Firestore if different
          if (liveRpt !== (data.rpt || 0)) {
            await updateDoc(doc(db, collectionName, userDoc.id), { rpt: liveRpt });
          }
        } catch (rptErr) {
          console.warn("Live RPT fetch failed, using cached:", rptErr);
          setOnChainRpt(data.rpt || 0);
        }
      }
    } catch (e) {
      console.error("Redeem fetch error:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [publicKey]);

  const redeemableBalance = onChainRpt - spentRpt;

  const handleRedeem = async (item) => {
    if (redeemableBalance < item.cost) return alert("Insufficient RPT balance.");
    if (!confirm(`Redeem ${item.cost} RPT for ${item.brand} ${item.type}?`)) return;

    setProcessingId(item.id);
    try {
      const { collection, query, where, getDocs } = await import('firebase/firestore');
      const q = query(collection(db, collectionName), where('walletAddress', '==', publicKey));
      const snap = await getDocs(q);
      
      if (!snap.empty) {
        const userDoc = snap.docs[0];
        const activationKey = generateKey();
        const newInventoryItem = {
          ...item,
          key: activationKey,
          redeemedAt: new Date().toISOString()
        };

        await updateDoc(doc(db, collectionName, userDoc.id), {
          spentRpt: (userDoc.data().spentRpt || 0) + item.cost,
          inventory: arrayUnion(newInventoryItem)
        });

        setSpentRpt(prev => prev + item.cost);
        setInventory(prev => [...prev, newInventoryItem]);
        setSuccessModal({ item, key: activationKey });
      }
    } catch (e) {
      console.error(e);
      alert("Redemption failed.");
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div style={{ color: 'var(--text-main)' }}>
      {/* Header Stats */}
      <div style={{ 
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
        marginBottom: '30px', padding: '25px', background: 'rgba(243,243,5,0.03)', 
        border: '1px solid var(--border-ghost)', backdropFilter: 'blur(10px)'
      }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '2px', margin: 0 }}>
            Redeem <span style={{ color: 'var(--primary)' }}>Center</span>
          </h1>
          <p style={{ color: 'var(--text-dim)', fontSize: '0.85rem', marginTop: '5px' }}>
            Exchange your RPT reputation for premium real-world value.
          </p>
        </div>
        
        <div style={{ display: 'flex', gap: '30px' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Available RPT</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--primary)' }}>{redeemableBalance.toLocaleString()}</div>
          </div>
          <div style={{ width: '1px', background: 'var(--border-ghost)' }}></div>
          <button 
            onClick={() => setShowInventory(true)}
            style={{ 
              background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-ghost)', 
              color: 'var(--text-main)', padding: '0 20px', cursor: 'pointer', display: 'flex', 
              alignItems: 'center', gap: '10px', fontSize: '0.85rem', fontWeight: 'bold',
              textTransform: 'uppercase'
            }}
          >
            <Clock size={16} /> My Rewards ({inventory.length})
          </button>
        </div>
      </div>

      {/* Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '20px' }}>
        {REDEEMABLES.map(item => (
          <div key={item.id} className="cyber-card" style={{ 
            padding: 0, position: 'relative', overflow: 'hidden', 
            transition: 'all 0.2s ease-out', cursor: 'default',
            opacity: redeemableBalance < item.cost ? 0.7 : 1,
            border: '1px solid var(--border-ghost)',
            display: 'flex', flexDirection: 'column'
          }}>
            {/* Sticker-Style Brand Header */}
            <div style={{ 
              height: '120px', background: item.color === '#000000' ? '#1a1a1a' : item.color, 
              position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center',
              borderBottom: '1px solid var(--border-ghost)', overflow: 'hidden'
            }}>
              {/* The "Sticker" - solid background for visibility */}
              <div style={{ 
                width: '70px', height: '70px', background: '#fff', 
                borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '10px', boxShadow: '0 4px 15px rgba(0,0,0,0.3)', zIndex: 2
              }}>
                <img 
                  src={item.logo} 
                  alt={item.brand} 
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }} 
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'flex';
                  }}
                />
                <div style={{ 
                  display: 'none', width: '40px', height: '40px', 
                  alignItems: 'center', justifyContent: 'center', 
                  fontSize: '1.2rem', fontWeight: 'bold', zIndex: 2, color: '#000'
                }}>
                  {item.brand[0]}
                </div>
              </div>

              <div style={{ 
                position: 'absolute', top: '10px', right: '10px', 
                fontSize: '0.55rem', color: 'var(--text-main)', textTransform: 'uppercase', 
                letterSpacing: '1px', zIndex: 3, background: 'var(--bg-card)', 
                padding: '2px 6px', borderRadius: '3px', fontWeight: 'bold',
                border: '1px solid rgba(255,255,255,0.1)'
              }}>
                {item.type}
              </div>
            </div>

            <div style={{ padding: '15px', flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
              <div style={{ marginBottom: '15px' }}>
                <div style={{ fontSize: '1.1rem', fontWeight: '900', color: 'var(--text-main)', letterSpacing: '0.5px' }}>{item.value}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 'bold', textTransform: 'uppercase' }}>{item.brand}</div>
              </div>

              <div style={{ 
                marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                paddingTop: '15px', borderTop: '1px solid var(--border-ghost)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Sparkles size={12} color="var(--primary)" />
                  <div>
                    <div style={{ fontSize: '1rem', fontWeight: 'bold', color: 'var(--text-main)', lineHeight: 1 }}>{item.cost}</div>
                    <div style={{ fontSize: '0.55rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>RPT</div>
                  </div>
                </div>
                
                <button 
                  onClick={() => handleRedeem(item)}
                  disabled={processingId === item.id || redeemableBalance < item.cost}
                  style={{ 
                    padding: '8px 14px', fontSize: '0.7rem', 
                    background: redeemableBalance < item.cost ? 'rgba(255,255,255,0.05)' : 'var(--primary)',
                    color: redeemableBalance < item.cost ? 'var(--text-dim)' : '#000',
                    border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer'
                  }}
                >
                  {processingId === item.id ? '...' : 'REDEEM'}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Inventory Modal */}
      {showInventory && (
        <div style={{ 
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', 
          backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', 
          justifyContent: 'center', zIndex: 1000 
        }}>
          <div style={{ 
            width: '90%', maxWidth: '600px', background: 'var(--bg-section)', 
            border: '1px solid var(--border-ghost)', padding: '40px', position: 'relative' 
          }}>
            <button 
              onClick={() => setShowInventory(false)}
              style={{ position: 'absolute', top: '20px', right: '20px', background: 'transparent', border: 'none', color: 'var(--text-main)', cursor: 'pointer' }}
            >
              <X size={24} />
            </button>

            <h2 style={{ fontSize: '1.5rem', fontWeight: '900', textTransform: 'uppercase', marginBottom: '30px' }}>
              My <span style={{ color: 'var(--primary)' }}>Vault</span>
            </h2>

            <div style={{ maxHeight: '400px', overflowY: 'auto', paddingRight: '10px' }}>
              {inventory.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-dim)' }}>
                  No rewards redeemed yet. Complete jobs to earn RPT!
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  {[...inventory].reverse().map((inv, i) => (
                    <div key={i} style={{ 
                      padding: '20px', background: 'rgba(255,255,255,0.03)', 
                      border: '1px solid var(--border-ghost)', display: 'flex', 
                      justifyContent: 'space-between', alignItems: 'center' 
                    }}>
                      <div>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>{inv.brand} • {inv.type}</div>
                        <div style={{ fontSize: '1rem', fontWeight: 'bold' }}>{inv.value}</div>
                        <div style={{ 
                          marginTop: '10px', fontFamily: 'monospace', color: 'var(--primary)', 
                          fontSize: '0.9rem', letterSpacing: '1px', background: 'rgba(0,0,0,0.3)', 
                          padding: '5px 10px', display: 'inline-block' 
                        }}>
                          {inv.key}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.6rem', color: 'rgba(0,255,136,0.5)' }}>REDEEMED</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>{new Date(inv.redeemedAt).toLocaleDateString()}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {successModal && (
        <div style={{ 
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', 
          backdropFilter: 'blur(15px)', display: 'flex', alignItems: 'center', 
          justifyContent: 'center', zIndex: 1100 
        }}>
          <div style={{ textAlign: 'center', maxWidth: '400px', padding: '40px' }}>
            <div style={{ 
              width: '80px', height: '80px', background: '#00ff88', 
              borderRadius: '50%', display: 'flex', alignItems: 'center', 
              justifyContent: 'center', margin: '0 auto 25px', color: '#000',
              boxShadow: '0 0 30px rgba(0,255,136,0.3)'
            }}>
              <CheckCircle size={40} />
            </div>
            <h2 style={{ fontSize: '1.8rem', fontWeight: '900', textTransform: 'uppercase', marginBottom: '10px' }}>Redeemed!</h2>
            <p style={{ color: 'var(--text-dim)', fontSize: '0.95rem', marginBottom: '30px' }}>
              Your {successModal.item.brand} {successModal.item.type} is ready for activation.
            </p>
            
            <div style={{ 
              padding: '20px', background: 'rgba(255,255,255,0.05)', 
              border: '1px dashed var(--primary)', marginBottom: '30px' 
            }}>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '10px' }}>Activation Key</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 'bold', fontFamily: 'monospace', color: 'var(--primary)', letterSpacing: '2px' }}>
                {successModal.key}
              </div>
            </div>

            <button 
              onClick={() => setSuccessModal(null)}
              className="btn-luxury" style={{ padding: '15px 40px' }}
            >
              GOT IT
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default RedeemShop;
