/**
 * Logic regression checks for subscription detection and weekly stats:
 *   npm run test:logic
 * Pure functions only — no Firestore or Gemini credentials needed.
 */
import assert from "node:assert";
import { detectSubscriptions, monthlyTotal } from "../src/lib/subscriptions";
import {
  addDays,
  categoryAnomaly,
  isoDate,
  mondayOf,
  resolveWeekAnchor,
  weekStats,
} from "../src/lib/stats";
import type { StoredReceipt } from "../src/lib/types";

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return isoDate(d);
}

let id = 0;
function r(merchant: string, date: string, total: number, category: StoredReceipt["category"] = "Subscriptions"): StoredReceipt {
  return { id: String(++id), merchant, date, total, lineItems: [], category, confidence: "high", source: "photo", createdAt: new Date().toISOString() };
}

// 1. Three monthly Netflix charges → flagged with 3 occurrences
const netflix = [r("Netflix", daysAgo(6), 649), r("Netflix", daysAgo(36), 649), r("Netflix", daysAgo(66), 649)];
let flags = detectSubscriptions(netflix);
assert.strictEqual(flags.length, 1, "netflix flagged");
assert.strictEqual(flags[0].occurrences, 3);
assert.strictEqual(flags[0].monthlyAmount, 649);

// 2. Irregular same-merchant orders → not flagged
flags = detectSubscriptions([r("Swiggy", daysAgo(1), 420, "Food"), r("Swiggy", daysAgo(5), 380, "Food"), r("Swiggy", daysAgo(12), 510, "Food")]);
assert.strictEqual(flags.length, 0, "irregular orders not flagged");

// 3. Price hike within ±10% still chains (649 → 699 is +7.7%)
flags = detectSubscriptions([r("Netflix", daysAgo(6), 699), r("Netflix", daysAgo(36), 649), r("Netflix", daysAgo(66), 649)]);
assert.strictEqual(flags.length, 1, "price hike tolerated");
assert.strictEqual(flags[0].monthlyAmount, 699);

// 4. Price jump beyond 10% breaks the chain
flags = detectSubscriptions([r("Gym", daysAgo(6), 1500), r("Gym", daysAgo(36), 1000), r("Gym", daysAgo(66), 1000)]);
assert.strictEqual(flags.length, 0, "big jump breaks chain");

// 5. Extra same-month purchase is skipped, chain survives
flags = detectSubscriptions([
  r("Prime", daysAgo(3), 299), r("Prime", daysAgo(10), 299), r("Prime", daysAgo(33), 299), r("Prime", daysAgo(63), 299),
]);
assert.strictEqual(flags.length, 1, "same-month extra skipped");
assert.strictEqual(flags[0].occurrences, 3);

// 6. Only 2 occurrences → below threshold
flags = detectSubscriptions([r("Hotstar", daysAgo(6), 299), r("Hotstar", daysAgo(36), 299)]);
assert.strictEqual(flags.length, 0, "two charges not enough");

// 7. weekStats: this-week filtering and category totals
const monday = weekStats([]).weekStart;
const receipts = [
  r("A", monday, 100, "Food"),
  r("B", daysAgo(0), 50, "Food"),
  r("C", daysAgo(30), 999, "Shopping"), // outside week
];
const s = weekStats(receipts);
assert.strictEqual(s.total, 150);
assert.strictEqual(s.count, 2);
assert.deepStrictEqual(s.byCategory, [{ category: "Food", total: 150 }]);

// 8. resolveWeekAnchor: invalid, mid-week, and future params
const currentMonday = isoDate(mondayOf(new Date()));
assert.strictEqual(isoDate(resolveWeekAnchor(undefined)), currentMonday);
assert.strictEqual(isoDate(resolveWeekAnchor("garbage")), currentMonday);
assert.strictEqual(
  isoDate(resolveWeekAnchor("2099-01-01")),
  currentMonday,
  "future week clamped to current",
);
const prevMonday = addDays(mondayOf(new Date()), -7);
const prevWednesday = addDays(prevMonday, 2);
assert.strictEqual(
  isoDate(resolveWeekAnchor(isoDate(prevWednesday))),
  isoDate(prevMonday),
  "mid-week param snaps to its Monday",
);

// 9. categoryAnomaly: 40% Food spike over a ₹500/week average
const anchor = mondayOf(new Date());
const anomalyReceipts: StoredReceipt[] = [
  r("Cafe", isoDate(addDays(anchor, 1)), 700, "Food"), // this week
  r("Cafe", isoDate(addDays(anchor, -6)), 500, "Food"), // wk -1
  r("Cafe", isoDate(addDays(anchor, -13)), 500, "Food"), // wk -2
  r("Cafe", isoDate(addDays(anchor, -20)), 500, "Food"), // wk -3
  r("Cafe", isoDate(addDays(anchor, -27)), 500, "Food"), // wk -4
];
const spike = categoryAnomaly(anomalyReceipts, anchor);
assert.ok(spike, "spike detected");
assert.strictEqual(spike.category, "Food");
assert.strictEqual(spike.pctAbove, 40);
assert.strictEqual(spike.weekTotal, 700, "baseline: week total exposed");
assert.strictEqual(spike.weeklyAvg, 500, "baseline: weekly average exposed");
assert.strictEqual(spike.lookbackWeeks, 4, "baseline: window exposed");

// 10. below the 1.3× threshold → no anomaly
assert.strictEqual(
  categoryAnomaly(
    [
      r("Cafe", isoDate(addDays(anchor, 1)), 550, "Food"),
      ...anomalyReceipts.slice(1),
    ],
    anchor,
  ),
  null,
  "10% above average is not an anomaly",
);

// 11. tiny baseline (avg < ₹200) never flags, even at a huge ratio
assert.strictEqual(
  categoryAnomaly(
    [
      r("Chai", isoDate(addDays(anchor, 1)), 400, "Food"),
      r("Chai", isoDate(addDays(anchor, -6)), 100, "Food"),
    ],
    anchor,
  ),
  null,
  "small baselines are ignored",
);

// 12. subscriptions monthly total
assert.strictEqual(
  monthlyTotal([
    { merchant: "A", monthlyAmount: 649, occurrences: 3, lastDate: "2026-07-10" },
    { merchant: "B", monthlyAmount: 119, occurrences: 3, lastDate: "2026-07-05" },
  ]),
  768,
);

console.log("All subscription-detection and stats checks passed ✓");
