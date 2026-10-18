"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BellIcon } from "@solar-icons/react/outline";
import { paths } from "@/config/paths";
import { NOTIFICATIONS_CHANGED } from "@/utils/notification-events";

export function HeaderNotifications() {
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let version = 0;
    const controller = new AbortController();
    async function refresh() {
      const requestVersion = ++version;
      try {
        const response = await fetch(paths.notificationsUnreadCount.getHref(), {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) {
          if (!cancelled && requestVersion === version && response.status === 401)
            setUnread(0);
          return;
        }
        const data: { unread?: unknown } = await response.json();
        if (
          !cancelled &&
          requestVersion === version &&
          typeof data.unread === "number" &&
          Number.isSafeInteger(data.unread) &&
          data.unread >= 0
        ) {
          setUnread(data.unread);
        }
      } catch {
        // A count refresh failure leaves the navigation and last known count usable.
      }
    }
    void refresh();
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, 60_000);
    window.addEventListener("focus", refresh);
    window.addEventListener(NOTIFICATIONS_CHANGED, refresh);
    return () => {
      cancelled = true;
      controller.abort();
      window.clearInterval(interval);
      window.removeEventListener("focus", refresh);
      window.removeEventListener(NOTIFICATIONS_CHANGED, refresh);
    };
  }, []);

  return (
    <Link
      href={paths.accountNotifications.getHref()}
      aria-label={unread > 0 ? `Notifications, ${unread} unread` : "Notifications"}
      className="relative w-10 h-10 rounded-full bg-neutral-700 flex items-center justify-center shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
    >
      <BellIcon aria-hidden="true" />
      {unread > 0 && (
        <span
          aria-hidden="true"
          className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-neutral-1000 bg-primary px-1 text-xs font-semibold text-white"
        >
          {unread > 99 ? "99+" : unread}
        </span>
      )}
    </Link>
  );
}
