import { existsSync, readFileSync } from "node:fs";
import { getDb } from "./firestore";

// Refresh token lives in Firestore (config/gmailToken) so it survives
// serverless deployments (Vercel's filesystem is ephemeral). A token file
// from older local versions is migrated automatically on first read.
const TOKEN_DOC = { collection: "config", id: "gmailToken" };
const LEGACY_TOKEN_PATH =
  process.env.GMAIL_TOKEN_PATH ?? "./secrets/gmail-token.json";

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

/**
 * Optional shared passcode gating the Gmail routes on public deployments.
 * Unset (local dev) → routes are open. Set GMAIL_ROUTES_SECRET on Vercel.
 */
export function isGmailKeyValid(provided: string | null | undefined): boolean {
  const secret = process.env.GMAIL_ROUTES_SECRET;
  if (!secret) return true;
  // Mobile keyboards/clipboards often append a stray space to pasted codes.
  return provided?.trim() === secret;
}

export function isGmailProtected(): boolean {
  return Boolean(process.env.GMAIL_ROUTES_SECRET);
}

async function readStoredToken(): Promise<string | null> {
  const doc = await getDb()
    .collection(TOKEN_DOC.collection)
    .doc(TOKEN_DOC.id)
    .get();
  const stored = doc.data()?.refreshToken as string | undefined;
  if (stored) return stored;

  // One-time migration from the pre-serverless file location
  if (existsSync(LEGACY_TOKEN_PATH)) {
    try {
      const { refreshToken } = JSON.parse(
        readFileSync(LEGACY_TOKEN_PATH, "utf8"),
      );
      if (refreshToken) {
        await saveRefreshToken(refreshToken);
        return refreshToken;
      }
    } catch {
      // unreadable legacy file — treat as not connected
    }
  }
  return null;
}

async function saveRefreshToken(refreshToken: string): Promise<void> {
  await getDb()
    .collection(TOKEN_DOC.collection)
    .doc(TOKEN_DOC.id)
    .set({ refreshToken, updatedAt: new Date().toISOString() });
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
  const secret = process.env.GMAIL_ROUTES_SECRET;
  if (secret) params.set("state", secret); // verified by the callback
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
  await saveRefreshToken(data.refresh_token);
}

export async function isGmailConnected(): Promise<boolean> {
  try {
    return (await readStoredToken()) !== null;
  } catch {
    // Firestore unreachable (e.g. missing credentials) — treat as unconnected
    return false;
  }
}

/** Fresh short-lived access token, or null when Gmail was never connected. */
export async function getAccessToken(): Promise<string | null> {
  const refreshToken = await readStoredToken();
  if (!refreshToken) return null;
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
