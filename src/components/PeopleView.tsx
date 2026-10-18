import { useMemo, useState } from 'react';
import { UserPlus, Search, Phone, Building2 } from 'lucide-react';
import { useLedgerContext } from '@/hooks/useLedgerContext';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { formatMoney, monthLabel } from '@/lib/months';
import { PERSON_ROLE_LABELS, type PersonRole, type PersonWithStatus } from '@/lib/types';
import { StatusBadge, Loading, ErrorBox } from '@/components/Dashboard';
import Avatar from '@/components/Avatar';

const STATUS_BORDER: Record<PersonWithStatus['status'], string> = {
  paid: 'hover:border-success-400/40',
  overpaid: 'hover:border-info-400/40',
  overdue: 'hover:border-error-400/40',
  partial: 'hover:border-warning-400/40',
  'n/a': 'hover:border-surface-300',
};

export default function PeopleView() {
  const { people, properties, units, tenancies, payments, personStatuses, loading, error, refresh, profile } = useLedgerContext();
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const cur = profile?.currency ?? 'NGN';

  const statuses = personStatuses();
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return statuses;
    return statuses.filter((s) => s.full_name.toLowerCase().includes(q));
  }, [statuses, query]);

  if (loading) return <Loading />;
  if (error) return <ErrorBox message={error} />;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="animate-fade-up">
          <h1 className="text-2xl font-bold text-surface-900">People</h1>
          <p className="text-sm text-surface-500">Everyone who pays you, and where they stand</p>
        </div>
        <button className="btn-primary press animate-fade-up" onClick={() => setShowAdd(true)}>
          <UserPlus className="h-4 w-4" /> Add person
        </button>
      </div>

      <div className="card p-4 animate-fade-up" style={{ animationDelay: '60ms' }}>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-400" />
          <input
            className="input pl-9"
            placeholder="Search by name…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="card flex flex-col items-center gap-4 p-12 text-center text-sm text-surface-500 animate-fade-up" style={{ animationDelay: '120ms' }}>
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 animate-float-y">
            <UserPlus className="h-6 w-6 text-brand-600" />
          </div>
          <p>No people yet. Add one, or upload a slip and SlipsLedger will match the payer automatically.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filtered.map((s, i) => (
            <PersonCard key={s.id} s={s} cur={cur} delay={i * 50} />
          ))}
        </div>
      )}

      {showAdd && (
        <AddPersonModal
          onClose={() => setShowAdd(false)}
          onSaved={async () => {
            setShowAdd(false);
            await refresh();
          }}
          userId={user!.id}
          people={people}
          properties={properties}
          units={units}
          tenancies={tenancies}
          payments={payments}
        />
      )}
    </div>
  );
}

function PersonCard({ s, cur, delay }: { s: PersonWithStatus; cur: string; delay: number }) {
  return (
    <div
      className={`card card-hover group border-l-4 p-5 animate-fade-up ${STATUS_BORDER[s.status]}`}
      style={{ animationDelay: `${delay}ms`, borderLeftColor: 'var(--accent, transparent)' }}
    >
      <div className="flex items-start gap-3">
        <Avatar name={s.full_name} size={44} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="truncate font-semibold text-surface-900">{s.full_name}</h3>
              <p className="text-xs text-surface-500">
                {PERSON_ROLE_LABELS[s.role]} · {s.property ? `${s.property.name}` : 'No property'}
              </p>
            </div>
            <StatusBadge status={s.status} />
          </div>
        </div>
      </div>

      {s.phone && (
        <p className="mt-3 flex items-center gap-1.5 text-sm text-surface-600">
          <Phone className="h-3.5 w-3.5 text-surface-400" /> {s.phone}
        </p>
      )}

      {s.tenancy && (
        <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 rounded-lg bg-surface-50 p-3 text-xs">
          <dt className="text-surface-500">Rent</dt>
          <dd className="font-semibold text-surface-900">{formatMoney(s.tenancy.rent_amount, cur)} / month</dd>
          <dt className="text-surface-500">Lease</dt>
          <dd className="text-surface-800">
            {s.tenancy.start_date}{s.tenancy.end_date ? ` → ${s.tenancy.end_date}` : ' → open'}
          </dd>
          <dt className="text-surface-500">Covered through</dt>
          <dd className="text-surface-800">{s.coveredThrough ? monthLabel(s.coveredThrough) : '—'}</dd>
        </dl>
      )}

      {s.owedMonths.length > 0 && (
        <p className="mt-3 flex items-center gap-1.5 text-xs font-medium text-error-600 animate-badge-in">
          <span className="h-1.5 w-1.5 rounded-full bg-error-500" />
          Owes {s.owedMonths.length} {s.owedMonths.length === 1 ? 'month' : 'months'}: {s.owedMonths.map(monthLabel).join(', ')}
        </p>
      )}
      {s.status === 'overpaid' && s.balance > 0 && (
        <p className="mt-3 flex items-center gap-1.5 text-xs font-medium text-info-600 animate-badge-in">
          <span className="h-1.5 w-1.5 rounded-full bg-info-500" />
          {formatMoney(s.balance, cur)} in credit
        </p>
      )}
    </div>
  );
}

interface AddProps {
  onClose: () => void;
  onSaved: () => Promise<void>;
  userId: string;
  people: { id: string; full_name: string }[];
  properties: { id: string; name: string }[];
  units: { id: string; label: string; property_id: string }[];
  tenancies: { id: string; person_id: string }[];
  payments: { id: string; person_id: string | null }[];
}

function AddPersonModal({ onClose, onSaved }: AddProps) {
  return <AddPersonInner onClose={onClose} onSaved={onSaved} />;
}

function AddPersonInner({ onClose, onSaved }: Pick<AddProps, 'onClose' | 'onSaved'>) {
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<PersonRole>('tenant');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    const { error } = await supabase.from('people').insert({ full_name: fullName, phone, role });
    setBusy(false);
    if (error) {
      console.error('person insert failed', error);
      setErr('Could not add this person. Please try again.');
      return;
    }
    await onSaved();
  };

  return (
    <Modal title="Add person" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="label" htmlFor="pname">Full name</label>
          <input id="pname" className="input" required value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="pphone">Phone (optional)</label>
          <input id="pphone" className="input" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="prole">Role</label>
          <select id="prole" className="input" value={role} onChange={(e) => setRole(e.target.value as PersonRole)}>
            {(Object.keys(PERSON_ROLE_LABELS) as PersonRole[]).map((r) => (
              <option key={r} value={r}>{PERSON_ROLE_LABELS[r]}</option>
            ))}
          </select>
        </div>
        {err && <p className="rounded-lg bg-error-50 px-3 py-2 text-sm text-error-700">{err}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn-primary press" disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
        </div>
      </form>
    </Modal>
  );
}

export function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-surface-900/40 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" onClick={onClose}>
      <div
        className={`card w-full ${wide ? 'max-w-2xl' : 'max-w-md'} p-6 shadow-lift animate-pop`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-surface-900">{title}</h2>
          <button onClick={onClose} className="text-surface-400 transition hover:scale-110 hover:text-surface-700" aria-label="Close">×</button>
        </div>
        {children}
      </div>
    </div>
  );
}
