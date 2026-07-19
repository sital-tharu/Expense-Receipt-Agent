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

/** Deterministic avatar color for a merchant — same name, same hue. */
export function merchantColor(name: string): string {
  let hash = 0;
  for (const ch of name.trim().toLowerCase()) {
    hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  }
  return `hsl(${hash % 360} 55% 42%)`;
}
