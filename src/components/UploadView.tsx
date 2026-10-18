import { useRef, useState } from 'react';
import { Upload as UploadIcon, FileCheck2, Loader2 } from 'lucide-react';
import { useLedgerContext } from '@/hooks/useLedgerContext';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { formatMoney } from '@/lib/months';
import { PAYMENT_TYPE_LABELS, DOC_CATEGORY_LABELS, type PaymentType, type DocCategory } from '@/lib/types';
import { hashFile } from '@/lib/integrity';


interface Draft {
  payerName: string;
  title: string;
  merchant: string;
  amount: string;
  paidOn: string;
  paymentType: PaymentType;
  category: DocCategory;
  coversFrom: string;
  coversTo: string;
  note: string;
  matchedPersonId: string | null;
  attachCaseId: string;
  imagePath: string;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

// Downscale large photos before upload (browser canvas), mirroring the
// proven Streamlit client: ≤1600px on the long edge, JPEG re-encode.
async function prepareForUpload(file: File): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
    if (scale >= 1 && file.type === 'image/jpeg') return file;
    const w = Math.round(bitmap.width * scale);
    const h = Math.round(bitmap.height * scale);
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close();
    return await new Promise<Blob>((resolve) => canvas.toBlob(
      (b) => resolve(b ?? file),
      'image/jpeg',
      0.88,
    ));
  } catch {
    return file;
  }
}

export default function UploadView() {
  const { people, cases, refresh, profile } = useLedgerContext();
  const { user } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [draft, setDraft] = useState<(Draft & { docHash: string }) | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const cur = profile?.currency ?? 'NGN';

  const pickFile = (f: File | null) => {
    if (!f) return;
    if (!f.type.startsWith('image/')) {
      setErr('Please choose an image file (photo of the slip).');
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      setErr('That image is too large — please use one under 10 MB.');
      return;
    }
    setErr(null);
    setFile(f);
    setPreviewUrl(URL.createObjectURL(f));
    setDraft(null);
    setStatus(null);
  };

  const extract = async () => {
    if (!file || !user) return;
    setExtracting(true);
    setErr(null);
    try {
      const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
      const prepared = await prepareForUpload(file);
      const docHash = await hashFile(prepared);
      const { error: upErr } = await supabase.storage.from('slips').upload(path, prepared, { contentType: 'image/jpeg' });
      if (upErr) throw new Error('upload');

      let extraction: Partial<Draft> | null = null;
      try {
        const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/extract-slip`;
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token ?? import.meta.env.VITE_SUPABASE_ANON_KEY;
        const res = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ imagePath: path }),
        });
        if (res.ok) {
          const body = await res.json();
          if (body && (typeof body.payer_name === 'string' || typeof body.title === 'string' || typeof body.merchant === 'string')) {
            extraction = {
              payerName: body.payer_name ?? '',
              title: body.title ?? '',
              merchant: body.merchant ?? '',
              amount: body.amount != null ? String(body.amount) : '',
              paidOn: body.paid_on ?? today(),
              paymentType: (['rent', 'cleaning', 'guard', 'other'] as PaymentType[]).includes(body.payment_type) ? body.payment_type : 'other',
              category: (['rent','utilities','groceries','services','goods','transport','medical','education','other'] as DocCategory[]).includes(body.category) ? body.category : 'other',
              coversFrom: body.covers_from ?? '',
              coversTo: body.covers_to ?? '',
              note: body.note ?? '',
            };
          }
        }
      } catch (e) {
        console.error('extraction unavailable', e);
      }

      const normalized = (extraction?.payerName ?? '').trim().toLowerCase();
      const match = normalized
        ? people.find((p) => p.full_name.toLowerCase().includes(normalized) || normalized.includes(p.full_name.toLowerCase().split(' ')[0]))
        : undefined;

      setDraft({
        payerName: extraction?.payerName ?? '',
        title: extraction?.title ?? '',
        merchant: extraction?.merchant ?? '',
        amount: extraction?.amount ?? '',
        paidOn: extraction?.paidOn ?? today(),
        paymentType: extraction?.paymentType ?? 'rent',
        category: extraction?.category ?? 'other',
        coversFrom: extraction?.coversFrom ?? '',
        coversTo: extraction?.coversTo ?? '',
        note: extraction?.note ?? '',
        matchedPersonId: match?.id ?? null,
        attachCaseId: '',
        imagePath: path,
        docHash,
      });
      setStatus(extraction ? 'Review what was read from the slip, then file it.' : 'Could not auto-read the slip — fill the details in below.');
    } catch (e) {
      console.error('upload failed', e);
      setErr('Upload failed. Please try again.');
    } finally {
      setExtracting(false);
    }
  };

  const fileDraft = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft || !user) return;
    setBusy(true);
    setErr(null);
    let personId = draft.matchedPersonId;
    if (!personId && draft.payerName.trim()) {
      const { data: created, error: personErr } = await supabase
        .from('people')
        .insert({ full_name: draft.payerName.trim() })
        .select('id')
        .maybeSingle();
      if (personErr) {
        console.error('person create failed', personErr);
        setErr('Could not create the payer record.');
        setBusy(false);
        return;
      }
      personId = created?.id ?? null;
    }
    const { data: inserted, error: payErr } = await supabase.from('payments').insert({
      person_id: personId,
      amount: Number(draft.amount) || 0,
      paid_on: draft.paidOn,
      payment_type: draft.paymentType,
      category: draft.category,
      title: draft.title,
      merchant: draft.merchant,
      doc_hash: draft.docHash,
      covers_from: draft.coversFrom || null,
      covers_to: draft.coversTo || null,
      slip_image_path: draft.imagePath,
      note: draft.note,
      source: 'ai',
    }).select('id').maybeSingle();
    setBusy(false);
    if (payErr || !inserted) {
      console.error('payment insert failed', payErr);
      setErr('Could not file this payment. Please try again.');
      return;
    }
    if (draft.attachCaseId) {
      const { error: caseErr } = await supabase
        .from('case_documents')
        .insert({ case_id: draft.attachCaseId, payment_id: inserted.id });
      if (caseErr) console.error('case attach failed', caseErr);
    }
    await refresh();
    setDraft(null);
    setFile(null);
    setPreviewUrl(null);
    setStatus('Filed. The ledger and statuses are up to date.');
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-surface-900">Add a receipt</h1>
        <p className="text-sm text-surface-500">Any receipt or payment confirmation — rent, a shop purchase, a service. SlipsLedger reads it and keeps it as a permanent record.</p>
      </div>

      {!draft && (
        <div
          className="card flex flex-col items-center gap-4 border-2 border-dashed border-surface-200 p-10 text-center transition hover:border-brand-300"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            pickFile(e.dataTransfer.files[0] ?? null);
          }}
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50">
            <UploadIcon className="h-6 w-6 text-brand-600" />
          </div>
          <div>
            <p className="font-medium text-surface-900">Choose a slip photo</p>
            <p className="mt-1 text-sm text-surface-500">JPG or PNG, up to 10 MB</p>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
          />
          <button className="btn-primary" onClick={() => fileRef.current?.click()}>Select image</button>
        </div>
      )}

      {previewUrl && !draft && (
        <div className="card overflow-hidden">
          <img src={previewUrl} alt="Slip preview" className="max-h-96 w-full object-contain" />
          <div className="border-t border-surface-200 p-4">
            <button className="btn-primary w-full" onClick={extract} disabled={extracting}>
              {extracting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Reading slip…
                </>
              ) : (
                <>
                  <FileCheck2 className="h-4 w-4" /> Read and review
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {draft && (
        <form className="card space-y-4 p-6" onSubmit={fileDraft}>
          <h2 className="text-lg font-semibold text-surface-900">Review and file</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="label" htmlFor="dtitle">What was it for</label>
              <input id="dtitle" className="input" placeholder="e.g. Deposit — Flat B" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
            </div>
            <div>
              <label className="label" htmlFor="dpayer">Payer (who paid you)</label>
              <input id="dpayer" className="input" value={draft.payerName} onChange={(e) => setDraft({ ...draft, payerName: e.target.value })} />
            </div>
            <div>
              <label className="label" htmlFor="dmerchant">Merchant (who you paid)</label>
              <input id="dmerchant" className="input" value={draft.merchant} onChange={(e) => setDraft({ ...draft, merchant: e.target.value })} />
            </div>
            <div>
              <label className="label" htmlFor="damt">Amount ({cur})</label>
              <input id="damt" className="input" type="number" min="0" step="0.01" required value={draft.amount} onChange={(e) => setDraft({ ...draft, amount: e.target.value })} />
            </div>
            <div>
              <label className="label" htmlFor="dpaid">Paid on</label>
              <input id="dpaid" className="input" type="date" required value={draft.paidOn} onChange={(e) => setDraft({ ...draft, paidOn: e.target.value })} />
            </div>
            <div>
              <label className="label" htmlFor="dcat">Category</label>
              <select id="dcat" className="input" value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value as DocCategory })}>
                {(Object.keys(DOC_CATEGORY_LABELS) as DocCategory[]).map((c) => (
                  <option key={c} value={c}>{DOC_CATEGORY_LABELS[c]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="dtype">Rent subtype</label>
              <select id="dtype" className="input" value={draft.paymentType} onChange={(e) => setDraft({ ...draft, paymentType: e.target.value as PaymentType })} disabled={draft.category !== 'rent'}>
                {(Object.keys(PAYMENT_TYPE_LABELS) as PaymentType[]).map((t) => (
                  <option key={t} value={t}>{PAYMENT_TYPE_LABELS[t]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="dcf">Covers from (rent only)</label>
              <input id="dcf" className="input" type="date" value={draft.coversFrom} onChange={(e) => setDraft({ ...draft, coversFrom: e.target.value })} disabled={draft.category !== 'rent'} />
            </div>
            <div>
              <label className="label" htmlFor="dct">Covers to (rent only)</label>
              <input id="dct" className="input" type="date" value={draft.coversTo} onChange={(e) => setDraft({ ...draft, coversTo: e.target.value })} disabled={draft.category !== 'rent'} />
            </div>
          </div>
          <div>
            <label className="label" htmlFor="dmatch">Match to person (optional)</label>
            <select
              id="dmatch"
              className="input"
              value={draft.matchedPersonId ?? ''}
              onChange={(e) => setDraft({ ...draft, matchedPersonId: e.target.value || null })}
            >
              <option value="">No person — keep as a general receipt</option>
              {people.map((p) => (
                <option key={p.id} value={p.id}>{p.full_name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="dcase">Add to case (optional)</label>
            <select
              id="dcase"
              className="input"
              value={draft.attachCaseId}
              onChange={(e) => setDraft({ ...draft, attachCaseId: e.target.value })}
            >
              <option value="">Not part of a case</option>
              {cases.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="dnote">Note (optional)</label>
            <input id="dnote" className="input" value={draft.note} onChange={(e) => setDraft({ ...draft, note: e.target.value })} />
          </div>
          {draft.coversFrom && draft.coversTo && (
            <p className="rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-800">
              This payment will fill every month from {draft.coversFrom} to {draft.coversTo} in the rent timeline.
            </p>
          )}
          {err && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{err}</p>}
          <div className="flex justify-end gap-2">
            <button type="button" className="btn-secondary" onClick={() => { setDraft(null); setStatus(null); }}>Discard</button>
            <button type="submit" className="btn-primary" disabled={busy}>{busy ? 'Filing…' : `File ${formatMoney(Number(draft.amount) || 0, cur)}`}</button>
          </div>
        </form>
      )}

      {status && (
        <p className="rounded-lg bg-brand-50 px-4 py-3 text-sm text-brand-800" role="status">{status}</p>
      )}
      {err && !draft && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{err}</p>
      )}
    </div>
  );
}
