/**
 * Exchange rates for foreign-currency receipts, INR per 1 unit.
 * Configure any currency via EXCHANGE_RATE_<ISO> in .env.local
 * (e.g. EXCHANGE_RATE_USD=96.28); built-in fallbacks below keep the app
 * working with zero config. Rates apply at extraction time only — stored
 * receipts keep the total they were imported with.
 */
const DEFAULT_RATES: Record<string, number> = {
  USD: 88,
  EUR: 95,
  GBP: 110,
};

export function exchangeRate(
  currency: string,
  env: NodeJS.ProcessEnv = process.env,
): number | null {
  const iso = currency.toUpperCase();
  const parsed = Number(env[`EXCHANGE_RATE_${iso}`]);
  if (Number.isFinite(parsed) && parsed > 0) return parsed;
  return DEFAULT_RATES[iso] ?? null;
}

/** Amount converted to INR (2dp), or null when no rate is known. */
export function convertToInr(
  amount: number,
  currency: string,
  env: NodeJS.ProcessEnv = process.env,
): number | null {
  const rate = exchangeRate(currency, env);
  return rate === null ? null : Math.round(amount * rate * 100) / 100;
}
