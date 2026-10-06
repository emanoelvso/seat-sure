import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeftIcon,
  CalendarIcon,
  ChairIcon,
  DownloadMinimalisticIcon,
  HistoryIcon,
  MapPointWaveIcon,
} from "@solar-icons/react/outline";
import type { Icon } from "@solar-icons/react/lib/types";
import { paths } from "@/config/paths";
import type { AccountOrderDetail } from "@/features/account/api/find-account-order";
import { OrderQrCode } from "@/features/account/components/order-qr-code";
import { OrderStatusBadge } from "@/features/account/components/order-status-badge";
import {
  orderDateLabel,
  paymentMethodLabel,
  selectedSeatLabel,
  ticketCountLabel,
  trackingCode,
} from "@/features/account/utils/account-order-format";
import type { MeQuery } from "@/types/__generated__/graphql";
import { formatPrice } from "@/utils/price";

const NO_VALUE = "—";

const LABEL_CLASS = "text-lg leading-[1.2] font-medium text-white";
const VALUE_CLASS = "text-base leading-[1.2] text-neutral-100";
const SECTION_TITLE_CLASS = "text-2xl leading-[1.2] font-bold text-tint-400";

// A label over its value (Figma: 8px apart), as a one-pair list.
function Field({
  label,
  icon: FieldIcon,
  children,
  className = "",
}: {
  label: string;
  icon?: Icon;
  children: ReactNode;
  className?: string;
}) {
  return (
    <dl className={`flex flex-col gap-2 ${className}`}>
      <dt className={`flex items-center gap-2 ${LABEL_CLASS}`}>
        {FieldIcon && <FieldIcon size={24} aria-hidden />}
        {label}
      </dt>
      <dd className={VALUE_CLASS}>{children}</dd>
    </dl>
  );
}

// "Event Details" / "Payment": the title, then a rule to the right edge.
function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center gap-5">
      <h2 className={SECTION_TITLE_CLASS}>{children}</h2>
      <hr className="grow border-neutral-600" />
    </div>
  );
}

function VerticalRule() {
  return <div aria-hidden className="h-[179px] w-px bg-neutral-600" />;
}

interface AccountOrderDetailViewProps {
  order: AccountOrderDetail;
  user: Pick<MeQuery["me"], "firstName" | "lastName">;
}

// The order detail page body (ORDDETAIL-01..03), from Figma 5844:77266 (back
// link) and 5011:121570 (card). The back link sits 20px below the header
// where the layout leaves 22px, hence -mt-0.5. Refund and download are not
// built, so their buttons keep the frame's look but are disabled.
export function AccountOrderDetailView({
  order,
  user,
}: AccountOrderDetailViewProps) {
  const { event } = order;
  const completed = order.status === "COMPLETED";

  return (
    <div className="-mt-0.5 flex flex-col items-start gap-5">
      <Link
        href={paths.accountTickets.getHref()}
        className="inline-flex h-8 items-center gap-2 rounded-lg px-4 py-[3px] text-base leading-[1.2] text-white transition-colors hover:text-tint-400"
      >
        <ArrowLeftIcon size={24} aria-hidden />
        Back to ticket
      </Link>

      <article className="flex min-h-[745px] w-full flex-col justify-between gap-8 rounded-3xl bg-neutral-1000 px-10 py-8">
        <div className="flex items-center gap-10">
          <div className="flex shrink-0 flex-col items-center gap-2">
            <div className="relative h-[182px] w-[180px] overflow-hidden rounded-[18px]">
              <Image
                src={event.coverImage}
                alt=""
                fill
                sizes="180px"
                className="object-cover"
              />
            </div>
            <h1 className="text-xl leading-[1.2] font-bold text-white">
              {event.name}
            </h1>
          </div>

          <div className="flex grow flex-col justify-center gap-12">
            <div className="flex items-center justify-between gap-12">
              <h2 className={SECTION_TITLE_CLASS}>Order Details</h2>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled
                  className="inline-flex h-10 w-[187px] items-center justify-center gap-2 rounded-lg bg-neutral-800 px-4 py-[5px] text-base leading-[1.2] text-neutral-100 disabled:cursor-not-allowed"
                >
                  <HistoryIcon size={24} aria-hidden />
                  Refound ticket
                </button>
                <button
                  type="button"
                  disabled
                  className="inline-flex h-10 w-[202px] items-center justify-center gap-2 rounded-lg border border-[#8e24aa] px-4 py-[5px] text-base leading-[1.2] text-primary disabled:cursor-not-allowed"
                >
                  <DownloadMinimalisticIcon size={24} aria-hidden />
                  Download ticket
                </button>
              </div>
            </div>

            <div className="flex h-[88px] items-center justify-between gap-[90px]">
              <Field label="Order Tracking Code">
                {trackingCode(order.id)}
              </Field>
              <Field label="Order Date" className="w-[220px]">
                {orderDateLabel(order.createdAt)}
              </Field>
              <OrderStatusBadge status={order.status} />
            </div>
          </div>
        </div>

        <section className="flex flex-col gap-8">
          <SectionTitle>Event Details</SectionTitle>
          <div className="flex items-center justify-between gap-12">
            <Field
              label="Location"
              icon={MapPointWaveIcon}
              className="w-[213px]"
            >
              <span className="block text-lg">{event.venue}</span>
              <span className="mt-2 block text-sm text-neutral-200">
                {event.city}, {event.country}
              </span>
            </Field>
            <Field label="Event Date" icon={CalendarIcon}>
              <span className="font-medium text-neutral-200">
                {orderDateLabel(event.startAt)}
              </span>
            </Field>
            <Field label="Selected Seat" icon={ChairIcon}>
              {selectedSeatLabel(order.ticketTypeName, order.items)}
            </Field>
          </div>
        </section>

        <section className="flex flex-col gap-8">
          <SectionTitle>Payment</SectionTitle>
          <div className="flex items-center justify-between pr-[29px]">
            <div className="flex flex-col gap-10">
              <Field label="Ticket count">
                {ticketCountLabel(order.quantity)}
              </Field>
              <Field label="Paid by">
                <span className="font-medium">
                  {user.firstName} {user.lastName}
                </span>
              </Field>
            </div>
            <VerticalRule />
            <div className="flex w-[126px] flex-col gap-10">
              <Field label="Transaction costs" className="whitespace-nowrap">
                {formatPrice(
                  order.serviceFeeCents + order.taxCents,
                  order.currency,
                )}
              </Field>
              <Field label="Payment method" className="whitespace-nowrap">
                <span className="font-medium">
                  {paymentMethodLabel(order.paymentCard)}
                </span>
              </Field>
            </div>
            <VerticalRule />
            <div className="flex flex-col gap-10">
              <Field label="Total paid">
                <span className="font-medium">
                  {formatPrice(order.totalCents, order.currency)}
                </span>
              </Field>
              <Field label="Transaction ID">
                {order.paymentId ?? NO_VALUE}
              </Field>
            </div>
            {completed && (
              <>
                <VerticalRule />
                <OrderQrCode orderId={order.id} />
              </>
            )}
          </div>
        </section>
      </article>
    </div>
  );
}
