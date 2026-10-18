// Month coverage arithmetic: all months are "YYYY-MM" strings.

export function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function monthKeyFromDateStr(dateStr: string): string {
  return dateStr.slice(0, 7);
}

export function addMonths(key: string, n: number): string {
  const [y, m] = key.split('-').map(Number);
  const d = new Date(y, m - 1 + n, 1);
  return monthKey(d);
}

export function monthsBetween(fromKey: string, toKey: string): string[] {
  const out: string[] = [];
  let cur = fromKey;
  let guard = 0;
  while (cur <= toKey && guard < 240) {
    out.push(cur);
    cur = addMonths(cur, 1);
    guard++;
  }
  return out;
}

export function monthLabel(key: string): string {
  const [y, m] = key.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

export function monthShortLabel(key: string): string {
  const [y, m] = key.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'short' });
}

export function currentMonthKey(): string {
  return monthKey(new Date());
}

/**
 * Compute which months a payment covers, given its explicit coverage range.
 * Falls back to the payment month when no range was recorded.
 */
export function coveredMonthsFor(p: { covers_from: string | null; covers_to: string | null; paid_on: string }): string[] {
  if (p.covers_from && p.covers_to && p.covers_from <= p.covers_to) {
    return monthsBetween(monthKeyFromDateStr(p.covers_from), monthKeyFromDateStr(p.covers_to));
  }
  return [monthKeyFromDateStr(p.paid_on)];
}

export function formatMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toLocaleString()}`;
  }
}

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr + (dateStr.length === 10 ? 'T00:00:00' : ''));
  return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function shortHash(hash: string): string {
  if (!hash) return '';
  return `${hash.slice(0, 4)}…${hash.slice(-4)}`;
}
