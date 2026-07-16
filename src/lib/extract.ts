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
  },
  required: ["merchant", "date", "total", "lineItems", "category"],
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
  retail/online shopping → Shopping; anything else → Other.`;
}

export async function extractReceipt(
  imageBytes: Buffer,
  mimeType: string,
): Promise<Receipt> {
  const ai = getGeminiClient();

  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: [
      {
        role: "user",
        parts: [
          { inlineData: { mimeType, data: imageBytes.toString("base64") } },
          { text: buildPrompt() },
        ],
      },
    ],
    config: {
      responseMimeType: "application/json",
      responseJsonSchema: RESPONSE_JSON_SCHEMA,
      temperature: 0,
    },
  });

  const text = response.text;
  if (!text) {
    throw new Error("Gemini returned an empty response for the receipt image");
  }
  return ReceiptSchema.parse(JSON.parse(text));
}
