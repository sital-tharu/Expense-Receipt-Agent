import { NextResponse } from "next/server";
import { exchangeCode } from "@/lib/gmail-auth";
import { isOwnerKeyValid } from "@/lib/owner";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");

  // When GMAIL_ROUTES_SECRET is set, the consent URL carries it as `state`;
  // reject callbacks that didn't originate from our gated auth route.
  if (!isOwnerKeyValid(url.searchParams.get("state"))) {
    return NextResponse.redirect(
      new URL("/?gmail=error&reason=bad_state", url.origin),
    );
  }

  if (error || !code) {
    return NextResponse.redirect(
      new URL(`/?gmail=error&reason=${encodeURIComponent(error ?? "no_code")}`, url.origin),
    );
  }

  try {
    await exchangeCode(code, url.origin);
    return NextResponse.redirect(new URL("/?gmail=connected", url.origin));
  } catch (err) {
    console.error("Gmail token exchange failed:", err);
    return NextResponse.redirect(new URL("/?gmail=error&reason=exchange", url.origin));
  }
}
