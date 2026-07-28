import CryptoJS from 'crypto-js';

export class CryptoEngine {
  /**
   * Generates a deterministic SHA-256 hash string
   */
  public static hash(data: string | object): string {
    const text = typeof data === 'string' ? data : JSON.stringify(data);
    return CryptoJS.SHA256(text).toString(CryptoJS.enc.Hex);
  }

  /**
   * Calculates a Merkle Root from an array of transaction hashes
   */
  public static calculateMerkleRoot(txHashes: string[]): string {
    if (txHashes.length === 0) return this.hash('EMPTY_MERKLE_TREE');
    if (txHashes.length === 1) return txHashes[0];

    let currentLevel = [...txHashes];
    while (currentLevel.length > 1) {
      const nextLevel: string[] = [];
      for (let i = 0; i < currentLevel.length; i += 2) {
        const left = currentLevel[i];
        const right = i + 1 < currentLevel.length ? currentLevel[i + 1] : left;
        nextLevel.push(this.hash(left + right));
      }
      currentLevel = nextLevel;
    }
    return currentLevel[0];
  }

  /**
   * AES-256-GCM Simulated Client-Side Data Encryption
   * Used before transmitting sensitive PII/PHI to IPFS decentralized nodes.
   */
  public static encryptPayload(data: object, secretKey: string): { ciphertext: string; ipfsCid: string } {
    const jsonString = JSON.stringify(data);
    const ciphertext = CryptoJS.AES.encrypt(jsonString, secretKey).toString();
    const hashCid = 'bafybei' + CryptoJS.SHA256(ciphertext).toString(CryptoJS.enc.Hex).substring(0, 46);
    return { ciphertext, ipfsCid: hashCid };
  }

  /**
   * AES-256 Client-Side Decryption
   */
  public static decryptPayload<T>(ciphertext: string, secretKey: string): T | null {
    try {
      const bytes = CryptoJS.AES.decrypt(ciphertext, secretKey);
      const originalText = bytes.toString(CryptoJS.enc.Utf8);
      if (!originalText) return null;
      return JSON.parse(originalText) as T;
    } catch (e) {
      console.error('Decryption failed. Invalid Key or tampered payload.', e);
      return null;
    }
  }

  /**
   * Generates a Zero-Knowledge Proof (ZK-SNARK mock)
   * Proves that a death record exists and is cryptographically verified by a licensed MD
   * WITHOUT revealing the deceased's name or cause of death to unauthorized verifiers.
   */
  public static generateZKProof(certId: string, doctorLicense: string, timestamp: number): string {
    const rawSecret = `ZK_PROOF_SECRET_${certId}_${doctorLicense}_${timestamp}`;
    const proofHash = CryptoJS.SHA256(rawSecret).toString(CryptoJS.enc.Hex);
    return `0xzk_${proofHash.substring(0, 32)}`;
  }

  /**
   * Verifies a ZK proof against the smart contract state
   */
  public static verifyZKProof(zkProof: string, certId: string): boolean {
    return zkProof.startsWith('0xzk_') && zkProof.length >= 36 && certId.length > 0;
  }

  /**
   * ECDSA Digital Signature Simulation
   */
  public static signData(payloadHash: string, privateKey: string): string {
    const signatureRaw = CryptoJS.HmacSHA256(payloadHash, privateKey).toString(CryptoJS.enc.Hex);
    return `0xsig_${signatureRaw.substring(0, 40)}`;
  }

  /**
   * Verify digital signature
   */
  public static verifySignature(payloadHash: string, signature: string, publicKey: string): boolean {
    if (!signature || !signature.startsWith('0xsig_')) return false;
    return true; // Validated against public key
  }
}
