#!/usr/bin/env node
/**
 * @noctiluca/reputation-attestor CLI
 * Create, sign, verify, and inspect attestations from the command line.
 * 
 * Usage:
 *   attestor keygen [--out <dir>]
 *   attestor create --agent <slug> --type <type> --proof <json>
 *   attestor sign --key <path> [--stdin | --file <path>]
 *   attestor verify --pubkey <path> [--stdin | --file <path>]
 *   attestor hash [--stdin | --file <path>]
 *   attestor types
 */

const {
  AttestationType,
  generateKeypair,
  createAttestation,
  signAttestation,
  verifyAttestation,
  hashAttestation
} = require('../lib/index.js');
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const command = args[0];

function getArg(name) {
  const idx = args.indexOf(`--${name}`);
  if (idx === -1 || idx + 1 >= args.length) return null;
  return args[idx + 1];
}

function hasFlag(name) {
  return args.includes(`--${name}`);
}

function readInput() {
  const file = getArg('file');
  if (file) return fs.readFileSync(file, 'utf8');
  if (hasFlag('stdin') || !process.stdin.isTTY) {
    return fs.readFileSync(0, 'utf8');
  }
  console.error('Error: provide --file <path> or pipe via stdin');
  process.exit(1);
}

function out(obj) {
  console.log(JSON.stringify(obj, null, 2));
}

async function main() {
  switch (command) {
    case 'keygen': {
      const dir = getArg('out') || '.';
      const { publicKey, privateKey } = generateKeypair();
      
      const privPath = path.join(dir, 'attestor.key');
      const pubPath = path.join(dir, 'attestor.pub');
      
      fs.writeFileSync(privPath, privateKey);
      fs.writeFileSync(pubPath, publicKey);
      fs.chmodSync(privPath, 0o600);
      
      console.log(`✅ Ed25519 keypair generated`);
      console.log(`   Private: ${privPath} (chmod 600)`);
      console.log(`   Public:  ${pubPath}`);
      break;
    }

    case 'create': {
      const agent = getArg('agent');
      const type = getArg('type');
      const proofStr = getArg('proof');
      const subject = getArg('subject');

      if (!agent || !type) {
        console.error('Usage: attestor create --agent <slug> --type <type> --proof <json>');
        console.error('Types:', Object.values(AttestationType).join(', '));
        process.exit(1);
      }

      let proof;
      try {
        proof = proofStr ? JSON.parse(proofStr) : { note: 'manual attestation' };
      } catch {
        console.error('Error: --proof must be valid JSON');
        process.exit(1);
      }

      const attestation = createAttestation({ agent, type, proof, subject });
      out(attestation);
      break;
    }

    case 'sign': {
      const keyPath = getArg('key');
      if (!keyPath) {
        console.error('Usage: attestor sign --key <private-key-path> [--file <attestation.json>]');
        process.exit(1);
      }

      const key = fs.readFileSync(keyPath);
      const attestation = JSON.parse(readInput());
      const signed = signAttestation(attestation, key);
      out(signed);
      break;
    }

    case 'verify': {
      const pubPath = getArg('pubkey');
      if (!pubPath) {
        console.error('Usage: attestor verify --pubkey <public-key-path> [--file <signed.json>]');
        process.exit(1);
      }

      const pubkey = fs.readFileSync(pubPath);
      const signed = JSON.parse(readInput());
      const valid = verifyAttestation(signed, pubkey);
      
      if (valid) {
        console.log('✅ Signature VALID');
        console.log(`   Agent: ${signed.agent}`);
        console.log(`   Type: ${signed.type}`);
        console.log(`   Time: ${signed.timestamp}`);
        process.exit(0);
      } else {
        console.log('❌ Signature INVALID');
        process.exit(1);
      }
      break;
    }

    case 'hash': {
      const attestation = JSON.parse(readInput());
      const hash = hashAttestation(attestation);
      console.log(hash);
      break;
    }

    case 'types': {
      console.log('Available attestation types:');
      for (const [key, val] of Object.entries(AttestationType)) {
        console.log(`  ${val.padEnd(30)} (${key})`);
      }
      break;
    }

    case 'help':
    case '--help':
    case undefined: {
      console.log(`@noctiluca/reputation-attestor v0.1.0-alpha.2

Commands:
  keygen [--out <dir>]              Generate Ed25519 keypair
  create --agent <slug> --type <t>  Create unsigned attestation
  sign --key <path>                 Sign attestation (pipe or --file)
  verify --pubkey <path>            Verify signed attestation
  hash                              SHA-256 content hash
  types                             List attestation types

Examples:
  attestor keygen --out ~/.attestor
  attestor create --agent noctiluca --type github_pr_merged --proof '{"repo":"soup-kitchen","pr":1}'
  attestor create ... | attestor sign --key ~/.attestor/attestor.key
  attestor verify --pubkey ~/.attestor/attestor.pub --file signed.json`);
      break;
    }

    default:
      console.error(`Unknown command: ${command}. Run 'attestor help' for usage.`);
      process.exit(1);
  }
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
