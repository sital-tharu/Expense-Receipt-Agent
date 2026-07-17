import { readFileSync } from "node:fs";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import type { Receipt, ReceiptSource, StoredReceipt } from "./types";

const RECEIPTS_COLLECTION = "receipts";
// Raw receipt images live in their own collection so receipt list queries
// stay light. Base64 in Firestore is a deliberate demo-grade tradeoff
// (no Blaze plan needed); docs are capped well under Firestore's 1 MiB limit.
export const RECEIPT_IMAGES_COLLECTION = "receiptImages";
const MAX_EMBEDDED_IMAGE_BYTES = 700 * 1024;

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
  image?: { bytes: Buffer; mimeType: string },
): Promise<string> {
  const db = getDb();
  const embedImage =
    image !== undefined && image.bytes.length <= MAX_EMBEDDED_IMAGE_BYTES;
  const doc = await db.collection(RECEIPTS_COLLECTION).add({
    ...receipt,
    source,
    createdAt: new Date().toISOString(),
    hasImage: embedImage,
  });
  if (embedImage) {
    await db.collection(RECEIPT_IMAGES_COLLECTION).doc(doc.id).set({
      data: image.bytes.toString("base64"),
      mimeType: image.mimeType,
    });
  }
  return doc.id;
}

export async function getReceiptImage(
  id: string,
): Promise<{ bytes: Buffer; mimeType: string } | null> {
  const doc = await getDb()
    .collection(RECEIPT_IMAGES_COLLECTION)
    .doc(id)
    .get();
  const data = doc.data();
  if (!data) return null;
  return {
    bytes: Buffer.from(data.data as string, "base64"),
    mimeType: data.mimeType as string,
  };
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
