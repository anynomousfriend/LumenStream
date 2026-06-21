# <img src="./frontend/public/logo.svg" width="36" height="36" align="top" style="margin-right: 8px;" /> LumenStream (Stellar Multi-Payment Tracker)

This repository contains a full-stack Stellar decentralized application (dApp) designed to record and track multi-address payments on the Stellar Testnet. It features a Rust-based Soroban smart contract and a modern React frontend with multi-wallet support.

## Deployed Contract

- **Testnet Contract ID**: `CA5HUAE5DEFVN62OCCI6NCQ4LSZ2AR67FGS4XC4YURJVLB2JVRZCDM6Q`

### Test Data
If you want to test the dApp immediately without deploying your own contract, use the following details:

**Contract ID**: 
```text
CA5HUAE5DEFVN62OCCI6NCQ4LSZ2AR67FGS4XC4YURJVLB2JVRZCDM6Q
```

**Receivers (Comma Separated)**:
```text
GDRYVYEFO2MKXNYQGTMMVMCVVRPNVBRPSDQFYKGVMWGEXY7DLKAXJMOZ, GBQFR2D2UVELX4PSHS2BEANTRGCQXRPGTUQW357HSWTAJKD7USL3357P
```

**Amounts (Comma Separated)**:
```text
100, 200
```

---

## 🛠️ Installation & Prerequisites

To develop, build, and deploy locally, you need a few tools installed:

### 1. Install Node.js
Ensure you have Node.js (v20+) and `npm` installed to run the frontend.

### 2. Install Rust
You need the Rust toolchain to compile the smart contract. You can install it via [rustup](https://rustup.rs/) or a version manager like `mise`.
```bash
# Example using mise:
mise use rust@latest
```

### 3. Add the WebAssembly Target
Stellar smart contracts compile to a specific WebAssembly standard. Add the required target to your Rust toolchain:
```bash
rustup target add wasm32v1-none
```

### 4. Install the Stellar CLI
The Stellar CLI is required to optimize and deploy Soroban contracts. You can download the pre-compiled binary:
```bash
# For Linux x86_64:
curl -sSL https://github.com/stellar/stellar-cli/releases/download/v27.0.0/stellar-cli-27.0.0-x86_64-unknown-linux-gnu.tar.gz | tar -xz
mv stellar-cli-27.0.0-x86_64-unknown-linux-gnu/stellar ~/.local/bin/stellar
```
*(Make sure `~/.local/bin` is in your `PATH`, or move it to `/usr/local/bin/stellar`)*

---

## 🖥️ How to Run the Frontend

The web application is built with Vite, React, and TypeScript. It uses `@creit.tech/stellar-wallets-kit` to support multiple wallets natively.

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install the Node dependencies:
   ```bash
   npm install
   ```
3. Start the local development server:
   ```bash
   npm run dev
   ```
4. Open your browser to the local server URL (usually `http://localhost:5173`).

---

## 🚀 How to Build and Deploy the Contract

If you want to modify the contract logic, you must rebuild and redeploy it.

1. **Navigate to the contract directory:**
   ```bash
   cd contract
   ```
2. **Build and optimize the contract:**
   *(Do not use `cargo build` directly, as newer Rust features like reference-types aren't fully supported by the Soroban VM without the CLI optimizer).*
   ```bash
   stellar contract build
   ```
3. **Generate a Testnet Identity (Optional):**
   If you don't have an account to pay the deployment fees, generate and fund one:
   ```bash
   stellar keys generate alice --network testnet
   ```
4. **Deploy to Testnet:**
   ```bash
   stellar contract deploy \
     --wasm target/wasm32v1-none/release/payment_tracker_contract.wasm \
     --source-account alice \
     --network testnet
   ```
5. **Update the Frontend:**
   Copy the `Contract ID` output by the deployment command, paste it into the "Configuration" card in the React app, and click **Set Contract**.

---

## 📝 How to Use the App

1. **Connect Wallet:** Click the "Connect Wallet" button to open the `StellarWalletsKit` modal. Select your installed wallet extension (e.g., Freighter) and make sure it is set to the **Testnet** network.
2. **Record Payments:** 
   - Enter comma-separated Stellar public keys in the **Receivers** field (e.g., `GB..., GC...`).
   - Enter comma-separated values in the **Amounts** field (e.g., `100, 200`).
   - Click **Record Payments** and approve the transaction in your wallet extension.
3. **View Status:** 
   - Toast notifications will track your transaction hash and network status. 
   - Upon completion, the "Your Payments" and "Recent Events" panels will automatically poll the RPC and update your dashboard!
