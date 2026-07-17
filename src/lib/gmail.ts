import { extractReceipt, extractReceiptFromText } from "./extract";
import { getAccessToken } from "./gmail-auth";
import { getDb, saveReceipt } from "./firestore";

const GMAIL_API = "https://gmail.googleapis.com/gmail/v1/users/me";
const PROCESSED_COLLECTION = "processedEmails";

// ---------- Pure MIME helpers (exported for tests) ----------

export interface GmailPart {
  mimeType?: string;
  filename?: string;
  headers?: { name: string; value: string }[];
  body?: { data?: string; attachmentId?: string; size?: number };
  parts?: GmailPart[];
}

export function decodeBase64Url(data: string): Buffer {
  return Buffer.from(data.replace(/-/g, "+").replace(/_/g, "/"), "base64");
}

export function flattenParts(payload: GmailPart): GmailPart[] {
  const out: GmailPart[] = [payload];
  for (const part of payload.parts ?? []) out.push(...flattenParts(part));
  return out;
}

export function getHeader(payload: GmailPart, name: string): string | undefined {
  return payload.headers?.find(
    (h) => h.name.toLowerCase() === name.toLowerCase(),
  )?.value;
}

/** Decoded message body — prefers HTML (richer for extraction), falls back to plain text. */
export function extractBody(payload: GmailPart): string | null {
  const parts = flattenParts(payload);
  const byType = (t: string) =>
    parts.find((p) => p.mimeType === t && p.body?.data);
  const part = byType("text/html") ?? byType("text/plain");
  return part?.body?.data ? decodeBase64Url(part.body.data).toString("utf8") : null;
}

export interface ImageAttachmentRef {
  attachmentId: string;
  mimeType: string;
  filename: string;
}

export function findImageAttachments(payload: GmailPart): ImageAttachmentRef[] {
  return flattenParts(payload)
    .filter((p) => p.mimeType?.startsWith("image/") && p.body?.attachmentId)
    .map((p) => ({
      attachmentId: p.body!.attachmentId!,
      mimeType: p.mimeType!,
      filename: p.filename ?? "attachment",
    }));
}

// ---------- Sync engine ----------

export interface SyncResult {
  imported: number;
  skipped: number;
  failed: { subject: string; error: string }[];
}

async function gmailFetch(path: string, token: string) {
  const res = await fetch(`${GMAIL_API}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new Error(`Gmail API ${path} failed (${res.status}): ${await res.text()}`);
  }
  return res.json();
}

export async function syncGmail(): Promise<SyncResult | { needsAuth: true }> {
  const token = await getAccessToken();
  if (!token) return { needsAuth: true };

  const label = process.env.GMAIL_LABEL ?? "receipts";
  const maxResults = Number(process.env.GMAIL_MAX_RESULTS) || 25;
  const list = await gmailFetch(
    `/messages?q=${encodeURIComponent(`label:${label}`)}&maxResults=${maxResults}`,
    token,
  );
  const messages: { id: string }[] = list.messages ?? [];

  const db = getDb();
  const result: SyncResult = { imported: 0, skipped: 0, failed: [] };

  for (const { id } of messages) {
    const seen = await db.collection(PROCESSED_COLLECTION).doc(id).get();
    if (seen.exists) {
      result.skipped++;
      continue;
    }

    let subject = "(unknown)";
    try {
      const msg = await gmailFetch(`/messages/${id}?format=full`, token);
      subject = getHeader(msg.payload, "Subject") ?? "(no subject)";
      const from = getHeader(msg.payload, "From") ?? "";

      const images = findImageAttachments(msg.payload);
      let receiptId: string;
      if (images.length > 0) {
        // Attached screenshot/photo → same multimodal path as uploads
        const att = images[0];
        const attData = await gmailFetch(
          `/messages/${id}/attachments/${att.attachmentId}`,
          token,
        );
        const bytes = decodeBase64Url(attData.data);
        const receipt = await extractReceipt(bytes, att.mimeType);
        receiptId = await saveReceipt(receipt, "email", {
          bytes,
          mimeType: att.mimeType,
        });
      } else {
        const body = extractBody(msg.payload);
        if (!body) throw new Error("no readable text or HTML body");
        const receipt = await extractReceiptFromText(body);
        receiptId = await saveReceipt(receipt, "email");
      }

      await db
        .collection("receipts")
        .doc(receiptId)
        .update({ emailSubject: subject, emailFrom: from });
      await db.collection(PROCESSED_COLLECTION).doc(id).set({
        receiptId,
        subject,
        from,
        processedAt: new Date().toISOString(),
      });
      result.imported++;
    } catch (err) {
      result.failed.push({
        subject,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return result;
}
