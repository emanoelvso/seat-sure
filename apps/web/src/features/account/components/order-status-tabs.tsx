import Link from "next/link";
import { paths } from "@/config/paths";
import type { AccountOrderCounts } from "@/features/account/api/find-account-orders";
import {
  type AccountOrdersSearchParams,
  type OrderStatus,
  serializeAccountOrdersSearchParams,
} from "@/features/account/utils/account-orders-search-params";

const TABS: {
  status: OrderStatus;
  label: string;
  count: keyof AccountOrderCounts;
}[] = [
  { status: "all", label: "All", count: "all" },
  { status: "pending", label: "Pending", count: "pending" },
  { status: "canceled", label: "Canceled", count: "cancelled" },
  { status: "completed", label: "Completed", count: "completed" },
];

const TAB_CLASS =
  "flex h-10 w-[127px] items-center justify-center gap-1 p-2 text-base leading-[120%] font-medium";
// Figma's gradient transform puts the primary stop 21.25% below the tab and
// the transparent one at 75.03% of its height, from the bottom.
const TAB_CURRENT_CLASS = `${TAB_CLASS} text-primary bg-[linear-gradient(0deg,var(--color-primary)_-21.25%,rgb(27_27_27/0)_75.03%)] shadow-[inset_0_-1px_0_var(--color-primary)]`;
// SPEC_DEVIATION: Figma colours the other tabs #454545 (neutral-300), below
// WCAG AA on the card. Reason: neutral-200 passes the a11y check.
const TAB_OTHER_CLASS = `${TAB_CLASS} rounded-lg text-neutral-200 hover:text-white`;

interface OrderStatusTabsProps {
  counts: AccountOrderCounts;
  params: AccountOrdersSearchParams;
}

// Status tabs (ORDLIST-02), from Figma "Status filter" 4276:72101: each tab
// links to its status, keeps the sort and drops the page (back to 1).
export function OrderStatusTabs({ counts, params }: OrderStatusTabsProps) {
  return (
    <nav aria-label="Order status">
      <ul className="flex items-center gap-12 pr-4">
        {TABS.map(({ status, label, count }) => {
          const current = status === params.status;
          return (
            <li key={status}>
              <Link
                href={serializeAccountOrdersSearchParams(
                  paths.accountTickets.getHref(),
                  { status, sort: params.sort },
                )}
                aria-current={current ? "page" : undefined}
                className={current ? TAB_CURRENT_CLASS : TAB_OTHER_CLASS}
              >
                {`${label} (${counts[count]})`}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
