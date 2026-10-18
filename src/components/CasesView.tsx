import { useState } from 'react';
import { FolderOpen, Plus, FileText, CheckCircle2 } from 'lucide-react';
import { useLedgerContext } from '@/hooks/useLedgerContext';
import { supabase } from '@/lib/supabase';
import { formatMoney, formatDate } from '@/lib/months';
import { DOC_CATEGORY_LABELS } from '@/lib/types';
import { Loading, ErrorBox } from '@/components/Dashboard';
import { Modal } from '@/components/PeopleView';

export default function CasesView() {
  const { cases, caseDocuments, payments, slipUrl, loading, error, refresh, profile } = useLedgerContext();
  const [showAdd, setShowAdd] = useState(false);
  const [openCase, setOpenCase] = useState<string | null>(null);
  const [attachFor, setAttachFor] = useState<string | null>(null);
  const cur = profile?.currency ?? 'NGN';

  const docsByCase = (caseId: string) => {
    const ids = new Set(caseDocuments.filter((cd) => cd.case_id === caseId).map((cd) => cd.payment_id));
    return payments.filter((p) => ids.has(p.id));
  };

  const removeDoc = async (caseId: string, paymentId: string) => {
    const { error: err } = await supabase
      .from('case_documents')
      .delete()
      .eq('case_id', caseId)
      .eq('payment_id', paymentId);
    if (err) {
      console.error('remove case doc failed', err);
      return;
    }
    await refresh();
  };

  const markResolved = async (caseId: string, resolved: boolean) => {
    const { error: err } = await supabase
      .from('cases')
      .update({ status: resolved ? 'resolved' : 'open' })
      .eq('id', caseId);
    if (err) {
      console.error('case status failed', err);
      return;
    }
    await refresh();
  };

  const printCase = (caseId: string) => {
    const kase = cases.find((c) => c.id === caseId);
    const docs = docsByCase(caseId);
    const rows = docs.map((p) => `
      <tr>
        <td>${esc(formatDate(p.paid_on))}</td>
        <td>${esc(p.title || p.merchant || 'Receipt')}</td>
        <td>${esc(DOC_CATEGORY_LABELS[p.category])}</td>
        <td style="text-align:right">${esc(formatMoney(p.amount, cur))}</td>
        <td>${esc(p.note)}</td>
      </tr>`).join('');
    const total = docs.reduce((s, p) => s + p.amount, 0);
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`<!doctype html><html><head><title>${esc(kase?.name ?? 'Case')} — evidence report</title>
      <style>body{font-family:system-ui,sans-serif;margin:40px;color:#1a1a1a}
      h1{font-size:22px} table{width:100%;border-collapse:collapse;margin-top:20px}
      td,th{border:1px solid #ddd;padding:8px;font-size:13px;text-align:left}
      th{background:#f4f4f2}.total{font-weight:bold;margin-top:12px}
      .meta{color:#666;font-size:12px}</style></head><body>
      <h1>${esc(kase?.name ?? 'Case')}</h1>
      <p class="meta">${esc(kase?.description ?? '')}<br/>Generated ${new Date().toLocaleString()} · ${docs.length} document(s) · SlipsLedger permanent record</p>
      <table><thead><tr><th>Date</th><th>Document</th><th>Category</th><th style="text-align:right">Amount</th><th>Note</th></tr></thead>
      <tbody>${rows}</tbody></table>
      <p class="total">Total: ${esc(formatMoney(total, cur))}</p>
      </body></html>`);
    win.document.close();
    win.print();
  };

  if (loading) return <Loading />;
  if (error) return <ErrorBox message={error} />;

  const openDocs = openCase ? docsByCase(openCase) : [];

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-900">Cases</h1>
          <p className="text-sm text-surface-500">Bundle receipts for disputes, refunds, or expense reports — ready to print as evidence</p>
        </div>
        <button className="btn-primary" onClick={() => setShowAdd(true)}>
          <Plus className="h-4 w-4" /> New case
        </button>
      </div>

      {cases.length === 0 ? (
        <div className="card p-12 text-center text-sm text-surface-500">
          No cases yet. Create one — e.g. “Deposit dispute — Flat B” — and add receipts to it.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {cases.map((c) => {
            const docs = docsByCase(c.id);
            const total = docs.reduce((s, p) => s + p.amount, 0);
            return (
              <div key={c.id} className="card p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="flex items-center gap-2 truncate font-semibold text-surface-900">
                      <FolderOpen className="h-4 w-4 shrink-0 text-brand-600" /> {c.name}
                    </h3>
                    {c.description && <p className="mt-0.5 line-clamp-2 text-xs text-surface-500">{c.description}</p>}
                  </div>
                  <span className={c.status === 'resolved' ? 'badge-paid' : 'badge-partial'}>
                    {c.status === 'resolved' ? 'Resolved' : 'Open'}
                  </span>
                </div>
                <p className="mt-3 text-sm text-surface-700">
                  {docs.length} document{docs.length === 1 ? '' : 's'} · {formatMoney(total, cur)}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button className="btn-secondary px-3 py-1.5 text-xs" onClick={() => setOpenCase(c.id)}>
                    <FileText className="h-3.5 w-3.5" /> Open
                  </button>
                  <button className="btn-secondary px-3 py-1.5 text-xs" onClick={() => printCase(c.id)} disabled={docs.length === 0}>
                    Print report
                  </button>
                  <button className="btn-secondary px-3 py-1.5 text-xs" onClick={() => markResolved(c.id, c.status !== 'resolved')}>
                    <CheckCircle2 className="h-3.5 w-3.5" /> {c.status === 'resolved' ? 'Reopen' : 'Resolve'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {openCase && (
        <Modal title={cases.find((c) => c.id === openCase)?.name ?? 'Case'} onClose={() => setOpenCase(null)} wide>
          <div className="space-y-3">
            {openDocs.length === 0 ? (
              <p className="py-4 text-center text-sm text-surface-500">No documents in this case yet.</p>
            ) : (
              <ul className="divide-y divide-surface-100">
                {openDocs.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-surface-900">{p.title || p.merchant || 'Receipt'}</p>
                      <p className="text-xs text-surface-500">{formatDate(p.paid_on)} · {DOC_CATEGORY_LABELS[p.category]}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="font-semibold">{formatMoney(p.amount, cur)}</span>
                      {p.slip_image_path && (
                        <button className="btn-secondary px-2 py-1 text-xs" onClick={async () => {
                          const url = await slipUrl(p.slip_image_path);
                          if (url) window.open(url, '_blank');
                        }}>Photo</button>
                      )}
                      <button className="text-xs text-red-600" onClick={() => removeDoc(openCase!, p.id)}>Remove</button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <div className="flex justify-between pt-2">
              <button className="btn-secondary" onClick={() => setAttachFor(openCase)}>Add document from vault</button>
              <button className="btn-primary" onClick={() => printCase(openCase!)}>Print report</button>
            </div>
          </div>
        </Modal>
      )}

      {attachFor && (
        <AttachModal
          caseId={attachFor}
          onClose={() => setAttachFor(null)}
          onDone={async () => {
            setAttachFor(null);
            await refresh();
          }}
        />
      )}

      {showAdd && (
        <NewCaseModal
          onClose={() => setShowAdd(false)}
          onSaved={async () => {
            setShowAdd(false);
            await refresh();
          }}
        />
      )}
    </div>
  );
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function NewCaseModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => Promise<void> }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    const { error } = await supabase.from('cases').insert({ name, description });
    setBusy(false);
    if (error) {
      console.error('case insert failed', error);
      setErr('Could not create the case. Please try again.');
      return;
    }
    await onSaved();
  };

  return (
    <Modal title="New case" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="label" htmlFor="cname">Name</label>
          <input id="cname" className="input" required placeholder="e.g. Deposit dispute — Flat B" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="cdesc">Description (optional)</label>
          <textarea id="cdesc" className="input" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        {err && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{err}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Create'}</button>
        </div>
      </form>
    </Modal>
  );
}

function AttachModal({ caseId, onClose, onDone }: { caseId: string; onClose: () => void; onDone: () => Promise<void> }) {
  const { payments, caseDocuments } = useLedgerContext();
  const [busy, setBusy] = useState<string | null>(null);

  const attached = new Set(caseDocuments.filter((cd) => cd.case_id === caseId).map((cd) => cd.payment_id));
  const candidates = payments.filter((p) => !attached.has(p.id));

  const attach = async (paymentId: string) => {
    setBusy(paymentId);
    const { error } = await supabase.from('case_documents').insert({ case_id: caseId, payment_id: paymentId });
    setBusy(null);
    if (error) {
      console.error('attach failed', error);
      return;
    }
    await onDone();
  };

  return (
    <Modal title="Add document from vault" onClose={onClose}>
      {candidates.length === 0 ? (
        <p className="py-4 text-center text-sm text-surface-500">Every document is already in this case.</p>
      ) : (
        <ul className="max-h-80 divide-y divide-surface-100 overflow-auto">
          {candidates.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
              <div className="min-w-0">
                <p className="truncate font-medium text-surface-900">{p.title || p.merchant || 'Receipt'}</p>
                <p className="text-xs text-surface-500">{formatDate(p.paid_on)}</p>
              </div>
              <button className="btn-secondary shrink-0 px-3 py-1 text-xs" onClick={() => attach(p.id)} disabled={busy === p.id}>
                {busy === p.id ? 'Adding…' : 'Add'}
              </button>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}
