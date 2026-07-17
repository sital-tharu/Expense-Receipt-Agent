import { NextResponse } from "next/server";
import { consentUrl } from "@/lib/gmail-auth";

export async function GET(request: Request) {
  const origin = new URL(request.url).origin;
  try {
    return NextResponse.redirect(consentUrl(origin));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Gmail auth failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
