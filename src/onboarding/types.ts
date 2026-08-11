/*
  ONBOARDING + ORG-TREE TYPES

  Shared shapes for the post-login onboarding wizard and the hospital org tree. Deliberately
  written so the SAME shapes serve both:
    - the current DEMO mode (any wallet picks any role, seeded "Demo Hospital"), and
    - the future SECURE mode (registrar = root of trust, invite-only, ZK-verified joins).

  The only thing that changes between the two is the GATE (how a node gets added), not the data
  model — so we won't have to rewrite screens later. See memory: dedecel-org-tree-onboarding.
*/

/** Top-level choice: is this visitor a citizen (family) or hospital staff? */
export type OnboardingKind = 'CITIZEN' | 'FACULTY';

/** Which registry side a faculty member works on. Official terms chosen: plain Births / Deaths. */
export type RegistrySide = 'BIRTHS' | 'DEATHS';

/**
 * A role inside the org tree. We keep birth-side and death-side role ids explicit so the wizard
 * dropdown can show the right set per side. These map onto the app's existing personas/roles.
 */
export type OrgRoleId =
  // Deaths side
  | 'DEATH_MORTICIAN'
  | 'DEATH_FORENSIC'          // Forensic / Medical examiner
  | 'DEATH_ATTENDING'         // Attending doctor / physician
  | 'DEATH_RECORDS'           // Records / admin officer
  // Births side
  | 'BIRTH_DOCTOR_MIDWIFE'
  | 'BIRTH_CIVIL_REGISTRAR'
  | 'BIRTH_JUDICIAL_AUDITOR'
  // Shared / root
  | 'HOSPITAL_ADMIN'          // first staffer at a hospital (registrar-issued in secure mode)
  | 'CIVIL_REGISTRAR';        // government root of trust

export interface OrgRoleMeta {
  id: OrgRoleId;
  side: RegistrySide | 'BOTH';
  label: string;              // human label for the dropdown
  blurb: string;              // one line describing what they do
  /** Who may this role legally sign for? Informational for now; enforced in secure mode later. */
  canCertify: boolean;
}

/**
 * One node in a hospital's org tree. A node is a person bound to a role at a hospital, placed under
 * a senior. In DEMO mode nodes are seed data / self-selected; in SECURE mode each node is a wallet
 * proven to hold a valid invite (ZK) issued by its `seniorId`.
 */
export interface OrgNode {
  id: string;                 // stable id within the tree
  name: string;               // display name (e.g. "Dr. Samuel Otieno")
  roleId: OrgRoleId;
  hospitalId: string;
  /** Parent node in the hierarchy. null for the hospital admin / registrar root. */
  seniorId: string | null;
  /** The wallet bound to this node, when known. null for seeded placeholders. */
  walletId?: string | null;
  /** DEMO seed vs a node created during this session. */
  source: 'SEED' | 'SESSION';
}

export interface Hospital {
  id: string;
  name: string;
  location: string;
  /** The registrar-issued admin node id (root of this hospital's tree). */
  adminNodeId: string;
}

/** The choice the wizard produces and hands back to the app to open the right dashboard. */
export interface OnboardingResult {
  kind: OnboardingKind;
  side?: RegistrySide;        // faculty only
  roleId?: OrgRoleId;         // faculty only
  hospitalId?: string;        // faculty only
  nodeId?: string;            // the org-tree node the user is acting as (faculty only)
}
