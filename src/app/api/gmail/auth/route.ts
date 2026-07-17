import { NextResponse } from "next/server";
import { consentUrl, isGmailKeyValid } from "@/lib/gmail-auth";

export async function GET(request: Request) {
  const url = new URL(request.url);
  if (!isGmailKeyValid(url.searchParams.get("key"))) {
    return NextResponse.json(
      { error: "Invalid or missing Gmail passcode", needsKey: true },
      { status: 403 },
    );
  }
  try {
    return NextResponse.redirect(consentUrl(url.origin));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Gmail auth failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
