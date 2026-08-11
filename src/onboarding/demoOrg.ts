import { Hospital, OrgNode, OrgRoleId, OrgRoleMeta, RegistrySide } from './types';

/*
  DEMO ORG DATA — a single fully-seeded "Demo Hospital" with a complete org tree on BOTH sides.

  This is the always-on demo the user asked for: any wallet can pick any role to see how each
  dashboard differs, and the tree below shows the senior -> junior hierarchy so the org-tree UI has
  real shape to render. It is SEED data only — the secure, registrar-rooted, ZK-invite flow will
  later replace how nodes are ADDED, not this shape. See memory: dedecel-org-tree-onboarding.
*/

/** The catalog of roles the wizard offers, grouped by side. */
export const ORG_ROLES: Record<OrgRoleId, OrgRoleMeta> = {
  // ---- Deaths side ----
  DEATH_MORTICIAN: {
    id: 'DEATH_MORTICIAN',
    side: 'DEATHS',
    label: 'Mortician / Mortuary technician',
    blurb: 'Receives and logs the deceased; often the first to record a death in the facility.',
    canCertify: false,
  },
  DEATH_FORENSIC: {
    id: 'DEATH_FORENSIC',
    side: 'DEATHS',
    label: 'Forensic / Medical examiner',
    blurb: 'Senior clinician who examines the deceased and certifies the cause of death.',
    canCertify: true,
  },
  DEATH_ATTENDING: {
    id: 'DEATH_ATTENDING',
    side: 'DEATHS',
    label: 'Attending doctor',
    blurb: 'Pronounces death and signs the medical certificate of cause of death.',
    canCertify: true,
  },
  DEATH_RECORDS: {
    id: 'DEATH_RECORDS',
    side: 'DEATHS',
    label: 'Records / Admin officer',
    blurb: 'Compiles the certified record and submits it to the civil registry.',
    canCertify: false,
  },

  // ---- Births side ----
  BIRTH_DOCTOR_MIDWIFE: {
    id: 'BIRTH_DOCTOR_MIDWIFE',
    side: 'BIRTHS',
    label: 'Doctor / Midwife',
    blurb: 'Attends the birth and attests the newborn record at the bedside.',
    canCertify: true,
  },
  BIRTH_CIVIL_REGISTRAR: {
    id: 'BIRTH_CIVIL_REGISTRAR',
    side: 'BIRTHS',
    label: 'Civil Registrar (Births)',
    blurb: 'Reviews birth attestations and affixes the official civil seal.',
    canCertify: true,
  },
  BIRTH_JUDICIAL_AUDITOR: {
    id: 'BIRTH_JUDICIAL_AUDITOR',
    side: 'BIRTHS',
    label: 'Judicial / Health inspector',
    blurb: 'Audits registration analytics and inspects proofs.',
    canCertify: false,
  },

  // ---- Shared / root ----
  HOSPITAL_ADMIN: {
    id: 'HOSPITAL_ADMIN',
    side: 'BOTH',
    label: 'Hospital administrator',
    blurb: 'First staffer at the facility; invites and approves staff (registrar-issued later).',
    canCertify: false,
  },
  CIVIL_REGISTRAR: {
    id: 'CIVIL_REGISTRAR',
    side: 'BOTH',
    label: 'Civil registrar (root)',
    blurb: 'Government root of trust who accredits hospitals and their first admin.',
    canCertify: true,
  },
};

/** Roles offered in the wizard dropdown for a given side (excludes the registrar root). */
export function rolesForSide(side: RegistrySide): OrgRoleMeta[] {
  return Object.values(ORG_ROLES).filter(
    (r) => (r.side === side || r.side === 'BOTH') && r.id !== 'CIVIL_REGISTRAR'
  );
}

export const DEMO_HOSPITAL: Hospital = {
  id: 'HOSP-DEMO-001',
  name: 'Demo Hospital',
  location: 'Nairobi, KE',
  adminNodeId: 'node-admin',
};

/*
  The seeded tree:

    Civil Registrar (root)
      └─ Hospital Admin
           ├─ DEATHS
           │    ├─ Forensic / Medical examiner (senior)
           │    │     └─ Mortician (junior)
           │    └─ Attending doctor
           │          └─ Records officer
           └─ BIRTHS
                ├─ Civil Registrar (Births)
                │     └─ Doctor / Midwife
                └─ Judicial / Health inspector
*/
export const DEMO_ORG_NODES: OrgNode[] = [
  {
    id: 'node-registrar',
    name: 'Hon. Marcus Vance',
    roleId: 'CIVIL_REGISTRAR',
    hospitalId: DEMO_HOSPITAL.id,
    seniorId: null,
    source: 'SEED',
  },
  {
    id: 'node-admin',
    name: 'Dr. Alexander Sterling',
    roleId: 'HOSPITAL_ADMIN',
    hospitalId: DEMO_HOSPITAL.id,
    seniorId: 'node-registrar',
    source: 'SEED',
  },

  // Deaths branch
  {
    id: 'node-forensic',
    name: 'Dr. Evelyn Wanjiku',
    roleId: 'DEATH_FORENSIC',
    hospitalId: DEMO_HOSPITAL.id,
    seniorId: 'node-admin',
    source: 'SEED',
  },
  {
    id: 'node-mortician',
    name: 'John Otieno',
    roleId: 'DEATH_MORTICIAN',
    hospitalId: DEMO_HOSPITAL.id,
    seniorId: 'node-forensic',
    source: 'SEED',
  },
  {
    id: 'node-attending',
    name: 'Dr. Priya Nair',
    roleId: 'DEATH_ATTENDING',
    hospitalId: DEMO_HOSPITAL.id,
    seniorId: 'node-admin',
    source: 'SEED',
  },
  {
    id: 'node-records-death',
    name: 'Grace Mwangi',
    roleId: 'DEATH_RECORDS',
    hospitalId: DEMO_HOSPITAL.id,
    seniorId: 'node-attending',
    source: 'SEED',
  },

  // Births branch
  {
    id: 'node-birth-registrar',
    name: 'Ruth Kamau',
    roleId: 'BIRTH_CIVIL_REGISTRAR',
    hospitalId: DEMO_HOSPITAL.id,
    seniorId: 'node-admin',
    source: 'SEED',
  },
  {
    id: 'node-doctor-midwife',
    name: 'Dr. Samuel Barasa',
    roleId: 'BIRTH_DOCTOR_MIDWIFE',
    hospitalId: DEMO_HOSPITAL.id,
    seniorId: 'node-birth-registrar',
    source: 'SEED',
  },
  {
    id: 'node-auditor',
    name: 'Insp. Daniel Kiptoo',
    roleId: 'BIRTH_JUDICIAL_AUDITOR',
    hospitalId: DEMO_HOSPITAL.id,
    seniorId: 'node-admin',
    source: 'SEED',
  },
];
