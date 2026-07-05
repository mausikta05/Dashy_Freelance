# ⚖️ Dashy Dispute Resolution System

This document details the architecture, on-chain logic, and administrative procedures for resolving conflicts between Companies and Workers within the Dashy protocol.

## 🏗️ Architecture Overview

The dispute system is a hybrid model where funds are locked trustlessly on the Stellar blockchain, while the resolution is mediated by a Protocol Administrator (Admin).

### On-Chain Components
- **EscrowVault Smart Contract**: Holds the XLM bounty and provides the functions to lock funds during a dispute and release them upon resolution.

### Off-Chain Components
- **Firestore Database**: Stores dispute reasons, evidence metadata, and communication logs.
- **Admin Dashboard**: Provides the interface for the administrator to review evidence and execute the payout split.

---

## 📝 Dispute Lifecycle

1.  **Initialization**: 
    - Either party (Company or Worker) calls `dispute(job_id, caller)`.
    - The contract verifies the caller is a participant and the job is `ACTIVE`.
    - Status transitions to `DISPUTED` (Funds are now un-withdrawable by the company and un-releasable by standard means).
2.  **Evidence Collection**:
    - The Worker's GitHub hash and submission notes are frozen as the primary "Evidence of Work".
    - Both parties can submit additional context/reasons via the Dashy UI (stored in Firestore).
3.  **Mediation**:
    - The Admin reviews the frozen evidence vs. the original mission requirements.
4.  **Resolution**:
    - The Admin executes `resolve_dispute(job_id, worker_pct)`.
    - Funds are split and transferred atomically.
    - Status transitions to `COMPLETED/RESOLVED`.

---

## 🛠️ Contract Modifications Required

While the current `EscrowVault` (v2.5) has basic dispute functions, the following enhancements are recommended for production-grade reliability:

### 1. `EscrowVault` (Contract ID: `CBLV25...`)
- **Add Event Emissions**: Currently, the contract does not emit events for disputes. We should add:
    - `DisputeRaised(job_id, caller)`
    - `DisputeResolved(job_id, worker_payout, company_refund)`
- **Dispute Cooldown**: (Optional) Add a minimum wait time (e.g., 24 hours) before an admin can resolve, allowing parties to settle privately.
- **RPT Adjustment**: Modify `resolve_dispute` to optionally grant a partial RPT (Reputation) score if the worker payout is above a certain threshold (e.g., > 50%).

### 2. `ProofWork` (Contract ID: `CDITPA...`)
- **Penalty Logic**: Implement a `slash_rpt(address, amount)` function that the admin can call if a party is found to be acting in bad faith during a dispute (e.g., submitting fake code or refusing to pay for valid work).

---

## 📋 Action Plan for Implementation

### Phase 1: Smart Contract Updates
- [ ] Update `EscrowVault` source to include `env.events().publish(...)`.
- [ ] Redeploy and update `contracts.md`.

### Phase 2: Frontend Integration
- [ ] **Worker Dashboard**: Add "Dispute Pact" button to the active project card.
- [ ] **Company Dashboard**: Add "Raise Conflict" button.
- [ ] **Admin Dashboard**: Build the "Resolution Slider" UI (0-100% split).

### Phase 3: Data Integrity
- [ ] Create a `disputes` collection in Firestore to track administrative notes and resolution history for auditing purposes.

---

## 🛡️ Security Considerations
- **Admin Multi-Sig**: For high-value bounties, the `Admin` address should ideally be a multi-signature account to prevent a single point of failure/malice.
- **Ledger Verification**: The Admin must always verify the Worker's `githubHash` against the actual repository state before executing a resolution.
