# PactPay: Manual Implementations & Setup Guide

This document outlines all the external services, smart contracts, and backend logic that must be manually configured or deployed outside of the React frontend.

---

## 1. Soroban Smart Contracts (5 Primary Contracts)

You will need to write in Rust, compile to WASM, and deploy these contracts to the **Stellar Testnet** using the Stellar CLI. Once deployed, their Contract IDs must be saved to the frontend environment variables and Firestore.

1. **Escrow Vault Contract**: 
   - Receives and locks XLM from companies.
   - Handles milestone payouts (95% to worker, 5% to platform treasury).
2. **ProofWork Contract**: 
   - Mints soulbound RPT (Reputation Point Tokens) when milestones are completed.
   - Calculates user reputation tiers (Trusted, Verified Senior, Expert).
   - Handles the legacy snapshot when a wallet is declared "dead".
3. **NFT Marketplace Contract**: 
   - Manages the storefront for status NFTs.
   - Verifies the user has the required RPT balance, burns/deducts the RPTs, and mints the NFT to the user's wallet.
4. **DeadDrop Contract**: 
   - Tracks the `ping()` heartbeat for user wallets.
   - Manages the 14-ledger challenge window.
   - Triggers the Escrow Vault and ProofWork contracts upon expiration.
5. **Registry Contract**: 
   - Handles user and company onboarding.
   - Locks the one-time registration stakes (10,000 XLM for Companies / 1,000 XLM for Workers).
   - Links Stellar wallet addresses to platform roles and permissions.

---

## 2. Firebase / Firestore Setup

You must create a project in the [Firebase Console](https://console.firebase.google.com/) to act as the off-chain database.

### Action Items:
1. **Create Project**: Enable Firestore Database.
2. **Environment Variables**: Extract the config keys (`apiKey`, `authDomain`, `projectId`, etc.) for the React frontend `.env` file.
3. **Database Collections**: Initialize the following top-level collections:
   - `users`: Profiles, roles, wallet addresses, GitHub usernames.
   - `jobs`: Job listings, milestone structures, escrow info, current status.
   - `applications`: Worker proposals and pitches.
   - `milestones`: Commit hashes, approval states.
   - `disputes`: Messaging threads for conflict resolution.
   - `notifications`: State tracking to prevent duplicate EmailJS triggers.
   - `donations`: XLM contributions to the Poverty Relief Fund.
4. **Manual GitHub Verification Flow**: The UI will provide a direct link to the worker's submitted GitHub commit. The company will click this link to review the code manually off-chain and then approve the milestone within the PactPay dashboard.

---

## 3. EmailJS Setup

[EmailJS](https://www.emailjs.com/) is used for transactional email notifications directly from the client/backend.

### Action Items:
1. **Create Account**: Sign up and connect a delivery service (e.g., a Gmail account). Obtain the `Service ID`.
2. **Get Public Key**: Locate your account's `Public Key` for frontend configuration.
3. **Create Email Template**: Build a single dynamic template (or multiple specific ones) using variables like `{{job_title}}`, `{{milestone_name}}`, `{{wallet_address}}`, and `{{message}}`. Obtain the `Template ID`.

**Events to configure triggers for:**
- Registration approvals (Company/Worker)
- Job application lifecycle (Received / Selected)
- Milestone updates (Submitted / Approved / Disputed)
- Admin dispute interventions and final resolutions
- DeadDrop warnings (approaching inactivity threshold)
- DeadDrop execution notices to heirs
- Poverty Relief Fund donation receipts and aid distribution alerts
