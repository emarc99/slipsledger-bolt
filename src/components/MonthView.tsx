import { useMemo, useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, CheckCircle2, CircleDollarSign } from 'lucide-react';
import { useLedgerContext } from '@/hooks/useLedgerContext';
import { addMonths, currentMonthKey, formatMoney, monthKeyFromDateStr, monthLabel } from '@/lib/months';
import { Loading, ErrorBox, StatusBadge } from '@/components/Dashboard';
import Avatar from '@/components/Avatar';

export default function MonthView() {
  const { personStatuses, payments, loading, error, profile } = useLedgerContext();
  const [month, setMonth] = useState(currentMonthKey());
  const [slideDir, setSlideDir] = useState(0);
  const cur = profile?.currency ?? 'NGN';
  const statuses = personStatuses(month);
  const prevMonth = useRef(month);

  useEffect(() => {
    setSlideDir(month > prevMonth.current ? 1 : -1);
    prevMonth.current = month;
  }, [month]);

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

  const activeRows = rows.filter((r) => r.active);
  const paidCount = activeRows.filter((r) => r.paid).length;
  const collectionRate = activeRows.length > 0 ? paidCount / activeRows.length : 0;

  if (loading) return <Loading />;
  if (error) return <ErrorBox message={error} />;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div className="animate-fade-up">
          <h1 className="text-2xl font-bold text-surface-900">Month view</h1>
          <p className="text-sm text-surface-500">Who has paid for {monthLabel(month)}</p>
        </div>
        <div className="flex items-center gap-1">
          <button className="btn-secondary press px-2.5 py-2" onClick={() => setMonth(addMonths(month, -1))} aria-label="Previous month">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span key={month} className="w-28 animate-fade-up text-center text-sm font-semibold text-surface-800">{monthLabel(month)}</span>
          <button className="btn-secondary press px-2.5 py-2" onClick={() => setMonth(addMonths(month, 1))} aria-label="Next month">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div key={month} className="card space-y-3 p-5 animate-fade-up" style={{ animationDelay: '60ms' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
              <CircleDollarSign className="h-4 w-4" />
            </div>
            <span className="text-sm text-surface-500">Collected in {monthLabel(month)}</span>
          </div>
          <span className="amount text-lg font-bold text-brand-700">{formatMoney(collected, cur)}</span>
        </div>
        {activeRows.length > 0 && (
          <div>
            <div className="flex items-center justify-between text-xs text-surface-500">
              <span>{paidCount} of {activeRows.length} tenants paid</span>
              <span>{Math.round(collectionRate * 100)}%</span>
            </div>
            <div className="progress-track mt-1.5 h-2">
              <div
                className={`progress-fill ${collectionRate >= 1 ? 'bg-success-500' : 'bg-brand-500'}`}
                style={{ width: `${collectionRate * 100}%` }}
              />
            </div>
          </div>
        )}
      </div>

      <div key={month + '-list'} className="card overflow-hidden">
        <ul className="divide-y divide-surface-100">
          {rows.length === 0 && (
            <li className="px-4 py-10 text-center text-sm text-surface-400">No active tenancies for this month.</li>
          )}
          {rows.map(({ person, active, paid }, i) => (
            <li
              key={person.id}
              className="flex items-center justify-between px-4 py-3.5 transition-colors hover:bg-brand-50/40 animate-fade-up"
              style={{ animationDelay: `${i * 30}ms` }}
            >
              <div className="flex items-center gap-3">
                <Avatar name={person.full_name} size={36} />
                <div className="min-w-0">
                  <p className={`truncate font-medium ${active ? 'text-surface-900' : 'text-surface-400'}`}>{person.full_name}</p>
                  <p className="text-xs text-surface-500">{person.property?.name ?? ''} {person.unit?.label ?? ''}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {!active && <span className="badge-neutral">Inactive</span>}
                {active && paid && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-success-100 px-2.5 py-0.5 text-xs font-semibold text-success-800 animate-badge-in">
                    <CheckCircle2 className="h-3 w-3" /> Paid
                  </span>
                )}
                {active && !paid && <StatusBadge status={person.status === 'overpaid' ? 'paid' : person.status} />}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
