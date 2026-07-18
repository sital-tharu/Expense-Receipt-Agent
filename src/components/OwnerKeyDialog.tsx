"use client";

import { useEffect, useState } from "react";
import { registerOwnerKeyDialog } from "@/lib/owner-key";

/**
 * App-styled replacement for window.prompt (unsupported in some browsers).
 * Mounted once in the root layout; opened via obtainOwnerKey().
 */
export default function OwnerKeyDialog() {
  const [resolver, setResolver] = useState<{
    resolve: (key: string | null) => void;
  } | null>(null);
  const [value, setValue] = useState("");

  useEffect(() => {
    registerOwnerKeyDialog((resolve) => {
      setValue("");
      setResolver({ resolve });
    });
    return () => registerOwnerKeyDialog(null);
  }, []);

  if (!resolver) return null;

  function close(key: string | null) {
    resolver?.resolve(key);
    setResolver(null);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={() => close(null)}
    >
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault();
          close(value.trim() || null);
        }}
        className="w-full max-w-xs rounded-xl border border-gray-200 bg-white p-4 shadow-xl dark:border-gray-700 dark:bg-gray-950"
      >
        <h2 className="text-sm font-semibold">Owner passcode</h2>
        <p className="mt-1 text-xs text-gray-500">
          Only the dashboard owner has this — visitors can keep exploring
          without it.
        </p>
        <input
          autoFocus
          type="password"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Passcode"
          className="mt-3 w-full rounded-md border border-gray-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-emerald-500 dark:border-gray-700"
        />
        <div className="mt-3 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => close(null)}
            className="rounded-md px-3 py-1.5 text-[13px] text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="rounded-md bg-emerald-600 px-3.5 py-1.5 text-[13px] font-medium text-white hover:bg-emerald-500"
          >
            Unlock
          </button>
        </div>
      </form>
    </div>
  );
}
