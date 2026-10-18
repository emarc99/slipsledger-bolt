import type { Payment, PersonWithStatus, Person, Property, Tenancy, Unit, PersonStatus } from './types';
import { coveredMonthsFor, currentMonthKey, monthKeyFromDateStr, monthsBetween } from './months';

/**
 * Compute a person's rent status from their tenancy and actual payment records.
 * Statuses are always derived from the ledger — never stored — so they can
 * never drift from the evidence.
 */
export function computePersonStatus(
  person: Person,
  tenancy: Tenancy | undefined,
  unit: Unit | undefined,
  property: Property | undefined,
  payments: Payment[],
  asOfMonth: string = currentMonthKey(),
): PersonWithStatus {
  const rentPayments = payments.filter((p) => p.payment_type === 'rent');
  const covered = new Set<string>();
  let coveredAmount = 0;
  for (const p of rentPayments) {
    for (const m of coveredMonthsFor(p)) {
      covered.add(m);
      coveredAmount += p.amount / coveredMonthsFor(p).length;
    }
  }

  if (!tenancy) {
    // No active lease terms yet — report activity only.
    return {
      ...person,
      status: 'n/a',
      balance: 0,
      owedMonths: [],
      coveredThrough: covered.size ? [...covered].sort()[covered.size - 1] ?? null : null,
      tenancy,
      unit,
      property,
    };
  }

  // Expected months run from tenancy start to the current month (or lease end).
  const expectedFrom = monthKeyFromDateStr(tenancy.start_date);
  const expectedTo = tenancy.end_date
    ? monthKeyFromDateStr(tenancy.end_date) < asOfMonth
      ? monthKeyFromDateStr(tenancy.end_date)
      : asOfMonth
    : asOfMonth;
  const expected = expectedFrom <= expectedTo ? monthsBetween(expectedFrom, expectedTo) : [];
  const owedMonths = expected.filter((m) => !covered.has(m));
  const expectedAmount = expected.length * tenancy.rent_amount;
  const balance = coveredAmount - expectedAmount; // negative = owed

  let status: PersonStatus;
  if (owedMonths.length === 0 && balance >= -0.01) {
    status = balance > tenancy.rent_amount * 0.5 ? 'overpaid' : 'paid';
  } else if (owedMonths.length === 0) {
    status = 'paid';
  } else if (coveredAmount >= expectedAmount - tenancy.rent_amount * 0.5 && owedMonths[owedMonths.length - 1] === latestExpected(expected, asOfMonth)) {
    status = 'partial';
  } else {
    status = 'overdue';
  }

  return {
    ...person,
    status,
    balance,
    owedMonths,
    coveredThrough: covered.size ? [...covered].sort()[covered.size - 1] ?? null : null,
    tenancy,
    unit,
    property,
  };
}

function latestExpected(expected: string[], asOfMonth: string): string {
  const past = expected.filter((m) => m <= asOfMonth);
  return past.length ? past[past.length - 1] : expected[0];
}

export function totalCollected(payments: Payment[], asOfMonth: string): number {
  return payments
    .filter((p) => monthKeyFromDateStr(p.paid_on) === asOfMonth)
    .reduce((sum, p) => sum + p.amount, 0);
}

export function totalOutstanding(statuses: PersonWithStatus[]): number {
  return statuses.reduce((sum, s) => sum + (s.balance < 0 ? -s.balance : 0), 0);
}
