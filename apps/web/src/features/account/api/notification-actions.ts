"use server";

import { redirect } from "next/navigation";
import {
  NO_SESSION,
  withAccessToken,
} from "@/features/auth/api/with-access-token";
import { graphqlServerFetch } from "@/lib/graphql-server";
import { MARK_ALL_NOTIFICATIONS_READ } from "@/features/account/api/mark-all-notifications-read";
import { MARK_NOTIFICATION_READ } from "@/features/account/api/mark-notification-read";
import type { MarkAllNotificationsReadMutation } from "@/types/__generated__/graphql";
import { paths } from "@/config/paths";

const GENERIC_ERROR = "Something went wrong. Please try again.";

export type MarkNotificationReadResult = { ok: true } | { error: string };

export type MarkAllNotificationsReadResult =
  | { counts: MarkAllNotificationsReadMutation["markAllNotificationsRead"] }
  | { error: string };

// Runs one notification mutation with the session refreshed once on
// UNAUTHENTICATED. Any failure, NOTIFICATION_NOT_FOUND included, is the
// generic error and the view reverts its optimistic state (NOTIF-10 AC 7,
// NOTIF-12 AC 5).
async function runNotificationMutation<T>(
  mutate: (accessToken: string) => Promise<T>,
): Promise<T | { error: string }> {
  let result;
  try {
    result = await withAccessToken(mutate);
  } catch {
    return { error: GENERIC_ERROR };
  }

  if (result === NO_SESSION) {
    redirect(paths.login.getHref(paths.accountNotifications.getHref()));
  }

  return result;
}

// Read AC 4: marks one of the caller's notifications read
export async function markNotificationReadAction(
  id: string,
): Promise<MarkNotificationReadResult> {
  return runNotificationMutation(async (accessToken) => {
    await graphqlServerFetch(
      MARK_NOTIFICATION_READ,
      { input: { id } },
      { revalidate: 0, accessToken },
    );
    return { ok: true as const };
  });
}

// Mark all AC 4: marks every unread notification read and returns the counts
export async function markAllNotificationsReadAction(): Promise<MarkAllNotificationsReadResult> {
  return runNotificationMutation(async (accessToken) => {
    const { markAllNotificationsRead } = await graphqlServerFetch(
      MARK_ALL_NOTIFICATIONS_READ,
      {},
      { revalidate: 0, accessToken },
    );
    return { counts: markAllNotificationsRead };
  });
}
