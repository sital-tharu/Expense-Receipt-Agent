/**
 * Single-owner auth: one shared passcode unlocks the write/manage surface
 * (Gmail sync, saving uploads, deleting receipts) on public deployments.
 * Visitors without it get a read-only dashboard plus try-it extraction.
 * Unset (local dev) → everything is open.
 *
 * The env var name is historical — it originally gated only the Gmail
 * routes. This module is the seam for real accounts later: swap these
 * checks for a per-user session and the call sites stay unchanged.
 */

// Pasted codes carry stray spaces and invisible characters (zero-width
// spaces, BOM, direction marks) from chat apps — strip both before comparing.
function normalizeKey(s: string): string {
  return s.replace(/[\u200B-\u200F\u2060\uFEFF]/g, "").trim();
}

export function isOwnerKeyValid(provided: string | null | undefined): boolean {
  const secret = process.env.GMAIL_ROUTES_SECRET;
  if (!secret) return true;
  return provided != null && normalizeKey(provided) === secret.trim();
}

export function isOwnerProtected(): boolean {
  return Boolean(process.env.GMAIL_ROUTES_SECRET);
}
