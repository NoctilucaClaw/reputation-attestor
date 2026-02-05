/**
 * Basic tests for reputation-attestor
 */
const crypto = require('crypto');
const { createAttestation, signAttestation, verifyAttestation, AttestationType } = require('../lib/index');

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

console.log('reputation-attestor v0.1.0-alpha tests\n');

// Generate test keypair
const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');

// Test 1: Create attestation
console.log('createAttestation:');
const att = createAttestation({
  agent: 'test-agent',
  type: AttestationType.PR_MERGED,
  proof: { repo: 'owner/repo', pr_number: 1, merge_commit_sha: 'abc123' }
});
assert(att.agent === 'test-agent', 'agent set correctly');
assert(att.type === 'github_pr_merged', 'type set correctly');
assert(att.version === '0.1.0', 'version present');
assert(att.nonce && att.nonce.length === 32, 'nonce generated');
assert(att.timestamp, 'timestamp present');

// Test 2: Sign attestation
console.log('\nsignAttestation:');
const pemPrivate = privateKey.export({ type: 'pkcs8', format: 'pem' });
const signed = signAttestation(att, pemPrivate);
assert(signed.signature, 'signature present');
assert(signed.signatureAlgorithm === 'Ed25519', 'algorithm is Ed25519');
assert(signed.agent === att.agent, 'original data preserved');

// Test 3: Verify attestation
console.log('\nverifyAttestation:');
const pemPublic = publicKey.export({ type: 'spki', format: 'pem' });
const valid = verifyAttestation(signed, pemPublic);
assert(valid === true, 'valid signature passes');

// Test 4: Tampered attestation fails
console.log('\ntamper detection:');
const tampered = { ...signed, agent: 'fake-agent' };
const invalid = verifyAttestation(tampered, pemPublic);
assert(invalid === false, 'tampered attestation rejected');

// Test 5: Subject attestation
console.log('\nsubject attestation:');
const subjAtt = createAttestation({
  agent: 'noctiluca',
  type: AttestationType.COLLABORATION,
  proof: { project: 'soup-kitchen', contribution: 'infra-docs' },
  subject: 'skarlun'
});
assert(subjAtt.subject === 'skarlun', 'subject set correctly');

// Test 6: Missing fields throw
console.log('\nvalidation:');
try {
  createAttestation({ agent: 'test' });
  assert(false, 'should throw on missing type');
} catch (e) {
  assert(e.message.includes('required'), 'throws on missing fields');
}

// Test 7: VORTEX materialization attestation
console.log('\nvortex_materialization:');
const { generateKeypair, hashAttestation, derivePublicKey } = require('../lib/index');
const kp = generateKeypair();
const vortexAtt = createAttestation({
  agent: 'BigBob',
  type: AttestationType.VORTEX_MATERIALIZATION,
  proof: { anchor_cid: 'bafybeigdyrzt5sfp7udm7hu76uh7y26nf3', status: 'confirmed', grace_period_hours: 48 }
});
const vortexSigned = signAttestation(vortexAtt, kp.privateKey);
const derPub = derivePublicKey(kp.privateKey);
const vortexValid = verifyAttestation(vortexSigned, derPub);
assert(vortexAtt.type === 'vortex_materialization', 'vortex type set');
assert(vortexValid === true, 'vortex attestation verifies with derived key');

// Test 8: recovery_initiated type
console.log('\nrecovery_initiated:');
const recoveryAtt = createAttestation({
  agent: 'Noctiluca',
  type: AttestationType.RECOVERY_INITIATED,
  proof: { reason: 'node_down', recovery_action: 'failover' }
});
assert(recoveryAtt.type === 'recovery_initiated', 'recovery type set');

// Test 9: hashAttestation is deterministic
console.log('\nhashAttestation:');
const h1 = hashAttestation(att);
const h2 = hashAttestation(att);
assert(h1 === h2, 'hash is deterministic');
assert(h1.length === 64, 'hash is SHA-256 hex (64 chars)');

// Test 10: generateKeypair works
console.log('\ngenerateKeypair:');
assert(Buffer.isBuffer(kp.publicKey), 'publicKey is Buffer');
assert(Buffer.isBuffer(kp.privateKey), 'privateKey is Buffer');
assert(kp.publicKey.length > 0, 'publicKey has content');

// Test 11: All types exist
console.log('\nAttestationType coverage:');
const allTypes = Object.values(AttestationType);
assert(allTypes.includes('vortex_materialization'), 'vortex_materialization in types');
assert(allTypes.includes('recovery_initiated'), 'recovery_initiated in types');
assert(allTypes.includes('security_audit'), 'security_audit in types');
assert(allTypes.length >= 10, `${allTypes.length} attestation types defined`);

// Test 12: AttestorEvents wildcard
console.log('\nAttestorEvents wildcard:');
const { AttestorEvents } = require('../lib/index');
const events = new AttestorEvents();
let wildcardCaught = null;
events.on('*', (event, data) => { wildcardCaught = event; });
events.emitAttestation('signed', { id: 'test' });
assert(wildcardCaught === 'signed', 'wildcard catches event name');

console.log(`\n📊 ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
