import type { Category } from "./types";

/** Dashboard URL preserving week/category filter params. */
export function dashboardHref(params: {
  week?: string;
  cat?: Category | string;
}): string {
  const q = new URLSearchParams();
  if (params.week) q.set("week", params.week);
  if (params.cat) q.set("cat", String(params.cat));
  const s = q.toString();
  return s ? `/?${s}` : "/";
}

/** CSS custom property carrying a category's color (see globals.css). */
export function categoryColorVar(category: string): string {
  return `var(--cat-${category.toLowerCase()})`;
}
