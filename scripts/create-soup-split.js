#!/usr/bin/env node
/**
 * Create $SOUP Fee Split via 0xSplits V1 on Base.
 * 
 * Split Configuration (IMMUTABLE — cannot be changed after deployment):
 *   Stefan  (40%) — 0x29CC5559f54C4408e5073aC8f9432f9ADA93c601
 *   BigBob  (30%) — 0x955F8D92F041a16a6CAC0985625211Be8De2377a
 *   Noctiluca (30%) — 0x643fc612b928ee9C58B8C9F1DF017E75757Be3D4
 * 
 * Requirements:
 *   - Base ETH in deployer wallet (for gas, ~0.001 ETH)
 *   - DEPLOYER_KEY environment variable (private key with 0x prefix)
 * 
 * Usage:
 *   DEPLOYER_KEY=0x... node scripts/create-soup-split.js
 *   
 * Dry-run (predict address without deploying):
 *   DEPLOYER_KEY=0x... DRY_RUN=1 node scripts/create-soup-split.js
 * 
 * Testnet (Base Sepolia):
 *   DEPLOYER_KEY=0x... CHAIN=base-sepolia node scripts/create-soup-split.js
 */

const ethers = require('/usr/local/lib/node_modules/ethers');
const fs = require('fs');
const path = require('path');

// ─── 0xSplits V1 SplitMain — same address on all EVM chains ───
const SPLIT_MAIN = '0x2ed6c4B5dA6378c7897AC67Ba9e43102Feb694EE';

const SPLIT_MAIN_ABI = [
  'function createSplit(address[] accounts, uint32[] percentAllocations, uint32 distributorFee, address controller) returns (address)',
  'function predictImmutableSplitAddress(address[] accounts, uint32[] percentAllocations, uint32 distributorFee) view returns (address)',
  'function getHash(address split) view returns (bytes32)',
  'event CreateSplit(address indexed split)'
];

// ─── Chain configs ───
const CHAINS = {
  'base': {
    rpc: 'https://mainnet.base.org',
    chainId: 8453,
    explorer: 'https://basescan.org',
    splitsApp: 'https://app.splits.org/accounts'
  },
  'base-sepolia': {
    rpc: 'https://sepolia.base.org',
    chainId: 84532,
    explorer: 'https://sepolia.basescan.org',
    splitsApp: 'https://app.splits.org/accounts'
  }
};

// ─── $SOUP Fee Split Recipients ───
// IMPORTANT: Addresses MUST be sorted in ascending order (0xSplits requirement)
// Percentages use 6 decimal precision: 1e6 = 100%
const RECIPIENTS = [
  { name: 'Stefan',    address: '0x29CC5559f54C4408e5073aC8f9432f9ADA93c601', pct: 40 },
  { name: 'Noctiluca', address: '0x643fc612b928ee9C58B8C9F1DF017E75757Be3D4', pct: 30 },
  { name: 'BigBob',    address: '0x955F8D92F041a16a6CAC0985625211Be8De2377a', pct: 30 }
];

// Sort by address (ascending) — 0xSplits requires sorted addresses
const sorted = [...RECIPIENTS].sort((a, b) => 
  a.address.toLowerCase().localeCompare(b.address.toLowerCase())
);

// 0xSplits V1 uses percentages scaled to 1e6 (1_000_000 = 100%)
const accounts = sorted.map(r => r.address);
const percentAllocations = sorted.map(r => r.pct * 10000); // 40% = 400000, 30% = 300000

// Validate percentages sum to 1e6
const totalPct = percentAllocations.reduce((a, b) => a + b, 0);
if (totalPct !== 1000000) {
  console.error(`❌ Percentages must sum to 1,000,000 (got ${totalPct})`);
  process.exit(1);
}

// Distributor fee: 0% (no incentive for third-party distribution)
const DISTRIBUTOR_FEE = 0;

// Controller: 0x0 = immutable (cannot be changed)
const CONTROLLER = ethers.ZeroAddress;

async function main() {
  const chain = process.env.CHAIN || 'base';
  const dryRun = process.env.DRY_RUN === '1';
  const config = CHAINS[chain];

  if (!config) {
    console.error(`Unknown chain: ${chain}. Use: ${Object.keys(CHAINS).join(', ')}`);
    process.exit(1);
  }

  const deployerKey = process.env.DEPLOYER_KEY;
  if (!deployerKey) {
    console.error('Set DEPLOYER_KEY environment variable (private key with 0x prefix)');
    process.exit(1);
  }

  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║        $SOUP Fee Split — 0xSplits V1 on Base            ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');
  console.log();
  console.log(`🔗 Chain: ${chain} (${config.chainId})`);
  console.log(`🌐 RPC: ${config.rpc}`);
  console.log();

  console.log('📋 Split Configuration:');
  console.log('   ┌─────────────┬────────────────────────────────────────────┬──────┐');
  for (const r of sorted) {
    console.log(`   │ ${r.name.padEnd(11)} │ ${r.address} │ ${String(r.pct).padStart(3)}% │`);
  }
  console.log('   └─────────────┴────────────────────────────────────────────┴──────┘');
  console.log(`   Distributor Fee: ${DISTRIBUTOR_FEE}%`);
  console.log(`   Controller: ${CONTROLLER} (IMMUTABLE)`);
  console.log();

  const provider = new ethers.JsonRpcProvider(config.rpc);
  const wallet = new ethers.Wallet(deployerKey, provider);
  const splitMain = new ethers.Contract(SPLIT_MAIN, SPLIT_MAIN_ABI, wallet);

  console.log(`👛 Deployer: ${wallet.address}`);
  const balance = await provider.getBalance(wallet.address);
  console.log(`💰 Balance: ${ethers.formatEther(balance)} ETH`);
  console.log();

  // Predict the split address
  console.log('🔮 Predicting split address...');
  const predictedAddress = await splitMain.predictImmutableSplitAddress(
    accounts,
    percentAllocations,
    DISTRIBUTOR_FEE
  );
  console.log(`   Predicted: ${predictedAddress}`);

  // Check if already deployed
  const existingCode = await provider.getCode(predictedAddress);
  if (existingCode !== '0x') {
    console.log(`\n✅ Split already deployed at: ${predictedAddress}`);
    console.log(`🔗 Splits: ${config.splitsApp}/${predictedAddress}/?chainId=${config.chainId}`);
    console.log(`🔗 Explorer: ${config.explorer}/address/${predictedAddress}`);
    return;
  }

  if (dryRun) {
    console.log('\n🔍 DRY RUN — not deploying.');
    console.log(`   Would deploy to: ${predictedAddress}`);
    console.log(`   Gas estimate: ~200,000 gas`);
    return;
  }

  if (balance === 0n) {
    console.error('\n❌ No ETH! Need Base ETH for gas.');
    if (chain === 'base-sepolia') {
      console.error('   Get testnet ETH: https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet');
    }
    process.exit(1);
  }

  // Create the split
  console.log('\n🚀 Creating immutable split...');
  const tx = await splitMain.createSplit(
    accounts,
    percentAllocations,
    DISTRIBUTOR_FEE,
    CONTROLLER
  );

  console.log(`📝 Tx: ${config.explorer}/tx/${tx.hash}`);
  console.log('⏳ Waiting for confirmation...');

  const receipt = await tx.wait();
  
  // Parse the CreateSplit event
  const splitEvent = receipt.logs.find(log => {
    try {
      const parsed = splitMain.interface.parseLog(log);
      return parsed?.name === 'CreateSplit';
    } catch { return false; }
  });

  const splitAddress = splitEvent 
    ? splitMain.interface.parseLog(splitEvent).args[0]
    : predictedAddress;

  console.log(`\n✅ Split created!`);
  console.log(`📍 Address: ${splitAddress}`);
  console.log(`🔗 Splits: ${config.splitsApp}/${splitAddress}/?chainId=${config.chainId}`);
  console.log(`🔗 Explorer: ${config.explorer}/address/${splitAddress}`);
  console.log(`⛽ Gas used: ${receipt.gasUsed.toString()}`);

  // Save deployment info
  const deploymentInfo = {
    type: '0xSplits-V1-ImmutableSplit',
    chain,
    chainId: config.chainId,
    splitAddress,
    splitMain: SPLIT_MAIN,
    recipients: sorted.map(r => ({
      name: r.name,
      address: r.address,
      percentage: r.pct
    })),
    distributorFee: DISTRIBUTOR_FEE,
    controller: CONTROLLER,
    immutable: true,
    txHash: tx.hash,
    deployer: wallet.address,
    deployedAt: new Date().toISOString(),
    links: {
      splits: `${config.splitsApp}/${splitAddress}/?chainId=${config.chainId}`,
      explorer: `${config.explorer}/address/${splitAddress}`
    }
  };

  const deploymentsDir = path.join(__dirname, '..', 'deployments');
  if (!fs.existsSync(deploymentsDir)) fs.mkdirSync(deploymentsDir);
  fs.writeFileSync(
    path.join(deploymentsDir, `soup-split-${chain}.json`),
    JSON.stringify(deploymentInfo, null, 2)
  );
  console.log(`\n💾 Deployment info saved to deployments/soup-split-${chain}.json`);

  console.log('\n🎉 Done! The split will automatically distribute any ETH/ERC20 sent to it.');
  console.log('   Anyone can call distributeETH() or distributeERC20() to trigger payouts.');
}

main().catch(err => {
  console.error('❌ Split creation failed:', err.message);
  process.exit(1);
});
