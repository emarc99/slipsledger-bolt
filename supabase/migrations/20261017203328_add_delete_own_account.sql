/*
# Account self-deletion function

1. New function
- `delete_own_account()` — SECURITY DEFINER; deletes the calling user's row in
  auth.users, which cascades to profiles, properties, units, people, tenancies,
  payments, and share_links (all FK ON DELETE CASCADE). Storage objects are
  removed by the client first.

2. Security
- Derives the caller from auth.uid() — no parameters.
- EXECUTE revoked from anon and granted to authenticated only.

3. Notes
- Enables true "right to deletion" for user data control.
*/

CREATE OR REPLACE FUNCTION delete_own_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = auth, public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  DELETE FROM auth.users WHERE id = auth.uid();
END;
$$;

REVOKE EXECUTE ON FUNCTION delete_own_account() FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION delete_own_account() TO authenticated;
