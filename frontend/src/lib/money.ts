// Money arrives from the API as decimal strings ("26.00"). Intl.NumberFormat formats the string directly
// (string input keeps full precision), so no value is ever converted to a JS number or computed here.
type Currency = "NZD" | "USD";

const formatters = new Map<string, Intl.NumberFormat>();

function formatterFor(locale: string, currency: Currency) {
  const key = `${locale}|${currency}`;
  let f = formatters.get(key);
  if (!f) {
    f = new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      currencyDisplay: "code",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    formatters.set(key, f);
  }
  return f;
}

/**
 * Pads what a customer typed ("250", "250.5") to the API's two-decimal money string ("250.00", "250.50").
 * Pure string handling, no arithmetic. Returns null when the input is not a plain non-negative amount.
 */
export function toMoneyString(input: string): string | null {
  const m = /^(\d+)(?:\.(\d{1,2}))?$/.exec(input.trim());
  if (!m) return null;
  const whole = m[1].replace(/^0+(?=\d)/, "");
  return `${whole}.${(m[2] ?? "").padEnd(2, "0")}`;
}

export function formatMoney(amount: string, currency: Currency, locale = "en-NZ"): string {
  if (!/^-?\d+\.\d{2}$/.test(amount)) throw new Error(`Not a money string: ${amount}`);
  // The string overload of format() is standard (Intl.NumberFormat v3); the cast only satisfies older lib typings.
  return formatterFor(locale, currency).format(amount as unknown as number);
}
