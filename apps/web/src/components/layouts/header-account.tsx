"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { BellIcon } from "@solar-icons/react/outline";
import { paths } from "@/config/paths";
import { getInitials } from "@/utils/initials";

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
// (AUTH-42, AUTH-43). The avatar links to the account tickets (ACCT-02);
// logging out lives in the account sidebar.
export function HeaderAccount() {
  const [session, setSession] = useState<SessionResponse | null>(null);

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
      <Link
        href={paths.accountTickets.getHref()}
        aria-label="My account"
        title="My account"
        className="w-10 h-10 rounded-full overflow-hidden shrink-0"
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
    </>
  );
}
