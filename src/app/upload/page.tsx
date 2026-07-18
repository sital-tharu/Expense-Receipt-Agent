"use client";

import Link from "next/link";
import { useState } from "react";
import { getStoredOwnerKey, obtainOwnerKey } from "@/lib/owner-key";
import { formatInr, formatShortDate } from "@/lib/stats";
import type { Receipt } from "@/lib/types";
import { categoryColorVar } from "@/lib/urls";

type Status = "idle" | "extracting" | "done" | "error";

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // bumped on "Upload another" — remounts the uncontrolled file input
  const [formKey, setFormKey] = useState(0);

  function reset() {
    setFile(null);
    setReceipt(null);
    setError(null);
    setStatus("idle");
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setFormKey((k) => k + 1);
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0] ?? null;
    setFile(selected);
    setReceipt(null);
    setError(null);
    setStatus("idle");
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(selected ? URL.createObjectURL(selected) : null);
  }

  async function runExtract() {
    if (!file) return;

    setStatus("extracting");
    setError(null);
    const body = new FormData();
    body.append("image", file);

    try {
      const key = getStoredOwnerKey();
      const res = await fetch("/api/extract", {
        method: "POST",
        body,
        headers: key ? { "x-owner-key": key } : undefined,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `Request failed (${res.status})`);
      setReceipt(data.receipt);
      setSaved(data.saved !== false);
      setStatus("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setStatus("error");
    }
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    void runExtract();
  }

  // Visitor tried it, owner wants it kept: take the passcode, redo with save
  async function unlockAndSave() {
    if (await obtainOwnerKey(true)) void runExtract();
  }

  return (
    <main className="mx-auto max-w-xl px-6 py-10">
      <h1 className="text-2xl font-semibold">Upload a receipt</h1>
      <p className="mt-1 text-sm text-gray-500">
        Receipt photo or GPay/UPI screenshot — Gemini extracts and categorizes
        it automatically.
      </p>

      {status !== "done" && (
      <form key={formKey} onSubmit={onSubmit} className="mt-6 space-y-4">
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={onFileChange}
          className="block w-full text-sm file:mr-4 file:rounded-md file:border-0 file:bg-gray-900 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-gray-700 dark:file:bg-gray-100 dark:file:text-gray-900"
        />

        <button
          type="submit"
          disabled={!file || status === "extracting"}
          className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {status === "extracting" ? "Extracting…" : "Extract & categorize"}
        </button>

        {previewUrl && (
          // eslint-disable-next-line @next/next/no-img-element -- local blob preview, next/image not applicable
          <img
            src={previewUrl}
            alt="Selected receipt preview"
            className="max-h-80 rounded-lg border border-gray-200 dark:border-gray-700"
          />
        )}
      </form>
      )}

      {status === "error" && error && (
        <p className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      )}

      {status === "done" && receipt && (
        <div className="mt-6 overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
          {/* Status banner */}
          <div
            className={`flex items-start gap-3 px-4 py-3.5 ${
              saved
                ? "bg-emerald-50 dark:bg-emerald-950/50"
                : "bg-sky-50 dark:bg-sky-950/50"
            }`}
          >
            <span aria-hidden className="mt-0.5 text-xl leading-none">
              {saved ? "✅" : "🔍"}
            </span>
            <div>
              <h2
                className={`text-sm font-semibold ${
                  saved
                    ? "text-emerald-900 dark:text-emerald-200"
                    : "text-sky-900 dark:text-sky-200"
                }`}
              >
                {saved
                  ? "Receipt saved to your dashboard"
                  : "Here's what the agent read"}
              </h2>
              <p
                className={`mt-0.5 text-xs ${
                  saved
                    ? "text-emerald-800/80 dark:text-emerald-300/80"
                    : "text-sky-800/80 dark:text-sky-300/80"
                }`}
              >
                {saved
                  ? "It's already counted in this week's totals."
                  : "Try-it mode — this public demo doesn't store your receipt."}
              </p>
            </div>
          </div>

          <div className="p-4">
            {receipt.confidence === "low" && (
              <p className="mb-3 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                ⚠️ The agent isn&apos;t fully sure about this one — double-check
                the fields below.
              </p>
            )}

            <div className="flex items-baseline justify-between gap-4">
              <div className="min-w-0">
                <p className="truncate text-base font-medium">
                  {receipt.merchant}
                </p>
                <p className="mt-1 flex items-center gap-2 text-xs text-gray-500">
                  {formatShortDate(receipt.date)}
                  <span className="inline-flex items-center gap-1.5">
                    <span
                      aria-hidden
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ background: categoryColorVar(receipt.category) }}
                    />
                    {receipt.category}
                  </span>
                </p>
              </div>
              <div className="text-right">
                <p className="font-mono text-2xl font-medium tracking-tight">
                  {formatInr(receipt.total)}
                </p>
                {receipt.originalCurrency && receipt.originalAmount != null && (
                  <p className="text-xs text-gray-500">
                    ≈ {receipt.originalCurrency} {receipt.originalAmount}
                  </p>
                )}
              </div>
            </div>

            {receipt.lineItems.length > 0 && (
              <table className="mt-3 w-full text-sm">
                <tbody>
                  {receipt.lineItems.map((item, i) => (
                    <tr
                      key={i}
                      className="border-t border-gray-100 dark:border-gray-800"
                    >
                      <td className="py-1">{item.name}</td>
                      <td className="py-1 text-right font-mono">
                        {formatInr(item.price)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            <div className="mt-4 flex flex-wrap items-center gap-2">
              {saved ? (
                <Link
                  href="/"
                  className="rounded-md bg-emerald-600 px-3.5 py-2 text-[13px] font-medium text-white hover:bg-emerald-500"
                >
                  View dashboard
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={unlockAndSave}
                  className="rounded-md bg-emerald-600 px-3.5 py-2 text-[13px] font-medium text-white hover:bg-emerald-500"
                >
                  Owner? Enter passcode to save
                </button>
              )}
              <button
                type="button"
                onClick={reset}
                className="rounded-md border border-gray-300 px-3.5 py-2 text-[13px] font-medium hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-900"
              >
                Upload another
              </button>
            </div>

            <details className="mt-4">
              <summary className="cursor-pointer text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                View raw extraction
              </summary>
              <pre className="mt-2 overflow-x-auto rounded-md bg-gray-50 p-3 font-mono text-xs leading-relaxed dark:bg-gray-900">
                {JSON.stringify(receipt, null, 2)}
              </pre>
            </details>
          </div>
        </div>
      )}
    </main>
  );
}
