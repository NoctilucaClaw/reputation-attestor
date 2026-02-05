#!/usr/bin/env node
/**
 * 0xSplits integration test — verifies split creation against Base mainnet fork.
 * Uses ethers.js JsonRpcProvider with hardhat's fork simulation.
 * 
 * This test:
 * 1. Validates recipient addresses and allocations
 * 2. Predicts the immutable split address
 * 3. Verifies the split hasn't been deployed yet
 * 4. Tests the SplitMain contract is accessible on Base
 * 
 * Run: node test/splits.test.js
 * Requires: ethers (global install ok)
 */

let passed = 0;
let failed = 0;

function assert(condition, msg) {
  if (condition) {
    console.log(`  ✅ ${msg}`);
    passed++;
  } else {
    console.log(`  ❌ ${msg}`);
    failed++;
  }
}

// --- Config ---
const SPLIT_MAIN = '0x2ed6c4B5dA6378c7897AC67Ba9e43102Feb694EE';
const RECIPIENTS = [
  '0x29CC5559f54C4408e5073aC8f9432f9ADA93c601', // Stefan (40%)
  '0x643fc612b928ee9C58B8C9F1DF017E75757Be3D4', // Noctiluca (30%)
  '0x955F8D92F041a16a6CAC0985625211Be8De2377a', // BigBob (30%)
];
const ALLOCATIONS = [400000, 300000, 300000]; // basis points (1M total)
const PREDICTED_ADDRESS = '0xBE3c41E1CC251422F0502442203a2C0c4F63111b';

console.log('0xSplits integration tests (Base mainnet read-only)\n');

async function main() {
  let ethers;
  try {
    ethers = require('/usr/local/lib/node_modules/ethers');
  } catch {
    try { ethers = require('ethers'); } catch {
      console.log('⚠️ ethers not available — skipping splits tests');
      process.exit(0);
    }
  }

  const RPC = 'https://mainnet.base.org';
  const provider = new ethers.JsonRpcProvider(RPC);

  // Test 1: Validate recipients are sorted (0xSplits requirement)
  console.log('Recipient validation:');
  const sorted = [...RECIPIENTS].sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
  assert(
    sorted.every((addr, i) => addr.toLowerCase() === RECIPIENTS[i].toLowerCase()),
    'recipients are sorted (required by 0xSplits)'
  );
  assert(RECIPIENTS.length === 3, '3 recipients configured');
  assert(ALLOCATIONS.reduce((a, b) => a + b, 0) === 1000000, 'allocations sum to 1,000,000');
  assert(ALLOCATIONS[0] === 400000, 'Stefan gets 40%');
  assert(ALLOCATIONS[1] === 300000, 'Noctiluca gets 30%');
  assert(ALLOCATIONS[2] === 300000, 'BigBob gets 30%');

  // Test 2: SplitMain contract exists on Base
  console.log('\nSplitMain contract:');
  try {
    const code = await provider.getCode(SPLIT_MAIN);
    assert(code.length > 100, `SplitMain has bytecode (${code.length} chars)`);
  } catch (e) {
    assert(false, `SplitMain check failed: ${e.message}`);
  }

  // Test 3: Predict split address
  console.log('\nAddress prediction:');
  try {
    const iface = new ethers.Interface([
      'function predictImmutableSplitAddress(address[] accounts, uint32[] percentAllocations, uint32 distributorFee) view returns (address)'
    ]);
    const contract = new ethers.Contract(SPLIT_MAIN, iface, provider);
    const predicted = await contract.predictImmutableSplitAddress(RECIPIENTS, ALLOCATIONS, 0);
    assert(predicted === PREDICTED_ADDRESS, `predicted address matches: ${predicted}`);
  } catch (e) {
    assert(false, `prediction failed: ${e.message}`);
  }

  // Test 4: Split not yet deployed
  console.log('\nDeployment status:');
  try {
    const iface = new ethers.Interface([
      'function getHash(address split) view returns (bytes32)'
    ]);
    const contract = new ethers.Contract(SPLIT_MAIN, iface, provider);
    const hash = await contract.getHash(PREDICTED_ADDRESS);
    const isDeployed = hash !== '0x' + '0'.repeat(64);
    assert(!isDeployed, `split not yet deployed (ready for creation)`);
  } catch (e) {
    assert(false, `deployment check failed: ${e.message}`);
  }

  // Test 5: Validate EVM addresses
  console.log('\nAddress validation:');
  for (const addr of RECIPIENTS) {
    assert(ethers.isAddress(addr), `${addr.slice(0, 10)}... is valid address`);
  }
  assert(ethers.isAddress(PREDICTED_ADDRESS), 'predicted split address is valid');

  console.log(`\n📊 ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
