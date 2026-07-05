# 🎨 Dashy NFT Marketplace Implementation Plan

This document outlines the full technical implementation and design for the **NFT Shop**, a decentralized marketplace integrated directly into the Dashy dashboard.

## 1. Smart Contract Architecture (Soroban Rust)

We will implement a robust NFT marketplace contract in `SmartContract/contracts/NFTMarketplace/src/lib.rs`.

### Data Structures
```rust
pub struct NFT {
    pub id: u64,
    pub owner: Address,
    pub metadata_url: String, // IPFS or Firebase URL
    pub price: i128,          // XLM price (in stroops)
    pub is_for_sale: bool,
}
```

### Contract Methods
- `mint(admin: Address, metadata_url: String, price: i128)`: Create a new NFT.
- `buy(buyer: Address, nft_id: u64)`: Process XLM transfer and update owner.
- `transfer(from: Address, to: Address, nft_id: u64)`: Direct ownership transfer.
- `list_for_sale(owner: Address, nft_id: u64, price: i128)`: Put an owned NFT back on market.
- `get_nft(nft_id: u64)`: Retrieve specific NFT details.
- `get_all_nfts()`: Return the full registry.

## 2. Navigation & UI Integration

### Sidebar/Navbar Updates
- **Path**: `src/components/DashboardLayout.jsx`
- **Action**: Add `NFT Shop` to the sidebar for both **Worker** and **Company** roles.
- **Icon**: `ShoppingBag` from `lucide-react`.

### Routing
- **Path**: `src/App.jsx`
- **Action**: Register the `/nft-shop` route to point to the new `NFTShop` component.

## 3. NFT Shop Component Design

### Aesthetics
- **Theme**: Premium Dystopian / Glassmorphism.
- **Visuals**: Glowing borders (`var(--primary)`), scanline overlays, and holographic card effects.
- **Components**:
    - `NFTCard`: Displays the asset image, rarity tag, current owner, and a "BUY" button.
    - `CollectionToggle`: Switch between "Marketplace" and "Owned by Me".

### State Management
- **Firestore Sync**: While the source of truth is the Soroban contract, we will index NFT metadata in a Firebase collection (`nfts`) to provide instant, zero-latency browsing with high-quality thumbnails.
- **Transaction Handling**: Use `callContract` from `WalletContext` to invoke the `buy` method on-chain.

## 4. Initial Asset Seed (The "Genesis" Collection)
We will launch with a curated set of Protocol NFTs:
1. **The Overseer Key**: 500 XLM (Legendary rarity).
2. **Pact-Protocol Drone**: 100 XLM (Rare).
3. **Verified Executor Badge**: 50 XLM (Common).
4. **Data-Silo Fragment**: 25 XLM (Common).

## 5. Execution Timeline
1. **Phase 1**: Update `DashboardLayout` and `App.jsx` to show the "NFT Shop" entry point.
2. **Phase 2**: Create the `NFTShop.jsx` component with dummy data and premium CSS.
3. **Phase 3**: Implement and deploy the Soroban `NFTMarketplace` contract logic.
4. **Phase 4**: Connect the "BUY" button to the `WalletContext` for real Testnet transactions.
5. **Phase 5**: Implement the Firebase ownership sync hook.
