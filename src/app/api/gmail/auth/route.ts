import { NextResponse } from "next/server";
import { consentUrl } from "@/lib/gmail-auth";
import { isOwnerKeyValid } from "@/lib/owner";

export async function GET(request: Request) {
  const url = new URL(request.url);
  if (!isOwnerKeyValid(url.searchParams.get("key"))) {
    return NextResponse.json(
      { error: "Invalid or missing owner passcode", needsKey: true },
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
