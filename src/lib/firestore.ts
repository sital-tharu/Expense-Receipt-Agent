import { readFileSync } from "node:fs";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import type { Receipt, ReceiptSource, StoredReceipt } from "./types";

const RECEIPTS_COLLECTION = "receipts";

function loadServiceAccount(): Record<string, unknown> {
  // Vercel/CI: whole JSON in an env var; local dev: path to gitignored file
  const inlineJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (inlineJson) return JSON.parse(inlineJson);

  const path = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  if (!path) {
    throw new Error(
      "Set FIREBASE_SERVICE_ACCOUNT_PATH (or FIREBASE_SERVICE_ACCOUNT_JSON) in .env.local",
    );
  }
  return JSON.parse(readFileSync(path, "utf8"));
}

export function getDb(): Firestore {
  // getApps() guard: Next.js dev hot-reload re-evaluates modules
  const app =
    getApps()[0] ?? initializeApp({ credential: cert(loadServiceAccount()) });
  return getFirestore(app);
}

export async function saveReceipt(
  receipt: Receipt,
  source: ReceiptSource,
): Promise<string> {
  const doc = await getDb()
    .collection(RECEIPTS_COLLECTION)
    .add({ ...receipt, source, createdAt: new Date().toISOString() });
  return doc.id;
}

export async function getReceipts(limit = 200): Promise<StoredReceipt[]> {
  const snapshot = await getDb()
    .collection(RECEIPTS_COLLECTION)
    .orderBy("date", "desc")
    .limit(limit)
    .get();
  return snapshot.docs.map(
    (d) => ({ id: d.id, ...d.data() }) as StoredReceipt,
  );
}
