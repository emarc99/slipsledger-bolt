// SHA-256 of the stored slip image, computed client-side at upload.
// Recorded on the payment so the photo's integrity can later be re-verified:
// hash the file again and compare — a mismatch means the stored image changed.

export async function hashFile(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const digest = await crypto.subtle.digest('SHA-256', buf);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function verifySlip(imagePath: string, expectedHash: string): Promise<boolean> {
  if (!expectedHash) return false;
  const { supabase } = await import('./supabase');
  const { data, error } = await supabase.storage.from('slips').download(imagePath);
  if (error || !data) return false;
  const digest = await crypto.subtle.digest('SHA-256', await data.arrayBuffer());
  const actual = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
  return actual === expectedHash;
}
