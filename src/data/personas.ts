import { UserPersona } from '../types';

export const USER_PERSONAS: Record<string, UserPersona> = {
  ADMIN: {
    role: 'ADMIN',
    name: 'Dr. Alexander Sterling, MD',
    title: 'Director of Medical Faculty & Registry Administration',
    licenseOrId: 'ADMIN-FACULTY-001-DIR',
    organization: 'National Health Council & Civil Status Bureau',
    publicKey: '0x04a00112233445566778899aabbccddeeff',
    privateKey: '0xpriv_admin_faculty_director_master_key'
  },
  MEDICAL_OFFICER: {
    role: 'MEDICAL_OFFICER',
    name: 'Dr. Evelyn Wanjiku, MD',
    title: 'Senior Forensic Medical Examiner',
    licenseOrId: 'KMD-88392-A',
    organization: 'Nairobi National Referral Hospital / Field Corps',
    publicKey: '0x04a2f819c991b3e82d1109a2bc38e91029c',
    privateKey: '0xpriv_med_wanjiku_88392_secret_key'
  },
  REGISTRAR: {
    role: 'REGISTRAR',
    name: 'Hon. Marcus Vance',
    title: 'Chief Registrar of Births & Deaths',
    licenseOrId: 'GOV-REGISTRAR-001',
    organization: 'Ministry of Interior & National Registration Authority',
    publicKey: '0x04c81a29f00192e817293a1290b38c1192',
    privateKey: '0xpriv_gov_registrar_vance_001_secret'
  },
  FAMILY: {
    role: 'FAMILY',
    name: 'Sarah Pendelton',
    title: 'Designated Kin / Executor of Estate',
    licenseOrId: 'NAT-ID-88201-391',
    organization: 'Estate of Arthur Pendelton',
    publicKey: '0x04f1a2881b992a019827361829029281a0',
    privateKey: '0xpriv_family_pendelton_sarah_key'
  },
  VERIFIER_AGENCY: {
    role: 'VERIFIER_AGENCY',
    name: 'Aegis Life Assurance & Probate Court',
    title: 'Senior Claims & Authenticity Auditor',
    licenseOrId: 'FIN-AUDIT-4902-ISO',
    organization: 'International Insurance Verification Network',
    publicKey: '0x04d192801a9182b82718291019281a092b',
    privateKey: '0xpriv_verifier_aegis_4902_secret'
  },
  SYSTEM_AUDITOR: {
    role: 'SYSTEM_AUDITOR',
    name: 'Consensus & ZK Proof Inspector',
    title: 'Smart Contract & Data Sovereignty Auditor',
    licenseOrId: 'NODE-VAL-00192',
    organization: 'Global Decentralized Health Records Foundation',
    publicKey: '0x04e88102a9182910192837192810293a01',
    privateKey: '0xpriv_node_validator_master'
  }
};
