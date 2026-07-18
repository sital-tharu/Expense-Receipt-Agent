// Client-side owner passcode storage — the browser-side half of lib/owner.ts.
// The ask-the-user UI lives in components/OwnerKeyDialog.tsx: window.prompt()
// is unavailable in some browsers/webviews (Electron throws), so we render
// our own dialog and resolve a promise when it closes.

// Historical storage key: existing browsers already hold the passcode here.
const KEY_STORAGE = "gmailRoutesKey";

type Resolver = (key: string | null) => void;
let opener: ((resolve: Resolver) => void) | null = null;

/** Wired up by <OwnerKeyDialog />, mounted once in the root layout. */
export function registerOwnerKeyDialog(
  fn: ((resolve: Resolver) => void) | null,
) {
  opener = fn;
}

/** Stored owner passcode, if any — never asks. */
export function getStoredOwnerKey(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(KEY_STORAGE);
}

/** Stored key, or ask once via the dialog and remember in localStorage. */
export async function obtainOwnerKey(forceAsk = false): Promise<string | null> {
  if (typeof window === "undefined") return null;
  const stored = window.localStorage.getItem(KEY_STORAGE);
  if (stored && !forceAsk) return stored;
  if (!opener) return null;
  const key = await new Promise<string | null>((resolve) => opener!(resolve));
  if (key) window.localStorage.setItem(KEY_STORAGE, key);
  return key;
}
