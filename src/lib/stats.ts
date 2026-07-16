import type { Category, StoredReceipt } from "./types";

/** Local-time YYYY-MM-DD (receipt dates are stored in this format). */
export function isoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Monday of the week containing `d`. */
export function mondayOf(d: Date): Date {
  const monday = new Date(d);
  monday.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return monday;
}

export interface CategoryTotal {
  category: Category;
  total: number;
}

export interface WeekStats {
  weekStart: string; // Monday, YYYY-MM-DD
  weekEnd: string; // Sunday, YYYY-MM-DD
  total: number;
  count: number;
  prevTotal: number; // previous Monday–Sunday, for week-over-week delta
  byCategory: CategoryTotal[]; // nonzero categories, largest first
}

export function weekStats(
  receipts: StoredReceipt[],
  now: Date = new Date(),
): WeekStats {
  const monday = mondayOf(now);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const prevMonday = new Date(monday);
  prevMonday.setDate(monday.getDate() - 7);

  const weekStart = isoDate(monday);
  const weekEnd = isoDate(sunday);
  const prevStart = isoDate(prevMonday);

  const inWeek = receipts.filter(
    (r) => r.date >= weekStart && r.date <= weekEnd,
  );
  const inPrevWeek = receipts.filter(
    (r) => r.date >= prevStart && r.date < weekStart,
  );

  const totals = new Map<Category, number>();
  for (const r of inWeek) {
    totals.set(r.category, (totals.get(r.category) ?? 0) + r.total);
  }

  return {
    weekStart,
    weekEnd,
    total: inWeek.reduce((sum, r) => sum + r.total, 0),
    count: inWeek.length,
    prevTotal: inPrevWeek.reduce((sum, r) => sum + r.total, 0),
    byCategory: [...totals.entries()]
      .map(([category, total]) => ({ category, total }))
      .sort((a, b) => b.total - a.total),
  };
}

export function formatInr(amount: number): string {
  return `₹${amount.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}
