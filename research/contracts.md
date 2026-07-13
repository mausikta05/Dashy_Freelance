# Dashy Contract Registry (Stellar Testnet)

This document tracks the official deployment addresses, WASM hashes, and purposes of all Dashy smart contracts.

---

## 🏗️ Active Contracts

### Dashy Registry
- **Contract ID**: `CDXB4OYLH4RRUFF2WXOJ7EQVMETIYS3QAO4OCQSF5N72HV6C7NFKBGHH`
- **WASM Hash**: `b5ce1273dfa87e7d0d39671c3dcbb800030e1e6d74ca42f8148f5d8e17f29094`
- **Source Account**: `deployer` (`GCJ54H57MA5BO7EZQRLCEXFVKQI5RFIXLXP6IWIQLB6SN2WOEOHGRU46`)
- **Network**: `testnet`
- **Purpose**: Handles User (1,000 XLM) and Company (10,000 XLM) registration stakes and admin withdrawals.

### ProofWork (v2.2)
- **Contract ID**: `CDS6J5XMEGDJPQ4XEKJFJOCHB6NFC732K4SXDPSQHUDQKJAR757I6UZE`
- **WASM Hash**: `3b3690f8d505e0ea3e6c454b4ef76ffb4e08c9246794894700ca7b8bce5fe861`
- **Source Account**: `deployer`
- **Network**: `testnet`
- **Purpose**: RPT tokens and trust badges.
- **Admin**: `GCJ54H57MA5BO7EZQRLCEXFVKQI5RFIXLXP6IWIQLB6SN2WOEOHGRU46`

### EscrowVault (v2.5 - redeployed fresh from source)
- **Contract ID**: `CACN5PFTVFJHGAFZ47MB5FXQPDN7QM4RNP5OVFBQ64B2VULWONFS5VAH`
- **WASM Hash**: `d610ad360f33a491aed40139748b3ed36fc929588f22a466035ffa813a026cd4`
- **Source Account**: `deployer`
- **Network**: `testnet`
- **Purpose**: Escrow, payouts, and ICC to ProofWork.
- **Admin**: `GCJ54H57MA5BO7EZQRLCEXFVKQI5RFIXLXP6IWIQLB6SN2WOEOHGRU46`
- **Linked ProofWork**: `CDS6J5XMEGDJPQ4XEKJFJOCHB6NFC732K4SXDPSQHUDQKJAR757I6UZE`

---

## 🚀 Future Deployments
- [ ] **DeadDrop**: Secure file exchange protocol.
