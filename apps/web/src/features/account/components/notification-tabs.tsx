import Link from "next/link";
import { paths } from "@/config/paths";
import type { NotificationCounts } from "@/features/account/api/find-my-notifications";
import {
  type NotificationTab,
  serializeAccountNotificationsSearchParams,
} from "@/features/account/utils/account-notifications-search-params";

const TABS: {
  tab: NotificationTab;
  label: string;
  count: "all" | "unread" | "read";
}[] = [
  { tab: "all", label: "All", count: "all" },
  { tab: "unread", label: "Unread", count: "unread" },
  { tab: "read", label: "Read", count: "read" },
];

const TAB_CLASS =
  "flex h-10 w-[99px] items-center justify-center gap-1 p-2 text-base leading-[120%] font-medium";
// Figma's gradient transform puts the primary stop 21.25% below the tab and
// the transparent one at 75.03% of its height, from the bottom; the fill is
// at 40% opacity (same as OrderStatusTabs).
const TAB_CURRENT_CLASS = `${TAB_CLASS} text-primary bg-[linear-gradient(0deg,rgb(193_79_230/0.4)_-21.25%,rgb(27_27_27/0)_75.03%)] shadow-[inset_0_-1px_0_var(--color-primary)]`;
// SPEC_DEVIATION: Figma colours the other tabs #454545 (neutral-300), below
// WCAG AA on the card. Reason: neutral-200 passes the a11y check.
const TAB_OTHER_CLASS = `${TAB_CLASS} rounded-lg text-neutral-200 hover:text-white`;

interface NotificationTabsProps {
  counts: NotificationCounts;
  tab: NotificationTab;
}

// Notification tabs (NOTIF-06 AC 3-4, 10), from Figma "Status filter /
// Notification" 5011:121413: each tab links to its filter and drops the page
// (back to 1).
export function NotificationTabs({
  counts,
  tab: current,
}: NotificationTabsProps) {
  return (
    <nav aria-label="Notification filter">
      <ul className="flex items-center gap-12">
        {TABS.map(({ tab, label, count }) => (
          <li key={tab}>
            <Link
              href={serializeAccountNotificationsSearchParams(
                paths.accountNotifications.getHref(),
                { tab },
              )}
              aria-current={tab === current ? "page" : undefined}
              className={tab === current ? TAB_CURRENT_CLASS : TAB_OTHER_CLASS}
            >
              {`${label} (${counts[count]})`}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
