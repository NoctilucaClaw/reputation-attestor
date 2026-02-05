#!/usr/bin/env node
/**
 * Deploy AttestationRegistry to Base Sepolia.
 * 
 * Prerequisites:
 *   - solc (npm install -g solc or use solcjs)
 *   - Base Sepolia ETH in deployer wallet (faucet: https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet)
 * 
 * Usage:
 *   DEPLOYER_KEY=0x... node scripts/deploy-sepolia.js
 *   
 * Or for mainnet:
 *   DEPLOYER_KEY=0x... CHAIN=base node scripts/deploy-sepolia.js
 */

const ethers = require('/usr/local/lib/node_modules/ethers');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const CHAINS = {
  'base-sepolia': {
    rpc: 'https://sepolia.base.org',
    chainId: 84532,
    explorer: 'https://sepolia.basescan.org'
  },
  'base': {
    rpc: 'https://mainnet.base.org',
    chainId: 8453,
    explorer: 'https://basescan.org'
  }
};

async function main() {
  const chain = process.env.CHAIN || 'base-sepolia';
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

  console.log(`🔗 Chain: ${chain} (${config.chainId})`);
  console.log(`🌐 RPC: ${config.rpc}`);

  // Compile contract
  const solFile = path.join(__dirname, '..', 'contracts', 'AttestationRegistry.sol');
  console.log('\n📦 Compiling AttestationRegistry.sol...');

  let compiled;
  try {
    // Try solcjs first
    const solc = require('solc');
    const source = fs.readFileSync(solFile, 'utf8');
    const input = {
      language: 'Solidity',
      sources: { 'AttestationRegistry.sol': { content: source } },
      settings: { outputSelection: { '*': { '*': ['abi', 'evm.bytecode.object'] } } }
    };
    const output = JSON.parse(solc.compile(JSON.stringify(input)));
    if (output.errors?.some(e => e.severity === 'error')) {
      console.error('Compilation errors:', output.errors.filter(e => e.severity === 'error'));
      process.exit(1);
    }
    const contract = output.contracts['AttestationRegistry.sol']['AttestationRegistry'];
    compiled = {
      abi: contract.abi,
      bytecode: '0x' + contract.evm.bytecode.object
    };
    console.log('✅ Compiled with solcjs');
  } catch (e) {
    // Fallback: try solc CLI
    try {
      const result = execSync(
        `solc --combined-json abi,bin --optimize --optimize-runs 200 ${solFile}`,
        { encoding: 'utf8' }
      );
      const json = JSON.parse(result);
      const key = Object.keys(json.contracts).find(k => k.includes('AttestationRegistry'));
      compiled = {
        abi: JSON.parse(json.contracts[key].abi),
        bytecode: '0x' + json.contracts[key].bin
      };
      console.log('✅ Compiled with solc CLI');
    } catch (e2) {
      console.error('❌ No Solidity compiler available. Install: npm install -g solc');
      console.error('   Or: sudo dnf install solidity (Fedora)');
      
      // Check if we have a pre-compiled artifact
      const artifactPath = path.join(__dirname, '..', 'artifacts', 'AttestationRegistry.json');
      if (fs.existsSync(artifactPath)) {
        compiled = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
        console.log('📋 Using pre-compiled artifact');
      } else {
        process.exit(1);
      }
    }
  }

  // Save artifact
  const artifactDir = path.join(__dirname, '..', 'artifacts');
  if (!fs.existsSync(artifactDir)) fs.mkdirSync(artifactDir);
  fs.writeFileSync(
    path.join(artifactDir, 'AttestationRegistry.json'),
    JSON.stringify(compiled, null, 2)
  );
  console.log(`💾 Artifact saved to artifacts/AttestationRegistry.json`);

  // Deploy
  const provider = new ethers.JsonRpcProvider(config.rpc);
  const wallet = new ethers.Wallet(deployerKey, provider);
  const balance = await provider.getBalance(wallet.address);

  console.log(`\n👛 Deployer: ${wallet.address}`);
  console.log(`💰 Balance: ${ethers.formatEther(balance)} ETH`);

  if (balance === 0n) {
    console.error('❌ No ETH! Get testnet ETH from: https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet');
    process.exit(1);
  }

  console.log('\n🚀 Deploying AttestationRegistry...');
  const factory = new ethers.ContractFactory(compiled.abi, compiled.bytecode, wallet);
  const contract = await factory.deploy();
  
  console.log(`📝 Tx: ${config.explorer}/tx/${contract.deploymentTransaction().hash}`);
  console.log('⏳ Waiting for confirmation...');
  
  await contract.waitForDeployment();
  const address = await contract.getAddress();

  console.log(`\n✅ AttestationRegistry deployed!`);
  console.log(`📍 Address: ${address}`);
  console.log(`🔗 Explorer: ${config.explorer}/address/${address}`);

  // Save deployment info
  const deploymentInfo = {
    chain,
    chainId: config.chainId,
    address,
    deployer: wallet.address,
    txHash: contract.deploymentTransaction().hash,
    deployedAt: new Date().toISOString(),
    abi: compiled.abi
  };
  
  const deploymentsDir = path.join(__dirname, '..', 'deployments');
  if (!fs.existsSync(deploymentsDir)) fs.mkdirSync(deploymentsDir);
  fs.writeFileSync(
    path.join(deploymentsDir, `${chain}.json`),
    JSON.stringify(deploymentInfo, null, 2)
  );
  console.log(`💾 Deployment info saved to deployments/${chain}.json`);
  
  // Quick smoke test
  console.log('\n🧪 Smoke test...');
  const registry = new ethers.Contract(address, compiled.abi, wallet);
  const total = await registry.totalAnchors();
  console.log(`   totalAnchors: ${total} (should be 0)`);
  
  // Test anchor
  const testHash = ethers.keccak256(ethers.toUtf8Bytes('test-attestation'));
  const testAgent = ethers.keccak256(ethers.toUtf8Bytes('noctiluca'));
  console.log('   Anchoring test attestation...');
  const tx = await registry.anchor(testHash, testAgent, 'test');
  await tx.wait();
  
  const anchored = await registry.isAnchored(testHash);
  console.log(`   isAnchored: ${anchored} (should be true)`);
  
  const count = await registry.getAnchorCount(testAgent);
  console.log(`   Agent anchor count: ${count} (should be 1)`);
  
  console.log('\n🎉 Deployment and smoke test complete!');
}

main().catch(err => {
  console.error('❌ Deployment failed:', err.message);
  process.exit(1);
});
