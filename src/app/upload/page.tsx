"use client";

import { useState } from "react";
import type { Receipt } from "@/lib/types";

type Status = "idle" | "extracting" | "done" | "error";

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [error, setError] = useState<string | null>(null);

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0] ?? null;
    setFile(selected);
    setReceipt(null);
    setError(null);
    setStatus("idle");
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(selected ? URL.createObjectURL(selected) : null);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;

    setStatus("extracting");
    setError(null);
    const body = new FormData();
    body.append("image", file);

    try {
      const res = await fetch("/api/extract", { method: "POST", body });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `Request failed (${res.status})`);
      setReceipt(data.receipt);
      setStatus("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setStatus("error");
    }
  }

  return (
    <main className="mx-auto max-w-xl px-6 py-10">
      <h1 className="text-2xl font-semibold">Upload a receipt</h1>
      <p className="mt-1 text-sm text-gray-500">
        Receipt photo or GPay/UPI screenshot — Gemini extracts and categorizes
        it automatically.
      </p>

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={onFileChange}
          className="block w-full text-sm file:mr-4 file:rounded-md file:border-0 file:bg-gray-900 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-gray-700 dark:file:bg-gray-100 dark:file:text-gray-900"
        />

        {previewUrl && (
          // eslint-disable-next-line @next/next/no-img-element -- local blob preview, next/image not applicable
          <img
            src={previewUrl}
            alt="Selected receipt preview"
            className="max-h-80 rounded-lg border border-gray-200 dark:border-gray-700"
          />
        )}

        <button
          type="submit"
          disabled={!file || status === "extracting"}
          className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {status === "extracting" ? "Extracting…" : "Extract & save"}
        </button>
      </form>

      {status === "error" && error && (
        <p className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      )}

      {status === "done" && receipt && (
        <div className="mt-6 rounded-lg border border-gray-200 p-4 dark:border-gray-700">
          <h2 className="font-medium">Saved ✓</h2>
          <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
            <dt className="text-gray-500">Merchant</dt>
            <dd>{receipt.merchant}</dd>
            <dt className="text-gray-500">Date</dt>
            <dd>{receipt.date}</dd>
            <dt className="text-gray-500">Total</dt>
            <dd>₹{receipt.total.toLocaleString("en-IN")}</dd>
            <dt className="text-gray-500">Category</dt>
            <dd>{receipt.category}</dd>
          </dl>
          {receipt.lineItems.length > 0 && (
            <table className="mt-3 w-full text-sm">
              <tbody>
                {receipt.lineItems.map((item, i) => (
                  <tr key={i} className="border-t border-gray-100 dark:border-gray-800">
                    <td className="py-1">{item.name}</td>
                    <td className="py-1 text-right">
                      ₹{item.price.toLocaleString("en-IN")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </main>
  );
}
