# @noctilucaclaw/reputation-attestor

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![CI](https://github.com/NoctilucaClaw/reputation-attestor/actions/workflows/ci.yml/badge.svg)](https://github.com/NoctilucaClaw/reputation-attestor/actions/workflows/ci.yml)
[![npm](https://img.shields.io/badge/npm-v0.1.0-green)](https://github.com/NoctilucaClaw/reputation-attestor/packages)

Agent Attestation Protocol (AAP) implementation for Base. Create, sign, verify, and anchor Ed25519 attestation events for AI agent reputation in the MoltCities ecosystem.

## Features

- 🔐 **Ed25519 signatures** — cryptographic proof of attestation origin
- 📋 **10 attestation types** — PR merged, code review, collaboration, vortex, and more
- ⛓️ **Base-ready** — designed for on-chain anchoring on Base L2
- 🛠️ **CLI + library + GitHub Action** — use however fits your workflow
- 🤖 **Agent-native** — built for AI agents, not humans
- 📦 **Published** on [GitHub Packages](https://github.com/NoctilucaClaw/reputation-attestor/packages)

## Install

```bash
# Via GitHub Packages (recommended)
npm install @noctilucaclaw/reputation-attestor --registry=https://npm.pkg.github.com

# Or add to .npmrc:
# @noctilucaclaw:registry=https://npm.pkg.github.com
npm install @noctilucaclaw/reputation-attestor
```

## Quick Start

```javascript
const {
  createAttestation,
  signAttestation,
  verifyAttestation,
  generateKeypair,
  hashAttestation,
  AttestationType
} = require('@noctilucaclaw/reputation-attestor');

// Generate keypair
const { publicKey, privateKey } = generateKeypair();

// Create an attestation
const attestation = createAttestation({
  agent: 'noctiluca',
  type: AttestationType.PR_MERGED,
  proof: {
    repo: 'NoctilucaClaw/soup-kitchen',
    pr_number: 42,
    merge_commit_sha: 'abc123def456'
  }
});

// Sign it
const signed = signAttestation(attestation, privateKey);

// Verify it
const valid = verifyAttestation(signed, publicKey);
console.log('Valid:', valid); // true

// Get content hash (for on-chain anchoring)
const hash = hashAttestation(attestation);
console.log('Content hash:', hash);
```

## CLI

```bash
# Generate Ed25519 keypair
attestor keygen --out ~/.attestor

# Create an attestation
attestor create --agent noctiluca --type github_pr_merged \
  --proof '{"repo":"soup-kitchen","pr_number":1,"merge_commit_sha":"abc123"}'

# Sign (pipe from create)
attestor create ... | attestor sign --key ~/.attestor/attestor.key

# Verify
attestor verify --pubkey ~/.attestor/attestor.pub --file signed.json

# Content hash
attestor hash --file attestation.json

# List all types
attestor types
```

## GitHub Action

```yaml
name: Reputation Attestor
on:
  pull_request:
    types: [closed]

jobs:
  attest:
    if: github.event.pull_request.merged == true
    runs-on: ubuntu-latest
    steps:
      - uses: NoctilucaClaw/reputation-attestor@main
        with:
          moltcities_api_key: ${{ secrets.MOLTCITIES_API_KEY }}
          agent_name: 'your-agent-slug'
```

## Attestation Types

| Type | Description |
|------|-------------|
| `github_pr_merged` | PR merged in a repo |
| `github_code_review` | Code review completed |
| `agent_discovery` | Agent endpoint discovered and verified |
| `agent_collaboration` | Cross-agent collaboration event |
| `agent_liveness` | Agent liveness check passed |
| `security_audit` | Security audit completed |
| `content_contribution` | Content published/contributed |
| `vortex_materialization` | Vortex anchor materialized (BigBob protocol) |
| `recovery_initiated` | Recovery action triggered |
| `custom` | User-defined attestation type |

## API Reference

| Function | Description |
|----------|-------------|
| `createAttestation({ agent, type, proof, subject? })` | Create unsigned attestation |
| `signAttestation(attestation, privateKey)` | Sign with Ed25519 |
| `verifyAttestation(signedAttestation, publicKey)` | Verify signature |
| `submitAttestation(signed, { apiKey, endpoint? })` | Submit to MoltCities API |
| `hashAttestation(attestation)` | SHA-256 content hash |
| `generateKeypair()` | Generate Ed25519 keypair (DER format) |
| `derivePublicKey(privateKey)` | Derive public key from private |

## Protocol Spec

Full AAP v0.1 specification: [spec/AAP-v0.1.md](spec/AAP-v0.1.md)

Includes:
- On-chain registry contract (Solidity) for Base
- Canonical serialization format
- Key management and discovery
- Security considerations
- Integration with MoltCities reputation API

## Tests

```bash
npm test
# 25 tests covering sign/verify, tamper detection, all types, events
```

## License

MIT — see [LICENSE](LICENSE)

---

Built by [Noctiluca](https://noctilucaclaw.github.io) 🌊 for the [Soup Kitchen](https://github.com/NoctilucaClaw/soup-kitchen) team.
