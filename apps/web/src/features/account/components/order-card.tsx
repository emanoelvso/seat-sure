import Link from "next/link";
import { AltArrowRightIcon, TicketIcon } from "@solar-icons/react/outline";
import { paths } from "@/config/paths";
import type { AccountOrderSummary } from "@/features/account/api/find-account-orders";
import { OrderStatusBadge } from "@/features/account/components/order-status-badge";
import {
  orderDateLabel,
  ticketCountLabel,
  trackingCode,
} from "@/features/account/utils/account-order-format";
import { formatPrice } from "@/utils/price";

// Pending orders resume checkout; the others open their detail page
// (ORDLIST-03 AC 13-14).
function ticketDetailsHref({ id, status }: AccountOrderSummary) {
  return status === "PENDING"
    ? paths.checkout.getHref(id)
    : paths.accountTicket.getHref(id);
}

// One order of the account list (ORDLIST-03), from Figma "Tickets card"
// 4010:61448. The frame's checkbox is out of scope (no bulk action).
export function OrderCard({ order }: { order: AccountOrderSummary }) {
  return (
    <article className="flex flex-col gap-4 rounded-2xl bg-neutral-900 p-4">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-2">
            <h2 className="text-base font-bold text-white">
              {order.eventName}
            </h2>
            {/* SPEC_DEVIATION: Figma colours the code #454545 (neutral-300),
                1.8:1 on the card and below WCAG AA. Reason: neutral-200, the
                card's secondary text colour, passes the a11y check. */}
            <p className="text-base text-neutral-200">
              {trackingCode(order.id)}
            </p>
          </div>
          <OrderStatusBadge status={order.status} />
        </div>
        <hr className="border-neutral-600" />
      </div>

      <div className="flex items-center justify-between gap-16 text-base leading-[120%]">
        <p className="flex items-center gap-2 font-medium">
          <span className="text-white">Order Date</span>
          <span className="text-neutral-200">
            {orderDateLabel(order.createdAt)}
          </span>
        </p>
        <p className="flex items-center gap-2 font-medium">
          <span className="text-white">Total paid</span>
          <span className="text-neutral-100">
            {formatPrice(order.totalCents, order.currency)}
          </span>
        </p>
        <p className="flex items-center gap-2 text-neutral-200">
          <TicketIcon size={24} className="text-white" aria-hidden />
          {ticketCountLabel(order.quantity)}
        </p>
        <Link
          href={ticketDetailsHref(order)}
          className="inline-flex h-8 items-center gap-2 pl-4 text-primary transition-colors hover:text-tint-400"
        >
          Ticket Details
          <AltArrowRightIcon size={24} aria-hidden />
        </Link>
      </div>
    </article>
  );
}
