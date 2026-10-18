import { useState } from 'react';
import { Download, Link2, Copy, XCircle, Share2 } from 'lucide-react';
import { useLedgerContext } from '@/hooks/useLedgerContext';
import { supabase } from '@/lib/supabase';
import { formatMoney } from '@/lib/months';
import { PAYMENT_TYPE_LABELS } from '@/lib/types';
import { Loading, ErrorBox } from '@/components/Dashboard';
import { Modal } from '@/components/PeopleView';

interface ShareLinkRow {
  id: string;
  token: string;
  expires_at: string;
  revoked: boolean;
}

export default function ExportView() {
  const { payments, people, loading, error, refresh, profile } = useLedgerContext();
  const cur = profile?.currency ?? 'NGN';
  const [links, setLinks] = useState<ShareLinkRow[]>([]);
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const loadLinks = async () => {
    const { data } = await supabase.from('share_links').select('*').order('created_at', { ascending: false });
    setLinks(data ?? []);
  };
  void loadLinks;

  const downloadCsv = () => {
    const nameById = new Map(people.map((p) => [p.id, p.full_name]));
    const rows = [
      ['Payer', 'Amount', 'Paid on', 'Type', 'Covers from', 'Covers to', 'Note', 'Source'],
      ...payments.map((p) => [
        p.person_id ? nameById.get(p.person_id) ?? '' : '',
        String(p.amount),
        p.paid_on,
        PAYMENT_TYPE_LABELS[p.payment_type],
        p.covers_from ?? '',
        p.covers_to ?? '',
        p.note.replace(/"/g, '""'),
        p.source,
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `slipsledger-export-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const createLink = async () => {
    setCreating(true);
    const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data, error: err } = await supabase.from('share_links').insert({ expires_at: expires }).select('token').maybeSingle();
    setCreating(false);
    if (err || !data) {
      console.error('share link failed', err);
      return;
    }
    await refresh();
    setLinks((prev) => [{
      id: crypto.randomUUID(), token: data.token, expires_at: expires, revoked: false,
    }, ...prev]);
  };

  const revokeLink = async (id: string) => {
    const { error: err } = await supabase.from('share_links').update({ revoked: true }).eq('id', id);
    if (err) {
      console.error('revoke failed', err);
      return;
    }
    setLinks((prev) => prev.map((l) => (l.id === id ? { ...l, revoked: true } : l)));
  };

  const shareUrl = (token: string) => `${window.location.origin}/share/${token}`;

  const copy = async (token: string) => {
    try {
      await navigator.clipboard.writeText(shareUrl(token));
      setCopied(token);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      console.error('copy failed');
    }
  };

  if (loading) return <Loading />;
  if (error) return <ErrorBox message={error} />;

  const total = payments.reduce((s, p) => s + p.amount, 0);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-surface-900">Export & share</h1>
        <p className="text-sm text-surface-500">Take your records anywhere, or share a read-only snapshot</p>
      </div>

      <section className="card space-y-4 p-6">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-surface-700">
          <Download className="h-4 w-4 text-brand-600" /> CSV export
        </h2>
        <p className="text-sm text-surface-500">
          {payments.length} payment{payments.length === 1 ? '' : 's'} totalling {formatMoney(total, cur)} — handy for disputes, agents, and tax records.
        </p>
        <button className="btn-primary" onClick={downloadCsv} disabled={payments.length === 0}>
          Download CSV
        </button>
      </section>

      <section className="card space-y-4 p-6">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-surface-700">
          <Share2 className="h-4 w-4 text-brand-600" /> Share links
        </h2>
        <p className="text-sm text-surface-500">
          A read-only ledger page a co-owner, agent, or accountant can open. Links expire after 7 days and can be revoked anytime.
        </p>
        <button className="btn-secondary" onClick={createLink} disabled={creating}>
          <Link2 className="h-4 w-4" /> {creating ? 'Creating…' : 'Create share link'}
        </button>
        <ul className="divide-y divide-surface-100">
          {links.filter((l) => !l.revoked).map((l) => (
            <li key={l.id} className="flex items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="truncate font-mono text-xs text-surface-700">{shareUrl(l.token)}</p>
                <p className="text-xs text-surface-400">expires {new Date(l.expires_at).toLocaleDateString()}</p>
              </div>
              <div className="flex shrink-0 gap-1">
                <button className="btn-secondary px-2.5 py-1.5" onClick={() => copy(l.token)} aria-label="Copy link">
                  {copied === l.token ? <span className="text-xs text-brand-700">Copied</span> : <Copy className="h-4 w-4" />}
                </button>
                <button className="btn-secondary px-2.5 py-1.5 text-red-600" onClick={() => revokeLink(l.id)} aria-label="Revoke link">
                  <XCircle className="h-4 w-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
