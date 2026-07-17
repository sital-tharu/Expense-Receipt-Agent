import { NextResponse } from "next/server";
import { isGmailKeyValid } from "@/lib/gmail-auth";
import { syncGmail } from "@/lib/gmail";

// A sync can run 25 emails through Gemini — allow up to a minute on Vercel
export const maxDuration = 60;

export async function POST(request: Request) {
  if (!isGmailKeyValid(request.headers.get("x-gmail-key"))) {
    return NextResponse.json(
      { error: "Invalid or missing Gmail passcode", needsKey: true },
      { status: 403 },
    );
  }
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
