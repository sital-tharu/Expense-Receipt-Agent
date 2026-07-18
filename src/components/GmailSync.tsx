"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { obtainOwnerKey } from "@/lib/owner-key";

interface SyncSummary {
  imported: number;
  skipped: number;
  failed: { subject: string; error: string }[];
}

export default function GmailSync({
  connected,
  protectionEnabled,
}: {
  connected: boolean;
  protectionEnabled: boolean;
}) {
  const router = useRouter();
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const buttonClasses =
    "inline-flex items-center gap-1.5 rounded-md border border-emerald-600/40 px-3 py-1.5 text-[13px] font-medium text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 disabled:opacity-50";

  function connect() {
    const key = protectionEnabled ? obtainOwnerKey() : null;
    if (protectionEnabled && !key) return;
    window.location.href = key
      ? `/api/gmail/auth?key=${encodeURIComponent(key)}`
      : "/api/gmail/auth";
  }

  async function sync(retrying = false) {
    setSyncing(true);
    setMessage(null);
    try {
      const key = protectionEnabled ? obtainOwnerKey(retrying) : null;
      if (protectionEnabled && !key) return;
      const res = await fetch("/api/gmail/sync", {
        method: "POST",
        headers: key ? { "x-owner-key": key } : undefined,
      });
      if (res.status === 403 && !retrying) {
        // wrong stored passcode — ask again once
        await sync(true);
        return;
      }
      if (res.status === 401) {
        connect();
        return;
      }
      const data: SyncSummary & { error?: string } = await res.json();
      if (!res.ok) throw new Error(data.error ?? `Sync failed (${res.status})`);
      const failNote =
        data.failed.length > 0 ? `, ${data.failed.length} failed` : "";
      setMessage(`${data.imported} imported, ${data.skipped} skipped${failNote}`);
      router.refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Sync failed");
    } finally {
      setSyncing(false);
    }
  }

  if (!connected) {
    return (
      <button onClick={connect} className={buttonClasses}>
        ✉️ Connect Gmail
      </button>
    );
  }

  return (
    <span className="inline-flex items-center gap-2">
      {message && <span className="text-xs text-gray-500">{message}</span>}
      <button onClick={() => sync()} disabled={syncing} className={buttonClasses}>
        {syncing ? "Syncing…" : "✉️ Sync inbox"}
      </button>
    </span>
  );
}
