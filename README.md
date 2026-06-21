# Stellar Payment Tracker (Level 2)

This repository contains a full-stack Stellar decentralized application (dApp) designed to record and track multi-address payments on the Stellar Testnet. It features a Rust-based Soroban smart contract and a modern React frontend with multi-wallet support.

## Project Structure

- **`contract/`**: Contains the Soroban smart contract written in Rust. It exposes functions to record multiple payments in persistent state and emit real-time events.
- **`frontend/`**: Contains a Vite + React + TypeScript web application that integrates `@creit.tech/stellar-wallets-kit` to support multiple Stellar wallets out-of-the-box.

## Deployed Contract

The smart contract has been compiled and deployed to the Stellar Testnet. 
- **Testnet Contract ID**: `CA5HUAE5DEFVN62OCCI6NCQ4LSZ2AR67FGS4XC4YURJVLB2JVRZCDM6Q`

## How to Run the Frontend

1. Ensure you have Node.js installed.
2. Navigate to the frontend directory:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
3. Open your browser to the local server URL (usually `http://localhost:5173`).

## How to Use the App

1. **Connect Wallet:** Click the "Connect Wallet" button to open the `StellarWalletsKit` modal. You only need one wallet extension installed (e.g., Freighter) to use the app. Ensure your wallet is set to the **Testnet** network.
2. **Set Contract:** Under the Configuration card, paste the Contract ID (`CA5HUAE5DEFVN62OCCI6NCQ4LSZ2AR67FGS4XC4YURJVLB2JVRZCDM6Q`) and click "Set Contract".
3. **Record Payments:** 
   - Enter comma-separated Stellar public keys in the **Receivers** field (e.g., `GB..., GC...`).
   - Enter comma-separated values in the **Amounts** field (e.g., `100, 200`).
   - Click **Record Payments** and approve the transaction in your wallet.
4. **View Status:** 
   - Toast notifications will keep you updated on the transaction status. 
   - Upon completion, the "Your Payments" and "Recent Events" panels will automatically synchronize to show the blockchain's current state.

## How to Build and Deploy the Contract

If you wish to make changes to the contract and redeploy it yourself, you need the [Stellar CLI](https://github.com/stellar/stellar-cli) and the `wasm32v1-none` target.

```bash
# 1. Add the target
rustup target add wasm32v1-none

# 2. Build the contract
cd contract
stellar contract build

# 3. Deploy to Testnet (replace <your_identity> with your funded keys)
stellar contract deploy \
  --wasm target/wasm32v1-none/release/payment_tracker_contract.wasm \
  --source-account <your_identity> \
  --network testnet
```
