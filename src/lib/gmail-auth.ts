import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

const TOKEN_PATH = process.env.GMAIL_TOKEN_PATH ?? "./secrets/gmail-token.json";
const SCOPE = "https://www.googleapis.com/auth/gmail.readonly";
const REDIRECT_PATH = "/api/gmail/callback";

function clientCreds(): { clientId: string; clientSecret: string } {
  const clientId = process.env.GMAIL_CLIENT_ID;
  const clientSecret = process.env.GMAIL_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error(
      "Set GMAIL_CLIENT_ID and GMAIL_CLIENT_SECRET in .env.local (see README Gmail setup)",
    );
  }
  return { clientId, clientSecret };
}

export function consentUrl(origin: string): string {
  const params = new URLSearchParams({
    client_id: clientCreds().clientId,
    redirect_uri: origin + REDIRECT_PATH,
    response_type: "code",
    scope: SCOPE,
    access_type: "offline",
    prompt: "consent", // force a refresh token even on reconnects
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

export async function exchangeCode(code: string, origin: string): Promise<void> {
  const { clientId, clientSecret } = clientCreds();
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: origin + REDIRECT_PATH,
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok) {
    throw new Error(`Token exchange failed (${res.status}): ${await res.text()}`);
  }
  const data = await res.json();
  if (!data.refresh_token) {
    throw new Error(
      "Google did not return a refresh token — remove this app at myaccount.google.com/permissions and reconnect",
    );
  }
  mkdirSync(dirname(TOKEN_PATH), { recursive: true });
  writeFileSync(
    TOKEN_PATH,
    JSON.stringify({ refreshToken: data.refresh_token }, null, 2),
  );
}

export function isGmailConnected(): boolean {
  return existsSync(TOKEN_PATH);
}

/** Fresh short-lived access token, or null when Gmail was never connected. */
export async function getAccessToken(): Promise<string | null> {
  if (!existsSync(TOKEN_PATH)) return null;
  const { refreshToken } = JSON.parse(readFileSync(TOKEN_PATH, "utf8"));
  const { clientId, clientSecret } = clientCreds();
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) {
    throw new Error(
      `Access-token refresh failed (${res.status}): ${await res.text()}`,
    );
  }
  return (await res.json()).access_token as string;
}
