import { describe, expect, it } from "vitest";
import { notificationTimestamp } from "@/features/account/utils/notification-format";

// 2026-10-07 20:00 UTC = 4:00 PM in New York (EDT), 5:00 PM in Sao Paulo.
const NOW = new Date("2026-10-07T20:00:00Z");
const NY = "America/New_York";

describe("notificationTimestamp", () => {
  it("reads 'Today at h:mm a' for the same day (View AC 13)", () => {
    expect(notificationTimestamp("2026-10-07T20:42:00Z", NOW, NY)).toBe(
      "Today at 4:42 PM",
    );
  });

  it("reads 'Yesterday at h:mm a' for the previous day", () => {
    expect(notificationTimestamp("2026-10-06T20:42:00Z", NOW, NY)).toBe(
      "Yesterday at 4:42 PM",
    );
  });

  it("reads 'MMM d at h:mm a' earlier this year", () => {
    expect(notificationTimestamp("2026-10-05T20:42:00Z", NOW, NY)).toBe(
      "Oct 5 at 4:42 PM",
    );
    expect(notificationTimestamp("2026-01-02T20:42:00Z", NOW, NY)).toBe(
      "Jan 2 at 3:42 PM",
    );
  });

  it("reads 'MMM d, yyyy at h:mm a' for a previous year", () => {
    expect(notificationTimestamp("2025-10-05T20:42:00Z", NOW, NY)).toBe(
      "Oct 5, 2025 at 4:42 PM",
    );
  });

  it("follows the time zone for day boundaries (View AC 13)", () => {
    // 01:30 UTC on Oct 7 is still Oct 6 evening in Sao Paulo (UTC-3), while
    // now (Oct 7 12:00 in Sao Paulo, 15:00 UTC) is on Oct 7.
    const now = new Date("2026-10-07T15:00:00Z");
    const iso = "2026-10-07T01:30:00Z";

    expect(notificationTimestamp(iso, now, "America/Sao_Paulo")).toBe(
      "Yesterday at 10:30 PM",
    );
    expect(notificationTimestamp(iso, now, "UTC")).toBe("Today at 1:30 AM");
  });

  it("uses the year in the time zone at the New Year boundary", () => {
    // 02:00 UTC on Jan 1 2026 is still Dec 31 2025 in New York.
    const now = new Date("2026-01-05T12:00:00Z");

    expect(notificationTimestamp("2026-01-01T02:00:00Z", now, NY)).toBe(
      "Dec 31, 2025 at 9:00 PM",
    );
  });

  it("defaults to the app time zone", () => {
    expect(notificationTimestamp("2026-10-07T12:00:00Z", NOW)).toMatch(
      /^Today at \d{1,2}:\d{2} [AP]M$/,
    );
  });
});
