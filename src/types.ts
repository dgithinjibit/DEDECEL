export type UserRole = 
  | 'ADMIN'
  | 'MEDICAL_OFFICER' 
  | 'REGISTRAR' 
  | 'FAMILY' 
  | 'VERIFIER_AGENCY' 
  | 'SYSTEM_AUDITOR';

export type CertificateType = 'DEATH';

export type JurisdictionMode = 
  | 'EU_GDPR' 
  | 'US_HIPAA' 
  | 'KE_PDPA' 
  | 'SG_PDPA' 
  | 'GLOBAL_ISO';

export type CertificateStatus = 
  | 'DRAFT' 
  | 'SIGNED_MEDICAL' 
  | 'APPROVED_REGISTRAR' 
  | 'SEALED_ONCHAIN' 
  | 'REVOKED' 
  | 'AMENDED';

export interface DeathCertificate {
  id: string;
  nationalId: string; // Hashed or masked for privacy
  firstName?: string;
  secondName?: string;
  lastName?: string;
  deceasedName: string;
  dateOfBirth: string;
  dateOfDeath: string;
  timeOfDeath: string;
  placeOfDeath: string; // e.g. "St. Jude Hospital, Nairobi", "Residence, Precinct 4"
  placeType: 'HOSPITAL' | 'RESIDENCE' | 'REMOTE_FIELD' | 'DISASTER_ZONE';
  gender: 'MALE' | 'FEMALE' | 'OTHER';
  ageAtDeath: number;
  
  // Medical Info
  causeOfDeathICD10: string; // e.g. "I21.9 - Acute Myocardial Infarction"
  causeCategory: 'NATURAL' | 'ACCIDENTAL' | 'INVESTIGATION_PENDING' | 'OTHER';
  secondaryCauses?: string;
  attendingPhysicianName: string;
  attendingPhysicianLicense: string;
  hospitalOrg: string;
  physicianSignatureHash?: string;
  
  // Cross-Ledger Birth Link Verification
  linkedBirthCertificateHash?: string; // Cryptographic hash of linked Birth Certificate record
  birthRecordVerifiedOnChain?: boolean; // Verified against Birth Registry dApp ledger
  
  // Blockchain & Security Metadata
  status: CertificateStatus;
  ipfsCid: string; // Encrypted payload IPFS hash
  blockchainTxHash?: string;
  blockNumber?: number;
  timestamp: number;
  jurisdiction: JurisdictionMode;
  zeroKnowledgeProof: string; // ZK-SNARK hash proof
  accessKeyHash: string; // For family / authorized access
  
  // Flags & Sync State
  isOfflineCreated?: boolean;
  isEncrypted: boolean;
  isAmended?: boolean;
  amendmentReason?: string;
  previousVersionHash?: string;
  
  // FHIR Export object
  fhirBundleId: string;
}

export interface FacultyMember {
  id: string;
  name: string;
  licenseNumber: string;
  specialty: 'FORENSIC_PATHOLOGY' | 'OBSTETRICS_GYNECOLOGY' | 'GENERAL_MEDICINE' | 'CIVIL_REGISTRATION' | 'HEALTH_INFORMATICS';
  role: UserRole;
  organization: string;
  email: string;
  status: 'ACTIVE' | 'PENDING_VERIFICATION' | 'SUSPENDED';
  verifiedOnChain: boolean;
  certificatesIssuedCount: number;
  registeredDate: string;
  publicKey: string;
}

export interface RecordTransaction {
  txHash: string;
  certificateId: string;
  certificateType?: CertificateType;
  action: 'CREATE' | 'SIGN' | 'APPROVE' | 'REVOKE' | 'AMEND' | 'VERIFY_FACULTY' | 'SUSPEND_FACULTY';
  performedBy: string; // Identity address/license
  role: UserRole;
  timestamp: number;
  zkProof: string;
  encryptedDataHash: string;
  status: 'SUCCESS' | 'REJECTED';
}

export interface Block {
  index: number;
  timestamp: number;
  transactions: RecordTransaction[];
  previousHash: string;
  hash: string;
  merkleRoot: string;
  nonce: number;
  validator: string;
}

export interface OfflineQueueItem {
  id: string;
  certificate: DeathCertificate;
  action: 'CREATE' | 'SIGN' | 'APPROVE' | 'REVOKE';
  timestamp: number;
  status: 'PENDING' | 'SYNCING' | 'SYNCED' | 'FAILED';
  dataSizeKb: number;
  compressedSizeKb: number;
  retryCount: number;
}

export type NetworkSpeed = 'ONLINE_5G' | 'LOW_BANDWIDTH_3G' | 'EDGE_2G' | 'OFFLINE';

export interface UserPersona {
  role: UserRole;
  name: string;
  title: string;
  licenseOrId: string;
  organization: string;
  publicKey: string;
  privateKey: string;
}

export interface EdgeCaseScenario {
  id: string;
  title: string;
  category: 'OFFLINE_BANDWIDTH' | 'PRIVACY_SOVEREIGNTY' | 'SMART_CONTRACT' | 'FAMILY_ACCESS' | 'LEGAL_DISPUTE';
  description: string;
  solutionArchitecture: string;
  status: 'HANDLED' | 'CONFIGURABLE';
  interactiveActionLabel?: string;
}
