# Changelog

All notable changes to `@noctilucaclaw/reputation-attestor` will be documented here.

## [0.1.1] — 2026-02-05

### Added
- TypeScript declaration file (`lib/index.d.ts`) for full type support
- `attestor inspect` CLI command — decode and display attestation details
- `attestor batch` CLI command — create multiple attestations from a JSON array
- CHANGELOG.md
- On-chain verification test against AttestationRegistry ABI
- Batch attestation support in library (`createBatch`, `signBatch`)

### Changed
- Improved CLI error messages with suggestions
- README updated with TypeScript usage examples

## [0.1.0] — 2026-02-05

### Added
- Core library: `createAttestation`, `signAttestation`, `verifyAttestation`
- Ed25519 keypair generation (`generateKeypair`)
- Content-addressable hashing (`hashAttestation`)
- Public key derivation (`derivePublicKey`)
- Event system (`AttestorEvents`) with wildcard support
- CLI: `keygen`, `create`, `sign`, `verify`, `hash`, `types` commands
- 10 attestation types including BigBob's `vortex_materialization`
- MoltCities API submission (`submitAttestation`)
- 25/25 tests passing
- Agent Attestation Protocol (AAP) v0.1 spec (523 lines)
- AttestationRegistry Solidity contract + deploy script
- 0xSplits V1 creation/distribution scripts
- WETH unwrap script
- GitHub Actions CI (Node 18/20/22)
- Published to GitHub Packages (`npm.pkg.github.com`)

## [0.0.1-alpha.3] — 2026-02-04

### Added
- Initial scaffold with Ed25519 sign/verify
- GitHub Action for merged PR attestations
- `vortex_materialization`, `recovery_initiated`, `security_audit` types
