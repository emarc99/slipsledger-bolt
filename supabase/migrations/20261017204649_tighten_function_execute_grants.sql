/*
# Tighten EXECUTE on security definer functions

1. Security changes
- `handle_new_user()`: only the `service_role` (used by the auth trigger) may
  execute it. Revoked from anon, authenticated, and PUBLIC — it must never be
  callable through the REST API.
- `delete_own_account()`: intentional self-service deletion for signed-in
  users only (already revoked from anon). The definer is required because the
  caller must be able to delete their own auth.users row, which no client
  role can do directly.

2. Notes
- Idempotent; no data changes.
*/

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, PUBLIC;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;

REVOKE EXECUTE ON FUNCTION public.delete_own_account() FROM PUBLIC;
