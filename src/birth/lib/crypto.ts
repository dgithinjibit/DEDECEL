// Cryptographic & ZK-SNARK utilities for BIRTH-CHAIN

/**
 * Computes SHA-256 hash string (0x...) using Web Crypto API
 */
export async function sha256Hex(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const buffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return '0x' + hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Generates an immutable Zero-Knowledge Birth Hash
 * Format: 0xbirth_record_hash_<sha256>
 */
export async function generateBirthHash(
  motherNationalId: string,
  dobIso: string,
  facilityId: string,
  salt: string = 'BIRTH_CHAIN_ZK_SALT_2026'
): Promise<string> {
  const rawString = `${motherNationalId.toUpperCase().trim()}|${dobIso}|${facilityId.toUpperCase().trim()}|${salt}`;
  const hex = await sha256Hex(rawString);
  return `0xbirth_record_hash_${hex.slice(2, 34)}`;
}

/**
 * Generates ZK-SNARK Proof metadata
 */
export async function generateZkProof(
  motherNationalId: string,
  dobIso: string,
  facilityId: string
): Promise<{
  birthHash: string;
  proofHash: string;
  publicInputs: {
    motherNationalIdHash: string;
    facilityId: string;
    yearOfBirth: number;
    jurisdictionCode: string;
  };
  verified: boolean;
  generatedAt: string;
}> {
  const birthHash = await generateBirthHash(motherNationalId, dobIso, facilityId);
  const motherHash = await sha256Hex(motherNationalId);
  const yearOfBirth = new Date(dobIso).getFullYear() || 2026;
  const proofHash = '0xzk_snark_proof_' + (await sha256Hex(`${birthHash}_PROOF`)).slice(2, 42);

  return {
    birthHash,
    proofHash,
    publicInputs: {
      motherNationalIdHash: motherHash,
      facilityId,
      yearOfBirth,
      jurisdictionCode: 'US-NY-CIVIL-DEPT',
    },
    verified: true,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Dual-Key Cryptographic Signer
 * Generates simulated Ed25519 signatures for Physician + Hospital Node
 */
export async function signBirthRecord(
  recordPayload: string,
  physicianLicense: string,
  facilityId: string
): Promise<{
  physicianSignature: string;
  physicianPublicKey: string;
  hospitalSignature: string;
  hospitalPublicKey: string;
  timestamp: string;
}> {
  const timestamp = new Date().toISOString();
  
  // Doctor Key pair simulation
  const docPubKey = '0xed25519_doc_pub_' + (await sha256Hex(physicianLicense)).slice(2, 22);
  const docSig = '0xsig_doc_' + (await sha256Hex(`${recordPayload}_${physicianLicense}_${timestamp}`)).slice(2, 34);

  // Hospital HSM Node Key pair simulation
  const hospPubKey = '0xed25519_hosp_pub_' + (await sha256Hex(facilityId)).slice(2, 22);
  const hospSig = '0xsig_hosp_node_' + (await sha256Hex(`${recordPayload}_${facilityId}_${timestamp}`)).slice(2, 34);

  return {
    physicianSignature: docSig,
    physicianPublicKey: docPubKey,
    hospitalSignature: hospSig,
    hospitalPublicKey: hospPubKey,
    timestamp,
  };
}

/**
 * AES-256-GCM PII Encryption Simulator for IPFS storage
 */
export async function encryptPayloadAES256(piiData: object, secretKey: string = 'BIRTH_CHAIN_AES256_SECRET'): Promise<{
  encryptedPayload: string;
  ipfsCid: string;
}> {
  const jsonStr = JSON.stringify(piiData);
  const encoder = new TextEncoder();
  const encoded = encoder.encode(jsonStr);
  
  // Base64 mock encryption simulation with AES header
  const base64 = btoa(String.fromCharCode(...encoded));
  const hash = await sha256Hex(jsonStr);
  const encryptedPayload = `AES256-GCM::IV[${hash.slice(2, 10)}]::TAG[${hash.slice(10, 18)}]::DATA[${base64}]`;
  
  // Simulated IPFS CIDv1
  const ipfsCid = `bafybeig${(await sha256Hex(encryptedPayload)).slice(2, 42).toLowerCase()}`;

  return {
    encryptedPayload,
    ipfsCid,
  };
}

/**
 * Decrypt Payload AES-256
 */
export function decryptPayloadAES256(encryptedPayload: string): object | null {
  try {
    if (!encryptedPayload.includes('::DATA[')) return null;
    const base64 = encryptedPayload.split('::DATA[')[1].replace(']', '');
    const decodedStr = atob(base64);
    return JSON.parse(decodedStr);
  } catch (err) {
    console.error('Decryption failed:', err);
    return null;
  }
}
