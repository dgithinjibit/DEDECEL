// =============================================================================
// zk-encoding — the SINGLE SOURCE OF TRUTH for how snarkjs/circom Groth16 objects
// are laid out in bytes for NEAR's alt_bn128 host functions.
//
// WHY THIS CRATE EXISTS:
//   The little-endian / Fq2-ordering conversion is the most correctness-critical,
//   most footgun-prone piece in the whole project (a wrong byte order silently makes
//   the on-chain verifier reject valid proofs). It was originally written TWICE — once
//   inline in the contract and once in TypeScript — which is exactly where such a bug
//   hides. This crate defines it ONCE. The contract depends on it directly; the
//   TypeScript backend is pinned to it via shared golden vectors (see `golden_vectors`).
//
// NO external deps, no near-sdk, `no_std` — so the on-chain contract (wasm) and any
// host tool can both use it without pulling anything in.
//
// BYTE LAYOUT (all field integers little-endian, 32 bytes each):
//   Fq / Fr element : 32 bytes LE
//   G1 point        : x(32) ‖ y(32)                         = 64 bytes
//   G2 point        : x.c0(32) ‖ x.c1(32) ‖ y.c0(32) ‖ y.c1(32) = 128 bytes
//
// Fq2 ORDERING: snarkjs prints an Fq2 as [c0, c1] (real part first). We serialize c0
// then c1. This is the classic porting footgun (Ethereum/EIP-197 swaps them). The
// contract's baked-in verification key and the TS re-encoder BOTH follow this order;
// if a live testnet proof rejects, this ordering is the first thing to flip.
// =============================================================================
#![no_std]

pub const FIELD_SIZE: usize = 32;
pub const G1_SIZE: usize = 64;
pub const G2_SIZE: usize = 128;

/// BN254 BASE field modulus (Fq) — the field the G1/G2 point *coordinates* live in, so
/// this is what coordinate negation (`-A`, `-y`) reduces against. This is `q`, NOT the
/// scalar field `r`; the two share their leading digits, which is exactly why a mix-up
/// here is silent and deadly (a wrong modulus makes valid proofs reject on-chain).
/// Stored as little-endian bytes so we can reduce without a bigint dependency.
pub const FQ_LE: [u8; 32] = [
    // 21888242871839275222246405745257275088696311157297823662689037894645226208583
    0x47, 0xfd, 0x7c, 0xd8, 0x16, 0x8c, 0x20, 0x3c, 0x8d, 0xca, 0x71, 0x68, 0x91, 0x6a, 0x81, 0x97,
    0x5d, 0x58, 0x81, 0x81, 0xb6, 0x45, 0x50, 0xb8, 0x29, 0xa0, 0x31, 0xe1, 0x72, 0x4e, 0x64, 0x30,
];

/// Errors from parsing/encoding. Kept tiny and `Copy` so callers can match cheaply.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum EncError {
    /// A decimal string contained a non-digit character.
    NotADigit,
    /// A decimal value did not fit in 32 bytes (>= 2^256) before field reduction.
    Overflow,
    /// A hex string had odd length or a non-hex nibble.
    BadHex,
    /// A decoded byte blob had the wrong length for its point type.
    BadLength,
}

/// Parse a decimal string into a 32-byte LITTLE-ENDIAN integer (schoolbook base-256
/// long multiplication: acc = acc*10 + digit). Rejects non-digits and values >= 2^256.
///
/// NOTE: this does NOT reduce mod the field — a value in [FQ, 2^256) is accepted as-is.
/// Field elements out of snarkjs are always < FQ, so that's fine; if you need reduction,
/// call [`reduce_le`] afterwards.
pub fn decimal_to_le32(s: &str) -> Result<[u8; FIELD_SIZE], EncError> {
    let mut acc = [0u8; FIELD_SIZE]; // little-endian: acc[0] is least significant
    for ch in s.bytes() {
        if !ch.is_ascii_digit() {
            return Err(EncError::NotADigit);
        }
        let digit = (ch - b'0') as u16;
        // acc = acc * 10 + digit, propagating carry across the LE bytes.
        let mut carry: u16 = digit;
        for byte in acc.iter_mut() {
            let v = (*byte as u16) * 10 + carry;
            *byte = (v & 0xff) as u8;
            carry = v >> 8;
        }
        if carry != 0 {
            return Err(EncError::Overflow);
        }
    }
    Ok(acc)
}

/// Reduce a little-endian 32-byte integer mod the BN254 field, in place-ish (returns a copy).
/// Cheap path: only subtracts FQ while the value is >= FQ (snarkjs values are already < FQ,
/// so this is usually a no-op; provided for completeness / negation).
pub fn reduce_le(mut x: [u8; 32]) -> [u8; 32] {
    while cmp_le(&x, &FQ_LE) != Ordering::Less {
        x = sub_le(&x, &FQ_LE);
    }
    x
}

/// Negate a field element given as LE bytes: returns (FQ - x) mod FQ. Used to compute -A
/// for the Groth16 pairing equation. Assumes x < FQ (reduces first to be safe).
pub fn negate_field_le(x: &[u8; 32]) -> [u8; 32] {
    let xr = reduce_le(*x);
    if is_zero_le(&xr) {
        return [0u8; 32]; // -0 == 0
    }
    sub_le(&FQ_LE, &xr)
}

/// G1 point -> 64 bytes: x(LE32) ‖ y(LE32). Inputs are decimal strings (snarkjs [x, y, z]; z ignored).
pub fn g1_to_le(x: &str, y: &str) -> Result<[u8; G1_SIZE], EncError> {
    let xb = decimal_to_le32(x)?;
    let yb = decimal_to_le32(y)?;
    let mut out = [0u8; G1_SIZE];
    out[..32].copy_from_slice(&xb);
    out[32..].copy_from_slice(&yb);
    Ok(out)
}

/// G2 point -> 128 bytes: x.c0 ‖ x.c1 ‖ y.c0 ‖ y.c1, each LE32, c0-before-c1.
/// Inputs are decimal strings from snarkjs's [[x_c0, x_c1], [y_c0, y_c1], [1, 0]].
pub fn g2_to_le(
    x_c0: &str,
    x_c1: &str,
    y_c0: &str,
    y_c1: &str,
) -> Result<[u8; G2_SIZE], EncError> {
    let mut out = [0u8; G2_SIZE];
    out[0..32].copy_from_slice(&decimal_to_le32(x_c0)?);
    out[32..64].copy_from_slice(&decimal_to_le32(x_c1)?);
    out[64..96].copy_from_slice(&decimal_to_le32(y_c0)?);
    out[96..128].copy_from_slice(&decimal_to_le32(y_c1)?);
    Ok(out)
}

/// Negate a G1 point given as snarkjs decimal strings: (x, y) -> (x, -y mod q), returned as
/// the 64-byte LE encoding ready for the pairing buffer.
pub fn negate_g1_to_le(x: &str, y: &str) -> Result<[u8; G1_SIZE], EncError> {
    let xb = decimal_to_le32(x)?;
    let yb = negate_field_le(&decimal_to_le32(y)?);
    let mut out = [0u8; G1_SIZE];
    out[..32].copy_from_slice(&xb);
    out[32..].copy_from_slice(&yb);
    Ok(out)
}

/// Decode a hex string (lowercase/uppercase, no 0x, even length) into bytes, into `out`.
/// Returns the number of bytes written or an error. Fixed-buffer to stay `no_std`.
pub fn hex_to_bytes(s: &str, out: &mut [u8]) -> Result<usize, EncError> {
    let bytes = s.as_bytes();
    if bytes.len() % 2 != 0 || bytes.len() / 2 > out.len() {
        return Err(EncError::BadHex);
    }
    for i in 0..bytes.len() / 2 {
        let hi = hex_nibble(bytes[2 * i])?;
        let lo = hex_nibble(bytes[2 * i + 1])?;
        out[i] = (hi << 4) | lo;
    }
    Ok(bytes.len() / 2)
}

fn hex_nibble(c: u8) -> Result<u8, EncError> {
    match c {
        b'0'..=b'9' => Ok(c - b'0'),
        b'a'..=b'f' => Ok(c - b'a' + 10),
        b'A'..=b'F' => Ok(c - b'A' + 10),
        _ => Err(EncError::BadHex),
    }
}

// ---- tiny little-endian bigint helpers (no deps) ----------------------------
use core::cmp::Ordering;

fn cmp_le(a: &[u8; 32], b: &[u8; 32]) -> Ordering {
    for i in (0..32).rev() {
        match a[i].cmp(&b[i]) {
            Ordering::Equal => continue,
            other => return other,
        }
    }
    Ordering::Equal
}

fn sub_le(a: &[u8; 32], b: &[u8; 32]) -> [u8; 32] {
    let mut out = [0u8; 32];
    let mut borrow: i16 = 0;
    for i in 0..32 {
        let v = a[i] as i16 - b[i] as i16 - borrow;
        if v < 0 {
            out[i] = (v + 256) as u8;
            borrow = 1;
        } else {
            out[i] = v as u8;
            borrow = 0;
        }
    }
    out
}

fn is_zero_le(a: &[u8; 32]) -> bool {
    a.iter().all(|&b| b == 0)
}

// =============================================================================
// GOLDEN VECTORS — the cross-language contract. `cargo test` prints these; the TS
// backend's near-encoding.test.ts asserts byte-identical output. If the two ever
// disagree, one side drifted. This is what makes the single-source-of-truth real.
// =============================================================================
#[cfg(test)]
mod tests {
    use super::*;

    fn to_hex(b: &[u8]) -> alloc::string::String {
        use core::fmt::Write;
        let mut s = alloc::string::String::new();
        for byte in b {
            let _ = write!(s, "{:02x}", byte);
        }
        s
    }
    extern crate alloc;

    #[test]
    fn decimal_le_lsb_first() {
        assert_eq!(decimal_to_le32("1").unwrap()[0], 1);
        assert_eq!(&decimal_to_le32("256").unwrap()[0..3], &[0, 1, 0]);
    }

    #[test]
    fn decimal_rejects_non_digit_and_overflow() {
        assert_eq!(decimal_to_le32("12a3"), Err(EncError::NotADigit));
        // 2^256 does not fit in 32 bytes.
        let two_256 =
            "115792089237316195423570985008687907853269984665640564039457584007913129639936";
        assert_eq!(decimal_to_le32(two_256), Err(EncError::Overflow));
    }

    #[test]
    fn max_fits_2_256_minus_1() {
        let max =
            "115792089237316195423570985008687907853269984665640564039457584007913129639935";
        assert!(decimal_to_le32(max).is_ok());
        assert_eq!(decimal_to_le32(max).unwrap(), [0xffu8; 32]);
    }

    #[test]
    fn fq_le_is_base_field_q() {
        // FQ_LE must be the BN254 BASE field q (coordinate field), not the scalar field r.
        // q = 21888242871839275222246405745257275088696311157297823662689037894645226208583.
        // We reconstruct q from its decimal via decimal_to_le32 and compare byte-for-byte;
        // this pins the constant so a copy-paste of r (or corrupted bytes) fails loudly.
        let q_from_decimal = decimal_to_le32(
            "21888242871839275222246405745257275088696311157297823662689037894645226208583",
        )
        .unwrap();
        assert_eq!(FQ_LE, q_from_decimal, "FQ_LE must equal the base field q");
    }

    #[test]
    fn negate_field_involution() {
        let seven = decimal_to_le32("7").unwrap();
        let neg = negate_field_le(&seven);
        let back = negate_field_le(&neg);
        assert_eq!(back, seven);
        assert_eq!(negate_field_le(&[0u8; 32]), [0u8; 32]); // -0 == 0
    }

    #[test]
    fn point_sizes() {
        assert_eq!(g1_to_le("1", "2").unwrap().len(), G1_SIZE);
        assert_eq!(g2_to_le("1", "2", "3", "4").unwrap().len(), G2_SIZE);
    }

    #[test]
    fn g2_is_c0_before_c1() {
        let g2 = g2_to_le("1", "2", "3", "4").unwrap();
        assert_eq!(g2[0], 1); // x.c0
        assert_eq!(g2[32], 2); // x.c1
        assert_eq!(g2[64], 3); // y.c0
        assert_eq!(g2[96], 4); // y.c1
    }

    #[test]
    fn hex_roundtrip() {
        let mut buf = [0u8; 4];
        let n = hex_to_bytes("0001ff10", &mut buf).unwrap();
        assert_eq!(&buf[..n], &[0x00, 0x01, 0xff, 0x10]);
        assert_eq!(hex_to_bytes("abc", &mut buf), Err(EncError::BadHex)); // odd length
        assert_eq!(hex_to_bytes("zz", &mut buf), Err(EncError::BadHex)); // bad nibble
    }

    /// GOLDEN VECTORS printed for the TS conformance test to assert against.
    /// Run: `cargo test -p zk-encoding -- --nocapture print_golden_vectors`
    #[test]
    fn print_golden_vectors() {
        extern crate std;
        use std::println;
        let fq_minus_1 =
            "21888242871839275222246405745257275088548364400416034343698204186575808495616";
        std::println!("GOLDEN one={}", to_hex(&decimal_to_le32("1").unwrap()));
        std::println!("GOLDEN v256={}", to_hex(&decimal_to_le32("256").unwrap()));
        std::println!(
            "GOLDEN big={}",
            to_hex(&decimal_to_le32("123456789012345678901234567890").unwrap())
        );
        std::println!(
            "GOLDEN fq_minus_1={}",
            to_hex(&decimal_to_le32(fq_minus_1).unwrap())
        );
        std::println!("GOLDEN neg7={}", to_hex(&negate_field_le(&decimal_to_le32("7").unwrap())));
        std::println!("GOLDEN g1_1_2={}", to_hex(&g1_to_le("1", "2").unwrap()));
        std::println!("GOLDEN g2_1_2_3_4={}", to_hex(&g2_to_le("1", "2", "3", "4").unwrap()));
        std::println!(
            "GOLDEN negg1_5_7={}",
            to_hex(&negate_g1_to_le("5", "7").unwrap())
        );
    }
}
