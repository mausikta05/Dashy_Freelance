# RPT Token Redemption & Voucher System

## Overview
This document outlines the implementation of the Dashy Redeem Shop, where workers and companies can utilize their accumulated RPT (Reputation Tokens) to acquire premium vouchers and gift cards.

## Core Philosophy
- **Proof of Work Utility**: RPT tokens are earned through successful contract completions on the Stellar network.
- **Off-Chain Redemption**: To avoid gas fees and preserve the user's permanent "Trust Badge" score, redemption occurs in a secure off-chain layer.
- **Non-Destructive spending**: Spending RPT for vouchers **does not** reduce the on-chain RPT score or lower the user's Trust Tier. It only consumes "Redeemable Balance" tracked in the Dashy database.

## Technical Architecture

### 1. Balance Calculation
The system calculates the redeemable balance as follows:
`Redeemable Balance = On-Chain RPT (Total) - Firestore Spent RPT`

### 2. Voucher Data Structure
Vouchers are categorized into **Gift Cards** (Fixed values) and **Coupons** (Percentage/Discount based).

| Type | Brand | RPT Cost | Value |
|---|---|---|---|
| Gift Card | Amazon | 500 | $50 |
| Gift Card | Netflix | 250 | 3 Months |
| Gift Card | Steam | 300 | $30 |
| Gift Card | Starbucks | 100 | $10 |
| Gift Card | Uber | 150 | $15 |
| Voucher | Nike | 200 | 25% Off |
| Voucher | Adidas | 180 | 20% Off |
| Voucher | H&M | 100 | $10 Voucher |
| Voucher | Walmart | 300 | $25 Voucher |
| Voucher | Best Buy | 500 | $50 Voucher |
| Voucher | IKEA | 400 | $40 Voucher |
| Voucher | Sephora | 150 | 15% Off |
| Voucher | PlayStation | 350 | $25 Credit |

### 3. Redemption Flow
1. **User Selection**: User selects a voucher in the `Redeem` section.
2. **Balance Check**: System verifies `Redeemable Balance >= Cost`.
3. **Firestore Update**: Increment `spentRpt` in the user's profile.
4. **Key Generation**: Generate a unique alphanumeric activation key (e.g., `PF-XXXX-XXXX-XXXX`).
5. **Persistence**: The key is stored in the user's `inventory` in Firestore for future access.

## UI Components
- **Sidebar Integration**: New "Redeem" navigation node.
- **Redeem Shop**: A grid-based marketplace featuring high-fidelity brand assets and "Purchase" triggers.
- **Inventory Overlay**: A section to view previously redeemed keys.
