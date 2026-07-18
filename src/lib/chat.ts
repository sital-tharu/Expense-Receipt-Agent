import { GEMINI_MODEL, getGeminiClient } from "./gemini";
import { getReceipts } from "./firestore";
import { detectSubscriptions, monthlyTotal } from "./subscriptions";
import type { StoredReceipt } from "./types";

export const MAX_QUESTION_CHARS = 300;

// One compact line per receipt keeps 200 receipts well under context limits.
function receiptLine(r: StoredReceipt): string {
  const item = r.lineItems.length
    ? ` | items: ${r.lineItems.map((i) => `${i.name} ₹${i.price}`).join(", ")}`
    : "";
  return `${r.date} | ${r.merchant} | ₹${r.total} | ${r.category}${item}`;
}

function buildContext(receipts: StoredReceipt[]): string {
  const subs = detectSubscriptions(receipts);
  const subLines = subs.length
    ? subs
        .map(
          (s) =>
            `${s.merchant} ₹${s.monthlyAmount}/mo (${s.occurrences} months in a row, last ${s.lastDate})`,
        )
        .join("\n") + `\nCombined: ₹${monthlyTotal(subs)}/mo`
    : "None detected.";

  return `RECEIPTS (date | merchant | amount in INR | category):
${receipts.map(receiptLine).join("\n")}

DETECTED RECURRING SUBSCRIPTIONS (same merchant, ~monthly, similar amount, 3+ months):
${subLines}`;
}

function buildPrompt(): string {
  const today = new Date().toISOString().slice(0, 10);
  return `You are the assistant inside a personal expense-tracking app. Today's
date is ${today}. Weeks run Monday–Sunday. All amounts are Indian Rupees.

Answer the user's question using ONLY the receipt data provided. Rules:
- Be concise: 1–4 short sentences, no headers or bullet lists unless the
  user asks for a breakdown.
- Compute sums/comparisons carefully from the lines; round to whole rupees
  and format like ₹1,234.
- Mention concrete merchants/dates when they make the answer clearer.
- If the data can't answer the question, say so plainly — never invent
  numbers or receipts.
- Politely refuse anything unrelated to this spending data.`;
}

/** One-shot grounded Q&A over all stored receipts — no conversation state. */
export async function askAgent(question: string): Promise<string> {
  const receipts = await getReceipts();
  const ai = getGeminiClient();
  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: [
      {
        role: "user",
        parts: [
          { text: buildPrompt() },
          { text: buildContext(receipts) },
          { text: `QUESTION: ${question}` },
        ],
      },
    ],
    config: { temperature: 0.2 },
  });
  const text = response.text?.trim();
  if (!text) throw new Error("Gemini returned an empty answer");
  return text;
}
