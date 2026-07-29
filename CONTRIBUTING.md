# Contributing to Dashy

First off, thank you for considering contributing to Dashy! It's people like you that make the protocol secure, robust, and accessible to everyone on the Stellar Network. 

This document outlines the process for contributing to our decentralized labor oversight ecosystem.

## 📜 Code of Conduct

By participating in this project, you are expected to uphold our Code of Conduct. Please treat all maintainers, contributors, and community members with respect. Harassment, discrimination, and toxic behavior will not be tolerated.

## 🐞 Reporting Bugs

If you find a bug in the smart contracts, frontend UI, or database sync logic, please open an Issue on GitHub. 

When filing a bug report, please include:
- A clear, descriptive title.
- Steps to reproduce the bug.
- Expected behavior vs. Actual behavior.
- Screenshots (especially for UI/UX glitches).
- Environment details (OS, Browser, Wallet Extension version, Node.js version).
- If it's an on-chain issue, please include the transaction hash (on Stellar Testnet) if available.

## 💡 Suggesting Enhancements

Have an idea to improve the protocol? We welcome feature requests!
1. Check the existing issues to ensure your idea hasn't already been proposed.
2. Open a new Issue and use the `enhancement` label.
3. Provide a clear use-case and explain how it benefits the Dashy ecosystem (Workers, Companies, or Admins).

## 🛠️ Development Setup

To set up the project locally for development, follow the detailed setup guide in the `README.md`. 
At a high level, you will need:
- Node.js v18+
- Rust & Soroban CLI
- Freighter Wallet (configured to Testnet)
- Firebase Project (for local DB emulation)

## 🌿 Branching Strategy

We follow a standard Git workflow:
- `main`: The stable production branch.
- `dev`: The active development branch.

When creating a new branch for your contribution, please use the following naming convention:
- `feature/your-feature-name` (for new features)
- `fix/issue-description` (for bug fixes)
- `contract/update-name` (for smart contract modifications)
- `docs/what-you-documented` (for documentation updates)

## 📝 Commit Guidelines

Write clean, descriptive commit messages. We prefer the conventional commits format:
- `feat: added ability to filter jobs by budget`
- `fix: resolved issue with EscrowVault payout split`
- `docs: expanded README architecture section`
- `style: updated Vault-Tec terminal neon glow`

## 🚀 Pull Request Process

1. Ensure your code passes all linting rules (`npm run lint` if configured).
2. If you modified Soroban Smart Contracts, ensure they compile successfully (`make build`) and all tests pass (`cargo test`).
3. Push your branch to your fork and submit a Pull Request against the `dev` branch.
4. In your PR description, explain *what* you changed and *why*. Reference any related issue numbers (e.g., `Closes #42`).
5. A maintainer will review your code. You may be asked to make changes.
6. Once approved, your PR will be squash-merged into `dev`.

## 🔐 Smart Contract Contributions

Modifying the Soroban contracts requires strict review due to financial implications. 
- Ensure all states (OPEN, ACTIVE, COMPLETED, DISPUTED) are strictly enforced.
- Do not bypass `require_auth()` checks.
- If modifying Inter-Contract Communication (ICC), verify that cross-contract calls handle panics gracefully.
- Include unit tests in the `test.rs` file for any new contract functionality.

## 🎨 UI/UX Contributions

Dashy uses a specific "Vault-Tec / Dystopian" aesthetic. When adding new components:
- Utilize CSS variables defined in `index.css` (e.g., `var(--primary)`, `var(--bg-dark)`).
- Ensure components are responsive (mobile-first approach).
- Maintain the heavy glassmorphism, CRT scanlines, and neon glow effects for consistency.

Thank you for contributing to the future of decentralized labor!
