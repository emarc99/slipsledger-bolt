/*
# Telegram bot linking tables

1. New tables
- `bot_link_codes` — short-lived, single-use codes the user generates in
  Settings to connect their Telegram. Claimed atomically by the bot function
  (UPDATE ... WHERE used_at IS NULL RETURNING).
- `bot_links` — the stable mapping telegram user/chat -> SlipsLedger account.

2. Security
- RLS on both. Users can select/insert/delete only their own codes and links;
  nobody can read another user's. The bot function uses the service role and
  performs its own authorization via the one-time code claim.
- Codes are 12 hex chars, consumed on use, and expire after 15 minutes.

3. Notes
- Fully idempotent.
*/

CREATE TABLE IF NOT EXISTS bot_link_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  code text NOT NULL UNIQUE,
  used_at timestamptz,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '15 minutes'),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS bot_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  telegram_id bigint NOT NULL UNIQUE,
  chat_id bigint NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE bot_link_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE bot_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_bot_link_codes" ON bot_link_codes;
CREATE POLICY "select_own_bot_link_codes" ON bot_link_codes FOR SELECT
TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_bot_link_codes" ON bot_link_codes;
CREATE POLICY "insert_own_bot_link_codes" ON bot_link_codes FOR INSERT
TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_bot_link_codes" ON bot_link_codes;
CREATE POLICY "delete_own_bot_link_codes" ON bot_link_codes FOR DELETE
TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "select_own_bot_links" ON bot_links;
CREATE POLICY "select_own_bot_links" ON bot_links FOR SELECT
TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_bot_links" ON bot_links;
CREATE POLICY "insert_own_bot_links" ON bot_links FOR INSERT
TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_bot_links" ON bot_links;
CREATE POLICY "delete_own_bot_links" ON bot_links FOR DELETE
TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_bot_link_codes_user ON bot_link_codes (user_id);
