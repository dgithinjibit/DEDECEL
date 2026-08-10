export type UserRole = 
  | 'Faculty_Overview'
  | 'Doctor_Midwife'
  | 'Civil_Registrar'
  | 'Family_Certificate'
  | 'Judicial_Auditor'
  | 'DEBICEL_Simulator';

export type PlaceOfBirth = 'Hospital' | 'Home_Birth' | 'Maternity_Clinic' | 'In_Transit';

export type Gender = 'Male' | 'Female' | 'Intersex' | 'Undisclosed';

export type BirthType = 'Single' | 'Twin' | 'Triplet' | 'Multiple';

export type RecordStatus = 'Pending_Registrar_Seal' | 'Sealed_On_Chain' | 'Rejected';

export type SyncState = 'Synced' | 'Queued_Offline' | 'Syncing' | 'Failed_Validation';

export interface CryptographicSignatures {
  physicianSignature: string; // Ed25519 signature
  physicianPublicKey: string; // Doctor's public key
  hospitalSignature: string;  // Hospital HSM Node signature
  hospitalPublicKey: string;  // Hospital Node public key
  timestamp: string;
}

export interface ZkSnarkProof {
  birthHash: string;      // e.g. 0xbirth_record_hash_a9f81b2e...
  proofHash: string;      // ZK-SNARK SNARK proof commitment
  publicInputs: {
    motherNationalIdHash: string;
    facilityId: string;
    yearOfBirth: number;
    jurisdictionCode: string;
  };
  verified: boolean;
  generatedAt: string;
}

export interface BlockchainAnchor {
  blockNumber: number;
  blockHash: string;
  txHash: string;
  sealedAt: string;
  registrarSealId: string;
  registrarName: string;
  nodeConsensus: string; // e.g. "9/9 Nodes Approved (100% BFT Consensus)"
}

export interface BirthRecord {
  id: string; // Registration ID e.g. REG-2026-98124
  childTempId: string; // Temp Hospital ID e.g. TMP-NWB-8812
  childFirstName: string;
  childLastName: string;
  dateOfBirth: string; // ISO String
  timeOfBirth: string; // e.g. "08:42 AM"
  placeOfBirth: PlaceOfBirth;
  facilityName: string;
  facilityId: string;
  gender: Gender;
  birthWeightGrams: number;
  gestationalAgeWeeks: number;
  apgar1Min: number;
  apgar5Min: number;
  birthType: BirthType;
  
  // Parents
  motherNationalId: string;
  motherLegalName: string;
  fatherNationalId?: string;
  fatherLegalName?: string;
  parentContactEmail?: string;
  
  // Attestation
  attendingPhysicianName: string;
  attendingPhysicianLicense: string;
  signatures: CryptographicSignatures;
  
  // Security & Chain
  status: RecordStatus;
  zkProof: ZkSnarkProof;
  ipfsCid: string; // e.g. QmX79A2b3c...
  encryptedPayload: string; // AES-256-GCM string
  blockchain?: BlockchainAnchor;
  
  // Metadata
  createdAt: string;
  updatedAt: string;
  syncState: SyncState;
  rejectionReason?: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  actor: string;
  role: UserRole;
  action: string;
  recordId: string;
  details: string;
  hash: string;
  ipAddress?: string;
}

export interface OfflineQueueItem {
  id: string;
  record: BirthRecord;
  queuedAt: string;
  status: 'Pending' | 'Syncing' | 'Failed';
  attempts: number;
  errorMessage?: string;
}

export interface DebicelQueryResult {
  found: boolean;
  nationalId: string;
  birthHash?: string;
  registrationId?: string;
  status?: string;
  dateOfBirth?: string;
  facilityId?: string;
  zkVerified?: boolean;
  blockHash?: string;
  message: string;
  queriedAt: string;
}

export type DedecelQueryResult = DebicelQueryResult;
