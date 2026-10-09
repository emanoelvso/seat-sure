"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BellIcon,
  CupIcon,
  Logout2Icon,
  SettingsIcon,
  StarFallMinimalisticIcon,
  TicketIcon,
  UserIcon,
  WalletIcon,
} from "@solar-icons/react/outline";
import type { Icon } from "@solar-icons/react/lib/types";
import { BrandLogo } from "@/components/layouts/brand-logo";
import { Button } from "@/components/ui/button";
import { paths } from "@/config/paths";

const ITEM_LAYOUT_CLASS =
  "flex h-10 w-full items-center justify-center px-4 py-2 text-base lg:w-auto";
const ITEM_CLASS = `${ITEM_LAYOUT_CLASS} text-white`;
// Figma's gradient transform scales x by 7.43, so the fill fades out over
// the first 1/7.43 (13.46%) of the item. The 4px left stroke sits inside.
// Minimize=on (4117:57200) has two overlaid fills, each 40% opaque with
// 60%-alpha stops. The second transform spans 1.923% to 27.691%.
const ITEM_CURRENT_CLASS = `${ITEM_LAYOUT_CLASS} text-tint-400 bg-linear-to-r from-primary/60 to-neutral-800/0 to-[13.46%] [box-shadow:inset_4px_0_0_var(--color-tint-400)] max-lg:[background-image:linear-gradient(90deg,color-mix(in_srgb,var(--color-primary)_24%,transparent)_0%,transparent_13.46%),linear-gradient(90deg,color-mix(in_srgb,var(--color-primary)_24%,transparent)_1.923%,transparent_27.691%)]`;

// Card frame: #181319 fill, 1px inside stroke fading from #1D1A1E (58%) to
// #B271C8 at the bottom, and the glow + stars exported from Figma. The
// stroke sits inside the 16px padding in Figma, hence 1px border + 15px.
const UPGRADE_CARD_BACKGROUND = [
  'url("/account/upgrade-plan-background.png") border-box center / 100% 100% no-repeat',
  "linear-gradient(#181319, #181319) padding-box",
  "linear-gradient(180deg, #1d1a1e 58.09%, #b271c8 100%) border-box",
].join(", ");

function ItemContent({ icon: ItemIcon, label }: { icon: Icon; label: string }) {
  return (
    <span className="flex items-center justify-center gap-2 lg:w-40 lg:justify-start">
      <ItemIcon size={24} aria-hidden="true" />
      <span className="hidden lg:inline">{label}</span>
    </span>
  );
}

// An item is current on its own path and on anything below it (an order
// detail keeps "Tickets" current).
function isCurrentPath(pathname: string | null, itemPath: string) {
  return pathname === itemPath || !!pathname?.startsWith(`${itemPath}/`);
}

function NavItem({
  href,
  current,
  icon,
  label,
}: {
  href: string;
  current: boolean;
  icon: Icon;
  label: string;
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      title={label}
      aria-current={current ? "page" : undefined}
      className={current ? ITEM_CURRENT_CLASS : ITEM_CLASS}
    >
      <ItemContent icon={icon} label={label} />
    </Link>
  );
}

// Account shell navigation. SET-01 enables Setting; See plans stays disabled.
export function AccountSidebar({ className = "" }: { className?: string }) {
  const pathname = usePathname();
  const ticketsPath = paths.accountTickets.getHref();
  const personalInfoPath = paths.accountPersonalInfo.getHref();
  const paymentPath = paths.accountPayment.getHref();
  const notificationsPath = paths.accountNotifications.getHref();
  const settingsPath = paths.accountSettings.getHref();

  return (
    <aside
      className={`flex w-24 shrink-0 flex-col rounded-3xl bg-neutral-1000 py-4 lg:w-60 lg:justify-between lg:gap-[46px] lg:overflow-hidden lg:px-4 ${className}`}
    >
      <div className="flex w-full flex-col gap-[35px] lg:gap-8">
        <div className="flex h-[60px] flex-col items-center justify-between lg:h-auto lg:flex-row lg:justify-center lg:gap-2 lg:border-b lg:border-neutral-700 lg:pb-4">
          <BrandLogo className="text-center text-[29px] leading-[37px] max-lg:tracking-tighter lg:grow lg:text-[2.5rem] lg:leading-[1.25]" />
          <hr className="w-16 border-neutral-700 lg:hidden" />
        </div>

        <nav aria-label="Account" className="flex flex-col gap-5 lg:gap-6">
          <ul className="flex flex-col gap-2 lg:items-start">
            <li>
              <NavItem
                href={ticketsPath}
                current={isCurrentPath(pathname, ticketsPath)}
                icon={TicketIcon}
                label="Tickets"
              />
            </li>
            <li>
              <NavItem
                href={personalInfoPath}
                current={isCurrentPath(pathname, personalInfoPath)}
                icon={UserIcon}
                label="Personal info"
              />
            </li>
            <li>
              <NavItem
                href={paymentPath}
                current={isCurrentPath(pathname, paymentPath)}
                icon={WalletIcon}
                label="Payment"
              />
            </li>
            <li>
              <NavItem
                href={notificationsPath}
                current={isCurrentPath(pathname, notificationsPath)}
                icon={BellIcon}
                label="Notification"
              />
            </li>
          </ul>

          <div className="flex flex-col items-center gap-[18px] pt-[3px] lg:items-stretch lg:gap-4 lg:pt-0">
            <hr className="w-16 border-neutral-700 lg:w-auto" />
            <ul className="flex w-full flex-col gap-2 lg:items-start">
              <li>
                <NavItem
                  href={settingsPath}
                  current={isCurrentPath(pathname, settingsPath)}
                  icon={SettingsIcon}
                  label="Setting"
                />
              </li>
              <li>
                <form action="/api/auth/logout" method="post">
                  <button
                    type="submit"
                    aria-label="Log out"
                    title="Log out"
                    className={`${ITEM_CLASS} cursor-pointer`}
                  >
                    <ItemContent icon={Logout2Icon} label="Log out" />
                  </button>
                </form>
              </li>
            </ul>
          </div>
        </nav>
      </div>

      <div
        className="hidden h-[149px] flex-col items-center justify-between gap-4 overflow-hidden rounded-2xl border border-transparent p-[15px] lg:flex"
        style={{ background: UPGRADE_CARD_BACKGROUND }}
      >
        <div className="flex w-full flex-col gap-2">
          <div className="flex items-center gap-2">
            <CupIcon size={24} />
            <p className="text-base leading-[120%] font-bold">
              Upgrade your plan
            </p>
          </div>
          <p className="text-center text-xs text-tint-400">
            Unlock additional features enhanced capabilities
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          aria-disabled="true"
          leftIcon={StarFallMinimalisticIcon}
          iconSize={16}
          className="pointer-events-none border border-primary px-4"
        >
          See plans
        </Button>
      </div>
    </aside>
  );
}
