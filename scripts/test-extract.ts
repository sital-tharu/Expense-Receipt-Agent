/**
 * CLI smoke test for the extraction pipeline:
 *   npm run test:extract -- samples/<image>
 * Extracts structured data from a receipt image, prints it, and saves it
 * to Firestore. Pass --dry-run to skip the Firestore write.
 */
import { readFileSync } from "node:fs";
import { extname, resolve } from "node:path";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

// Imported after dotenv so env vars are set before module init
import { extractReceipt } from "../src/lib/extract";
import { saveReceipt } from "../src/lib/firestore";

const MIME_TYPES: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
};

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const file = args.find((a) => !a.startsWith("--"));

  if (!file) {
    console.error("Usage: npm run test:extract -- samples/<image> [--dry-run]");
    process.exit(1);
  }

  const mimeType = MIME_TYPES[extname(file).toLowerCase()];
  if (!mimeType) {
    console.error(`Unsupported image type: ${file} (use png/jpg/webp)`);
    process.exit(1);
  }

  const path = resolve(file);
  console.log(`Extracting from ${path} ...`);
  const started = Date.now();
  const imageBytes = readFileSync(path);
  const receipt = await extractReceipt(imageBytes, mimeType);
  console.log(`Extracted in ${((Date.now() - started) / 1000).toFixed(1)}s:\n`);
  console.log(JSON.stringify(receipt, null, 2));

  if (dryRun) {
    console.log("\n--dry-run: skipping Firestore write");
    return;
  }

  const id = await saveReceipt(receipt, "photo", { bytes: imageBytes, mimeType });
  console.log(`\nSaved to Firestore: receipts/${id} (image embedded)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
