import { TZDate } from "@date-fns/tz";
import { env } from "@/config/env";

// ISO instant of a wall-clock time in env.timeZone. Fixtures built with it read
// the same wall time whatever the machine's or the browser's time zone is.
export function zonedIso(
  year: number,
  monthIndex: number,
  day: number,
  hour = 0,
  minute = 0,
) {
  const date = new TZDate(year, monthIndex, day, hour, minute, env.timeZone);
  return new Date(date.getTime()).toISOString();
}
