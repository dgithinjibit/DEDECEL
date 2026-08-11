pragma circom 2.1.6;

include "poseidon.circom";

/*
  CERT COMMITMENT circuit — BIDECEL ZK proof #1 (slice 1).

  WHAT IT PROVES (in zero knowledge):
    "I know the secret parts of a certificate whose Poseidon commitment equals this public value."
    ...without revealing those secret parts.

  This matches backend/src/poseidon.ts exactly. There we compute:
      commitment = Poseidon(saltField, digestHi, digestLo)
  where (saltField, digestHi, digestLo) are derived from the salted+peppered SHA-256 digest of the
  certificate (the two 128-bit limbs) and the per-record salt. Those three are the PRIVATE witness.
  The commitment is the single PUBLIC output.

  So a prover who holds a real certificate (and thus its salt + can recompute the digest) can
  produce a proof that verifies against the public `commitment` the /verify API publishes — proving
  the certificate is genuine WITHOUT exposing any of its contents.

  Poseidon here is circomlib's Poseidon, whose round constants match poseidon-lite, so the value
  computed off-chain in poseidon.ts and the value computed in-circuit agree bit-for-bit.
*/

template CertCommitment() {
    // Private witness (the "secret" the prover holds; never revealed).
    signal input saltField;   // salt mapped into the BN254 field
    signal input digestHi;    // high 128 bits of the salted+peppered SHA-256 digest
    signal input digestLo;    // low  128 bits of that digest

    // Public output: the commitment the verifier checks against.
    signal output commitment;

    // Poseidon over exactly 3 inputs, in the SAME order as poseidon3([saltField, hi, lo]).
    component h = Poseidon(3);
    h.inputs[0] <== saltField;
    h.inputs[1] <== digestHi;
    h.inputs[2] <== digestLo;

    commitment <== h.out;
}

component main = CertCommitment();
