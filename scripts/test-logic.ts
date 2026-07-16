/**
 * Logic regression checks for subscription detection and weekly stats:
 *   npm run test:logic
 * Pure functions only — no Firestore or Gemini credentials needed.
 */
import assert from "node:assert";
import { detectSubscriptions } from "../src/lib/subscriptions";
import { isoDate, weekStats } from "../src/lib/stats";
import type { StoredReceipt } from "../src/lib/types";

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return isoDate(d);
}

let id = 0;
function r(merchant: string, date: string, total: number, category: StoredReceipt["category"] = "Subscriptions"): StoredReceipt {
  return { id: String(++id), merchant, date, total, lineItems: [], category, source: "photo", createdAt: new Date().toISOString() };
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

console.log("All subscription-detection and stats checks passed ✓");
