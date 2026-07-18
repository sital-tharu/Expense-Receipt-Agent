import { NextResponse } from "next/server";
import { getDb, RECEIPT_IMAGES_COLLECTION } from "@/lib/firestore";
import { isOwnerKeyValid } from "@/lib/owner";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isOwnerKeyValid(request.headers.get("x-owner-key"))) {
    return NextResponse.json(
      { error: "Invalid or missing owner passcode", needsKey: true },
      { status: 403 },
    );
  }
  const { id } = await params;
  const db = getDb();
  const ref = db.collection("receipts").doc(id);
  const doc = await ref.get();
  if (!doc.exists) {
    return NextResponse.json({ error: "Receipt not found" }, { status: 404 });
  }

  // Email receipts: flag the dedup marker, or the next sync would treat
  // the missing receipt as stale and reimport the mail.
  const emailMessageId = doc.data()?.emailMessageId as string | undefined;
  if (emailMessageId) {
    await db
      .collection("processedEmails")
      .doc(emailMessageId)
      .set(
        { deleted: true, deletedAt: new Date().toISOString() },
        { merge: true },
      );
  }

  await db.collection(RECEIPT_IMAGES_COLLECTION).doc(id).delete();
  await ref.delete();
  return NextResponse.json({ ok: true });
}
