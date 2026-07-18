// Client-side owner passcode storage — the browser-side half of lib/owner.ts.

// Historical storage key: existing browsers already hold the passcode here.
const KEY_STORAGE = "gmailRoutesKey";

/** Stored owner passcode, if any — never prompts. */
export function getStoredOwnerKey(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(KEY_STORAGE);
}

/** Ask once, remember in localStorage; only used when the server is gated. */
export function obtainOwnerKey(forceAsk = false): string | null {
  if (typeof window === "undefined") return null;
  let key = window.localStorage.getItem(KEY_STORAGE);
  if (!key || forceAsk) {
    key =
      window
        .prompt("Owner passcode (the GMAIL_ROUTES_SECRET you configured):")
        ?.trim() || null;
    if (key) window.localStorage.setItem(KEY_STORAGE, key);
  }
  return key;
}
