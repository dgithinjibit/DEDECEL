import { createClient, SupabaseClient } from '@supabase/supabase-js';

/*
  DATA STORE — where the private certificate rows live (off-chain PII).

  Two backends behind one interface:
    * SUPABASE  — used when SUPABASE_URL + SUPABASE_SERVICE_KEY env vars are set.
    * IN-MEMORY — automatic fallback when they aren't, so the API runs with zero setup
                  while you're developing. (Data is lost on restart — fine for local dev.)

  Switching to real Supabase is just: set the two env vars and restart. No code change.

  Everything here stays SERVER-SIDE. The `salt` column is a secret; never expose it to clients.
*/

export type Domain = 'BIRTH' | 'DEATH';

/** A stored row: the full record payload plus our hashing/anchoring columns. */
export interface StoredCert {
  id: string;
  payload: Record<string, unknown>; // the full original record (PII)
  salt: string;                      // per-record secret (off-chain only)
  cert_hash: string;                 // salted fingerprint (safe to anchor on-chain)
  status: string;
  anchor_tx_id: string | null;
  anchored_at: string | null;
  // Denormalized lookup keys (also present inside payload):
  national_id?: string | null;       // death: deceased; birth: n/a
  mother_national_id?: string | null; // birth
  father_national_id?: string | null; // birth
  created_at: string;
  updated_at: string;
}

export interface CertStore {
  insert(domain: Domain, row: StoredCert): Promise<StoredCert>;
  getById(domain: Domain, id: string): Promise<StoredCert | null>;
  list(domain: Domain): Promise<StoredCert[]>;
  /** Hard delete — used for GDPR erasure. Returns true if a row was removed. */
  remove(domain: Domain, id: string): Promise<boolean>;
  update(domain: Domain, id: string, patch: Partial<StoredCert>): Promise<StoredCert | null>;
  /** Cross-ledger: find a birth row by a parent's national id. */
  findBirthByNationalId(nationalId: string): Promise<StoredCert | null>;
  /** Which backend is active — for the health endpoint. */
  backendName(): string;
}

const TABLE: Record<Domain, string> = {
  BIRTH: 'birth_certificates',
  DEATH: 'death_certificates',
};

// ---------------------------------------------------------------------------
// Supabase-backed store
// ---------------------------------------------------------------------------
class SupabaseStore implements CertStore {
  constructor(private db: SupabaseClient) {}
  backendName() {
    return 'supabase';
  }
  async insert(domain: Domain, row: StoredCert) {
    // Drop keys whose value is null/undefined before inserting. StoredCert carries columns for
    // BOTH domains (e.g. mother_national_id/father_national_id are birth-only, national_id is
    // death-only); a death row leaves the birth-only ones null and vice-versa. Those columns do
    // not exist on the other table, so sending them makes Supabase reject the insert with
    // "Could not find the 'x' column ... in the schema cache". Stripping nulls lets each table
    // receive only the columns it actually defines, and Postgres applies its own defaults.
    const clean = Object.fromEntries(
      Object.entries(row).filter(([, v]) => v !== null && v !== undefined)
    );
    const { data, error } = await this.db.from(TABLE[domain]).insert(clean).select().single();
    if (error) throw new Error(`insert failed: ${error.message}`);
    return data as StoredCert;
  }
  async getById(domain: Domain, id: string) {
    const { data, error } = await this.db.from(TABLE[domain]).select('*').eq('id', id).maybeSingle();
    if (error) throw new Error(`getById failed: ${error.message}`);
    return (data as StoredCert) ?? null;
  }
  async list(domain: Domain) {
    const { data, error } = await this.db
      .from(TABLE[domain])
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw new Error(`list failed: ${error.message}`);
    return (data as StoredCert[]) ?? [];
  }
  async remove(domain: Domain, id: string) {
    const { error, count } = await this.db
      .from(TABLE[domain])
      .delete({ count: 'exact' })
      .eq('id', id);
    if (error) throw new Error(`remove failed: ${error.message}`);
    return (count ?? 0) > 0;
  }
  async update(domain: Domain, id: string, patch: Partial<StoredCert>) {
    const { data, error } = await this.db
      .from(TABLE[domain])
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .maybeSingle();
    if (error) throw new Error(`update failed: ${error.message}`);
    return (data as StoredCert) ?? null;
  }
  async findBirthByNationalId(nationalId: string) {
    const nid = nationalId.toUpperCase();
    const { data, error } = await this.db
      .from(TABLE.BIRTH)
      .select('*')
      .or(`mother_national_id.eq.${nid},father_national_id.eq.${nid}`)
      .maybeSingle();
    if (error) throw new Error(`findBirthByNationalId failed: ${error.message}`);
    return (data as StoredCert) ?? null;
  }
}

// ---------------------------------------------------------------------------
// In-memory fallback store (no external setup needed)
// ---------------------------------------------------------------------------
class MemoryStore implements CertStore {
  private tables: Record<Domain, Map<string, StoredCert>> = {
    BIRTH: new Map(),
    DEATH: new Map(),
  };
  backendName() {
    return 'memory (no Supabase configured)';
  }
  async insert(domain: Domain, row: StoredCert) {
    this.tables[domain].set(row.id, row);
    return row;
  }
  async getById(domain: Domain, id: string) {
    return this.tables[domain].get(id) ?? null;
  }
  async list(domain: Domain) {
    return [...this.tables[domain].values()].sort((a, b) =>
      a.created_at < b.created_at ? 1 : -1
    );
  }
  async remove(domain: Domain, id: string) {
    return this.tables[domain].delete(id);
  }
  async update(domain: Domain, id: string, patch: Partial<StoredCert>) {
    const cur = this.tables[domain].get(id);
    if (!cur) return null;
    const next = { ...cur, ...patch, updated_at: new Date().toISOString() };
    this.tables[domain].set(id, next);
    return next;
  }
  async findBirthByNationalId(nationalId: string) {
    const nid = nationalId.toUpperCase();
    for (const row of this.tables.BIRTH.values()) {
      if (
        (row.mother_national_id || '').toUpperCase() === nid ||
        (row.father_national_id || '').toUpperCase() === nid
      ) {
        return row;
      }
    }
    return null;
  }
}

/** Build the active store from env. Supabase if configured, else in-memory. */
export function createStore(): CertStore {
  // Explicit override for tests: `import 'dotenv/config'` in server.ts reloads .env from disk,
  // which can repopulate SUPABASE_* even after a test does `delete process.env.SUPABASE_URL`.
  // That would silently run the test suite against the REAL database. This flag wins over .env,
  // so a test can force the in-memory store deterministically.
  if (process.env.DEDECEL_FORCE_MEMORY_STORE === '1') {
    console.log('[store] DEDECEL_FORCE_MEMORY_STORE=1 — using in-memory store');
    return new MemoryStore();
  }
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (url && key) {
    const client = createClient(url, key, { auth: { persistSession: false } });
    console.log('[store] using Supabase backend');
    return new SupabaseStore(client);
  }
  console.log('[store] SUPABASE_URL / SUPABASE_SERVICE_KEY not set — using in-memory store (dev only)');
  return new MemoryStore();
}
