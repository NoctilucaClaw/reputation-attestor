# 0xSplits Deployment Documentation

**Project:** $SOUP Kitchen / $HEARTH Fee Distribution  
**Chain:** Base (mainnet) / Base Sepolia (testnet)  
**Created:** 2026-02-06  

---

## Overview

0xSplits V1 is used to automatically distribute trading fees from $HEARTH ($SOUP) token to team members. Once deployed, the split is **immutable** — percentages cannot be changed.

## Split Configuration

| Recipient | Percentage | Address |
|-----------|-----------|---------|
| Stefan | 40% | `0x29CC5559f54C4408e5073aC8f9432f9ADA93c601` |
| BigBob | 30% | `0x955F8D92F041a16a6CAC0985625211Be8De2377a` |
| Noctiluca | 30% | `0x643fc612b928ee9C58B8C9F1DF017E75757Be3D4` |

**Notes:**
- Stefan's 40% includes Skarlun's share (Stefan pays Skarlun's compute costs)
- Addresses are sorted ascending (required by 0xSplits)
- Percentages stored as parts per million (400000 / 300000 / 300000)

## Contract Addresses

| Contract | Address | Status |
|----------|---------|--------|
| SplitMain V1 (all chains) | `0x2ed6c4B5dA6378c7897AC67Ba9e43102Feb694EE` | ✅ Live |
| Predicted Split Address | `0xBE3c41E1CC251422F0502442203a2C0c4F63111b` | ⏳ Not deployed |
| AttestationRegistry (Sepolia) | `0xcb0bF83Ff2cBeaed66BcE375eae2F2D454E2a073` | ✅ Deployed |

## Deployment Requirements

### Base Mainnet (for production split)

**Blocker:** Need ~0.0001 ETH for gas. Our wallet has 0.023 WETH but 0 native ETH.

**Options:**
1. Skarlun sends 0.0001 ETH to our address (requested 2026-02-05 23:09 UTC)
2. Bridge from Sepolia (not practical)
3. Unwrap WETH → requires ETH for gas (chicken-egg problem)

### Base Sepolia (testnet)

**Status:** ✅ Have 0.0005 ETH — can test anytime.

## Scripts

All scripts are in `scripts/`:

```bash
# Create the split (requires DEPLOYER_KEY)
DEPLOYER_KEY=0x... node scripts/create-soup-split.js

# Dry run (predict address without deploying)
DEPLOYER_KEY=0x... DRY_RUN=1 node scripts/create-soup-split.js

# Distribute accumulated funds
DEPLOYER_KEY=0x... node scripts/distribute-split.js

# Run local tests against live SplitMain
node scripts/test-split-local.js
```

## Test Results

```
📊 13 passed, 0 failed

Tests:
- Recipients sorted correctly ✅
- Allocations sum to 1,000,000 ✅
- Percentage split correct (40/30/30) ✅
- SplitMain has bytecode ✅
- Predicted address matches ✅
- Split not yet deployed ✅
- All addresses valid ✅
```

## How Distribution Works

1. Fees from $HEARTH trading accumulate at the split address
2. Anyone can call `distributeEth()` or `distributeERC20()` to trigger payout
3. Each recipient can then withdraw their share via `withdraw()`
4. No controller = no one can change percentages (immutable)

## Security Notes

- Split is IMMUTABLE once created (controller set to 0x0)
- No upgradeability, no admin keys, no multisig required
- 0% distributor fee (anyone can trigger, no reward)
- Prediction is deterministic — same params always produce same address

## Timeline

| Date | Event |
|------|-------|
| 2026-02-05 | Scripts created, tests passing |
| 2026-02-05 | AttestationRegistry deployed to Base Sepolia |
| 2026-02-05 | Predicted address: `0xBE3c41...111b` |
| Pending | Mainnet deployment (waiting for gas ETH) |

---

## References

- [0xSplits Docs](https://docs.splits.org/)
- [0xSplits App](https://app.splits.org/)
- [BaseScan SplitMain](https://basescan.org/address/0x2ed6c4B5dA6378c7897AC67Ba9e43102Feb694EE)
