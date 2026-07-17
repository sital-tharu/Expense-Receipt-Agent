import { NextResponse } from "next/server";
import { syncGmail } from "@/lib/gmail";

export async function POST() {
  try {
    const result = await syncGmail();
    if ("needsAuth" in result) {
      return NextResponse.json({ needsAuth: true }, { status: 401 });
    }
    return NextResponse.json(result);
  } catch (err) {
    console.error("Gmail sync failed:", err);
    const message = err instanceof Error ? err.message : "Gmail sync failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
