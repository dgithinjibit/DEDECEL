-- ============================================================================
-- DEDECEL / DeBiCeL — off-chain database schema (Supabase Postgres)
-- ============================================================================
-- Phase 2 of the roadmap. This database holds the PRIVATE certificate data (PII).
-- The blockchain (Phase 3) will store ONLY a salted hash per record — never the
-- data below. See docs/research/onchain-vs-offchain-privacy.md for why.
--
-- Privacy rules baked into this schema:
--   * All PII (names, national IDs, medical details) lives here, off-chain, and
--     can be HARD-DELETED on an erasure request (plain DELETE removes the row).
--   * Each record has its own random `salt`. The salt + a server-only global
--     "pepper" (an env var, NOT in this DB) are mixed in before hashing, so a
--     low-entropy field like a birth date can't be brute-forced from the hash.
--   * Deleting the row (and thus its salt) makes the on-chain hash unreproducible
--     — this is the mechanism we rely on for "right to erasure".
--   * `cert_hash` is the fingerprint that gets anchored on-chain. It is safe to
--     expose; the raw data and salt are not.
--
-- IMPORTANT — how the backend uses these tables (backend/src/store.ts):
--   The backend stores the WHOLE submitted certificate in the `payload` jsonb column
--   and only ever writes a handful of top-level columns: id, payload, salt, cert_hash,
--   status, anchor_tx_id, anchored_at, created_at, updated_at, plus the lookup id(s)
--   national_id (death) / mother_national_id + father_national_id (birth). The many
--   detailed PII columns below are OPTIONAL mirror fields — they may be null. That is
--   why the human-name / date columns are nullable (they used to be NOT NULL, which
--   rejected every insert since the code leaves them in `payload`).
--
-- Run this in the Supabase SQL editor once to create the tables. If you created an
-- earlier version with NOT NULL on deceased_name/date_of_death/child_first_name/etc.,
-- run the ALTER block in schema-migrate.sql to relax them, or drop+recreate here.
-- ============================================================================

-- Enable pgcrypto for gen_random_uuid() (Supabase has this available).
create extension if not exists pgcrypto;

-- ----------------------------------------------------------------------------
-- BIRTH certificates
-- ----------------------------------------------------------------------------
create table if not exists birth_certificates (
  -- Identity
  id                text primary key,                    -- e.g. REG-2026-98124 (registration id)
  child_temp_id     text,
  child_first_name  text,                                -- optional mirror; PII lives in payload
  child_last_name   text,                                -- optional mirror
  date_of_birth     text,                                -- optional mirror
  time_of_birth     text,
  place_of_birth    text,
  facility_name     text,
  facility_id       text,
  gender            text,
  birth_weight_grams   integer,
  gestational_age_weeks integer,
  apgar_1_min       integer,
  apgar_5_min       integer,
  birth_type        text,

  -- Parents. mother_national_id / father_national_id ARE set by the backend (lookup keys).
  mother_national_id text,
  mother_legal_name  text,                               -- optional mirror
  father_national_id text,
  father_legal_name  text,
  parent_contact_email text,

  -- Attestation
  attending_physician_name    text,
  attending_physician_license text,

  -- Full original record as submitted (JSON), so nothing is lost. PII — off-chain only.
  payload           jsonb not null,

  -- Hashing / anchoring
  salt              text not null,            -- per-record secret, off-chain only
  cert_hash         text not null,            -- salted SHA-256 fingerprint (goes on-chain)
  status            text not null default 'Pending_Registrar_Seal',
  anchor_tx_id      text,                     -- NEAR tx id once anchored (Phase 3)
  anchored_at       timestamptz,

  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- Fast cross-ledger lookup by parent national id (death certs verify birth by this).
create index if not exists idx_birth_mother_nid on birth_certificates (mother_national_id);
create index if not exists idx_birth_father_nid on birth_certificates (father_national_id);
create index if not exists idx_birth_hash        on birth_certificates (cert_hash);

-- ----------------------------------------------------------------------------
-- DEATH certificates
-- ----------------------------------------------------------------------------
create table if not exists death_certificates (
  -- Identity. national_id IS set by the backend (lookup key).
  id             text primary key,                       -- e.g. CERT-2026-000123
  national_id    text,
  first_name     text,
  second_name    text,
  last_name      text,
  deceased_name  text,                                   -- optional mirror; PII lives in payload
  date_of_birth  text,
  date_of_death  text,                                   -- optional mirror
  time_of_death  text,
  place_of_death text,
  place_type     text,
  gender         text,
  age_at_death   integer,

  -- Medical (PII)
  cause_of_death_icd10 text,
  cause_category       text,
  secondary_causes     text,
  attending_physician_name    text,
  attending_physician_license text,
  hospital_org         text,

  -- Cross-ledger birth link
  linked_birth_cert_hash text,
  birth_verified_onchain boolean default false,

  -- Full original record as submitted (JSON). PII — off-chain only.
  payload        jsonb not null,

  -- Hashing / anchoring
  salt           text not null,               -- per-record secret, off-chain only
  cert_hash      text not null,               -- salted SHA-256 fingerprint (goes on-chain)
  status         text not null default 'DRAFT',
  jurisdiction   text,
  anchor_tx_id   text,
  anchored_at    timestamptz,

  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists idx_death_national_id on death_certificates (national_id);
create index if not exists idx_death_hash        on death_certificates (cert_hash);

-- ----------------------------------------------------------------------------
-- AUDIT LOG (append-only trail; no PII beyond actor + record id references)
-- ----------------------------------------------------------------------------
create table if not exists audit_logs (
  id         bigint generated always as identity primary key,
  ts         timestamptz not null default now(),
  actor      text,
  role       text,
  action     text not null,
  record_id  text,
  domain     text,                            -- 'BIRTH' | 'DEATH'
  details    text
);

create index if not exists idx_audit_record on audit_logs (record_id);
