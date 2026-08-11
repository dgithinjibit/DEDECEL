-- ============================================================================
-- MIGRATION: relax NOT NULL on the "mirror" PII columns the backend never fills.
-- ============================================================================
-- The original schema.sql declared deceased_name/date_of_death (death) and
-- child_first_name/child_last_name/date_of_birth/mother_legal_name (birth) as NOT NULL.
-- The backend (backend/src/store.ts) stores the whole record in `payload` and does NOT
-- populate those individual columns, so every insert failed with a not-null violation.
--
-- Run this ONCE in the Supabase SQL editor if your tables were created from the old
-- (NOT NULL) schema. It is safe to re-run. After this, schema.sql and the live DB agree.
-- ============================================================================

alter table death_certificates alter column deceased_name drop not null;
alter table death_certificates alter column date_of_death drop not null;

alter table birth_certificates alter column child_first_name drop not null;
alter table birth_certificates alter column child_last_name  drop not null;
alter table birth_certificates alter column date_of_birth    drop not null;
alter table birth_certificates alter column mother_legal_name drop not null;
