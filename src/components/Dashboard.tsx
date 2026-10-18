import { useMemo, useState } from 'react';
import { CircleDollarSign, AlertTriangle, CheckCircle2, Search, Upload } from 'lucide-react';
import { useLedgerContext } from '@/hooks/useLedgerContext';
import { currentMonthKey, monthLabel, formatMoney, monthShortLabel } from '@/lib/months';
import type { PersonWithStatus } from '@/lib/types';
import type { Tab } from '@/components/Shell';

interface Props {
  onNavigate: (tab: Tab) => void;
}

export default function Dashboard({ onNavigate }: Props) {
  const { summary, personStatuses, payments, loading, error, profile } = useLedgerContext();
  const [query, setQuery] = useState('');
  const [month, setMonth] = useState(currentMonthKey());

  const cur = profile?.currency ?? 'NGN';
  const stats = summary(month);
  const statuses = personStatuses(month);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return statuses;
    return statuses.filter(
      (s) =>
        s.full_name.toLowerCase().includes(q) ||
        (s.property?.name ?? '').toLowerCase().includes(q) ||
        (s.unit?.label ?? '').toLowerCase().includes(q),
    );
  }, [statuses, query]);

  const grouped = useMemo(() => {
    const map = new Map<string, PersonWithStatus[]>();
    for (const s of filtered) {
      const key = s.property?.name ?? 'No property assigned';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(s);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  if (loading) return <Loading />;
  if (error) return <ErrorBox message={error} />;

  const recent = payments.slice(0, 6);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-surface-900">Dashboard</h1>
          <p className="text-sm text-surface-500">{monthLabel(month)} at a glance</p>
        </div>
        <select
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="input w-full sm:w-44"
          aria-label="Select month"
        >
          {availableMonths(payments).map((m) => (
            <option key={m} value={m}>{monthLabel(m)}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon={CircleDollarSign} tone="brand" label="Collected" value={formatMoney(stats.collected, cur)} />
        <StatCard icon={AlertTriangle} tone="red" label="Outstanding" value={formatMoney(stats.outstanding, cur)} />
        <StatCard icon={AlertTriangle} tone="amber" label="Overdue people" value={String(stats.overdueCount)} />
        <StatCard icon={CheckCircle2} tone="brand" label="Paid up" value={String(stats.paidCount)} />
      </div>

      <div className="card p-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-400" />
          <input
            className="input pl-9"
            placeholder="Search person, property, or unit…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      {grouped.length === 0 ? (
        <EmptyState onNavigate={onNavigate} />
      ) : (
        <div className="space-y-6">
          {grouped.map(([propertyName, people]) => (
            <section key={propertyName} className="card overflow-hidden">
              <header className="flex items-center justify-between border-b border-surface-200 bg-surface-50 px-4 py-3">
                <h2 className="flex items-center gap-2 text-sm font-semibold text-surface-700">
                  {propertyName}
                </h2>
                <span className="text-xs text-surface-400">{people.length} {people.length === 1 ? 'person' : 'people'}</span>
              </header>
              <ul className="divide-y divide-surface-100">
                {people.map((s) => (
                  <li key={s.id} className="flex flex-col gap-2 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-surface-900">{s.full_name}</p>
                      <p className="text-xs text-surface-500">
                        {s.unit?.label ?? 'No unit'}
                        {s.status !== 'n/a' && s.coveredThrough && ` · covered through ${monthShortLabel(s.coveredThrough)} ${s.coveredThrough.slice(0, 4)}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      {s.balance < 0 && (
                        <span className="amount text-sm font-semibold text-red-600">{formatMoney(-s.balance, cur)} owed</span>
                      )}
                      {s.balance > 0 && (
                        <span className="amount text-sm font-semibold text-sky-600">{formatMoney(s.balance, cur)} credit</span>
                      )}
                      <StatusBadge status={s.status} />
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      {recent.length > 0 && (
        <section className="card overflow-hidden">
          <header className="border-b border-surface-200 bg-surface-50 px-4 py-3">
            <h2 className="text-sm font-semibold text-surface-700">Recent payments</h2>
          </header>
          <ul className="divide-y divide-surface-100">
            {recent.map((p) => (
              <li key={p.id} className="flex items-center justify-between px-4 py-3 text-sm">
                <div>
                  <p className="font-medium text-surface-900">{p.note || 'Payment'}</p>
                  <p className="text-xs text-surface-500">{p.paid_on} · {p.payment_type}</p>
                </div>
                <span className="amount font-semibold text-brand-700">{formatMoney(p.amount, cur)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function availableMonths(payments: { paid_on: string }[]): string[] {
  const set = new Set(payments.map((p) => p.paid_on.slice(0, 7)));
  set.add(currentMonthKey());
  return [...set].sort().reverse();
}

function StatCard({ icon: Icon, label, value, tone }: { icon: typeof CircleDollarSign; label: string; value: string; tone: 'brand' | 'red' | 'amber' }) {
  const tones = {
    brand: 'bg-brand-50 text-brand-700',
    red: 'bg-red-50 text-red-600',
    amber: 'bg-amber-50 text-amber-600',
  };
  return (
    <div className="card flex items-center gap-4 p-4">
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${tones[tone]}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wide text-surface-400">{label}</p>
        <p className="truncate text-lg font-bold text-surface-900 amount">{value}</p>
      </div>
    </div>
  );
}

export function StatusBadge({ status }: { status: PersonWithStatus['status'] }) {
  const labels: Record<PersonWithStatus['status'], { text: string; cls: string }> = {
    paid: { text: 'Paid up', cls: 'badge-paid' },
    partial: { text: 'Partial', cls: 'badge-partial' },
    overdue: { text: 'Overdue', cls: 'badge-overdue' },
    overpaid: { text: 'Overpaid', cls: 'badge-overpaid' },
    'n/a': { text: 'No lease', cls: 'badge-neutral' },
  };
  const { text, cls } = labels[status];
  return <span className={cls}>{text}</span>;
}

export function Loading() {
  return (
    <div className="flex justify-center py-24">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
    </div>
  );
}

export function ErrorBox({ message }: { message: string }) {
  return (
    <div className="mx-auto max-w-md rounded-xl bg-red-50 p-6 text-center text-sm text-red-700">
      {message}
    </div>
  );
}

function EmptyState({ onNavigate }: { onNavigate: (t: Tab) => void }) {
  return (
    <div className="card flex flex-col items-center gap-4 p-12 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50">
        <Upload className="h-6 w-6 text-brand-600" />
      </div>
      <div>
        <h2 className="text-lg font-semibold text-surface-900">Nothing here yet</h2>
        <p className="mt-1 max-w-sm text-sm text-surface-500">
          Add people and properties, or photograph a receipt and SlipsLedger will set things up for you.
        </p>
      </div>
      <button className="btn-primary" onClick={() => onNavigate('upload')}>
        Add your first receipt
      </button>
    </div>
  );
}
