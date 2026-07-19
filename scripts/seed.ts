/**
 * Seeds a rich mock receipt history so the dashboard, subscription radar,
 * anomaly detection, and chatbot all have a full demo story to tell.
 *
 *   npm run seed                 add mock receipts
 *   npm run seed -- --wipe       delete previously seeded docs first
 *   npm run seed -- --wipe-real  back up real (non-seeded) receipts to
 *                                secrets/, then delete them — and flag their
 *                                Gmail dedup markers so a future sync won't
 *                                re-import the same emails
 *
 * The dataset is date-relative: rerun it on demo day so "this week" is fresh.
 * Designed outcomes (when run mid-week):
 *   - 5 recurring streaks: Netflix, Spotify, YouTube Premium, Jio, BESCOM
 *   - exactly one anomaly: Shopping ≈ 5-6× the 4-week average (headphones)
 *   - steady Food (~₹1,600/wk) and Transport (~₹500/wk) so nothing else flags
 *   - one foreign-currency receipt and one "Needs review" low-confidence row
 */
import { writeFileSync } from "node:fs";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

import { getDb } from "../src/lib/firestore";
import { addDays, isoDate, mondayOf } from "../src/lib/stats";
import type { Receipt } from "../src/lib/types";

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return isoDate(d);
}

/** Date on a given weekday (0=Mon … 6=Sun) of the week `weeksAgo` back. */
function onDay(weeksAgo: number, weekday: number): string {
  return isoDate(addDays(mondayOf(new Date()), -7 * weeksAgo + weekday));
}

const none: Receipt["lineItems"] = [];

type SeedEntry = Omit<Receipt, "confidence"> & {
  confidence?: Receipt["confidence"];
};

const SEED: SeedEntry[] = [
  // ---- Recurring subscriptions (25-35 day cadence, ±10% amounts) ----
  { merchant: "Netflix", date: daysAgo(5), total: 649, lineItems: none, category: "Subscriptions" },
  { merchant: "Netflix", date: daysAgo(35), total: 649, lineItems: none, category: "Subscriptions" },
  { merchant: "Netflix", date: daysAgo(65), total: 649, lineItems: none, category: "Subscriptions" },
  { merchant: "Netflix", date: daysAgo(95), total: 649, lineItems: none, category: "Subscriptions" },

  { merchant: "Spotify", date: daysAgo(11), total: 119, lineItems: none, category: "Subscriptions" },
  { merchant: "Spotify", date: daysAgo(40), total: 119, lineItems: none, category: "Subscriptions" },
  { merchant: "Spotify", date: daysAgo(70), total: 119, lineItems: none, category: "Subscriptions" },
  { merchant: "Spotify", date: daysAgo(101), total: 119, lineItems: none, category: "Subscriptions" },

  { merchant: "YouTube Premium", date: daysAgo(16), total: 149, lineItems: none, category: "Subscriptions" },
  { merchant: "YouTube Premium", date: daysAgo(47), total: 149, lineItems: none, category: "Subscriptions" },
  { merchant: "YouTube Premium", date: daysAgo(78), total: 149, lineItems: none, category: "Subscriptions" },

  { merchant: "Jio Recharge", date: daysAgo(3), total: 299, lineItems: none, category: "Utilities" },
  { merchant: "Jio Recharge", date: daysAgo(31), total: 299, lineItems: none, category: "Utilities" },
  { merchant: "Jio Recharge", date: daysAgo(59), total: 299, lineItems: none, category: "Utilities" },
  { merchant: "Jio Recharge", date: daysAgo(87), total: 299, lineItems: none, category: "Utilities" },

  // Electricity bill — recurring amounts vary a little but stay within ±10%,
  // so the radar flags the *bill*, not just app subscriptions
  { merchant: "BESCOM", date: onDay(2, 5), total: 950, lineItems: none, category: "Utilities" },
  { merchant: "BESCOM", date: onDay(6, 5), total: 890, lineItems: none, category: "Utilities" },
  { merchant: "BESCOM", date: onDay(10, 5), total: 905, lineItems: none, category: "Utilities" },

  // ---- This week: the headphones story (Shopping anomaly ≈ 5-6×) ----
  { merchant: "Croma", date: daysAgo(1), total: 5490, lineItems: [{ name: "Sony WH-CH720N headphones", price: 5490 }], category: "Shopping" },
  { merchant: "Amazon", date: daysAgo(0), total: 499, lineItems: [{ name: "Phone case", price: 499 }], category: "Shopping" },
  { merchant: "Swiggy", date: daysAgo(1), total: 420, lineItems: [{ name: "Paneer wrap", price: 220 }, { name: "Fries", price: 120 }, { name: "Delivery fee", price: 80 }], category: "Food" },
  { merchant: "BigBasket", date: daysAgo(2), total: 1240, lineItems: [{ name: "Vegetables", price: 480 }, { name: "Milk 2L", price: 130 }, { name: "Rice 5kg", price: 630 }], category: "Food" },
  { merchant: "Sri Sai Kirana Store", date: daysAgo(2), total: 185, lineItems: none, category: "Food", confidence: "low" },
  { merchant: "Bengaluru Metro", date: daysAgo(0), total: 60, lineItems: none, category: "Transport" },
  { merchant: "Rapido", date: daysAgo(1), total: 185, lineItems: none, category: "Transport" },

  // ---- Week 1 (last week) ----
  { merchant: "Zomato", date: onDay(1, 1), total: 385, lineItems: none, category: "Food" },
  { merchant: "Blinkit", date: onDay(1, 3), total: 462, lineItems: none, category: "Food" },
  { merchant: "Blue Tokai Coffee", date: onDay(1, 5), total: 540, lineItems: none, category: "Food" },
  { merchant: "MTR", date: onDay(1, 6), total: 240, lineItems: none, category: "Food" },
  { merchant: "Uber", date: onDay(1, 2), total: 240, lineItems: none, category: "Transport" },
  { merchant: "Bengaluru Metro", date: onDay(1, 4), total: 90, lineItems: none, category: "Transport" },
  { merchant: "Amazon", date: onDay(1, 5), total: 899, lineItems: [{ name: "USB hub", price: 649 }, { name: "USB-C cable", price: 250 }], category: "Shopping" },

  // ---- Week 2 ----
  { merchant: "Swiggy", date: onDay(2, 2), total: 510, lineItems: none, category: "Food" },
  { merchant: "BigBasket", date: onDay(2, 5), total: 1180, lineItems: none, category: "Food" },
  { merchant: "Indian Oil", date: onDay(2, 3), total: 1000, lineItems: none, category: "Transport" },
  { merchant: "Myntra", date: onDay(2, 6), total: 1499, lineItems: [{ name: "T-shirts (2)", price: 1499 }], category: "Shopping" },
  // Foreign-currency showcase: total is recomputed from EXCHANGE_RATE_USD
  { merchant: "Notion", date: onDay(2, 4), total: 963, lineItems: none, category: "Subscriptions", originalAmount: 10, originalCurrency: "USD" },

  // ---- Week 3 ----
  { merchant: "Zomato", date: onDay(3, 0), total: 445, lineItems: none, category: "Food" },
  { merchant: "Blinkit", date: onDay(3, 3), total: 395, lineItems: none, category: "Food" },
  { merchant: "The Rameshwaram Cafe", date: onDay(3, 5), total: 260, lineItems: none, category: "Food" },
  { merchant: "Swiggy", date: onDay(3, 6), total: 380, lineItems: none, category: "Food" },
  { merchant: "Ola", date: onDay(3, 2), total: 265, lineItems: none, category: "Transport" },
  { merchant: "Bengaluru Metro", date: onDay(3, 4), total: 45, lineItems: none, category: "Transport" },
  { merchant: "Flipkart", date: onDay(3, 5), total: 649, lineItems: none, category: "Shopping" },

  // ---- Week 4 ----
  { merchant: "BigBasket", date: onDay(4, 5), total: 890, lineItems: none, category: "Food" },
  { merchant: "Zomato", date: onDay(4, 2), total: 410, lineItems: none, category: "Food" },
  { merchant: "Rapido", date: onDay(4, 1), total: 145, lineItems: none, category: "Transport" },
  { merchant: "Uber", date: onDay(4, 5), total: 320, lineItems: none, category: "Transport" },
  { merchant: "Amazon", date: onDay(4, 3), total: 1099, lineItems: [{ name: "Backpack", price: 1099 }], category: "Shopping" },

  // ---- Older scatter (weeks 5-11: history for navigation + streak context) ----
  { merchant: "Zomato", date: onDay(5, 2), total: 470, lineItems: none, category: "Food" },
  { merchant: "Bengaluru Metro", date: onDay(5, 3), total: 120, lineItems: none, category: "Transport" },
  { merchant: "Amazon", date: onDay(5, 5), total: 699, lineItems: none, category: "Shopping" },
  { merchant: "BigBasket", date: onDay(6, 5), total: 1150, lineItems: none, category: "Food" },
  { merchant: "Uber", date: onDay(6, 2), total: 210, lineItems: none, category: "Transport" },
  { merchant: "Swiggy", date: onDay(7, 3), total: 465, lineItems: none, category: "Food" },
  { merchant: "Myntra", date: onDay(7, 6), total: 999, lineItems: none, category: "Shopping" },
  { merchant: "Zomato", date: onDay(8, 1), total: 395, lineItems: none, category: "Food" },
  { merchant: "Indian Oil", date: onDay(8, 4), total: 1000, lineItems: none, category: "Transport" },
  { merchant: "PVR Cinemas", date: onDay(8, 6), total: 560, lineItems: none, category: "Other" },
  { merchant: "BigBasket", date: onDay(9, 5), total: 1275, lineItems: none, category: "Food" },
  { merchant: "Bengaluru Metro", date: onDay(9, 2), total: 75, lineItems: none, category: "Transport" },
  { merchant: "Swiggy", date: onDay(10, 4), total: 410, lineItems: none, category: "Food" },
  { merchant: "Zomato", date: onDay(11, 3), total: 375, lineItems: none, category: "Food" },
  { merchant: "Uber", date: onDay(11, 5), total: 280, lineItems: none, category: "Transport" },
];

/** Back up all real (non-seeded) receipts to secrets/, then delete them. */
async function wipeRealReceipts() {
  const db = getDb();
  const all = await db.collection("receipts").get();
  const real = all.docs.filter((d) => d.data().seeded !== true);
  if (real.length === 0) {
    console.log("No real receipts to wipe");
    return;
  }

  const backup = [];
  for (const doc of real) {
    const image = await db.collection("receiptImages").doc(doc.id).get();
    backup.push({
      id: doc.id,
      receipt: doc.data(),
      image: image.exists ? image.data() : null,
    });
  }
  // timestamped so repeated wipes on the same day never overwrite a backup
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const path = `secrets/backup-real-receipts-${stamp}.json`;
  writeFileSync(path, JSON.stringify(backup, null, 2));
  console.log(`Backed up ${real.length} real receipts to ${path}`);

  const batch = db.batch();
  for (const doc of real) {
    // deleted email receipts must stay deleted across future Gmail syncs
    const emailMessageId = doc.data().emailMessageId as string | undefined;
    if (emailMessageId) {
      batch.set(
        db.collection("processedEmails").doc(emailMessageId),
        { deleted: true, deletedAt: new Date().toISOString() },
        { merge: true },
      );
    }
    batch.delete(db.collection("receiptImages").doc(doc.id));
    batch.delete(doc.ref);
  }
  await batch.commit();
  console.log(`Wiped ${real.length} real receipts (backup kept in secrets/)`);
}

async function main() {
  const db = getDb();
  const col = db.collection("receipts");

  if (process.argv.includes("--wipe-real")) {
    await wipeRealReceipts();
  }

  if (process.argv.includes("--wipe")) {
    const seeded = await col.where("seeded", "==", true).get();
    if (!seeded.empty) {
      const batch = db.batch();
      seeded.docs.forEach((d) => batch.delete(d.ref));
      await batch.commit();
    }
    console.log(`Wiped ${seeded.size} previously seeded receipts`);
  }

  const batch = db.batch();
  const createdAt = new Date().toISOString();
  for (const { confidence, ...receipt } of SEED) {
    batch.set(col.doc(), {
      ...receipt,
      confidence: confidence ?? "high",
      source: "photo",
      seeded: true,
      createdAt,
    });
  }
  await batch.commit();
  console.log(`Seeded ${SEED.length} mock receipts`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
