import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useLedgerContext } from '@/hooks/useLedgerContext';
import { addMonths, currentMonthKey, formatMoney, monthKeyFromDateStr, monthLabel } from '@/lib/months';
import { Loading, ErrorBox, StatusBadge } from '@/components/Dashboard';

export default function MonthView() {
  const { personStatuses, payments, loading, error, profile } = useLedgerContext();
  const [month, setMonth] = useState(currentMonthKey());
  const cur = profile?.currency ?? 'NGN';
  const statuses = personStatuses(month);

  const collected = useMemo(
    () => payments.filter((p) => monthKeyFromDateStr(p.paid_on) === month).reduce((s, p) => s + p.amount, 0),
    [payments, month],
  );

  const rows = useMemo(() => {
    return statuses
      .filter((s) => s.tenancy)
      .map((s) => {
        const expectedThisMonth =
          s.tenancy &&
          monthKeyFromDateStr(s.tenancy.start_date) <= month &&
          (!s.tenancy.end_date || monthKeyFromDateStr(s.tenancy.end_date) >= month);
        const paidThisMonth = payments.some(
          (p) =>
            p.person_id === s.id &&
            p.payment_type === 'rent' &&
            p.covers_from && p.covers_to
              ? p.covers_from.slice(0, 7) <= month && month <= p.covers_to.slice(0, 7)
              : monthKeyFromDateStr(p.paid_on) === month,
        );
        return { person: s, active: !!expectedThisMonth, paid: paidThisMonth };
      })
      .sort((a, b) => a.person.full_name.localeCompare(b.person.full_name));
  }, [statuses, payments, month]);

  if (loading) return <Loading />;
  if (error) return <ErrorBox message={error} />;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-900">Month view</h1>
          <p className="text-sm text-surface-500">Who has paid for {monthLabel(month)}</p>
        </div>
        <div className="flex items-center gap-1">
          <button className="btn-secondary px-2.5 py-2" onClick={() => setMonth(addMonths(month, -1))} aria-label="Previous month">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="w-28 text-center text-sm font-semibold text-surface-800">{monthLabel(month)}</span>
          <button className="btn-secondary px-2.5 py-2" onClick={() => setMonth(addMonths(month, 1))} aria-label="Next month">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="card p-4 text-sm">
        <span className="text-surface-500">Collected in {monthLabel(month)}: </span>
        <span className="font-bold text-brand-700">{formatMoney(collected, cur)}</span>
      </div>

      <div className="card overflow-hidden">
        <ul className="divide-y divide-surface-100">
          {rows.length === 0 && (
            <li className="px-4 py-10 text-center text-sm text-surface-400">No active tenancies for this month.</li>
          )}
          {rows.map(({ person, active, paid }) => (
            <li key={person.id} className="flex items-center justify-between px-4 py-3.5">
              <div className="min-w-0">
                <p className={`truncate font-medium ${active ? 'text-surface-900' : 'text-surface-400'}`}>{person.full_name}</p>
                <p className="text-xs text-surface-500">{person.property?.name ?? ''} {person.unit?.label ?? ''}</p>
              </div>
              <div className="flex items-center gap-3">
                {!active && <span className="badge-neutral">Inactive</span>}
                {active && (paid ? <span className="badge-paid">Paid</span> : <StatusBadge status={person.status === 'overpaid' ? 'paid' : person.status} />)}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
