import { env } from "@/config/env";
import { formatEventDay, formatEventTime } from "@/utils/event-format";

// Pure display helpers for the account order list and detail (ORDLIST-03,
// ORDDETAIL-01, ORDDETAIL-02).

const NO_VALUE = "—";

interface OrderSeat {
  row: string;
  number: string;
}

interface PaymentCard {
  brand: string;
  last4: string;
}

const numeric = (a: string, b: string) =>
  a.localeCompare(b, undefined, { numeric: true });

// "#" + the first 8 characters of the order id, uppercased.
export function trackingCode(orderId: string): string {
  return `# ${orderId.slice(0, 8).toUpperCase()}`;
}

export function ticketCountLabel(quantity: number): string {
  return quantity === 1 ? "1 ticket" : `${quantity} tickets`;
}

// "Tue 30 Sep • 7:30 PM" in the app time zone.
export function orderDateLabel(iso: string, timeZone = env.timeZone): string {
  return `${formatEventDay(iso, timeZone)} • ${formatEventTime(iso, timeZone)}`;
}

// "VIP • Row 7 • Seats 07, 10": one "Row • Seats" group per row, rows and
// seat numbers in ascending order.
export function selectedSeatLabel(
  ticketTypeName: string,
  items: OrderSeat[],
): string {
  const numbersByRow = new Map<string, string[]>();
  for (const { row, number } of items) {
    numbersByRow.set(row, [...(numbersByRow.get(row) ?? []), number]);
  }

  const groups = [...numbersByRow.keys()].sort(numeric).map((row) => {
    const numbers = numbersByRow.get(row)!.sort(numeric);
    return `Row ${row} • Seats ${numbers.join(", ")}`;
  });

  return [ticketTypeName, ...groups].join(" • ");
}

// SPEC_DEVIATION: the spec's literal example is `Visa •••• 4242` from a brand
// stored as "Visa". Billing stores the brand lowercase ("visa"), so the first
// letter is capitalised here to read `Visa •••• 4242` from real data.
// Reason: the API returns cardBrand exactly as stored.
export function paymentMethodLabel(card: PaymentCard | null): string {
  if (!card) return NO_VALUE;
  const brand = card.brand.charAt(0).toUpperCase() + card.brand.slice(1);
  return `${brand} •••• ${card.last4}`;
}
