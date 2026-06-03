export type PrizeCurrency = "PHP" | "USD";

export const PRIZE_CURRENCIES: {
  code: PrizeCurrency;
  label: string;
  symbol: string;
}[] = [
  { code: "PHP", label: "PHP · Peso", symbol: "₱" },
  { code: "USD", label: "USD · Dollar", symbol: "$" },
];

export function getCurrencySymbol(currency: PrizeCurrency): string {
  return PRIZE_CURRENCIES.find((c) => c.code === currency)?.symbol ?? "$";
}

/** Strip non-digits from user input. */
export function parsePrizeDigits(raw: string): string {
  return raw.replace(/\D/g, "");
}

/** Format digit string with thousands separators (no symbol). */
export function formatPrizeDigits(digits: string): string {
  if (!digits) return "";
  const n = Number.parseInt(digits, 10);
  if (Number.isNaN(n)) return "";
  return new Intl.NumberFormat("en-US").format(n);
}

export function prizeDigitsToNumber(digits: string): number {
  if (!digits) return 0;
  return Number.parseInt(digits, 10);
}

export function formatPrizePool(digits: string, currency: PrizeCurrency): string {
  const amount = prizeDigitsToNumber(digits);
  if (amount <= 0) return "";
  const symbol = getCurrencySymbol(currency);
  return `${symbol}${formatPrizeDigits(digits)}`;
}

/** Parse stored display string (e.g. ₱10,000) into currency + digits for forms. */
export function parseStoredPrizePool(
  prizePool: string,
): { currency: PrizeCurrency; digits: string } {
  const trimmed = prizePool.trim();
  const currency: PrizeCurrency = trimmed.startsWith("$") ? "USD" : "PHP";
  const digits = parsePrizeDigits(trimmed);
  return { currency, digits };
}
