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
  "flex h-10 items-center justify-center px-4 py-2 text-base";
const ITEM_CLASS = `${ITEM_LAYOUT_CLASS} text-white`;
// Figma's gradient transform scales x by 7.43, so the fill fades out over
// the first 1/7.43 (13.46%) of the item. The 4px left stroke sits inside.
const ITEM_CURRENT_CLASS = `${ITEM_LAYOUT_CLASS} text-tint-400 bg-linear-to-r from-primary/60 to-neutral-800/0 to-[13.46%] shadow-[inset_4px_0_0_var(--color-tint-400)]`;

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
    <span className="flex w-40 items-center gap-2">
      <ItemIcon size={24} />
      {label}
    </span>
  );
}

function DisabledItem({ icon, label }: { icon: Icon; label: string }) {
  return (
    <span role="link" aria-disabled="true" className={ITEM_CLASS}>
      <ItemContent icon={icon} label={label} />
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
      aria-current={current ? "page" : undefined}
      className={current ? ITEM_CURRENT_CLASS : ITEM_CLASS}
    >
      <ItemContent icon={icon} label={label} />
    </Link>
  );
}

// Account shell navigation (ACCT-01, ACCT-02, PROFILE-09, CARD-12): Tickets,
// Personal info, Payment and Log out work; the unbuilt pages and "See plans" render disabled,
// with no href.
export function AccountSidebar({ className = "" }: { className?: string }) {
  const pathname = usePathname();
  const ticketsPath = paths.accountTickets.getHref();
  const personalInfoPath = paths.accountPersonalInfo.getHref();
  const paymentPath = paths.accountPayment.getHref();

  return (
    <aside
      className={`flex w-60 shrink-0 flex-col justify-between gap-[46px] overflow-hidden rounded-3xl bg-neutral-1000 p-4 ${className}`}
    >
      <div className="flex flex-col gap-8">
        <div className="flex items-center justify-center gap-2 border-b border-neutral-700 pb-4">
          <BrandLogo className="grow text-center text-[2.5rem] leading-[1.25]" />
        </div>

        <nav aria-label="Account" className="flex flex-col gap-6">
          <ul className="flex flex-col items-start gap-2">
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
              <DisabledItem icon={BellIcon} label="Notification" />
            </li>
          </ul>

          <div className="flex flex-col gap-4">
            <hr className="border-neutral-700" />
            <ul className="flex flex-col items-start gap-2">
              <li>
                <DisabledItem icon={SettingsIcon} label="Setting" />
              </li>
              <li>
                <form action="/api/auth/logout" method="post">
                  <button
                    type="submit"
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
        className="flex h-[149px] flex-col items-center justify-between gap-4 overflow-hidden rounded-2xl border border-transparent p-[15px]"
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
