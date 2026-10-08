"use client";

import { useRef, useState } from "react";
import { CheckReadIcon } from "@solar-icons/react/outline";
import { Pagination } from "@/components/ui/pagination";
import { paths } from "@/config/paths";
import type { NotificationsPage } from "@/features/account/api/find-my-notifications";
import {
  markNotificationReadAction,
  markAllNotificationsReadAction,
} from "@/features/account/api/notification-actions";
import { notificationCopy } from "@/features/account/utils/notification-copy";
import { notificationTimestamp } from "@/features/account/utils/notification-format";
import { NOTIFICATIONS_CHANGED } from "@/utils/notification-events";
import {
  type AccountNotificationsSearchParams,
  serializeAccountNotificationsSearchParams,
} from "@/features/account/utils/account-notifications-search-params";
import { NotificationCard } from "./notification-card";
import { NotificationTabs } from "./notification-tabs";
import { NotificationsEmptyState } from "./notifications-empty-state";

interface NotificationsViewProps {
  data: NotificationsPage;
  params: AccountNotificationsSearchParams;
  now: string;
  markReadAction?: typeof markNotificationReadAction;
  markAllReadAction?: typeof markAllNotificationsReadAction;
}

export function NotificationsView({
  data,
  params,
  now,
  markReadAction = markNotificationReadAction,
  markAllReadAction = markAllNotificationsReadAction,
}: NotificationsViewProps) {
  const [readIds, setReadIds] = useState(
    () =>
      new Set(data.items.filter((item) => item.readAt).map((item) => item.id)),
  );
  const [counts, setCounts] = useState(data.counts);
  const [error, setError] = useState("");
  const pending = useRef(new Set<string>());
  const markingAll = useRef(false);

  async function markRead(id: string) {
    if (readIds.has(id) || pending.current.has(id) || markingAll.current)
      return;
    pending.current.add(id);
    setError("");
    setReadIds((ids) => new Set(ids).add(id));
    setCounts((value) => ({
      ...value,
      unread: value.unread - 1,
      read: value.read + 1,
    }));
    const result = await markReadAction(id);
    if ("error" in result) {
      setReadIds((ids) => {
        const next = new Set(ids);
        next.delete(id);
        return next;
      });
      setCounts((value) => ({
        ...value,
        unread: value.unread + 1,
        read: value.read - 1,
      }));
      setError(result.error);
    } else {
      window.dispatchEvent(new Event(NOTIFICATIONS_CHANGED));
    }
    pending.current.delete(id);
  }

  async function markAll() {
    if (markingAll.current || counts.unread === 0 || pending.current.size > 0)
      return;
    markingAll.current = true;
    const previousIds = readIds;
    const previousCounts = counts;
    setError("");
    setReadIds(new Set(data.items.map((item) => item.id)));
    setCounts({ ...counts, unread: 0, read: counts.all });
    const result = await markAllReadAction();
    if ("error" in result) {
      setReadIds(previousIds);
      setCounts(previousCounts);
      setError(result.error);
    } else {
      setCounts(result.counts);
      window.dispatchEvent(new Event(NOTIFICATIONS_CHANGED));
    }
    markingAll.current = false;
  }

  if (data.counts.all === 0)
    return (
      <section className="mt-0.5 flex min-h-[793px] flex-col items-center justify-center rounded-3xl bg-neutral-1000">
        <h1 className="sr-only">Notifications</h1>
        <NotificationsEmptyState />
      </section>
    );

  // Figma 5011:121411: 40px padding, 48px vertical gap, 793px height;
  // list 5011:121417: 16px gap. Shallow metadata excludes faulty instances.
  return (
    <section className="flex min-h-[793px] flex-col gap-12 rounded-3xl bg-neutral-1000 p-10">
      <h1 className="sr-only">Notifications</h1>
      <div className="flex items-center justify-between">
        <NotificationTabs counts={counts} tab={params.tab} />
        {params.tab !== "read" && (
          <button
            type="button"
            aria-disabled={counts.unread === 0}
            onClick={markAll}
            className="flex cursor-pointer items-center gap-2 text-base leading-[1.2] font-medium text-neutral-200 hover:text-white aria-disabled:cursor-default"
          >
            <span>Mark All as Read</span>
            <CheckReadIcon size={24} aria-hidden />
          </button>
        )}
      </div>
      {error && (
        <p role="alert" className="text-sm text-error-300">
          {error}
        </p>
      )}
      {data.items.length === 0 ? (
        <p className="text-base text-neutral-200">
          {params.tab === "unread"
            ? "You’re all caught up."
            : "No read notifications yet."}
        </p>
      ) : (
        <ul className="flex flex-col gap-4">
          {data.items.map((item) => {
            const copy = notificationCopy(item);
            return (
              copy && (
                <li key={item.id}>
                  <NotificationCard
                    {...copy}
                    timestamp={notificationTimestamp(
                      item.createdAt,
                      new Date(now),
                    )}
                    unread={!readIds.has(item.id)}
                    onActivate={() => markRead(item.id)}
                  />
                </li>
              )
            );
          })}
        </ul>
      )}
      <Pagination
        page={data.page}
        totalPages={data.totalPages}
        getHref={(page) =>
          serializeAccountNotificationsSearchParams(
            paths.accountNotifications.getHref(),
            { tab: params.tab, page },
          )
        }
      />
    </section>
  );
}
