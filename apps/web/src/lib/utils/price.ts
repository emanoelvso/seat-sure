export function formatPrice(cents: number, currency = "USD") {
  const fractionDigits = cents % 100 === 0 ? 0 : 2;

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(cents / 100);
}
