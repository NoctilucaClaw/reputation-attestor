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

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
