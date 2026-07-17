import { GEMINI_MODEL, getGeminiClient } from "./gemini";
import { CATEGORIES, ReceiptSchema, type Receipt } from "./types";

const RESPONSE_JSON_SCHEMA = {
  type: "object",
  properties: {
    merchant: {
      type: "string",
      description:
        "Store or payee name. For UPI/GPay screenshots use the recipient name shown — never a UPI ID or transaction code.",
    },
    date: {
      type: "string",
      description: "Transaction date in YYYY-MM-DD format.",
    },
    total: {
      type: "number",
      description:
        "Final amount paid in Indian Rupees, as a plain number without symbols or commas.",
    },
    lineItems: {
      type: "array",
      description:
        "Itemized purchases. Empty array when no line items are visible (typical for payment-app screenshots).",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          price: { type: "number" },
        },
        required: ["name", "price"],
      },
    },
    category: {
      type: "string",
      enum: [...CATEGORIES],
      description: "Single best-fit spending category.",
    },
    confidence: {
      type: "string",
      enum: ["high", "low"],
      description:
        "Self-assessment: 'low' if the image is blurry, cropped, or any extracted field is uncertain; otherwise 'high'.",
    },
  },
  required: ["merchant", "date", "total", "lineItems", "category", "confidence"],
};

function buildPrompt(): string {
  const today = new Date().toISOString().slice(0, 10);
  return `Extract structured expense data from this image. Today's date is ${today}.

The image is either a paper/store receipt photo, or a payment-app screenshot
(Google Pay / UPI) that shows a payee and amount but no itemized lines.

Rules:
- merchant: the store or payee name. For UPI/GPay screenshots use the recipient
  name shown (e.g. "Netflix", "Bengaluru Metro"). Clean it up — no UPI IDs,
  handles, or transaction codes.
- date: the transaction date as YYYY-MM-DD. If the year is missing, use the
  most recent past occurrence of that day relative to today.
- total: the final amount paid in INR as a plain number.
- lineItems: itemized purchases with name and price. Return [] when none are
  visible.
- category: pick the single best fit. Streaming/software/memberships →
  Subscriptions; groceries/restaurants/food delivery → Food; fuel/cab/metro/
  train → Transport; electricity/water/gas/mobile recharge → Utilities;
  retail/online shopping → Shopping; anything else → Other.
- confidence: "low" if the image is blurry, partially cropped, hard to read,
  or you are not certain about the merchant, date, or total; otherwise "high".`;
}

type ContentPart = { text: string } | { inlineData: { mimeType: string; data: string } };

async function runExtraction(parts: ContentPart[]): Promise<Receipt> {
  const ai = getGeminiClient();
  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: [{ role: "user", parts }],
    config: {
      responseMimeType: "application/json",
      responseJsonSchema: RESPONSE_JSON_SCHEMA,
      temperature: 0,
    },
  });
  const text = response.text;
  if (!text) {
    throw new Error("Gemini returned an empty response for the receipt");
  }
  return ReceiptSchema.parse(JSON.parse(text));
}

export async function extractReceipt(
  imageBytes: Buffer,
  mimeType: string,
): Promise<Receipt> {
  return runExtraction([
    { inlineData: { mimeType, data: imageBytes.toString("base64") } },
    { text: buildPrompt() },
  ]);
}

// Email bodies can be huge (styled HTML) — keep well inside context limits
const MAX_EMAIL_CHARS = 20_000;

function buildEmailPrompt(): string {
  const today = new Date().toISOString().slice(0, 10);
  return `Extract structured expense data from this email (raw HTML or plain
text). Today's date is ${today}. The email should be a purchase, order, or
payment confirmation (e.g. food delivery, shopping, bank/UPI alert, invoice).

Rules:
- merchant: the business that charged the money (e.g. "Swiggy", "Amazon") —
  never the mail provider or the bank sending the alert (for bank/UPI alerts
  use the payee named in the message).
- date: the transaction date as YYYY-MM-DD; if only the email's sent date is
  visible, use that.
- total: the final amount paid in INR (order total after discounts, including
  delivery fees and taxes) as a plain number.
- lineItems: itemized purchases with name and price when listed; otherwise [].
- category: pick the single best fit. Streaming/software/memberships →
  Subscriptions; groceries/restaurants/food delivery → Food; fuel/cab/metro/
  train → Transport; electricity/water/gas/mobile recharge → Utilities;
  retail/online shopping → Shopping; anything else → Other.
- confidence: "low" if this does not clearly look like a payment/receipt email
  or you are unsure about the merchant, date, or total; otherwise "high".`;
}

export async function extractReceiptFromText(body: string): Promise<Receipt> {
  return runExtraction([
    { text: buildEmailPrompt() },
    { text: `EMAIL CONTENT:\n${body.slice(0, MAX_EMAIL_CHARS)}` },
  ]);
}
