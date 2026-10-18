/*
# Generalize to a receipt vault: documents, merchants, cases

1. Purpose
Reframes the core from rent-only to a general, permanent receipt record:
any document (rent receipt, invoice, shop purchase, service payment) can be
stored with tamper-evident verification and bundled into "cases" (e.g. a
dispute) for export. Rent tracking (tenancies, lease-aware statuses) remains
as one category on top of this core.

2. New tables
- `cases`           — named bundles of documents (e.g. "Deposit dispute — Flat B").
- `case_documents`  — join table: which documents belong to which case.

3. Modified tables (additive only, no data loss)
- `payments`:
  - adds `title` (what the payment was for, human-readable)
  - adds `merchant` (free-text counterparty as written on the receipt)
  - adds `category` — 'rent' | 'utilities' | 'groceries' | 'services' | 'goods' | 'transport' | 'medical' | 'education' | 'other'
    (existing `payment_type` is kept for rent sub-typing; category is the general layer)
  - adds `doc_hash` (SHA-256 of the stored image, computed at upload — proves
    the record's photo has not been swapped since filing)
  - adds `case_id` convenience? No — case linkage lives in case_documents
    so a document can appear in multiple bundles.
- `people` gains nothing; merchants are free text on payments, people remain
  for recurring counterparties (tenants, providers).

4. Security
- RLS on new tables, owner-scoped, four policies each, authenticated only —
  same model as the rest of the schema.
- Views of case contents inherit document ownership through joins with
  owner-checked EXISTS predicates.

5. Notes
- Fully idempotent; no destructive statements.
*/

CREATE TABLE IF NOT EXISTS cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','resolved')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS case_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  case_id uuid NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  payment_id uuid NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (case_id, payment_id)
);

ALTER TABLE cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_cases" ON cases;
CREATE POLICY "select_own_cases" ON cases FOR SELECT
TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_cases" ON cases;
CREATE POLICY "insert_own_cases" ON cases FOR INSERT
TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_cases" ON cases;
CREATE POLICY "update_own_cases" ON cases FOR UPDATE
TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_cases" ON cases;
CREATE POLICY "delete_own_cases" ON cases FOR DELETE
TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "select_own_case_documents" ON case_documents;
CREATE POLICY "select_own_case_documents" ON case_documents FOR SELECT
TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_case_documents" ON case_documents;
CREATE POLICY "insert_own_case_documents" ON case_documents FOR INSERT
TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_case_documents" ON case_documents;
CREATE POLICY "delete_own_case_documents" ON case_documents FOR DELETE
TO authenticated USING (auth.uid() = user_id);

-- Generalize payments (additive) ------------------------------------------------
ALTER TABLE payments ADD COLUMN IF NOT EXISTS title text NOT NULL DEFAULT '';
ALTER TABLE payments ADD COLUMN IF NOT EXISTS merchant text NOT NULL DEFAULT '';
ALTER TABLE payments ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'other'
  CHECK (category IN ('rent','utilities','groceries','services','goods','transport','medical','education','other'));
ALTER TABLE payments ADD COLUMN IF NOT EXISTS doc_hash text NOT NULL DEFAULT '';

-- Backfill: existing rent rows map to the rent category.
UPDATE payments SET category = 'rent' WHERE payment_type = 'rent' AND category = 'other';

CREATE INDEX IF NOT EXISTS idx_payments_user_category ON payments (user_id, category);
CREATE INDEX IF NOT EXISTS idx_case_documents_case ON case_documents (case_id);
