"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface SyncSummary {
  imported: number;
  skipped: number;
  failed: { subject: string; error: string }[];
}

export default function GmailSync({ connected }: { connected: boolean }) {
  const router = useRouter();
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const buttonClasses =
    "inline-flex items-center gap-1.5 rounded-md border border-emerald-600/40 px-3 py-1.5 text-[13px] font-medium text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 disabled:opacity-50";

  if (!connected) {
    return (
      <a href="/api/gmail/auth" className={buttonClasses}>
        ✉️ Connect Gmail
      </a>
    );
  }

  async function sync() {
    setSyncing(true);
    setMessage(null);
    try {
      const res = await fetch("/api/gmail/sync", { method: "POST" });
      if (res.status === 401) {
        window.location.href = "/api/gmail/auth";
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

  return (
    <span className="inline-flex items-center gap-2">
      {message && <span className="text-xs text-gray-500">{message}</span>}
      <button onClick={sync} disabled={syncing} className={buttonClasses}>
        {syncing ? "Syncing…" : "✉️ Sync inbox"}
      </button>
    </span>
  );
}
