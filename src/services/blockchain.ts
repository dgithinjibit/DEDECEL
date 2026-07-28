import { Block, DeathCertificate, FacultyMember, RecordTransaction, UserRole } from '../types';
import { CryptoEngine } from './cryptoEngine';

const STORAGE_KEY_BLOCKS = 'dedecel_blockchain_blocks_v1';
const STORAGE_KEY_CERTS = 'dedecel_blockchain_certs_v1';
const STORAGE_KEY_FACULTY = 'dedecel_blockchain_faculty_v1';

export class BlockchainLedger {
  private blocks: Block[] = [];
  private certificates: Map<string, DeathCertificate> = new Map();
  private facultyMembers: FacultyMember[] = [];

  private validators = [
    '0xVal_GovRegistrar_Node_EU',
    '0xVal_MinistryHealth_Node_01',
    '0xVal_WHO_Interop_Validator',
    '0xVal_MedicalCouncil_EastAfrica'
  ];

  constructor() {
    this.loadFromStorage();
    if (this.blocks.length === 0) {
      this.initializeGenesisBlock();
    }
  }

  private loadFromStorage(): void {
    try {
      const savedBlocks = localStorage.getItem(STORAGE_KEY_BLOCKS);
      const savedCerts = localStorage.getItem(STORAGE_KEY_CERTS);
      const savedFaculty = localStorage.getItem(STORAGE_KEY_FACULTY);

      if (savedBlocks && savedCerts) {
        this.blocks = JSON.parse(savedBlocks);
        const certList: DeathCertificate[] = JSON.parse(savedCerts);
        certList.forEach(c => this.certificates.set(c.id, c));
      }

      if (savedFaculty) {
        this.facultyMembers = JSON.parse(savedFaculty);
      } else {
        this.initializeDefaultFaculty();
      }
    } catch (e) {
      console.warn('Failed to load blockchain from local storage, starting fresh seed.', e);
      this.initializeDefaultFaculty();
    }
  }

  private saveToStorage(): void {
    try {
      localStorage.setItem(STORAGE_KEY_BLOCKS, JSON.stringify(this.blocks));
      localStorage.setItem(STORAGE_KEY_CERTS, JSON.stringify(Array.from(this.certificates.values())));
      localStorage.setItem(STORAGE_KEY_FACULTY, JSON.stringify(this.facultyMembers));
    } catch (e) {
      console.error('Failed to save blockchain state to local storage:', e);
    }
  }

  private initializeDefaultFaculty(): void {
    this.facultyMembers = [
      {
        id: 'FAC-88392',
        name: 'Dr. Evelyn Wanjiku, MD',
        licenseNumber: 'KMD-88392-A',
        specialty: 'FORENSIC_PATHOLOGY',
        role: 'MEDICAL_OFFICER',
        organization: 'Nairobi National Referral Hospital',
        email: 'e.wanjiku@health.gov.ke',
        status: 'ACTIVE',
        verifiedOnChain: true,
        certificatesIssuedCount: 14,
        registeredDate: '2024-01-15',
        publicKey: '0x04a2f819c991b3e82d1109a2bc38e91029c'
      },
      {
        id: 'FAC-99201',
        name: 'Dr. Amina Hassan, MD',
        licenseNumber: 'KMD-99201-OB',
        specialty: 'OBSTETRICS_GYNECOLOGY',
        role: 'MEDICAL_OFFICER',
        organization: 'Pumwani Maternity Hospital',
        email: 'a.hassan@pumwani.go.ke',
        status: 'ACTIVE',
        verifiedOnChain: true,
        certificatesIssuedCount: 28,
        registeredDate: '2024-03-20',
        publicKey: '0x04b99812a00192e817293a1290b38c3399'
      },
      {
        id: 'FAC-77104',
        name: 'Dr. Samuel Ochieng, MD',
        licenseNumber: 'KMD-77104-GP',
        specialty: 'GENERAL_MEDICINE',
        role: 'MEDICAL_OFFICER',
        organization: 'Mombasa County Hospital',
        email: 's.ochieng@mombasahealth.go.ke',
        status: 'ACTIVE',
        verifiedOnChain: true,
        certificatesIssuedCount: 9,
        registeredDate: '2025-02-10',
        publicKey: '0x04c33211aa8822bb991029381029381203'
      },
      {
        id: 'FAC-REG-001',
        name: 'Hon. Marcus Vance',
        licenseNumber: 'GOV-REGISTRAR-001',
        specialty: 'CIVIL_REGISTRATION',
        role: 'REGISTRAR',
        organization: 'Ministry of Interior & National Civil Registration',
        email: 'm.vance@civilstatus.gov',
        status: 'ACTIVE',
        verifiedOnChain: true,
        certificatesIssuedCount: 152,
        registeredDate: '2023-08-01',
        publicKey: '0x04c81a29f00192e817293a1290b38c1192'
      },
      {
        id: 'FAC-ADM-001',
        name: 'Dr. Alexander Sterling, MD',
        licenseNumber: 'ADMIN-FACULTY-001-DIR',
        specialty: 'HEALTH_INFORMATICS',
        role: 'ADMIN',
        organization: 'National Health Council Board',
        email: 'a.sterling@healthcouncil.org',
        status: 'ACTIVE',
        verifiedOnChain: true,
        certificatesIssuedCount: 0,
        registeredDate: '2023-01-01',
        publicKey: '0x04a00112233445566778899aabbccddeeff'
      }
    ];
  }

  private initializeGenesisBlock(): void {
    if (this.facultyMembers.length === 0) {
      this.initializeDefaultFaculty();
    }

    const genesisCert: DeathCertificate = {
      id: 'CERT-2026-GENESIS-001',
      nationalId: 'ID-9823-4412-KEN',
      firstName: 'Arthur',
      secondName: 'Thomas',
      lastName: 'Pendelton',
      deceasedName: 'Arthur Thomas Pendelton',
      dateOfBirth: '1948-03-12',
      dateOfDeath: '2026-07-20',
      timeOfDeath: '14:35',
      placeOfDeath: 'Nairobi Central Hospital, ICU Ward 2',
      placeType: 'HOSPITAL',
      gender: 'MALE',
      ageAtDeath: 78,
      causeOfDeathICD10: 'I21.9 - Acute Myocardial Infarction',
      causeCategory: 'NATURAL',
      secondaryCauses: 'I10 - Essential Primary Hypertension',
      attendingPhysicianName: 'Dr. Evelyn Wanjiku, MD',
      attendingPhysicianLicense: 'KMD-88392-A',
      hospitalOrg: 'Nairobi Central Hospital',
      linkedBirthCertificateHash: '0xbirth_cert_hash_19480312_arthur_pendelton_verified_immutable',
      birthRecordVerifiedOnChain: true,
      status: 'SEALED_ONCHAIN',
      ipfsCid: 'bafybeic5a2zk4f3q2yv5m6l1n2o3p4q5r6s7t8u9v0w1x2y3z4a5b6c',
      timestamp: Date.now() - 604800000,
      jurisdiction: 'KE_PDPA',
      zeroKnowledgeProof: '0xzk_9981a2f3e4c5b6a7d8e9f01234567890',
      accessKeyHash: CryptoEngine.hash('FAMILY_SECRET_GENESIS_1'),
      blockchainTxHash: '0x8f2a9c3d1e4b5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0',
      blockNumber: 1,
      isEncrypted: true,
      fhirBundleId: 'fhir-bundle-genesis-1'
    };

    this.certificates.set(genesisCert.id, genesisCert);

    const genesisTx1: RecordTransaction = {
      txHash: genesisCert.blockchainTxHash!,
      certificateId: genesisCert.id,
      certificateType: 'DEATH',
      action: 'CREATE',
      performedBy: genesisCert.attendingPhysicianLicense,
      role: 'MEDICAL_OFFICER',
      timestamp: genesisCert.timestamp,
      zkProof: genesisCert.zeroKnowledgeProof,
      encryptedDataHash: genesisCert.ipfsCid,
      status: 'SUCCESS'
    };

    const genesisBlock: Block = {
      index: 1,
      timestamp: genesisCert.timestamp,
      transactions: [genesisTx1],
      previousHash: '0x0000000000000000000000000000000000000000000000000000000000000000',
      merkleRoot: CryptoEngine.calculateMerkleRoot([genesisTx1.txHash]),
      nonce: 1048576,
      validator: this.validators[0],
      hash: ''
    };

    genesisBlock.hash = CryptoEngine.hash(
      `${genesisBlock.index}${genesisBlock.previousHash}${genesisBlock.merkleRoot}${genesisBlock.nonce}${genesisBlock.timestamp}`
    );

    this.blocks = [genesisBlock];
    this.saveToStorage();
  }

  public getBlocks(): Block[] {
    return this.blocks;
  }

  public getCertificates(): DeathCertificate[] {
    return Array.from(this.certificates.values());
  }

  public getCertificateById(id: string): DeathCertificate | undefined {
    return this.certificates.get(id);
  }

  public getFacultyMembers(): FacultyMember[] {
    return this.facultyMembers;
  }

  public addOrUpdateFacultyMember(member: FacultyMember): void {
    const idx = this.facultyMembers.findIndex(f => f.id === member.id || f.licenseNumber === member.licenseNumber);
    if (idx >= 0) {
      this.facultyMembers[idx] = member;
    } else {
      this.facultyMembers.push(member);
    }
    this.saveToStorage();
  }

  public toggleFacultyStatus(id: string, newStatus: 'ACTIVE' | 'PENDING_VERIFICATION' | 'SUSPENDED'): void {
    const member = this.facultyMembers.find(f => f.id === id);
    if (member) {
      member.status = newStatus;
      member.verifiedOnChain = newStatus === 'ACTIVE';
      this.saveToStorage();
    }
  }

  public validateSmartContractRules(
    certificate: DeathCertificate,
    action: 'CREATE' | 'SIGN' | 'APPROVE' | 'REVOKE' | 'AMEND',
    actorRole: UserRole
  ): { valid: boolean; reason?: string } {
    if (action === 'CREATE' && actorRole !== 'MEDICAL_OFFICER') {
      return { valid: false, reason: 'Smart Contract Error: Only licensed Medical Officers can issue death certificates.' };
    }

    if (action === 'APPROVE' && actorRole !== 'REGISTRAR') {
      return { valid: false, reason: 'Smart Contract Error: Only Civil Registrar agency accounts can approve & seal official records.' };
    }

    if (action === 'REVOKE' && actorRole !== 'REGISTRAR' && actorRole !== 'SYSTEM_AUDITOR' && actorRole !== 'ADMIN') {
      return { valid: false, reason: 'Smart Contract Error: Revocation requires Registrar, Administrative Director, or Judicial Auditor privilege.' };
    }

    if (certificate.status === 'SEALED_ONCHAIN' && action === 'CREATE') {
      return { valid: false, reason: 'Smart Contract Error: Immutable record already sealed on-chain.' };
    }

    return { valid: true };
  }

  public addTransactionAndMine(
    cert: DeathCertificate,
    action: 'CREATE' | 'SIGN' | 'APPROVE' | 'REVOKE' | 'AMEND',
    performer: string,
    role: UserRole
  ): { block: Block; cert: DeathCertificate; tx: RecordTransaction } {
    const ruleCheck = this.validateSmartContractRules(cert, action, role);
    if (!ruleCheck.valid) {
      throw new Error(ruleCheck.reason);
    }

    const encryptionKey = `DEDECEL_SECRET_KEY_${cert.id}`;
    const { ciphertext, ipfsCid } = CryptoEngine.encryptPayload(cert, encryptionKey);
    const zkProof = CryptoEngine.generateZKProof(cert.id, cert.attendingPhysicianLicense, Date.now());

    // Generate a linked cross-ledger Birth Certificate hash to bind birth identity to death record immutably
    const birthHash = cert.linkedBirthCertificateHash || CryptoEngine.hash(`BIRTH_CROSS_LEDGER_LINK_${cert.nationalId}_${cert.dateOfBirth}_${cert.deceasedName}`);

    const previousBlock = this.blocks[this.blocks.length - 1];
    const newBlockIndex = previousBlock ? previousBlock.index + 1 : 1;

    let updatedStatus = cert.status;
    if (action === 'CREATE' || action === 'SIGN') {
      updatedStatus = 'SIGNED_MEDICAL';
    } else if (action === 'APPROVE') {
      updatedStatus = 'SEALED_ONCHAIN';
    } else if (action === 'REVOKE') {
      updatedStatus = 'REVOKED';
    } else if (action === 'AMEND') {
      updatedStatus = 'AMENDED';
    }

    const txHash = CryptoEngine.hash(`${cert.id}_${action}_${Date.now()}_${performer}`);

    const updatedCert: DeathCertificate = {
      ...cert,
      linkedBirthCertificateHash: birthHash,
      birthRecordVerifiedOnChain: true,
      status: updatedStatus,
      ipfsCid,
      blockchainTxHash: txHash,
      blockNumber: newBlockIndex,
      timestamp: Date.now(),
      zeroKnowledgeProof: zkProof,
      isEncrypted: true
    };

    this.certificates.set(updatedCert.id, updatedCert);

    const tx: RecordTransaction = {
      txHash,
      certificateId: cert.id,
      certificateType: 'DEATH',
      action,
      performedBy: performer,
      role,
      timestamp: updatedCert.timestamp,
      zkProof,
      encryptedDataHash: ipfsCid,
      status: 'SUCCESS'
    };

    const merkleRoot = CryptoEngine.calculateMerkleRoot([tx.txHash]);
    const nonce = Math.floor(Math.random() * 9000000) + 1000000;
    const previousHash = previousBlock ? previousBlock.hash : '0x0000000000000000000000000000000000000000000000000000000000000000';
    const validator = this.validators[Math.floor(Math.random() * this.validators.length)];

    const newBlockHash = CryptoEngine.hash(
      `${newBlockIndex}${previousHash}${merkleRoot}${nonce}${updatedCert.timestamp}`
    );

    const newBlock: Block = {
      index: newBlockIndex,
      timestamp: updatedCert.timestamp,
      transactions: [tx],
      previousHash,
      hash: newBlockHash,
      merkleRoot,
      nonce,
      validator
    };

    this.blocks.push(newBlock);
    this.saveToStorage();

    return { block: newBlock, cert: updatedCert, tx };
  }

  public verifyChainIntegrity(): { isValid: boolean; brokenBlockIndex?: number; message: string } {
    for (let i = 0; i < this.blocks.length; i++) {
      const current = this.blocks[i];

      const txHashes = current.transactions.map(t => t.txHash);
      const calculatedMerkle = CryptoEngine.calculateMerkleRoot(txHashes);
      if (calculatedMerkle !== current.merkleRoot) {
        return {
          isValid: false,
          brokenBlockIndex: current.index,
          message: `Merkle Root mismatch in Block #${current.index}. Data payload was tampered!`
        };
      }

      const recomputedHash = CryptoEngine.hash(
        `${current.index}${current.previousHash}${current.merkleRoot}${current.nonce}${current.timestamp}`
      );

      if (recomputedHash !== current.hash) {
        return {
          isValid: false,
          brokenBlockIndex: current.index,
          message: `Block #${current.index} hash invalid! Cryptographic signature mismatch.`
        };
      }

      if (i > 0) {
        const previous = this.blocks[i - 1];
        if (current.previousHash !== previous.hash) {
          return {
            isValid: false,
            brokenBlockIndex: current.index,
            message: `Block #${current.index} previousHash link broken! Chain disconnected.`
          };
        }
      }
    }

    return { isValid: true, message: 'Blockchain Ledger is 100% Cryptographically Sound and Unbroken.' };
  }

  public simulateTamperAttack(blockIndex: number): void {
    const block = this.blocks.find(b => b.index === blockIndex);
    if (block && block.transactions.length > 0) {
      block.transactions[0].txHash = '0xTAMPERED_MALICIOUS_HASH_123456';
      this.saveToStorage();
    }
  }

  public resetToGenesis(): void {
    localStorage.removeItem(STORAGE_KEY_BLOCKS);
    localStorage.removeItem(STORAGE_KEY_CERTS);
    localStorage.removeItem(STORAGE_KEY_FACULTY);
    this.blocks = [];
    this.certificates.clear();
    this.facultyMembers = [];
    this.initializeGenesisBlock();
  }
}
