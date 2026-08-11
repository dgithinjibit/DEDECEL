/*
  near-encoding.ts — convert snarkjs/circom Groth16 objects into the byte layout that NEAR's
  alt_bn128 host functions expect.

  WHY THIS EXISTS (the little-endian decision, locked 2026-08-11):
    snarkjs emits field elements as DECIMAL STRINGS, and the on-chain EIP-197-style convention people
    reach for first is BIG-endian. NEAR's alt_bn128 precompiles instead read fixed-size LITTLE-endian
    integers (32-byte scalars / Fq coords, points as x‖y). So before a snarkjs proof can be checked
    on NEAR we must re-encode every field element big→little-endian, and lay out G1/G2 points in the
    exact order the host functions consume. This mirrors what groth16-solana's conversion script does.

  See docs/research/groth16-on-near-verification-2026.md (Q1 encoding, the REFUTED EIP-197 claim).

  BYTE LAYOUT produced here (all integers little-endian, 32 bytes each):
    Fq / Fr element : 32 bytes LE
    G1 point        : x(32) ‖ y(32)                     = 64 bytes
    G2 point        : x.c0(32) ‖ x.c1(32) ‖ y.c0(32) ‖ y.c1(32) = 128 bytes

  Fq2 ORDERING NOTE: snarkjs stores an Fq2 coordinate as the array [c0, c1] (real part first). NEAR's
  runtime (arkworks-compatible) reads Fq2 as (c0, c1) little-endian in that same c0-then-c1 order, so
  we serialize [0] then [1]. This is called out explicitly because it is the classic porting footgun
  (Ethereum/EIP-197 swaps them); the Rust verifier MUST assume the same order this file produces.
*/

/**
 * BN254 BASE field modulus (Fq) — the field the G1/G2 point *coordinates* live in, so this is
 * what coordinate negation (`-A`, `-y`) reduces against. This is `q`, NOT the scalar field `r`
 * (which ends in ...495617). The two share leading digits, so a mix-up here is silent: it makes
 * every valid proof reject on-chain. Must match FQ_LE in crates/zk-encoding/src/lib.rs.
 */
const FQ =
  21888242871839275222246405745257275088696311157297823662689037894645226208583n;

/** Serialize a single field element (given as a decimal or 0x string) to 32-byte little-endian. */
export function fieldToLe32(value: string): Uint8Array {
  let n = (value.startsWith('0x') ? BigInt(value) : BigInt(value)) % FQ;
  if (n < 0n) n += FQ;
  const out = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    out[i] = Number(n & 0xffn); // least-significant byte first == little-endian
    n >>= 8n;
  }
  return out;
}

/** snarkjs G1 point is [x, y, z]; z is projective and always "1" in the affine output we consume. */
export type SnarkG1 = [string, string, string];
/** snarkjs G2 point is [[x.c0, x.c1], [y.c0, y.c1], [z.c0, z.c1]]; z == ["1","0"]. */
export type SnarkG2 = [[string, string], [string, string], [string, string]];

function concat(...parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(total);
  let off = 0;
  for (const p of parts) {
    out.set(p, off);
    off += p.length;
  }
  return out;
}

/** G1 -> 64 bytes: x(LE32) ‖ y(LE32). Ignores the projective z (asserted affine). */
export function g1ToLe(p: SnarkG1): Uint8Array {
  return concat(fieldToLe32(p[0]), fieldToLe32(p[1]));
}

/** G2 -> 128 bytes: x.c0 ‖ x.c1 ‖ y.c0 ‖ y.c1, each LE32, c0-before-c1 (see Fq2 ordering note). */
export function g2ToLe(p: SnarkG2): Uint8Array {
  return concat(
    fieldToLe32(p[0][0]),
    fieldToLe32(p[0][1]),
    fieldToLe32(p[1][0]),
    fieldToLe32(p[1][1])
  );
}

/**
 * Negate a G1 point over Fq: (x, y) -> (x, -y mod q). Groth16 verification needs -A for the pairing
 * equation e(-A,B)·e(alpha,beta)·e(vk_x,gamma)·e(C,delta) == 1. We negate here so the Rust side can
 * feed the pairs directly.
 */
export function negateG1(p: SnarkG1): SnarkG1 {
  const y = BigInt(p[1]) % FQ;
  const negY = (FQ - (y < 0n ? y + FQ : y)) % FQ;
  return [p[0], negY.toString(), p[2]];
}

export interface SnarkProof {
  pi_a: SnarkG1;
  pi_b: SnarkG2;
  pi_c: SnarkG1;
}

/**
 * Encode a snarkjs proof + its public signals into the NEAR pairing-check input for our
 * cert_commitment circuit (verification key baked into the Rust contract).
 *
 * The pairing check is over 4 pairs (G1, G2):
 *   (-A, B), (alpha, beta), (vk_x, gamma), (C, delta)
 * The vk-derived pairs (alpha/beta, gamma, delta) and IC are constants known to the contract, so
 * here we only ship the parts that vary per proof: the negated A, B, C, and vk_x (= IC[0] +
 * sum(publicSignal_i * IC[i+1])). We return the pieces separately so the Rust side can assemble the
 * final 4-pair buffer against its baked-in vk. `vkX` is computed on the Rust side from publicSignals
 * for trust-minimization, so we also pass the raw signals through.
 *
 * Returns raw little-endian byte blobs the contract method takes as base64/hex args.
 */
export function encodeProofForNear(proof: SnarkProof, publicSignals: string[]): {
  negA: Uint8Array; // G1, 64B
  b: Uint8Array;    // G2, 128B
  c: Uint8Array;    // G1, 64B
  publicSignals: Uint8Array[]; // each Fr as LE32
} {
  return {
    negA: g1ToLe(negateG1(proof.pi_a)),
    b: g2ToLe(proof.pi_b),
    c: g1ToLe(proof.pi_c),
    publicSignals: publicSignals.map((s) => fieldToLe32(s)),
  };
}

/** Hex-encode a byte blob (lowercase, no 0x) — the wire format for the contract call args. */
export function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}
