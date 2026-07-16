import Link from "next/link";
import CategoryChart from "@/components/CategoryChart";
import { getReceipts } from "@/lib/firestore";
import { formatInr, weekStats } from "@/lib/stats";
import type { StoredReceipt } from "@/lib/types";

// Firestore data changes between requests — never prerender this page
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  let receipts: StoredReceipt[] = [];
  let loadError: string | null = null;
  try {
    receipts = await getReceipts();
  } catch (err) {
    loadError = err instanceof Error ? err.message : "Failed to load receipts";
  }

  const stats = weekStats(receipts);
  const deltaPct =
    stats.prevTotal > 0
      ? ((stats.total - stats.prevTotal) / stats.prevTotal) * 100
      : null;
  const recent = [...receipts]
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .slice(0, 10);

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-10">
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold">This week</h1>
        <p className="text-sm text-gray-500">
          {stats.weekStart} → {stats.weekEnd}
        </p>
      </div>

      {loadError && (
        <div className="mt-6 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200">
          <p className="font-medium">Firestore isn&apos;t reachable yet</p>
          <p className="mt-1">
            Add <code>GEMINI_API_KEY</code> and{" "}
            <code>FIREBASE_SERVICE_ACCOUNT_PATH</code> to <code>.env.local</code>{" "}
            (see README setup). Error: {loadError}
          </p>
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-gray-200 p-5 dark:border-gray-800 sm:col-span-2">
          <p className="text-sm text-gray-500">Total spend</p>
          <p className="mt-1 text-5xl font-semibold tracking-tight">
            {formatInr(stats.total)}
          </p>
          {deltaPct !== null && (
            <p className="mt-2 text-sm text-gray-500">
              {deltaPct >= 0 ? "▲" : "▼"} {Math.abs(deltaPct).toFixed(0)}% vs
              last week ({formatInr(stats.prevTotal)})
            </p>
          )}
        </div>
        <div className="rounded-xl border border-gray-200 p-5 dark:border-gray-800">
          <p className="text-sm text-gray-500">Receipts</p>
          <p className="mt-1 text-5xl font-semibold tracking-tight">
            {stats.count}
          </p>
          <p className="mt-2 text-sm text-gray-500">this week</p>
        </div>
      </div>

      <section className="mt-8">
        <h2 className="text-sm font-medium text-gray-500">Spend by category</h2>
        <div className="mt-3 rounded-xl border border-gray-200 p-4 dark:border-gray-800">
          <CategoryChart data={stats.byCategory} />
        </div>
      </section>

      <section className="mt-8">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-medium text-gray-500">Recent receipts</h2>
          <Link
            href="/upload"
            className="text-sm font-medium text-emerald-600 hover:text-emerald-500"
          >
            + Add receipt
          </Link>
        </div>
        {recent.length === 0 ? (
          <p className="mt-4 text-sm text-gray-500">
            No receipts yet —{" "}
            <Link href="/upload" className="text-emerald-600 underline">
              upload your first one
            </Link>
            .
          </p>
        ) : (
          <table className="mt-3 w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-gray-500 dark:border-gray-800">
                <th className="py-2 font-medium">Merchant</th>
                <th className="py-2 font-medium">Date</th>
                <th className="py-2 font-medium">Category</th>
                <th className="py-2 text-right font-medium">Amount</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((r) => (
                <tr
                  key={r.id}
                  className="border-b border-gray-100 dark:border-gray-900"
                >
                  <td className="py-2">{r.merchant}</td>
                  <td className="py-2 text-gray-500">{r.date}</td>
                  <td className="py-2 text-gray-500">{r.category}</td>
                  <td className="py-2 text-right tabular-nums">
                    {formatInr(r.total)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </main>
  );
}
