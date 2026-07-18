"use client";

import { useRouter } from "next/navigation";
import { useState, useSyncExternalStore } from "react";
import { getStoredOwnerKey, obtainOwnerKey } from "@/lib/owner-key";

const noSubscription = () => () => {};

/**
 * Per-row ✕ button. Hidden from visitors: it only renders when the owner
 * passcode is already in this browser (or the deploy is unprotected).
 */
export default function DeleteReceipt({
  id,
  merchant,
  protectionEnabled,
}: {
  id: string;
  merchant: string;
  protectionEnabled: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  // localStorage is unavailable during SSR — render nothing on the server,
  // reveal after hydration if this browser holds the passcode
  const hasKey = useSyncExternalStore(
    noSubscription,
    () => Boolean(getStoredOwnerKey()),
    () => false,
  );

  if (protectionEnabled && !hasKey) return null;

  async function remove(retrying = false) {
    if (!retrying && !window.confirm(`Delete the ${merchant} receipt?`)) return;
    setBusy(true);
    try {
      const key = protectionEnabled ? await obtainOwnerKey(retrying) : null;
      if (protectionEnabled && !key) return;
      const res = await fetch(`/api/receipts/${id}`, {
        method: "DELETE",
        headers: key ? { "x-owner-key": key } : undefined,
      });
      if (res.status === 403 && !retrying) {
        // wrong stored passcode — ask again once
        await remove(true);
        return;
      }
      if (!res.ok) throw new Error(`Delete failed (${res.status})`);
      router.refresh();
    } catch {
      window.alert("Could not delete this receipt — try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      onClick={() => remove()}
      disabled={busy}
      aria-label={`Delete the ${merchant} receipt`}
      title="Delete receipt"
      className="rounded px-1 text-gray-300 hover:text-red-600 disabled:opacity-40 dark:text-gray-600 dark:hover:text-red-400"
    >
      ✕
    </button>
  );
}
