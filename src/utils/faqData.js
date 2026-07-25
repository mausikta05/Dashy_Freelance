export const FAQ_DATA = {
  worker: {
    steps: [
      { title: 'Initialize Access', desc: 'Connect your Stellar wallet and authorize the 1,000 XLM registry protocol fee. This establishes your initial reputation (RPT) on-chain.' },
      { title: 'Configure Profile', desc: 'Detail your profession, skills, and experience. Your wallet address serves as your unique protocol identity.' },
      { title: 'Pact Acquisition', desc: 'Browse the global grid for active jobs. Submit your bio for consideration by companies.' },
      { title: 'Execution & Evidence', desc: 'Once assigned, perform the work. Submit a cryptographic hash of your work (e.g., GitHub commit hash) and documentation links.' },
      { title: 'Atomic Settlement', desc: 'Upon approval, funds are released from the EscrowVault directly to your wallet. If a conflict arises, you can initiate Dispute Protocol.' }
    ],
    requirements: [
      'Active Stellar Wallet (Freighter, Albedo, or xBull recommended)',
      '1,000 XLM Registry Fee (Vaulted for platform security)',
      'Verifiable work evidence for every milestone'
    ],
    disputes: 'If a company fails to release funds after evidence submission, use the "RAISE_DISPUTE" command in your active jobs panel. This freezes the funds and alerts an Overseer.'
  },
  company: {
    steps: [
      { title: 'Corporate Registry', desc: 'Establish your company on the grid with a 10,000 XLM corporate entry fee. This ensures high-stakes commitment to the network.' },
      { title: 'Job Deployment', desc: 'Create a new Pact. The budget is immediately deducted from your wallet and locked in the EscrowVault contract.' },
      { title: 'Candidate Screening', desc: 'Review worker profiles and their RPT scores. Assign the most qualified executor to the job.' },
      { title: 'Quality Assurance', desc: 'Review the work evidence (GitHub hashes/docs) submitted by the worker.' },
      { title: 'Payment Authorization', desc: 'Approve the work to trigger the EscrowVault release. Funds are sent to the worker atomically.' }
    ],
    requirements: [
      'Corporate Identity Verification',
      '10,000 XLM Corporate Registry Fee',
      'Full job budget available for Escrow locking at deployment'
    ],
    disputes: 'If the submitted work does not meet requirements, use the "RAISE_CONFLICT" protocol. Do not release funds; instead, wait for Overseer mediation.'
  },
  admin: {
    steps: [
      { title: 'Overseer Authentication', desc: 'Access the admin console via secure Firebase credentials.' },
      { title: 'Dispute Monitoring', desc: 'Identify Pacts that have entered the DISPUTED state.' },
      { title: 'Evidence Review', desc: 'Analyze the side-by-side comparison of job requirements vs. worker-submitted hashes.' },
      { title: 'Neutral Resolution', desc: 'Allocate funds using the payout slider based on work completion percentage.' },
      { title: 'On-Chain Execution', desc: 'Trigger the resolve_dispute() function to distribute vaulted funds and close the Pact.' }
    ],
    requirements: [
      'Authorized Overseer Credentials',
      'Deep understanding of the EscrowVault contract logic',
      'Impartiality in mediation'
    ],
    disputes: 'Admins act as the final authority. Once a resolution is executed on-chain, the transaction is immutable and funds are distributed according to the set percentages.'
  }
};
