import { EdgeCaseScenario } from '../types';

export const EDGE_CASE_SCENARIOS: EdgeCaseScenario[] = [
  {
    id: 'EDGE-1',
    title: 'Offline & Remote Field Connectivity',
    category: 'OFFLINE_BANDWIDTH',
    description: 'Medical officers operating in remote rural areas or emergency relief zones with zero cellular or 2G connections need to issue digitally signed death certificates.',
    solutionArchitecture: 'Certificates are signed locally using client-side Web Crypto API keypairs, compressed up to 72% with Protocol Buffers / Binary FHIR, stored in encrypted IndexedDB, and queued for auto-gossip broadcast as soon as a 2G/3G/Satellite mesh node is detected.',
    status: 'HANDLED',
    interactiveActionLabel: 'Simulate 2G Field Queue & Offline Sync'
  },
  {
    id: 'EDGE-2',
    title: 'GDPR "Right to be Forgotten" vs Blockchain Immutability',
    category: 'PRIVACY_SOVEREIGNTY',
    description: 'Under EU GDPR Article 17 or Kenya PDPA, a family or court orders the removal of personal health information (PII/PHI) from public view, but blockchains cannot be edited.',
    solutionArchitecture: 'Data dualism pattern: PII/PHI is stored off-chain in encrypted IPFS shards. Only the SHA-256 hash anchor and ZK-Proof are stored on-chain. Upon valid court order, the off-chain decryption key is revoked from the Key Management Service (KMS), rendering the on-chain payload mathematically unrecoverable crypto-shredded noise.',
    status: 'HANDLED',
    interactiveActionLabel: 'Test Crypto-Shredding Key Revocation'
  },
  {
    id: 'EDGE-3',
    title: 'Post-Autopsy Cause of Death Amendment',
    category: 'SMART_CONTRACT',
    description: 'A death certificate was issued as "Natural Causes - Cardiac Arrest", but toxicology results 2 weeks later reveal accidental poisoning requiring amendment.',
    solutionArchitecture: 'Smart contract amendment pointer: Blockchains do not overwrite past blocks. Instead, the smart contract creates a new "AMENDED" block linked back to the original Certificate ID hash (`previousVersionHash`). Both records remain permanently auditable with an immutable paper-trail of who amended what and why.',
    status: 'HANDLED',
    interactiveActionLabel: 'Test Smart Contract Record Amendment'
  },
  {
    id: 'EDGE-4',
    title: 'Family Key Recovery & Grieving Relative Access',
    category: 'FAMILY_ACCESS',
    description: 'A grieving family member loses the secret 12-word seed phrase or family access key required to unlock their deceased parent\'s official certificate for estate probate.',
    solutionArchitecture: 'Shamir\'s Secret Sharing & Registrar Escrow: The access key is split into 3 key shards (1 held by Medical Facility, 1 by Civil Registrar, 1 given to Family). Any 2 out of 3 shards can re-synthesize the access key upon verification of legal executor credentials.',
    status: 'HANDLED',
    interactiveActionLabel: 'Test 2-of-3 Key Shard Recovery'
  },
  {
    id: 'EDGE-5',
    title: 'Unidentified Deceased & Disaster Zone Batch Reporting',
    category: 'LEGAL_DISPUTE',
    description: 'In mass casualty scenarios or unidentified body cases, full personal details (National ID, Name) are unknown at time of death certification.',
    solutionArchitecture: 'Temporary Biometric Hash & Sequential Placeholder ID: Certificate created with DNA/Biometric/Location hash as temporary anchor. Smart contract allows Registrar to bind verified National ID once identified via Interpol or forensic database without invalidating the initial timestamp.',
    status: 'HANDLED',
    interactiveActionLabel: 'Create Unidentified Mass Casualty Entry'
  },
  {
    id: 'EDGE-6',
    title: 'Zero-Knowledge Selective Disclosure for Insurance',
    category: 'PRIVACY_SOVEREIGNTY',
    description: 'Insurance agencies need to verify that death occurred on or before a policy deadline without inspecting private medical details (e.g. sensitive cause of death).',
    solutionArchitecture: 'ZK-SNARK proof circuits generate a cryptographic boolean verification ("Is Certified Dead == True AND Date <= 2026-07-27") signed by Registrar, allowing 100% verification with 0% disclosure of confidential medical diagnosis.',
    status: 'HANDLED',
    interactiveActionLabel: 'Generate ZK-Proof for Insurance'
  },
  {
    id: 'EDGE-7',
    title: 'Multi-Jurisdiction Data Sovereignty Routing',
    category: 'PRIVACY_SOVEREIGNTY',
    description: 'A citizen of the European Union passes away while abroad in East Africa. Dual compliance (EU GDPR & Kenya PDPA) is required.',
    solutionArchitecture: 'Jurisdictional smart contract gateway tags payload with regional data routing constraints, ensuring off-chain IPFS nodes store data within sovereign borders while cross-chain interoperability bridges maintain cryptographic proof consistency.',
    status: 'HANDLED',
    interactiveActionLabel: 'Inspect Multi-Jurisdiction Tags'
  }
];
