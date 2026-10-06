"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { BellIcon, Logout2Icon, TicketIcon } from "@solar-icons/react/outline";
import { paths } from "@/config/paths";
import { getInitials } from "@/utils/initials";

const MENU_ITEM_CLASS =
  "flex h-10 items-center gap-2 rounded-lg px-3 text-base text-white hover:bg-neutral-700 focus-visible:bg-neutral-700";

interface SessionUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
}

interface SessionResponse {
  user: SessionUser | null;
}

// Fetches the signed-in state on mount (AUTH-48) and renders the right
// header slot for it: a loading placeholder, a Signup link carrying the
// current page as redirectTo (AUTH-40), or the bell + avatar/initials
// (AUTH-42, AUTH-43). The avatar links to the account tickets (ACCT-02) and
// opens a small menu on hover or keyboard focus with the same link and a
// Log out button (the same POST the account sidebar uses).
export function HeaderAccount() {
  const [session, setSession] = useState<SessionResponse | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    fetch(paths.session.getHref())
      .then((response) => response.json() as Promise<SessionResponse>)
      .then((data) => {
        if (!cancelled) setSession(data);
      })
      .catch(() => {
        if (!cancelled) setSession({ user: null });
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (session === null) {
    return <div className="w-10 h-10" />;
  }

  if (!session.user) {
    const redirectTo = `${window.location.pathname}${window.location.search}`;
    return (
      <Link
        href={paths.signup.getHref(redirectTo)}
        className="inline-flex items-center justify-center h-10 px-4 rounded-lg bg-primary text-white"
      >
        Signup
      </Link>
    );
  }

  const { user } = session;

  return (
    <>
      <div className="w-10 h-10 rounded-full bg-neutral-700 flex items-center justify-center shrink-0">
        <BellIcon />
      </div>
      <div
        className="relative shrink-0"
        onMouseEnter={() => setMenuOpen(true)}
        onMouseLeave={() => setMenuOpen(false)}
        onFocus={() => setMenuOpen(true)}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) {
            setMenuOpen(false);
          }
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape") setMenuOpen(false);
        }}
      >
        <Link
          href={paths.accountTickets.getHref()}
          aria-label="My account"
          className="block w-10 h-10 rounded-full overflow-hidden"
        >
          {user.avatarUrl ? (
            <Image
              className="object-cover w-full h-full"
              src={user.avatarUrl}
              alt="Profile Avatar"
              width={40}
              height={40}
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-neutral-700 flex items-center justify-center text-white text-sm font-medium">
              {getInitials(user.firstName, user.lastName, user.email)}
            </div>
          )}
        </Link>
        {menuOpen && (
          // pt-2 keeps the pointer inside the wrapper while it crosses the
          // gap between the avatar and the panel.
          <div className="absolute right-0 top-full z-30 pt-2">
            <div className="flex w-48 flex-col gap-1 rounded-xl border border-neutral-700 bg-neutral-900 p-2 shadow-lg">
              <Link
                href={paths.accountTickets.getHref()}
                className={MENU_ITEM_CLASS}
              >
                <TicketIcon size={20} />
                My tickets
              </Link>
              <form action="/api/auth/logout" method="post">
                <button
                  type="submit"
                  className={`${MENU_ITEM_CLASS} w-full cursor-pointer`}
                >
                  <Logout2Icon size={20} />
                  Log out
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
