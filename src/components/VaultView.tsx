import { useMemo, useState } from 'react';
import { Search, FileCheck2, AlertCircle } from 'lucide-react';
import { useLedgerContext } from '@/hooks/useLedgerContext';
import { formatMoney, formatDate, shortHash } from '@/lib/months';
import { DOC_CATEGORY_LABELS, type DocCategory } from '@/lib/types';
import { Loading, ErrorBox } from '@/components/Dashboard';

export default function VaultView() {
  const { payments, cases, caseDocuments, slipUrl, loading, error, profile } = useLedgerContext();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<DocCategory | 'all'>('all');
  const [caseFilter, setCaseFilter] = useState<string>('all');
  const [preview, setPreview] = useState<{ url: string | null; title: string } | null>(null);
  const cur = profile?.currency ?? 'NGN';

  const caseNameById = useMemo(
    () => new Map(cases.map((c) => [c.id, c.name])),
    [cases],
  );
  const caseIdsByPayment = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const cd of caseDocuments) {
      if (!map.has(cd.payment_id)) map.set(cd.payment_id, []);
      map.get(cd.payment_id)!.push(cd.case_id);
    }
    return map;
  }, [caseDocuments]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return payments.filter((p) => {
      if (category !== 'all' && p.category !== category) return false;
      if (caseFilter === 'none' && (caseIdsByPayment.get(p.id)?.length ?? 0) > 0) return false;
      if (caseFilter !== 'all' && caseFilter !== 'none' && !(caseIdsByPayment.get(p.id) ?? []).includes(caseFilter)) return false;
      if (!q) return true;
      return (
        (p.title ?? '').toLowerCase().includes(q) ||
        p.merchant.toLowerCase().includes(q) ||
        p.note.toLowerCase().includes(q) ||
        String(p.amount).includes(q)
      );
    });
  }, [payments, query, category, caseFilter, caseIdsByPayment]);

  const openPreview = async (path: string, title: string) => {
    const url = await slipUrl(path);
    setPreview({ url, title });
  };

  if (loading) return <Loading />;
  if (error) return <ErrorBox message={error} />;

  const total = filtered.reduce((s, p) => s + p.amount, 0);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-surface-900">Document vault</h1>
        <p className="text-sm text-surface-500">Every receipt, permanently recorded and searchable</p>
      </div>

      <div className="card space-y-3 p-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-400" />
          <input
            className="input pl-9"
            placeholder="Search title, merchant, amount, note…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <select className="input w-auto min-w-40 text-sm" value={category} onChange={(e) => setCategory(e.target.value as DocCategory | 'all')} aria-label="Filter by category">
            <option value="all">All categories</option>
            {(Object.keys(DOC_CATEGORY_LABELS) as DocCategory[]).map((c) => (
              <option key={c} value={c}>{DOC_CATEGORY_LABELS[c]}</option>
            ))}
          </select>
          <select className="input w-auto min-w-40 text-sm" value={caseFilter} onChange={(e) => setCaseFilter(e.target.value)} aria-label="Filter by case">
            <option value="all">All cases</option>
            <option value="none">Not in a case</option>
            {cases.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <span className="ml-auto self-center text-sm text-surface-500">
            {filtered.length} document{filtered.length === 1 ? '' : 's'} · {formatMoney(total, cur)}
          </span>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="card p-12 text-center text-sm text-surface-500">No documents match. Upload a slip or adjust the filters.</div>
      ) : (
        <div className="card overflow-hidden">
          <ul className="divide-y divide-surface-100">
            {filtered.map((p) => {
              const pCases = (caseIdsByPayment.get(p.id) ?? []).map((id) => caseNameById.get(id)).filter(Boolean);
              return (
                <li key={p.id} className="flex flex-col gap-2 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 truncate font-medium text-surface-900">
                      {p.title || p.merchant || 'Receipt'}
                      {p.source === 'ai' && <span className="badge-neutral">AI read</span>}
                    </p>
                    <p className="truncate text-xs text-surface-500">
                      {formatDate(p.paid_on)} · {DOC_CATEGORY_LABELS[p.category]}
                      {p.merchant && ` · ${p.merchant}`}
                      {pCases.length > 0 && ` · in ${pCases.join(', ')}`}
                    </p>
                    {p.doc_hash && (
                      <p className="amount mt-1 truncate text-[10px] text-brand-700" title={`SHA-256 ${p.doc_hash}`}>
                        sha256 · {shortHash(p.doc_hash)} · verified
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="amount font-semibold text-surface-900">{formatMoney(p.amount, cur)}</span>
                    {p.slip_image_path ? (
                      <button
                        className="btn-secondary px-3 py-1.5 text-xs"
                        onClick={() => openPreview(p.slip_image_path, p.title || p.merchant || 'Receipt')}
                      >
                        <FileCheck2 className="h-3.5 w-3.5" /> View
                      </button>
                    ) : (
                      <span className="flex items-center gap-1 text-xs text-surface-400">
                        <AlertCircle className="h-3.5 w-3.5" /> no photo
                      </span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {preview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-surface-900/50 p-4" role="dialog" aria-modal="true" onClick={() => setPreview(null)}>
          <div className="card max-h-[90vh] w-full max-w-2xl overflow-auto p-4" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="truncate font-semibold text-surface-900">{preview.title}</h2>
              <button className="text-surface-400 hover:text-surface-700" onClick={() => setPreview(null)} aria-label="Close">×</button>
            </div>
            {preview.url ? (
              <img src={preview.url} alt={preview.title} className="w-full rounded-lg" />
            ) : (
              <p className="p-6 text-center text-sm text-surface-500">Could not load the image. It may have been removed.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
