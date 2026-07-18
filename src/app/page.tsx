import Link from "next/link";
import CategoryBars from "@/components/CategoryBars";
import DeleteReceipt from "@/components/DeleteReceipt";
import { getReceipts } from "@/lib/firestore";
import { isOwnerProtected } from "@/lib/owner";
import {
  addDays,
  categoryAnomaly,
  formatInr,
  formatShortDate,
  isoDate,
  mondayOf,
  resolveWeekAnchor,
  weekStats,
} from "@/lib/stats";
import { detectSubscriptions, monthlyTotal } from "@/lib/subscriptions";
import { CATEGORIES, type Category, type StoredReceipt } from "@/lib/types";
import { categoryColorVar, dashboardHref } from "@/lib/urls";

// Firestore data changes between requests — never prerender this page
export const dynamic = "force-dynamic";

function provenance(r: StoredReceipt): string {
  if (r.seeded) return "Demo";
  return r.source === "email" ? "Email" : "Photo";
}

function CategoryBadge({ category }: { category: Category }) {
  const color = categoryColorVar(category);
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px]"
      style={{ background: `color-mix(in srgb, ${color} 15%, transparent)` }}
    >
      <span
        className="h-1.5 w-1.5 shrink-0 rounded-full"
        style={{ background: color }}
        aria-hidden
      />
      {category}
    </span>
  );
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  const weekRaw = Array.isArray(sp.week) ? sp.week[0] : sp.week;
  const catRaw = Array.isArray(sp.cat) ? sp.cat[0] : sp.cat;
  const activeCat = (CATEGORIES as readonly string[]).includes(catRaw ?? "")
    ? (catRaw as Category)
    : undefined;

  const anchor = resolveWeekAnchor(weekRaw);
  const weekStart = isoDate(anchor);
  const isCurrentWeek = weekStart === isoDate(mondayOf(new Date()));
  // omit ?week= for the current week so the default URL stays clean
  const weekParam = isCurrentWeek ? undefined : weekStart;
  const prevWeek = isoDate(addDays(anchor, -7));
  const nextWeek = addDays(anchor, 7);
  const nextIsCurrent = isoDate(nextWeek) === isoDate(mondayOf(new Date()));

  let receipts: StoredReceipt[] = [];
  let loadError: string | null = null;
  try {
    receipts = await getReceipts();
  } catch (err) {
    loadError = err instanceof Error ? err.message : "Failed to load receipts";
  }

  const stats = weekStats(receipts, anchor);
  const deltaPct =
    stats.prevTotal > 0
      ? ((stats.total - stats.prevTotal) / stats.prevTotal) * 100
      : null;
  const anomaly = categoryAnomaly(receipts, anchor);
  // subscription streaks span months — always detected over ALL receipts
  const subscriptions = detectSubscriptions(receipts);
  const subsTotal = monthlyTotal(subscriptions);

  const weekReceipts = receipts
    .filter((r) => r.date >= stats.weekStart && r.date <= stats.weekEnd)
    .filter((r) => !activeCat || r.category === activeCat)
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .slice(0, 15);

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-10">
      {/* Header: week navigator + subscriptions total */}
      <div className="flex items-end justify-between">
        <div>
          <p className="font-mono text-xs tracking-widest text-gray-400">
            WEEK OF
          </p>
          <div className="mt-0.5 flex items-center gap-2">
            <Link
              href={dashboardHref({ week: prevWeek, cat: activeCat })}
              aria-label="Previous week"
              className="rounded px-1 text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
            >
              ‹
            </Link>
            <h1 className="text-[15px] font-medium">
              {formatShortDate(stats.weekStart)} –{" "}
              {formatShortDate(stats.weekEnd)}
            </h1>
            {!isCurrentWeek && (
              <Link
                href={dashboardHref({
                  week: nextIsCurrent ? undefined : isoDate(nextWeek),
                  cat: activeCat,
                })}
                aria-label="Next week"
                className="rounded px-1 text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
              >
                ›
              </Link>
            )}
          </div>
        </div>
        {subscriptions.length > 0 && (
          <div className="text-right">
            <p className="text-xs text-gray-400">Subscriptions · monthly total</p>
            <p className="mt-0.5 font-mono text-[15px] font-medium">
              {formatInr(subsTotal)}/mo
            </p>
          </div>
        )}
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

      {/* Stat tiles */}
      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-[1.3fr_1fr]">
        <div className="rounded-xl bg-gray-50 p-4 dark:bg-gray-900/60">
          <p className="text-[13px] text-gray-500">Total spend · this week</p>
          <p className="mt-1 font-mono text-3xl font-medium tracking-tight">
            {formatInr(stats.total)}
          </p>
          {deltaPct !== null && (
            <p
              className={`mt-1.5 text-xs ${
                deltaPct <= 0
                  ? "text-emerald-700 dark:text-emerald-400"
                  : "text-gray-500"
              }`}
            >
              {deltaPct <= 0 ? "↓" : "↑"} {Math.abs(deltaPct).toFixed(0)}% vs
              last week ({formatInr(stats.prevTotal)})
            </p>
          )}
        </div>
        <div className="flex flex-col justify-center rounded-xl bg-gray-50 p-4 dark:bg-gray-900/60">
          <p className="text-[13px] text-gray-500">Receipts</p>
          <p className="mt-1 font-mono text-3xl font-medium tracking-tight">
            {stats.count}
          </p>
        </div>
      </div>

      {/* Anomaly callout */}
      {anomaly && (
        <section className="mt-6">
          <h2 className="text-[13px] text-gray-500">Anomaly detected</h2>
          <div className="mt-2 rounded-lg bg-amber-50 px-3.5 py-2.5 dark:bg-amber-950/60">
            <div className="flex items-center gap-2">
              <span aria-hidden>⚠️</span>
              <p className="text-[13px] text-amber-900 dark:text-amber-200">
                {anomaly.category} spend is{" "}
                {anomaly.ratio >= 2
                  ? `${anomaly.ratio}× your usual`
                  : `${anomaly.pctAbove}% above your usual`}{" "}
                weekly average
              </p>
            </div>
            <p className="mt-1 pl-6 text-xs text-amber-800/80 dark:text-amber-300/80">
              {formatInr(anomaly.weekTotal)} this week vs{" "}
              {formatInr(anomaly.weeklyAvg)}/week average over the previous{" "}
              {anomaly.lookbackWeeks} weeks
            </p>
            <details className="mt-1.5 pl-6">
              <summary className="cursor-pointer text-xs text-amber-700 hover:underline dark:text-amber-400">
                How is this calculated?
              </summary>
              <div className="mt-1.5 space-y-1 text-xs text-amber-800/90 dark:text-amber-300/90">
                <p className="font-mono">
                  {formatInr(anomaly.weekTotal)} ÷ {formatInr(anomaly.weeklyAvg)}{" "}
                  = {anomaly.ratio}× your usual ({anomaly.pctAbove}% above)
                </p>
                <p>
                  The weekly average is your total {anomaly.category} spend over
                  the {anomaly.lookbackWeeks} weeks before this one, divided by{" "}
                  {anomaly.lookbackWeeks}. Categories averaging under{" "}
                  {formatInr(anomaly.minAvg)}/week are never flagged.
                </p>
              </div>
            </details>
          </div>
        </section>
      )}

      {/* Recurring subscriptions */}
      {subscriptions.length > 0 && (
        <section className="mt-6">
          <h2 className="text-[13px] text-gray-500">
            Recurring subscriptions · monthly
          </h2>
          <ul className="mt-2 flex flex-col gap-2">
            {subscriptions.map((s) => (
              <li
                key={s.merchant}
                className="flex items-center justify-between rounded-lg bg-gray-50 px-3.5 py-2.5 dark:bg-gray-900/60"
              >
                <div className="flex items-center gap-2.5">
                  <span aria-hidden className="text-gray-400">
                    🔁
                  </span>
                  <div>
                    <p className="text-sm font-medium">{s.merchant}</p>
                    <p className="mt-0.5 text-xs text-gray-500">
                      {s.occurrences} months in a row · last charged{" "}
                      {formatShortDate(s.lastDate)}
                    </p>
                  </div>
                </div>
                <p className="font-mono text-sm font-medium">
                  {formatInr(s.monthlyAmount)}/mo
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Spend by category */}
      <section className="mt-6">
        <h2 className="text-[13px] text-gray-500">
          Spend by category · this week
        </h2>
        <div className="mt-3">
          <CategoryBars
            data={stats.byCategory}
            week={weekParam}
            activeCat={activeCat}
          />
        </div>
      </section>

      {/* Receipts table */}
      <section className="mt-8">
        <div className="flex items-baseline justify-between">
          <div className="flex items-baseline gap-2">
            <h2 className="text-[13px] text-gray-500">Receipts this week</h2>
            {activeCat && (
              <Link
                href={dashboardHref({ week: weekParam })}
                className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-2 py-0.5 text-[11px] text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                {activeCat} ✕
              </Link>
            )}
          </div>
          <Link
            href="/upload"
            className="text-[13px] font-medium text-emerald-600 hover:text-emerald-500"
          >
            + Add receipt
          </Link>
        </div>

        {weekReceipts.length === 0 ? (
          <p className="mt-4 text-sm text-gray-500">
            {activeCat ? (
              <>
                No {activeCat} receipts this week —{" "}
                <Link
                  href={dashboardHref({ week: weekParam })}
                  className="text-emerald-600 underline"
                >
                  clear the filter
                </Link>
                .
              </>
            ) : (
              <>
                No receipts this week —{" "}
                <Link href="/upload" className="text-emerald-600 underline">
                  upload one
                </Link>
                .
              </>
            )}
          </p>
        ) : (
          <div className="mt-3 overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-800">
            <table className="w-full min-w-[540px] text-[13px]">
              <thead>
                <tr className="bg-gray-50 text-left text-xs text-gray-500 dark:bg-gray-900/60">
                  <th className="px-3.5 py-2 font-medium">Merchant</th>
                  <th className="px-3.5 py-2 font-medium">Date</th>
                  <th className="px-3.5 py-2 font-medium">Category</th>
                  <th className="px-3.5 py-2 font-medium">Source</th>
                  <th className="px-3.5 py-2 text-right font-medium">Amount</th>
                  <th className="w-0 px-1.5 py-2" aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {weekReceipts.map((r) => (
                  <tr
                    key={r.id}
                    className="border-t border-gray-100 dark:border-gray-900"
                  >
                    <td className="px-3.5 py-2.5" title={r.emailSubject}>
                      {r.merchant}
                      {r.confidence === "low" && (
                        <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                          Needs review
                        </span>
                      )}
                    </td>
                    <td className="px-3.5 py-2.5 text-gray-500">
                      {formatShortDate(r.date)}
                    </td>
                    <td className="px-3.5 py-2.5">
                      <CategoryBadge category={r.category} />
                    </td>
                    <td className="px-3.5 py-2.5 whitespace-nowrap text-gray-500">
                      {provenance(r)}
                      {r.hasImage && (
                        <a
                          href={`/api/receipts/${r.id}/image`}
                          target="_blank"
                          rel="noopener"
                          title="View the original receipt image"
                          className="ml-1.5 text-emerald-600 hover:underline"
                        >
                          view
                        </a>
                      )}
                      {r.source === "email" && r.emailMessageId && (
                        <a
                          href={`https://mail.google.com/mail/u/0/#all/${r.emailMessageId}`}
                          target="_blank"
                          rel="noopener"
                          title={`Open in Gmail: ${r.emailSubject ?? ""}`}
                          className="ml-1.5 text-emerald-600 hover:underline"
                        >
                          mail
                        </a>
                      )}
                    </td>
                    <td className="px-3.5 py-2.5 text-right font-mono tabular-nums">
                      {formatInr(r.total)}
                      {r.originalCurrency && r.originalAmount != null && (
                        <div
                          className="text-[11px] text-gray-500"
                          title="Original amount — ₹ value is an approximate conversion"
                        >
                          {r.originalCurrency} {r.originalAmount}
                        </div>
                      )}
                    </td>
                    <td className="px-1.5 py-2.5 text-center">
                      <DeleteReceipt
                        id={r.id}
                        merchant={r.merchant}
                        protectionEnabled={isOwnerProtected()}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
