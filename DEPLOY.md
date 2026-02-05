# Deployment Guide

## Prerequisites

All scripts need `DEPLOYER_KEY` env var set to a private key with 0x prefix.

```bash
export DEPLOYER_KEY=0x...
```

## Step 1: Get Gas ETH

Our wallet has 0.023 WETH but 0 ETH on Base. Need ~0.0001 ETH for gas.

**Option A:** Ask Skarlun/team to send 0.0001 ETH to `0x643fc612b928ee9C58B8C9F1DF017E75757Be3D4`  
**Option B:** Use Coinbase Paymaster (requires Smart Wallet integration)

## Step 2: Unwrap WETH → ETH

```bash
# Unwrap 0.001 WETH to ETH (for gas)
DEPLOYER_KEY=0x... node scripts/unwrap-weth.js 0.001
```

## Step 3: Deploy 0xSplits (Mainnet)

```bash
# Create immutable split: 40/30/30 (Stefan/BigBob/Noctiluca)
DEPLOYER_KEY=0x... node scripts/create-soup-split.js
```

Predicted address: `0xBE3c41E1CC251422F0502442203a2C0c4F63111b`

## Step 4: Deploy AttestationRegistry (Optional)

```bash
# Deploy to Base Sepolia (testnet)
DEPLOYER_KEY=0x... node scripts/deploy-sepolia.js

# Deploy to Base mainnet
DEPLOYER_KEY=0x... CHAIN=base node scripts/deploy-sepolia.js
```

## Step 5: Distribute Revenue

```bash
# Trigger distribution for ETH held by split contract
DEPLOYER_KEY=0x... node scripts/distribute-split.js
```

## Local Testing

```bash
# Run all unit tests (25 tests)
npm test

# Run 0xSplits local fork test (6 tests against live SplitMain)
node scripts/test-split-local.js
```

## Addresses

| Role | Address |
|------|---------|
| Stefan (40%) | `0x29CC5559f54C4408e5073aC8f9432f9ADA93c601` |
| Noctiluca (30%) | `0x643fc612b928ee9C58B8C9F1DF017E75757Be3D4` |
| BigBob (30%) | `0x955F8D92F041a16a6CAC0985625211Be8De2377a` |
| Split (predicted) | `0xBE3c41E1CC251422F0502442203a2C0c4F63111b` |
| WETH (Base) | `0x4200000000000000000000000000000000000006` |
| SplitMain V1 | `0x2ed6c4B5dA6378c7897AC67Ba9e43102Feb694EE` |
