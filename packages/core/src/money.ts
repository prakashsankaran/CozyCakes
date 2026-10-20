/** Money is always integer minor units (paise for INR); see data-model.md. */
export type Minor = number;

export function assertMinor(amount: number): Minor {
  if (!Number.isSafeInteger(amount)) throw new RangeError(`Not an integer minor amount: ${amount}`);
  return amount;
}

const formatters = new Map<string, Intl.NumberFormat>();

/** Formats minor units for display, dropping ".00" for whole amounts (₹1,250 not ₹1,250.00). */
export function formatMoney(amount: Minor, currency = "INR", locale = "en-IN"): string {
  const whole = amount % 100 === 0;
  const key = `${locale}:${currency}:${whole}`;
  let fmt = formatters.get(key);
  if (!fmt) {
    fmt = new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      minimumFractionDigits: whole ? 0 : 2,
      maximumFractionDigits: whole ? 0 : 2,
    });
    formatters.set(key, fmt);
  }
  return fmt.format(amount / 100);
}
