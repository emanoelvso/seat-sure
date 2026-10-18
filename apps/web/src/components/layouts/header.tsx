import Link from "next/link";
import { BrandLogo } from "@/components/layouts/brand-logo";
import { HeaderAccount } from "@/components/layouts/header-account";
import { Input } from "@/components/ui/input";
import { paths } from "@/config/paths";
import { EVENT_TYPE_LABELS, type EventType } from "@/utils/event-types";

const NAV_EVENT_TYPES: EventType[] = ["SHOW", "CONCERT", "SPORT", "FESTIVAL"];

const NAV_ITEMS = [
  { label: "Home", href: paths.home.getHref() },
  ...NAV_EVENT_TYPES.map((type) => ({
    label: EVENT_TYPE_LABELS[type],
    href: paths.events.getHref(type),
  })),
];

interface HeaderProps {
  searchMode?: boolean;
  className?: string;
  transparent?: boolean;
}

export function Header({
  searchMode = false,
  className,
  transparent = false,
}: HeaderProps) {
  return (
    <header
      className={`py-4 px-27 ${transparent ? "relative z-20" : "mb-35"}  flex items-center justify-between ${searchMode && "bg-neutral-1000 py-5 px-6 rounded-xl"} ${className}`}
    >
      {searchMode ? (
        <Input />
      ) : (
        <>
          <BrandLogo className="text-[2.5rem]" />

          <nav>
            <ul className="flex gap-10">
              {NAV_ITEMS.map(({ label, href }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="text-neutral-200 hover:text-white transition duration-700 px-4 py-1.5 rounded-full relative group isolate"
                  >
                    <div className="absolute -bottom-5 left-1/2 -translate-x-1/2  duration-700 w-8 h-6 blur-[12px] bg-zinc-700 opacity-0 group-hover:opacity-100 transition -z-10"></div>
                    <div className="absolute -top-5 left-1/2 -translate-x-1/2  duration-700 w-8 h-6 blur-[12px] bg-zinc-700 opacity-0 group-hover:opacity-100 transition -z-10"></div>
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </>
      )}
      <div className="flex items-center gap-3">
        <HeaderAccount />
      </div>
    </header>
  );
}
