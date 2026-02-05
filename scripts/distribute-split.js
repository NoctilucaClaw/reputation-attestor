#!/usr/bin/env node
/**
 * Distribute ETH or ERC20 from a 0xSplits V1 Split on Base.
 * 
 * Anyone can call this — no special permissions needed.
 * The caller pays gas; recipients receive their share.
 * 
 * Usage:
 *   # Distribute ETH
 *   DEPLOYER_KEY=0x... SPLIT=0x... node scripts/distribute-split.js
 *   
 *   # Distribute WETH (or any ERC20)
 *   DEPLOYER_KEY=0x... SPLIT=0x... TOKEN=0x4200000000000000000000000000000000000006 node scripts/distribute-split.js
 *   
 *   # Base Sepolia
 *   DEPLOYER_KEY=0x... SPLIT=0x... CHAIN=base-sepolia node scripts/distribute-split.js
 */

const ethers = require('/usr/local/lib/node_modules/ethers');

const SPLIT_MAIN = '0x2ed6c4B5dA6378c7897AC67Ba9e43102Feb694EE';
const ETH_ADDRESS = '0x0000000000000000000000000000000000000000';

// WETH on Base mainnet
const WETH_BASE = '0x4200000000000000000000000000000000000006';

const SPLIT_MAIN_ABI = [
  'function distributeETH(address split, address[] accounts, uint32[] percentAllocations, uint32 distributorFee, address distributorAddress) external',
  'function distributeERC20(address split, address token, address[] accounts, uint32[] percentAllocations, uint32 distributorFee, address distributorAddress) external',
  'function getETHBalance(address account) view returns (uint256)',
  'function getERC20Balance(address account, address token) view returns (uint256)',
  'function withdraw(address account, uint256 withdrawETH, address[] tokens) external',
  'function getHash(address split) view returns (bytes32)'
];

const CHAINS = {
  'base': { rpc: 'https://mainnet.base.org', chainId: 8453, explorer: 'https://basescan.org' },
  'base-sepolia': { rpc: 'https://sepolia.base.org', chainId: 84532, explorer: 'https://sepolia.basescan.org' }
};

// Same sorted recipients as create-soup-split.js
const RECIPIENTS = [
  { name: 'Stefan',    address: '0x29CC5559f54C4408e5073aC8f9432f9ADA93c601', pct: 40 },
  { name: 'Noctiluca', address: '0x643fc612b928ee9C58B8C9F1DF017E75757Be3D4', pct: 30 },
  { name: 'BigBob',    address: '0x955F8D92F041a16a6CAC0985625211Be8De2377a', pct: 30 }
].sort((a, b) => a.address.toLowerCase().localeCompare(b.address.toLowerCase()));

const accounts = RECIPIENTS.map(r => r.address);
const percentAllocations = RECIPIENTS.map(r => r.pct * 10000);

async function main() {
  const chain = process.env.CHAIN || 'base';
  const config = CHAINS[chain];
  const splitAddress = process.env.SPLIT;
  const tokenAddress = process.env.TOKEN || null;
  const deployerKey = process.env.DEPLOYER_KEY;

  if (!config) { console.error(`Unknown chain: ${chain}`); process.exit(1); }
  if (!splitAddress) { console.error('Set SPLIT environment variable (split contract address)'); process.exit(1); }
  if (!deployerKey) { console.error('Set DEPLOYER_KEY environment variable'); process.exit(1); }

  console.log(`🔗 Chain: ${chain}`);
  console.log(`📍 Split: ${splitAddress}`);
  console.log(`💎 Token: ${tokenAddress || 'ETH (native)'}\n`);

  const provider = new ethers.JsonRpcProvider(config.rpc);
  const wallet = new ethers.Wallet(deployerKey, provider);
  const splitMain = new ethers.Contract(SPLIT_MAIN, SPLIT_MAIN_ABI, wallet);

  // Check split balance
  const splitBalance = await provider.getBalance(splitAddress);
  console.log(`💰 Split ETH balance: ${ethers.formatEther(splitBalance)} ETH`);

  if (tokenAddress) {
    // Distribute ERC20
    const erc20 = new ethers.Contract(tokenAddress, [
      'function balanceOf(address) view returns (uint256)',
      'function symbol() view returns (string)',
      'function decimals() view returns (uint8)'
    ], provider);
    
    const tokenBalance = await erc20.balanceOf(splitAddress);
    const symbol = await erc20.symbol().catch(() => 'TOKEN');
    const decimals = await erc20.decimals().catch(() => 18);
    console.log(`💰 Split ${symbol} balance: ${ethers.formatUnits(tokenBalance, decimals)} ${symbol}`);
    
    if (tokenBalance === 0n) {
      console.log('\n⚠️  No tokens to distribute.');
      return;
    }

    console.log(`\n🚀 Distributing ${symbol}...`);
    const tx = await splitMain.distributeERC20(
      splitAddress, tokenAddress, accounts, percentAllocations, 0, wallet.address
    );
    console.log(`📝 Tx: ${config.explorer}/tx/${tx.hash}`);
    await tx.wait();
    console.log('✅ Distribution complete!');
  } else {
    // Distribute ETH
    if (splitBalance === 0n) {
      console.log('\n⚠️  No ETH to distribute.');
      return;
    }

    console.log(`\n🚀 Distributing ETH...`);
    const tx = await splitMain.distributeETH(
      splitAddress, accounts, percentAllocations, 0, wallet.address
    );
    console.log(`📝 Tx: ${config.explorer}/tx/${tx.hash}`);
    await tx.wait();
    console.log('✅ Distribution complete!');
  }

  // Show balances after distribution
  console.log('\n📊 Withdrawable balances in SplitMain:');
  for (const r of RECIPIENTS) {
    const ethBal = await splitMain.getETHBalance(r.address);
    console.log(`   ${r.name.padEnd(12)} ${ethers.formatEther(ethBal)} ETH`);
  }

  console.log('\n💡 Recipients can withdraw via:');
  console.log(`   DEPLOYER_KEY=0x... ACCOUNT=<address> node scripts/distribute-split.js withdraw`);
}

// Handle withdraw subcommand
if (process.argv[2] === 'withdraw') {
  (async () => {
    const chain = process.env.CHAIN || 'base';
    const config = CHAINS[chain];
    const deployerKey = process.env.DEPLOYER_KEY;
    const account = process.env.ACCOUNT;
    
    if (!deployerKey || !account) {
      console.error('Set DEPLOYER_KEY and ACCOUNT environment variables');
      process.exit(1);
    }

    const provider = new ethers.JsonRpcProvider(config.rpc);
    const wallet = new ethers.Wallet(deployerKey, provider);
    const splitMain = new ethers.Contract(SPLIT_MAIN, SPLIT_MAIN_ABI, wallet);

    console.log(`🔗 Withdrawing for ${account}...`);
    const tx = await splitMain.withdraw(account, 1, []);
    console.log(`📝 Tx: ${config.explorer}/tx/${tx.hash}`);
    await tx.wait();
    console.log('✅ Withdrawal complete!');
  })().catch(err => { console.error('❌', err.message); process.exit(1); });
} else {
  main().catch(err => { console.error('❌', err.message); process.exit(1); });
}
