#!/usr/bin/env node
/**
 * Unwrap WETH → ETH on Base mainnet.
 * 
 * Converts a specified amount of WETH back to native ETH.
 * Used to get gas ETH from WETH holdings.
 * 
 * Usage:
 *   DEPLOYER_KEY=0x... node scripts/unwrap-weth.js [amount_in_ether]
 *   
 * Default: unwraps 0.001 WETH → 0.001 ETH (enough for several deploys)
 * 
 * Example:
 *   DEPLOYER_KEY=0x... node scripts/unwrap-weth.js 0.002
 */

const ethers = require('/usr/local/lib/node_modules/ethers');

const WETH_ADDRESS = '0x4200000000000000000000000000000000000006'; // WETH on Base
const WETH_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function withdraw(uint256 wad)',
  'function deposit() payable',
  'event Withdrawal(address indexed src, uint256 wad)',
];

const BASE_RPC = 'https://mainnet.base.org';

async function main() {
  const deployerKey = process.env.DEPLOYER_KEY;
  if (!deployerKey) {
    console.error('❌ Set DEPLOYER_KEY environment variable');
    process.exit(1);
  }

  const amount = process.argv[2] || '0.001';
  const amountWei = ethers.parseEther(amount);

  console.log('🔄 WETH → ETH Unwrap on Base\n');

  const provider = new ethers.JsonRpcProvider(BASE_RPC);
  const wallet = new ethers.Wallet(deployerKey, provider);
  const weth = new ethers.Contract(WETH_ADDRESS, WETH_ABI, wallet);

  // Check balances
  const ethBalance = await provider.getBalance(wallet.address);
  const wethBalance = await weth.balanceOf(wallet.address);

  console.log(`Address: ${wallet.address}`);
  console.log(`ETH balance:  ${ethers.formatEther(ethBalance)} ETH`);
  console.log(`WETH balance: ${ethers.formatEther(wethBalance)} WETH`);
  console.log(`Unwrapping:   ${amount} WETH → ETH\n`);

  if (wethBalance < amountWei) {
    console.error(`❌ Insufficient WETH. Have ${ethers.formatEther(wethBalance)}, need ${amount}`);
    process.exit(1);
  }

  // Check if we have enough ETH for gas
  const gasEstimate = await weth.withdraw.estimateGas(amountWei);
  const feeData = await provider.getFeeData();
  const gasCost = gasEstimate * (feeData.gasPrice || 0n);
  
  console.log(`Gas estimate: ${gasEstimate.toString()} units (~${ethers.formatEther(gasCost)} ETH)`);

  if (ethBalance < gasCost) {
    console.error(`❌ Not enough ETH for gas. Have ${ethers.formatEther(ethBalance)}, need ~${ethers.formatEther(gasCost)}`);
    console.error('💡 First transaction needs ETH for gas. Options:');
    console.error('   1. Ask Skarlun/team for tiny ETH transfer (~0.0001 ETH)');
    console.error('   2. Use a gas sponsorship service');
    process.exit(1);
  }

  // Execute unwrap
  console.log('📤 Sending withdraw transaction...');
  const tx = await weth.withdraw(amountWei);
  console.log(`TX hash: ${tx.hash}`);
  console.log(`Explorer: https://basescan.org/tx/${tx.hash}`);
  console.log('⏳ Waiting for confirmation...');

  const receipt = await tx.wait();
  console.log(`✅ Confirmed in block ${receipt.blockNumber}`);
  console.log(`Gas used: ${receipt.gasUsed.toString()}`);

  // Final balances
  const newEthBalance = await provider.getBalance(wallet.address);
  const newWethBalance = await weth.balanceOf(wallet.address);
  console.log(`\nNew ETH balance:  ${ethers.formatEther(newEthBalance)} ETH`);
  console.log(`New WETH balance: ${ethers.formatEther(newWethBalance)} WETH`);
}

main().catch(e => {
  console.error('❌ Error:', e.message);
  process.exit(1);
});
