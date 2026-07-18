import { getDb } from "./firestore";

/**
 * Global daily caps on the public demo surface (chat + try-it extraction),
 * so voting-day traffic can't burn the Gemini free tier dry. The owner
 * bypasses these (routes skip the check when the owner key is valid).
 * Counters live in Firestore (usage/{YYYY-MM-DD}) because serverless
 * instances share no memory.
 */
const DEFAULT_LIMITS = { chat: 300, extract: 100 } as const;

export type QuotaKind = keyof typeof DEFAULT_LIMITS;

const LIMIT_ENV: Record<QuotaKind, string> = {
  chat: "CHAT_DAILY_LIMIT",
  extract: "EXTRACT_DAILY_LIMIT",
};

function limitFor(kind: QuotaKind): number {
  const n = Number(process.env[LIMIT_ENV[kind]]);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_LIMITS[kind];
}

/** Atomically consume one unit of today's global quota. False = exhausted. */
export async function consumeQuota(kind: QuotaKind): Promise<boolean> {
  const db = getDb();
  const ref = db
    .collection("usage")
    .doc(new Date().toISOString().slice(0, 10));
  return db.runTransaction(async (tx) => {
    const used = ((await tx.get(ref)).data()?.[kind] as number | undefined) ?? 0;
    if (used >= limitFor(kind)) return false;
    tx.set(ref, { [kind]: used + 1 }, { merge: true });
    return true;
  });
}

export const QUOTA_MESSAGE =
  "The public demo has reached today's AI limit — please try again tomorrow.";
