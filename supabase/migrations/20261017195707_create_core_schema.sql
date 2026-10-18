/*
# SlipsLedger core schema (multi-user, owner-scoped)

## 1. Purpose
Creates the foundational tables for SlipsLedger: property owners (landlords/agents)
sign up, and every record they create is visible only to them.

## 2. New Tables
- `profiles`         — one per account: display name, currency preference, WhatsApp-ready settings,
                       and the "proactive overdue nudge" toggle (default OFF, user-controlled).
- `properties`       — a building or plot owned/managed by the account.
- `units`            — a rentable unit (room, shop, apartment) within a property.
- `people`           — payers: tenants, cleaners, guards, or other providers.
- `tenancies`        — the lease terms linking a person to a unit: rent amount, due day of month,
                       lease start date and optional lease end date. This is what makes
                       rent tracking lease-aware (multi-month and full-year payments
                       are spread across the correct months).
- `payments`         — the ledger: one row per money event. Includes the covered period
                       (covers_from/covers_to) so a single payment can cover 1..N months,
                       the storage path of the original slip photo, and how the record
                       entered the system (manual / AI extraction / telegram bot).
- `share_links`      — revocable, expiring read-only share links.

## 3. Security
- RLS enabled on every table.
- Four policies per table (SELECT / INSERT / UPDATE / DELETE), all scoped to
  `authenticated` with ownership predicates — no row is ever visible or writable
  by another account.
- Owner columns default to `auth.uid()` so the client never supplies ownership.

## 4. Notes
- No destructive statements; fully idempotent.
- Indexes added on the columns used by dashboard queries and searches.
*/

-- profiles -------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL DEFAULT '',
  currency text NOT NULL DEFAULT 'NGN',
  nudge_enabled boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_profile" ON profiles;
CREATE POLICY "select_own_profile" ON profiles FOR SELECT
TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "insert_own_profile" ON profiles;
CREATE POLICY "insert_own_profile" ON profiles FOR INSERT
TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "update_own_profile" ON profiles;
CREATE POLICY "update_own_profile" ON profiles FOR UPDATE
TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "delete_own_profile" ON profiles;
CREATE POLICY "delete_own_profile" ON profiles FOR DELETE
TO authenticated USING (auth.uid() = id);

-- properties -----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS properties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  address text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE properties ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_properties" ON properties;
CREATE POLICY "select_own_properties" ON properties FOR SELECT
TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_properties" ON properties;
CREATE POLICY "insert_own_properties" ON properties FOR INSERT
TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_properties" ON properties;
CREATE POLICY "update_own_properties" ON properties FOR UPDATE
TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_properties" ON properties;
CREATE POLICY "delete_own_properties" ON properties FOR DELETE
TO authenticated USING (auth.uid() = user_id);

-- units ----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS units (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  label text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE units ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_units" ON units;
CREATE POLICY "select_own_units" ON units FOR SELECT
TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_units" ON units;
CREATE POLICY "insert_own_units" ON units FOR INSERT
TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_units" ON units;
CREATE POLICY "update_own_units" ON units FOR UPDATE
TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_units" ON units;
CREATE POLICY "delete_own_units" ON units FOR DELETE
TO authenticated USING (auth.uid() = user_id);

-- people ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS people (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  phone text NOT NULL DEFAULT '',
  role text NOT NULL DEFAULT 'tenant' CHECK (role IN ('tenant','cleaner','guard','provider')),
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE people ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_people" ON people;
CREATE POLICY "select_own_people" ON people FOR SELECT
TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_people" ON people;
CREATE POLICY "insert_own_people" ON people FOR INSERT
TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_people" ON people;
CREATE POLICY "update_own_people" ON people FOR UPDATE
TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_people" ON people;
CREATE POLICY "delete_own_people" ON people FOR DELETE
TO authenticated USING (auth.uid() = user_id);

-- tenancies ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tenancies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  person_id uuid NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  unit_id uuid NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  rent_amount numeric(12,2) NOT NULL CHECK (rent_amount >= 0),
  due_day smallint NOT NULL DEFAULT 1 CHECK (due_day BETWEEN 1 AND 28),
  start_date date NOT NULL,
  end_date date,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE tenancies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_tenancies" ON tenancies;
CREATE POLICY "select_own_tenancies" ON tenancies FOR SELECT
TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_tenancies" ON tenancies;
CREATE POLICY "insert_own_tenancies" ON tenancies FOR INSERT
TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_tenancies" ON tenancies;
CREATE POLICY "update_own_tenancies" ON tenancies FOR UPDATE
TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_tenancies" ON tenancies;
CREATE POLICY "delete_own_tenancies" ON tenancies FOR DELETE
TO authenticated USING (auth.uid() = user_id);

-- payments (ledger) ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  person_id uuid REFERENCES people(id) ON DELETE SET NULL,
  tenancy_id uuid REFERENCES tenancies(id) ON DELETE SET NULL,
  amount numeric(12,2) NOT NULL CHECK (amount >= 0),
  paid_on date NOT NULL,
  payment_type text NOT NULL DEFAULT 'rent' CHECK (payment_type IN ('rent','cleaning','guard','other')),
  covers_from date,
  covers_to date,
  slip_image_path text NOT NULL DEFAULT '',
  note text NOT NULL DEFAULT '',
  source text NOT NULL DEFAULT 'manual' CHECK (source IN ('manual','ai','telegram')),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_payments" ON payments;
CREATE POLICY "select_own_payments" ON payments FOR SELECT
TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_payments" ON payments;
CREATE POLICY "insert_own_payments" ON payments FOR INSERT
TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_payments" ON payments;
CREATE POLICY "update_own_payments" ON payments FOR UPDATE
TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_payments" ON payments;
CREATE POLICY "delete_own_payments" ON payments FOR DELETE
TO authenticated USING (auth.uid() = user_id);

-- share links ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS share_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24), 'hex'),
  expires_at timestamptz NOT NULL,
  revoked boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE share_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_share_links" ON share_links;
CREATE POLICY "select_own_share_links" ON share_links FOR SELECT
TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_share_links" ON share_links;
CREATE POLICY "insert_own_share_links" ON share_links FOR INSERT
TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_share_links" ON share_links;
CREATE POLICY "update_own_share_links" ON share_links FOR UPDATE
TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_share_links" ON share_links;
CREATE POLICY "delete_own_share_links" ON share_links FOR DELETE
TO authenticated USING (auth.uid() = user_id);

-- indexes for dashboard + search queries --------------------------------------
CREATE INDEX IF NOT EXISTS idx_payments_user_paid_on ON payments (user_id, paid_on);
CREATE INDEX IF NOT EXISTS idx_payments_user_person ON payments (user_id, person_id);
CREATE INDEX IF NOT EXISTS idx_payments_user_type ON payments (user_id, payment_type);
CREATE INDEX IF NOT EXISTS idx_people_user_name ON people (user_id, lower(full_name));
CREATE INDEX IF NOT EXISTS idx_properties_user ON properties (user_id);
CREATE INDEX IF NOT EXISTS idx_units_user_property ON units (user_id, property_id);
CREATE INDEX IF NOT EXISTS idx_tenancies_user_person ON tenancies (user_id, person_id);
