import Link from "next/link";
import { formatInr } from "@/lib/stats";
import type { CategoryTotal } from "@/lib/stats";
import { categoryColorVar, dashboardHref } from "@/lib/urls";

/**
 * Labeled bar list (server-rendered). Clicking a row toggles the category
 * filter on the receipts table below, preserving the selected week.
 */
export default function CategoryBars({
  data,
  week,
  activeCat,
}: {
  data: CategoryTotal[];
  week?: string;
  activeCat?: string;
}) {
  if (data.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-gray-500">
        No spending this week.
      </p>
    );
  }

  const max = Math.max(...data.map((d) => d.total));

  return (
    <div className="flex flex-col gap-2.5">
      {data.map(({ category, total }) => {
        const isActive = activeCat === category;
        const dimmed = activeCat !== undefined && !isActive;
        return (
          <Link
            key={category}
            href={dashboardHref({ week, cat: isActive ? undefined : category })}
            title={isActive ? "Clear filter" : `Filter receipts: ${category}`}
            className={`group flex items-center gap-3 ${dimmed ? "opacity-40" : ""}`}
          >
            <span className="w-24 shrink-0 text-[13px] group-hover:underline">
              {category}
            </span>
            <span className="h-2 flex-1 overflow-hidden rounded bg-gray-100 dark:bg-gray-900">
              <span
                className="block h-full rounded"
                style={{
                  width: `${Math.max((total / max) * 100, 2)}%`,
                  background: categoryColorVar(category),
                }}
              />
            </span>
            <span className="w-20 shrink-0 text-right font-mono text-[13px]">
              {formatInr(total)}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
