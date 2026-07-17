import { z } from "zod";

export const CATEGORIES = [
  "Food",
  "Transport",
  "Subscriptions",
  "Shopping",
  "Utilities",
  "Other",
] as const;

export type Category = (typeof CATEGORIES)[number];

export const LineItemSchema = z.object({
  name: z.string().min(1),
  price: z.number(),
});

export const ReceiptSchema = z.object({
  merchant: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "date must be YYYY-MM-DD"),
  total: z.number().nonnegative(),
  // Empty for payment-app screenshots (GPay/UPI) that show no itemized lines
  lineItems: z.array(LineItemSchema),
  category: z.enum(CATEGORIES),
  // Model self-assessment; "low" surfaces a "Needs review" badge in the UI.
  // Defaulted so receipts stored before this field existed still parse.
  confidence: z.enum(["high", "low"]).default("high"),
});

export type Receipt = z.infer<typeof ReceiptSchema>;

export type ReceiptSource = "photo" | "email";

export interface StoredReceipt extends Receipt {
  id: string;
  source: ReceiptSource;
  createdAt: string; // ISO timestamp
  hasImage?: boolean; // raw image stored in receiptImages/{id}
  seeded?: boolean; // mock demo data (npm run seed)
}
