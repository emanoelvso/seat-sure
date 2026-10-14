import { formatPrice } from "@/utils/price";

interface OrderSummaryProps {
  order: {
    quantity: number;
    currency: string;
    unitPriceCents: number;
    /** Defaults to quantity * unitPriceCents. */
    subtotalCents?: number;
    unitServiceFeeCents: number;
    unitTaxCents: number;
    totalCents: number;
  };
}

function Line({ term, value }: { term: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg bg-neutral-700 px-2 py-1.5 text-neutral-200">
      <dt>{term}</dt>
      <dd>{value}</dd>
    </div>
  );
}

// PAY-25: per-ticket prices as "{N} * {unit}" plus the order total. When the
// seats cost different prices, unitPriceCents is only the first seat's, so
// the Ticket price line shows the subtotal instead (PRICE-13).
export function OrderSummary({ order }: OrderSummaryProps) {
  const { quantity, currency } = order;
  const perTicket = (cents: number) =>
    `${quantity} * ${formatPrice(cents, currency)}`;

  const subtotalCents = order.subtotalCents ?? quantity * order.unitPriceCents;
  const ticketPrice =
    subtotalCents === quantity * order.unitPriceCents
      ? perTicket(order.unitPriceCents)
      : formatPrice(subtotalCents, currency);

  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-xl font-bold text-white">Order summary</h2>
      <dl className="flex flex-col gap-2 rounded-2xl bg-neutral-800 p-4">
        <Line term="Ticket price" value={ticketPrice} />
        <Line term="Service fee" value={perTicket(order.unitServiceFeeCents)} />
        <Line term="Tax" value={perTicket(order.unitTaxCents)} />
        <div className="flex items-center justify-between gap-4 px-2 py-1.5 font-bold text-white">
          <dt>Total price</dt>
          <dd>{formatPrice(order.totalCents, currency)}</dd>
        </div>
      </dl>
    </section>
  );
}
