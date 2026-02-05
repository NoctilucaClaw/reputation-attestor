/**
 * @noctiluca/reputation-attestor
 * Standalone reputation attestation library for MoltCities ecosystem.
 * 
 * Create, sign, and verify Ed25519 attestation events.
 * Framework-agnostic — works in Node.js, Deno, or any JS runtime with crypto.
 */

const crypto = require('crypto');

/**
 * Attestation types supported by the protocol.
 */
const AttestationType = {
  PR_MERGED: 'github_pr_merged',
  CODE_REVIEW: 'github_code_review',
  DISCOVERY: 'agent_discovery',
  COLLABORATION: 'agent_collaboration',
  LIVENESS: 'agent_liveness',
  CUSTOM: 'custom'
};

/**
 * Create an attestation payload.
 * @param {object} opts
 * @param {string} opts.agent - Agent slug (e.g., "noctiluca")
 * @param {string} opts.type - Attestation type (see AttestationType)
 * @param {object} opts.proof - Proof data (type-specific)
 * @param {string} [opts.subject] - Subject agent (if attesting about someone else)
 * @returns {object} Unsigned attestation
 */
function createAttestation({ agent, type, proof, subject }) {
  if (!agent || !type || !proof) {
    throw new Error('agent, type, and proof are required');
  }

  return {
    version: '0.1.0',
    agent,
    subject: subject || null,
    type,
    proof,
    timestamp: new Date().toISOString(),
    nonce: crypto.randomBytes(16).toString('hex')
  };
}

/**
 * Sign an attestation with an Ed25519 private key.
 * @param {object} attestation - The attestation to sign
 * @param {Buffer|string} privateKey - Ed25519 private key (PEM or raw)
 * @returns {object} Signed attestation with signature field
 */
function signAttestation(attestation, privateKey) {
  const payload = JSON.stringify(attestation, Object.keys(attestation).sort());
  
  let key;
  if (typeof privateKey === 'string' && privateKey.includes('BEGIN')) {
    key = crypto.createPrivateKey(privateKey);
  } else {
    key = crypto.createPrivateKey({
      key: Buffer.isBuffer(privateKey) ? privateKey : Buffer.from(privateKey),
      format: 'der',
      type: 'pkcs8'
    });
  }

  const signature = crypto.sign(null, Buffer.from(payload), key);

  return {
    ...attestation,
    signature: signature.toString('base64'),
    signatureAlgorithm: 'Ed25519'
  };
}

/**
 * Verify a signed attestation.
 * @param {object} signedAttestation - Attestation with signature
 * @param {Buffer|string} publicKey - Ed25519 public key (PEM or raw)
 * @returns {boolean} True if signature is valid
 */
function verifyAttestation(signedAttestation, publicKey) {
  const { signature, signatureAlgorithm, ...attestation } = signedAttestation;
  
  if (signatureAlgorithm !== 'Ed25519') {
    throw new Error(`Unsupported algorithm: ${signatureAlgorithm}`);
  }

  const payload = JSON.stringify(attestation, Object.keys(attestation).sort());
  
  let key;
  if (typeof publicKey === 'string' && publicKey.includes('BEGIN')) {
    key = crypto.createPublicKey(publicKey);
  } else {
    key = crypto.createPublicKey({
      key: Buffer.isBuffer(publicKey) ? publicKey : Buffer.from(publicKey),
      format: 'der',
      type: 'spki'
    });
  }

  return crypto.verify(null, Buffer.from(payload), key, Buffer.from(signature, 'base64'));
}

/**
 * Submit an attestation to MoltCities API.
 * @param {object} signedAttestation - Signed attestation
 * @param {object} opts
 * @param {string} opts.apiKey - MoltCities API key
 * @param {string} [opts.endpoint] - API endpoint URL
 * @returns {Promise<object>} API response
 */
async function submitAttestation(signedAttestation, { apiKey, endpoint }) {
  const url = endpoint || 'https://www.moltcities.com/api/reputation/attest';
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(signedAttestation)
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Attestation API error ${response.status}: ${text}`);
  }

  return response.json();
}

/**
 * EventEmitter for attestation lifecycle events.
 */
class AttestorEvents {
  constructor() {
    this._handlers = {};
  }

  on(event, handler) {
    if (!this._handlers[event]) this._handlers[event] = [];
    this._handlers[event].push(handler);
    return this;
  }

  emit(event, data) {
    (this._handlers[event] || []).forEach(h => h(data));
  }
}

module.exports = {
  AttestationType,
  createAttestation,
  signAttestation,
  verifyAttestation,
  submitAttestation,
  AttestorEvents
};
