/**
 * Logic regression checks for subscription detection and weekly stats:
 *   npm run test:logic
 * Pure functions only — no Firestore or Gemini credentials needed.
 */
import assert from "node:assert";
import {
  decodeBase64Url,
  extractBody,
  findImageAttachments,
  getHeader,
  type GmailPart,
} from "../src/lib/gmail";
import { detectSubscriptions, monthlyTotal } from "../src/lib/subscriptions";
import {
  addDays,
  categoryAnomaly,
  formatInr,
  isoDate,
  mondayOf,
  resolveWeekAnchor,
  weekStats,
} from "../src/lib/stats";
import { ReceiptSchema, type StoredReceipt } from "../src/lib/types";

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
assert.strictEqual(spike.ratio, 1.4, "ratio exposed (700/500)");
assert.strictEqual(spike.minAvg, 200, "effective floor exposed");

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

// 12b. anomaly thresholds are configurable via opts
const tinyBaseline = [
  r("Chai", isoDate(addDays(anchor, 1)), 400, "Food"),
  r("Chai", isoDate(addDays(anchor, -6)), 100, "Food"),
];
assert.strictEqual(categoryAnomaly(tinyBaseline, anchor), null);
const tinyFlagged = categoryAnomaly(tinyBaseline, anchor, { minAvg: 20 });
assert.ok(tinyFlagged, "lower minAvg flags the tiny baseline");
assert.strictEqual(tinyFlagged.ratio, 16, "400 vs 25/week avg = 16×");
assert.strictEqual(tinyFlagged.minAvg, 20, "override reflected in result");
assert.strictEqual(
  categoryAnomaly(anomalyReceipts, anchor, { threshold: 1.5 }),
  null,
  "raised threshold ignores a 1.4× spike",
);
const shortWindow = categoryAnomaly(tinyBaseline, anchor, {
  lookbackWeeks: 1,
  minAvg: 50,
});
assert.ok(shortWindow, "1-week lookback treats last week alone as the average");
assert.strictEqual(shortWindow.weeklyAvg, 100);

// 13. INR formatting rules: whole → no decimals, fractional → exactly two
assert.strictEqual(formatInr(2619), "₹2,619");
assert.strictEqual(formatInr(424.71), "₹424.71");
assert.strictEqual(formatInr(424.7), "₹424.70", "fractional pads to 2 dp");
assert.strictEqual(formatInr(0), "₹0");
assert.strictEqual(formatInr(123456), "₹1,23,456", "Indian digit grouping");

// 14. weekStats byCategory is descending and sums to the weekly total
const multiCat = [
  r("A", isoDate(addDays(mondayOf(new Date()), 1)), 100, "Food"),
  r("B", isoDate(addDays(mondayOf(new Date()), 1)), 900, "Shopping"),
  r("C", isoDate(addDays(mondayOf(new Date()), 2)), 400, "Transport"),
];
const mc = weekStats(multiCat);
assert.deepStrictEqual(
  mc.byCategory.map((c) => c.category),
  ["Shopping", "Transport", "Food"],
  "categories sorted by spend descending",
);
assert.strictEqual(
  mc.byCategory.reduce((s, c) => s + c.total, 0),
  mc.total,
  "category totals sum to week total",
);

// 15. duplicated charges (e.g. reseeding without --wipe) don't break detection
const dup = (m: string, d: string, t: number) => [r(m, d, t), r(m, d, t)];
flags = detectSubscriptions([
  ...dup("Prime", daysAgo(3), 299),
  ...dup("Prime", daysAgo(33), 299),
  ...dup("Prime", daysAgo(63), 299),
]);
assert.strictEqual(flags.length, 1, "duplicates still detected");
assert.strictEqual(flags[0].occurrences, 3);

// 16. Gmail MIME helpers: base64url decoding (- and _ chars, no padding)
assert.strictEqual(decodeBase64Url("SGVsbG8-Pw").toString("utf8"), "Hello>?");
assert.strictEqual(
  decodeBase64Url(Buffer.from("₹424.71").toString("base64url")).toString("utf8"),
  "₹424.71",
  "round-trips unicode",
);

// 17. body extraction prefers HTML over plain text, walks nested parts
const b64 = (s: string) => Buffer.from(s).toString("base64url");
const multipart: GmailPart = {
  mimeType: "multipart/mixed",
  headers: [{ name: "Subject", value: "Your Swiggy order" }],
  parts: [
    {
      mimeType: "multipart/alternative",
      parts: [
        { mimeType: "text/plain", body: { data: b64("plain version") } },
        { mimeType: "text/html", body: { data: b64("<b>html version</b>") } },
      ],
    },
    {
      mimeType: "image/jpeg",
      filename: "receipt.jpeg",
      body: { attachmentId: "att-1", size: 1234 },
    },
  ],
};
assert.strictEqual(extractBody(multipart), "<b>html version</b>");
assert.strictEqual(
  extractBody({ mimeType: "text/plain", body: { data: b64("only plain") } }),
  "only plain",
  "plain-only fallback",
);
assert.strictEqual(extractBody({ mimeType: "multipart/mixed", parts: [] }), null);

// 18. image attachment discovery + case-insensitive headers
assert.deepStrictEqual(findImageAttachments(multipart), [
  { attachmentId: "att-1", mimeType: "image/jpeg", filename: "receipt.jpeg" },
]);
assert.strictEqual(getHeader(multipart, "subject"), "Your Swiggy order");
assert.strictEqual(getHeader(multipart, "From"), undefined);

// 19. foreign-currency fields: optional, nullable, ISO-code enforced
const base = {
  merchant: "Anthropic, PBC",
  date: "2026-07-14",
  total: 1760,
  lineItems: [],
  category: "Subscriptions" as const,
  confidence: "high" as const,
};
assert.strictEqual(
  ReceiptSchema.parse({ ...base, originalAmount: 20, originalCurrency: "USD" })
    .originalCurrency,
  "USD",
);
assert.strictEqual(
  ReceiptSchema.parse({ ...base, originalAmount: null, originalCurrency: null })
    .originalAmount,
  null,
  "explicit nulls accepted (INR receipts)",
);
assert.strictEqual(
  ReceiptSchema.parse(base).originalAmount,
  undefined,
  "absent fields accepted (docs stored before this feature)",
);
assert.throws(
  () => ReceiptSchema.parse({ ...base, originalAmount: 20, originalCurrency: "DOLLARS" }),
  "non-ISO currency code rejected",
);

console.log("All subscription-detection and stats checks passed ✓");
