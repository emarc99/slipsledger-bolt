/*
# Private slip storage + automatic profile creation

## 1. Storage
- Creates the private bucket `slips` (no public access — files are only ever
  served through short-lived signed URLs owned by the account).
- Storage policies enforce that each account may only upload into / read from
  its own folder: `<user_id>/filename`. Ownership is taken from the session,
  never from the client.

## 2. New function
- `handle_new_user()` — SECURITY DEFINER trigger that seeds a `profiles` row
  whenever someone signs up. It only copies the email local-part as a display
  name; no other user metadata is trusted.

## 3. Security
- Bucket is private; policies are owner-folder-scoped.
- Profile trigger runs as definer because it executes during signup when no
  RLS session exists yet; it writes only the caller's own row.

## 4. Notes
- Fully idempotent.
*/

INSERT INTO storage.buckets (id, name, public)
VALUES ('slips', 'slips', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "slips_insert_own_folder" ON storage.objects;
CREATE POLICY "slips_insert_own_folder" ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'slips'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "slips_select_own_folder" ON storage.objects;
CREATE POLICY "slips_select_own_folder" ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'slips'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "slips_delete_own_folder" ON storage.objects;
CREATE POLICY "slips_delete_own_folder" ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'slips'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO profiles (id, display_name)
  VALUES (
    NEW.id,
    split_part(COALESCE(NEW.email, 'landlord'), '@', 1)
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION handle_new_user();
