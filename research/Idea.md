# PactPay Platform — Full Architecture Documentation

---

## 1. Project Overview

PactPay is a decentralized freelance marketplace built on the Stellar blockchain (Soroban smart contracts), combining escrow-based payments, GitHub-verified milestone delivery, soulbound reputation tokens, and a dead-man's switch inheritance system. The platform operates on Stellar Testnet and uses Firebase Firestore as its off-chain database, React + Vite for the frontend, EmailJS for notifications, and the Stellar CLI for contract deployment and interaction.

---

## 2. User Roles & Registration

The platform has three distinct roles, each tied to a unique Stellar wallet address with different on-chain permissions.

A **Company** account pays a one-time registration stake of 10,000 XLM to join the platform. Companies can post jobs, fund escrow vaults, approve or dispute milestone submissions, and view worker reputation profiles. A **Worker** account pays a registration stake of 1,000 XLM. Workers can browse the job board, apply for jobs, submit GitHub commit hashes against milestones, and build their reputation score over time. An **Admin** account is platform-managed and requires no stake. Admins resolve escalated disputes, flag bad actors, pause contracts, and configure oracle parameters. No role can impersonate another on-chain because each role maps to a distinct set of authorized Soroban contract calls verified against the caller's wallet address.

---

## 3. Tech Stack

The frontend is built with **React + Vite**, providing a fast, modular SPA with separate dashboard views for each role. **Firebase Firestore** serves as the off-chain database, storing job listings, user profiles, application records, notification state, dispute threads, and metadata that would be too costly to store entirely on-chain. The blockchain layer uses **Stellar Testnet** with **Soroban smart contracts**, written in Rust and deployed via the **Stellar CLI**. All financial logic — escrow, milestone release, RPT minting, and fee collection — lives in these contracts. **EmailJS** handles transactional email notifications triggered by platform events like job acceptance, milestone approval, and dispute escalation. GitHub verification is handled manually: the UI provides direct links to submitted commits for the company to review before approving milestones.

---

## 4. Financial Flow

**Job Posting** costs 100 XLM from the company's wallet. On top of this, the company deposits the full XLM amount for the job into a Soroban escrow vault at the time of posting. Once a worker accepts and the company approves them, the XLM is locked — the company cannot withdraw it unilaterally for the duration of active engagement.

**Platform Fee**: On every successfully completed and paid milestone, the platform automatically deducts 5% of that milestone's XLM value before releasing the remainder to the worker's Stellar wallet. This fee is collected by the treasury contract address.

**Milestone Release**: When a milestone passes the full verification and approval flow (detailed below), the vault contract executes an atomic transfer — 5% to the platform treasury, 95% to the worker's wallet — with no manual intervention required from either party.

**Poverty Relief Fund Donation**: Companies and workers can voluntarily donate XLM to the community-managed Poverty Relief Fund. These funds are locked in a dedicated Soroban contract and distributed based on governance approvals to participants in distress.

---

## 5. The Job Lifecycle (PactPay Flow)

The lifecycle of a job moves through six clear stages.

First, the company creates a job posting with a title, description, required skills, milestone breakdown, and total USDC amount. Posting costs 500 XLM and locks the USDC into escrow simultaneously. Second, the job appears on the public job board. Workers browse and apply; the company reviews applicants and selects one, triggering an acceptance notification via EmailJS to both parties. Third, work begins. The worker completes a milestone and submits the corresponding GitHub commit hash through the platform UI, which is securely stored in Firestore.

Fourth, the **Manual Verification** phase begins. The platform generates a direct link to the submitted GitHub commit. The company clicks this link to review the code off-chain. Once satisfied, the company returns to the PactPay UI to officially approve the milestone.

Fifth, the **company review and dispute cycle** begins. The company can either approve the milestone (triggering automatic payment) or raise a dispute. A dispute goes back to the worker for remediation. This back-and-forth can occur up to four times. On the fifth unresolved cycle, an **Admin** is automatically assigned to review all submitted evidence, commit history, and dispute messages, and makes a binding on-chain resolution. Throughout the dispute cycle, all messages and submissions are stored in Firestore and both parties receive EmailJS notifications at each step.

Sixth, upon final approval — whether by the company or by Admin resolution — the vault contract releases that milestone's USDC (minus the 5% fee) to the worker's wallet, and one Reputation Point Token (RPT) is minted to both the worker's and the company's Stellar wallets.

---

## 6. Reputation System (ProofWork)

RPTs are **soulbound ERC-like tokens** on Stellar — they cannot be transferred, sold, or gifted. They can only be minted by the ProofWork contract upon successful, verified milestone completion. Because every RPT represents a cryptographically proven piece of work, the score is tamper-proof.

Workers accumulate RPTs over time and unlock reputation tiers computed entirely on-chain by the ProofWork contract: **Trusted** at 10 RPTs, **Verified Senior** at 50 RPTs, and **Expert** at 100 RPTs. These tiers are not assigned by admins — they are derived automatically from the on-chain token count. Any company can look up a worker's Stellar address and see their full verified milestone history, including project type hashes and timestamps.

Companies also earn RPTs for each milestone they pay out, building a reputation signal that demonstrates they post legitimate work and pay reliably — making them more attractive to high-tier workers.

---

## 7. NFT Marketplace

The platform includes an NFT marketplace with a hard constraint: NFTs can **only be purchased using RPTs**, not USDC or XLM. This means real money cannot buy them. The only acquisition path is through verified work. NFTs serve as status artifacts and profile badges. A "100-milestone" NFT immediately signals elite status to any viewer. Companies can issue custom NFTs — for example, "Shipped the Mobile App" or "Built v2 Backend" — which workers earn and permanently display on their profiles. Because the RPT supply is finite and proof-gated, the NFT economy is inherently resistant to fake credentials.

---

## 8. DeadDrop — Inheritance & Liveness System

Every wallet on the platform has a configurable heartbeat. Workers and companies periodically call a `ping()` function to signal liveness. If a wallet goes silent and crosses the inactivity threshold, the inheritance clock begins. A designated heir or guardian can then trigger the release process. A 14-ledger challenge window opens during which the original owner can call `im_alive()` to abort the process entirely.

If the challenge window closes without an abort, the vault executes: any unclaimed USDC from active milestones is distributed to the heir, earned NFTs transfer to the heir's wallet, and the worker's full RPT history is snapshotted and linked to a permanent legacy address. The professional record persists on-chain forever as a memorial of verified work. Active job contracts in progress are flagged for Admin review during this window to determine how open milestones should be handled.

---

## 9. Database Architecture (Firebase Firestore)

Firestore is organized into the following top-level collections.

The **users** collection stores profile data for all registered accounts, including role, Stellar wallet address, linked GitHub username, registration timestamp, and EmailJS contact details. The **jobs** collection holds all job postings, including title, description, skills, milestone structure, USDC amounts, escrow vault address, company wallet, worker wallet (once assigned), and current status. The **applications** collection tracks all worker applications per job. The **milestones** collection stores per-milestone data: the commit hash submitted, current approval status, dispute round count, and admin assignment flag. The **disputes** collection contains the full back-and-forth thread between worker and company for each contested milestone, with timestamps and resolution outcome. The **notifications** collection tracks EmailJS notification state so events are not sent twice. The **reputation** collection mirrors on-chain RPT counts for fast dashboard display without requiring a live RPC call on every page load. The **donations** collection tracks XLM contributions to the Poverty Relief Fund, including donor wallet, amount, timestamp, and transaction hash.

---

## 10. Smart Contract Architecture (Soroban)

The platform deploys five primary Soroban contracts on Stellar Testnet.

The **Escrow Vault Contract** handles USDC locking at job creation, milestone-level release (with 5% fee deduction), and the emergency distribution logic triggered by DeadDrop. The **ProofWork Contract** manages soulbound RPT minting on milestone completion, computes reputation tier thresholds, and handles the legacy snapshot on wallet death. The **NFT Marketplace Contract** manages the storefront for status NFTs, verifying the user has the required RPT balance, burning RPTs, and minting the NFT to the user's wallet. The **DeadDrop Contract** tracks per-wallet heartbeat timestamps, manages the 14-ledger challenge window, executes vault distribution to heirs, and triggers the RPT legacy snapshot in ProofWork. The **Poverty Relief Fund Contract** manages voluntary XLM donations from users, locking funds securely and handling governance-approved distributions to workers or companies in distress. All contracts are deployed and managed using the Stellar CLI, with contract addresses stored in Firestore for frontend reference.

---

## 11. Notification System (EmailJS)

EmailJS is called from the frontend React app (or a lightweight serverless function) on the following events: company registration approval, worker registration approval, job application received, worker selected for a job, milestone submission received by company, company approves or disputes a milestone, dispute returned to worker for remediation, Admin assigned to a dispute, Admin resolution issued, DeadDrop liveness warning (approaching inactivity threshold), DeadDrop vault execution notice to heir, Poverty Relief Fund donation receipt, and fund distribution approval. Each EmailJS template is parameterized with the relevant job title, milestone name, dispute round, and wallet address so all parties have full context.

---

## 12. Key Security & Design Constraints

Registration stakes (10,000 XLM for companies, 1,000 XLM for workers) create economic skin-in-the-game that deters spam and bad actors. The 5% platform fee is deducted atomically at the contract level — it cannot be bypassed through UI manipulation. The four-round dispute cap prevents infinite stalling while giving both parties a fair chance at resolution before Admin escalation. Soulbound RPTs make reputation non-transferable and non-purchasable by design. The 14-ledger DeadDrop challenge window prevents accidental inheritance triggers from brief inactivity. Admin accounts are the only role with dispute-resolution authority on-chain, and that authority is scoped strictly to disputed milestones — admins cannot move funds arbitrarily.

---

## 13. Poverty Relief Fund (PactRelief)

The **Poverty Relief Fund** is a decentralized philanthropic initiative integrated into the PactPay ecosystem. It allows both Companies and Workers to contribute XLM to a community-managed pool designed to provide financial aid to participants in distress or to support social impact projects within the developer community.

**Donation Mechanism**: Any registered Company or Worker can donate XLM directly from their dashboard. Donations are handled by a dedicated Soroban contract that locks the funds in a transparent, auditable vault. As an incentive, significant contributions may be recognized with unique soulbound "Philanthropist" NFTs or a one-time Reputation Point (RPT) bonus, reinforcing the donor's commitment to the ecosystem's health.

**Distribution & Governance**: The fund's distribution is governed by a transparent proposal system. Admins or high-reputation members can nominate recipients (e.g., workers facing medical emergencies or companies in developing regions needing small grants). Once a proposal is approved, the funds are released atomically to the recipient's Stellar wallet.

Reuirements:
Use Stellar Testnet
Implement wallet connect functionality
Implement wallet disconnect functionality
Fetch the connected wallet’s XLM balance
Display the balance and RPT clearly in the UI
Show transaction feedback to the user:
Success or failure state
Transaction hash directly on the UI with link to transaction explorer and confirmation message
StellarWalletsKit implementation
Error handling (wallet not found, rejected, insufficient balance)
Calling contract functions from the frontend
Reading and writing data to a contract
Event listening and state synchronization
Transaction status tracking (pending/success/fail)
3 error types handled
Contract deployed on testnet
Contract called from the frontend
Transaction status visible
Loading states and progress indicators
Basic caching implementation
Writing tests for your application
nter-contract calls
Custom token creation or liquidity pool mechanics
Advanced event streaming (real-time)
CI/CD pipeline setup
Mobile responsive design