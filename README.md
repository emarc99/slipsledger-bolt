# SlipsLedger

Turn any receipt into a permanent, provable record. Photograph a receipt or payment confirmation — SlipsLedger reads it, timestamps it, and keeps it searchable forever. Bundle receipts into cases (disputes, refunds, expense reports) and print evidence reports. For landlords, lease-aware rent tracking sits on top as one category.

Built with Bolt: React + TypeScript + Tailwind on the front, Supabase (Postgres, auth, storage, edge functions) behind it.

## What it does

- **Snap to record** — upload any receipt; a secure server function reads it (Gemini), validates the output, and you confirm before anything is filed. Without an API key the same flow works as a clean manual form.
- **Tamper-evident proof** — every document gets a SHA-256 fingerprint of its photo at upload; integrity can be re-verified later.
- **Cases** — bundle related documents and print a clean evidence report (dates, categories, amounts, notes, totals).
- **Vault** — permanent, searchable archive of every receipt with category and case filters.
- **Lease-aware rent tracking (the landlord wedge)** — tenancies carry rent, due day, and lease dates; one month or a full year of coverage fills the correct timeline months; statuses (paid/owing/overdue/overpaid) are computed from real payments, never stored.
- **Telegram bot** — send a receipt by chat to file it; ask "who owes me?" for rent questions. Linked via one-time codes.
- **Export & share** — CSV download plus revocable, expiring read-only share links.
- **Demo mode** — Settings → "Load demo data" seeds a labeled sample showing rent statuses and general-document categories.

## Privacy

- Every table is locked to its owner at the database level (row-level security); ownership is stamped from the session, never the client.
- Receipt photos live in a private storage bucket, served only through short-lived signed URLs; each account's files live in its own verified folder.
- Uploads are type- and size-checked; the AI key stays server-side; errors shown to users are generic, with detail kept in logs.
- Account self-deletion removes every record and file (a database function deletes the auth user, cascading everywhere).

## Running

The Supabase project is provisioned automatically in Bolt. Locally:

```bash
npm install
npm run dev
```

Environment variables (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) are pre-populated. Optional secrets for full functionality: `GEMINI_API_KEY` (receipt reading), `TELEGRAM_BOT_TOKEN`, `TELEGRAM_BOT_SECRET` (bot webhook), set via the Supabase dashboard.

## Repo layout

```
src/components/   UI screens (landing, auth, dashboard, vault, cases, people, properties, month, upload, export, settings)
src/lib/          Supabase client, auth, types, month math, status engine, integrity (SHA-256), demo seed
src/hooks/        Ledger data + context
supabase/
  migrations/     Schema: owner-scoped tables, RLS, private storage, cases, bot linking, account deletion
  functions/      extract-slip (AI reader), telegram-bot (webhook)
```
