import { NextResponse } from "next/server";
import { exchangeCode } from "@/lib/gmail-auth";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");

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
