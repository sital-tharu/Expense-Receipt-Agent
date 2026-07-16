/**
 * Seeds mock receipt history so the dashboard and subscription detection
 * have something to show (no real 3-month history exists before demo day).
 *
 *   npm run seed            add mock receipts
 *   npm run seed -- --wipe  delete previously seeded docs first (real
 *                           receipts are never touched)
 */
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

import { getDb } from "../src/lib/firestore";
import { isoDate } from "../src/lib/stats";
import type { Receipt } from "../src/lib/types";

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return isoDate(d);
}

const none: Receipt["lineItems"] = [];

// confidence is stamped "high" at write time — mock data is by definition clean
const SEED: Omit<Receipt, "confidence">[] = [
  // --- Recurring subscriptions: 3 charges each, ~monthly cadence ---
  { merchant: "Netflix", date: daysAgo(6), total: 649, lineItems: none, category: "Subscriptions" },
  { merchant: "Netflix", date: daysAgo(36), total: 649, lineItems: none, category: "Subscriptions" },
  { merchant: "Netflix", date: daysAgo(66), total: 649, lineItems: none, category: "Subscriptions" },

  { merchant: "Spotify", date: daysAgo(11), total: 119, lineItems: none, category: "Subscriptions" },
  { merchant: "Spotify", date: daysAgo(41), total: 119, lineItems: none, category: "Subscriptions" },
  { merchant: "Spotify", date: daysAgo(72), total: 119, lineItems: none, category: "Subscriptions" },

  { merchant: "Jio Recharge", date: daysAgo(4), total: 299, lineItems: none, category: "Utilities" },
  { merchant: "Jio Recharge", date: daysAgo(33), total: 299, lineItems: none, category: "Utilities" },
  { merchant: "Jio Recharge", date: daysAgo(63), total: 299, lineItems: none, category: "Utilities" },

  // --- This week ---
  { merchant: "Amazon", date: daysAgo(0), total: 899, lineItems: [{ name: "USB-C cable", price: 399 }, { name: "Phone case", price: 500 }], category: "Shopping" },
  { merchant: "Swiggy", date: daysAgo(1), total: 420, lineItems: [{ name: "Paneer wrap", price: 220 }, { name: "Fries", price: 120 }, { name: "Delivery fee", price: 80 }], category: "Food" },
  { merchant: "Bengaluru Metro", date: daysAgo(2), total: 60, lineItems: none, category: "Transport" },
  { merchant: "BigBasket", date: daysAgo(3), total: 1240, lineItems: [{ name: "Vegetables", price: 480 }, { name: "Milk 2L", price: 130 }, { name: "Rice 5kg", price: 630 }], category: "Food" },

  // --- Last week (for the week-over-week delta) ---
  { merchant: "Blue Tokai Coffee", date: daysAgo(7), total: 540, lineItems: none, category: "Food" },
  { merchant: "Zomato", date: daysAgo(8), total: 350, lineItems: none, category: "Food" },
  { merchant: "Uber", date: daysAgo(9), total: 240, lineItems: none, category: "Transport" },
  { merchant: "Croma", date: daysAgo(10), total: 2499, lineItems: [{ name: "Bluetooth speaker", price: 2499 }], category: "Shopping" },

  // --- Older scatter ---
  { merchant: "Swiggy", date: daysAgo(20), total: 380, lineItems: none, category: "Food" },
  { merchant: "Indian Oil", date: daysAgo(25), total: 1000, lineItems: none, category: "Transport" },
  { merchant: "BESCOM", date: daysAgo(40), total: 830, lineItems: none, category: "Utilities" },
];

async function main() {
  const db = getDb();
  const col = db.collection("receipts");

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
  for (const receipt of SEED) {
    batch.set(col.doc(), {
      ...receipt,
      confidence: "high",
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
