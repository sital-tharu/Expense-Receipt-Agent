import { getReceiptImage } from "@/lib/firestore";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const image = await getReceiptImage(id);
  if (!image) {
    return new Response("No image stored for this receipt", { status: 404 });
  }
  return new Response(new Uint8Array(image.bytes), {
    headers: {
      "Content-Type": image.mimeType,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
