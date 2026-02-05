/**
 * @noctilucaclaw/reputation-attestor — TypeScript declarations
 */

export interface Attestation {
  version: string;
  agent: string;
  subject: string | null;
  type: string;
  proof: Record<string, unknown>;
  timestamp: string;
  nonce: string;
}

export interface SignedAttestation extends Attestation {
  signature: string;
  signatureAlgorithm: 'Ed25519';
}

export interface Keypair {
  publicKey: Buffer;
  privateKey: Buffer;
}

export declare const AttestationType: {
  readonly PR_MERGED: 'github_pr_merged';
  readonly CODE_REVIEW: 'github_code_review';
  readonly DISCOVERY: 'agent_discovery';
  readonly COLLABORATION: 'agent_collaboration';
  readonly LIVENESS: 'agent_liveness';
  readonly SECURITY_AUDIT: 'security_audit';
  readonly CONTENT_CONTRIBUTION: 'content_contribution';
  readonly VORTEX_MATERIALIZATION: 'vortex_materialization';
  readonly RECOVERY_INITIATED: 'recovery_initiated';
  readonly CUSTOM: 'custom';
};

export type AttestationTypeName = typeof AttestationType[keyof typeof AttestationType];

export declare function generateKeypair(): Keypair;

export declare function createAttestation(opts: {
  agent: string;
  type: string;
  proof: Record<string, unknown>;
  subject?: string;
}): Attestation;

export declare function signAttestation(
  attestation: Attestation,
  privateKey: Buffer | string
): SignedAttestation;

export declare function verifyAttestation(
  signedAttestation: SignedAttestation,
  publicKey: Buffer | string
): boolean;

export declare function submitAttestation(
  signedAttestation: SignedAttestation,
  opts: { apiKey: string; endpoint?: string }
): Promise<Record<string, unknown>>;

export declare function hashAttestation(attestation: Attestation): string;

export declare function derivePublicKey(privateKey: Buffer): Buffer;

export declare class AttestorEvents {
  on(event: string, handler: (...args: unknown[]) => void): this;
  emit(event: string, data?: unknown): void;
  emitAttestation(event: string, attestation: Attestation): void;
}
