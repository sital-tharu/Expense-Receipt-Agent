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

export function addDays(d: Date, days: number): Date {
  const out = new Date(d);
  out.setDate(d.getDate() + days);
  return out;
}

/**
 * Resolve a `?week=` URL param to a week-anchor Monday. Invalid values and
 * future weeks fall back to the current week.
 */
export function resolveWeekAnchor(
  param: string | undefined,
  now: Date = new Date(),
): Date {
  const currentMonday = mondayOf(now);
  if (param && /^\d{4}-\d{2}-\d{2}$/.test(param)) {
    const parsed = new Date(`${param}T00:00:00`);
    if (!Number.isNaN(parsed.getTime())) {
      const monday = mondayOf(parsed);
      if (isoDate(monday) <= isoDate(currentMonday)) return monday;
    }
  }
  return currentMonday;
}

/** "2026-07-16" → "Jul 16" */
export function formatShortDate(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
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

// Formatting rule (app-wide): whole rupees show no decimals, fractional
// amounts always show exactly two. Route every displayed amount through here.
export function formatInr(amount: number): string {
  const options: Intl.NumberFormatOptions = Number.isInteger(amount)
    ? { maximumFractionDigits: 0 }
    : { minimumFractionDigits: 2, maximumFractionDigits: 2 };
  return `₹${amount.toLocaleString("en-IN", options)}`;
}

export interface CategoryAnomaly {
  category: Category;
  pctAbove: number; // e.g. 40 → "40% above your usual weekly average"
  weekTotal: number; // this week's spend in the flagged category
  weeklyAvg: number; // baseline: mean over the lookback window
  lookbackWeeks: number; // window size, for display ("last 4 weeks")
}

const ANOMALY_LOOKBACK_WEEKS = 4;
const ANOMALY_MIN_AVG = 200; // ignore categories with a tiny baseline
const ANOMALY_THRESHOLD = 1.3; // current week must be ≥130% of the average

/**
 * Compares the displayed week's per-category spend against the mean of the
 * previous 4 weeks (weeks without spend count as zero). Returns the largest
 * spike above threshold, or null.
 */
export function categoryAnomaly(
  receipts: StoredReceipt[],
  weekAnchor: Date,
): CategoryAnomaly | null {
  const monday = mondayOf(weekAnchor);
  const weekStart = isoDate(monday);
  const weekEnd = isoDate(addDays(monday, 6));
  const lookbackStart = isoDate(addDays(monday, -7 * ANOMALY_LOOKBACK_WEEKS));

  const current = new Map<Category, number>();
  const lookback = new Map<Category, number>();
  for (const r of receipts) {
    if (r.date >= weekStart && r.date <= weekEnd) {
      current.set(r.category, (current.get(r.category) ?? 0) + r.total);
    } else if (r.date >= lookbackStart && r.date < weekStart) {
      lookback.set(r.category, (lookback.get(r.category) ?? 0) + r.total);
    }
  }

  let best: CategoryAnomaly | null = null;
  for (const [category, total] of current) {
    const avg = (lookback.get(category) ?? 0) / ANOMALY_LOOKBACK_WEEKS;
    if (avg < ANOMALY_MIN_AVG || total < avg * ANOMALY_THRESHOLD) continue;
    const pctAbove = Math.round((total / avg - 1) * 100);
    if (!best || pctAbove > best.pctAbove) {
      best = {
        category,
        pctAbove,
        weekTotal: total,
        weeklyAvg: Math.round(avg),
        lookbackWeeks: ANOMALY_LOOKBACK_WEEKS,
      };
    }
  }
  return best;
}
