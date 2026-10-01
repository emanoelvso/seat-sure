import { Lobster } from "next/font/google";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { UsaIcon } from "@/components/icons/usa-icon";
import { AltArrowDownIcon, BellIcon } from "@solar-icons/react/outline";
import Image from "next/image";
import { Input } from "@/components/ui/input";
import { paths } from "@/config/paths";
import { EVENT_TYPE_LABELS, type EventType } from "@/utils/event-types";
const lobster = Lobster({
  weight: "400",
  subsets: ["latin"],
});

const NAV_EVENT_TYPES: EventType[] = ["SHOW", "CONCERT", "SPORT", "FESTIVAL"];

const NAV_ITEMS = [
  { label: "Home", href: paths.home.getHref() },
  ...NAV_EVENT_TYPES.map((type) => ({
    label: EVENT_TYPE_LABELS[type],
    href: paths.events.getHref(type),
  })),
];

interface HeaderProps {
  avatarUrl?: string;
  searchMode?: boolean;
  className?: string;
  transparent?: boolean;
}

export function Header({
  avatarUrl,
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
          <Link
            href={paths.home.getHref()}
            className={`${lobster.className} text-[2.5rem] text-primary`}
          >
            SeatSure
          </Link>

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
        {avatarUrl && (
          <div
            className={
              searchMode
                ? "bg-neutral-700 rounded-full w-10 h-10 overflow-hidden shrink-0 flex items-center justify-center"
                : ""
            }
          >
            <BellIcon />
          </div>
        )}
        <button className="flex items-center gap-1">
          <UsaIcon />
          <span>Eng</span>
          <AltArrowDownIcon />
        </button>
        {avatarUrl ? (
          <div className="w-10 h-10 rounded-full overflow-hidden shrink-0">
            <Image
              className="object-cover w-full h-full"
              src={avatarUrl}
              alt="Profile Avatar"
              width={40}
              height={40}
            />
          </div>
        ) : (
          <Button>Signup</Button>
        )}
      </div>
    </header>
  );
}
