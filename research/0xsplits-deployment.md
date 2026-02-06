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
| Split (Base Sepolia) | `0xBE3c41E1CC251422F0502442203a2C0c4F63111b` | ✅ Deployed 2026-02-06 |
| Split (Base Mainnet) | `0xBE3c41E1CC251422F0502442203a2C0c4F63111b` | ✅ Deployed 2026-02-06 21:31 UTC |
| AttestationRegistry (Sepolia) | `0xcb0bF83Ff2cBeaed66BcE375eae2F2D454E2a073` | ✅ Deployed |

## Deployment Requirements

### Base Mainnet (for production split)

**Status:** ✅ **DEPLOYED** 2026-02-06 21:31 UTC

Stefan sent ~0.0005 ETH gas, deployed immediately.
- Tx: `0x02f45cc96ee77d66dd6a571122cee2fe710262b99e4fea7b48dc67e378a7dd25`
- Split contract is now live and IMMUTABLE

### Base Sepolia (testnet)

**Status:** ✅ **DEPLOYED** at `0xBE3c41E1CC251422F0502442203a2C0c4F63111b` (2026-02-06 06:29 UTC)

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
- All addresses valid ✅
- Split deployed on Base Sepolia ✅
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
| 2026-02-06 | **Split deployed to Base Sepolia** ✅ |
| Pending | Mainnet deployment (waiting for gas ETH) |

---

## References

- [0xSplits Docs](https://docs.splits.org/)
- [0xSplits App](https://app.splits.org/)
- [BaseScan SplitMain](https://basescan.org/address/0x2ed6c4B5dA6378c7897AC67Ba9e43102Feb694EE)
