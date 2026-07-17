import { NextResponse } from "next/server";
import { extractReceipt } from "@/lib/extract";
import { saveReceipt } from "@/lib/firestore";

// Vercel rejects request bodies over ~4.5MB — keep our limit inside it so
// users get our error message, not the platform's
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

export const maxDuration = 30;

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("image");

  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "Send an image file in the 'image' form field" },
      { status: 400 },
    );
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json(
      { error: `Unsupported image type ${file.type} (use png/jpg/webp)` },
      { status: 400 },
    );
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return NextResponse.json(
      { error: "Image too large (max 4 MB)" },
      { status: 413 },
    );
  }

  try {
    const bytes = Buffer.from(await file.arrayBuffer());
    const receipt = await extractReceipt(bytes, file.type);
    const id = await saveReceipt(receipt, "photo", {
      bytes,
      mimeType: file.type,
    });
    return NextResponse.json({ id, receipt });
  } catch (err) {
    console.error("Receipt extraction failed:", err);
    const message = err instanceof Error ? err.message : "Extraction failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
