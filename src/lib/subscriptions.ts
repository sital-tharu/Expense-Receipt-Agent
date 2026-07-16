import type { StoredReceipt } from "./types";

export interface SubscriptionFlag {
  merchant: string; // display name from the most recent charge
  monthlyAmount: number; // most recent charge amount
  occurrences: number; // consecutive ~monthly charges
  lastDate: string; // YYYY-MM-DD of most recent charge
}

const AMOUNT_TOLERANCE = 0.1; // ±10% allows small price hikes
const CADENCE_DAYS = 30;
const CADENCE_TOLERANCE_DAYS = 5; // gaps of 25–35 days count as monthly
const MIN_OCCURRENCES = 3;

function daysBetween(earlier: string, later: string): number {
  return Math.round((Date.parse(later) - Date.parse(earlier)) / 86_400_000);
}

/**
 * Rule-based recurring-charge detection: same merchant, ~monthly cadence,
 * similar amount. Walks backwards from the latest charge, ignoring extra
 * same-month purchases, and flags streaks of 3+ months.
 */
export function detectSubscriptions(
  receipts: StoredReceipt[],
): SubscriptionFlag[] {
  const byMerchant = new Map<string, StoredReceipt[]>();
  for (const r of receipts) {
    const key = r.merchant.trim().toLowerCase();
    const group = byMerchant.get(key);
    if (group) group.push(r);
    else byMerchant.set(key, [r]);
  }

  const flags: SubscriptionFlag[] = [];
  for (const group of byMerchant.values()) {
    if (group.length < MIN_OCCURRENCES) continue;
    group.sort((a, b) => (a.date > b.date ? -1 : 1)); // newest first

    const latest = group[0];
    let anchor = latest;
    let occurrences = 1;
    for (const r of group.slice(1)) {
      const gap = daysBetween(r.date, anchor.date);
      if (gap < CADENCE_DAYS - CADENCE_TOLERANCE_DAYS) continue; // extra purchase within the month
      if (gap > CADENCE_DAYS + CADENCE_TOLERANCE_DAYS) break; // cadence broken
      if (Math.abs(r.total - anchor.total) / anchor.total > AMOUNT_TOLERANCE)
        break;
      occurrences++;
      anchor = r;
    }

    if (occurrences >= MIN_OCCURRENCES) {
      flags.push({
        merchant: latest.merchant,
        monthlyAmount: latest.total,
        occurrences,
        lastDate: latest.date,
      });
    }
  }

  return flags.sort((a, b) => b.monthlyAmount - a.monthlyAmount);
}

/** Combined monthly cost of all detected subscriptions. */
export function monthlyTotal(flags: SubscriptionFlag[]): number {
  return flags.reduce((sum, f) => sum + f.monthlyAmount, 0);
}
