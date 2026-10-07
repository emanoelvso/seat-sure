import { tz } from "@date-fns/tz";
import { differenceInCalendarDays, format } from "date-fns";
import { env } from "@/config/env";
import { formatEventTime } from "@/utils/event-format";

// "Today at 4:42 PM", "Yesterday at 4:42 PM", "Oct 5 at 4:42 PM" this year,
// "Oct 5, 2025 at 4:42 PM" before (NOTIF-07). Days and years are counted in
// the app time zone; `now` is the caller's clock so server and client agree.
export function notificationTimestamp(
  iso: string,
  now: Date,
  timeZone = env.timeZone,
): string {
  const created = new Date(iso);
  const zone = { in: tz(timeZone) };
  const time = formatEventTime(iso, timeZone);

  const daysAgo = differenceInCalendarDays(now, created, zone);
  if (daysAgo === 0) return `Today at ${time}`;
  if (daysAgo === 1) return `Yesterday at ${time}`;

  const sameYear = format(created, "yyyy", zone) === format(now, "yyyy", zone);
  const day = format(created, sameYear ? "MMM d" : "MMM d, yyyy", zone);
  return `${day} at ${time}`;
}
