import { afterEach, describe, expect, it, vi } from "vitest";
import {
  orderDateLabel,
  paymentMethodLabel,
  selectedSeatLabel,
  ticketCountLabel,
  trackingCode,
} from "@/features/account/utils/account-order-format";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("trackingCode", () => {
  it("is # plus the first 8 id characters, uppercased (ORDLIST-03)", () => {
    expect(trackingCode("3f2a9c1b-7d44-4e0a-9b1c-2f6e8a0d5c33")).toBe(
      "# 3F2A9C1B",
    );
  });
});

describe("ticketCountLabel", () => {
  it("reads 1 ticket for a single seat (ORDLIST-03)", () => {
    expect(ticketCountLabel(1)).toBe("1 ticket");
  });

  it("reads {n} tickets otherwise (ORDLIST-03)", () => {
    expect(ticketCountLabel(2)).toBe("2 tickets");
  });
});

describe("orderDateLabel", () => {
  it("formats the creation time as 'Tue 30 Sep • 7:30 PM' in UTC (ORDLIST-03)", () => {
    vi.stubEnv("NEXT_PUBLIC_TIME_ZONE", "UTC");

    expect(orderDateLabel("2025-09-30T19:30:00.000Z")).toBe(
      "Tue 30 Sep • 7:30 PM",
    );
  });

  it("formats in the app time zone (ORDLIST-03)", () => {
    vi.stubEnv("NEXT_PUBLIC_TIME_ZONE", "Asia/Tokyo");

    expect(orderDateLabel("2025-09-30T19:30:00.000Z")).toBe(
      "Wed 01 Oct • 4:30 AM",
    );
  });
});

describe("selectedSeatLabel", () => {
  it("lists the seat numbers of one row in ascending order (ORDDETAIL-01)", () => {
    expect(
      selectedSeatLabel("VIP", [
        { row: "7", number: "10" },
        { row: "7", number: "07" },
      ]),
    ).toBe("VIP • Row 7 • Seats 07, 10");
  });

  it("lists one group per row, rows ascending (ORDDETAIL-01)", () => {
    expect(
      selectedSeatLabel("VIP", [
        { row: "7", number: "10" },
        { row: "3", number: "02" },
        { row: "7", number: "07" },
        { row: "3", number: "01" },
      ]),
    ).toBe("VIP • Row 3 • Seats 01, 02 • Row 7 • Seats 07, 10");
  });

  it("sorts rows and seat numbers numerically (ORDDETAIL-01)", () => {
    expect(
      selectedSeatLabel("GA", [
        { row: "10", number: "2" },
        { row: "9", number: "10" },
        { row: "9", number: "2" },
      ]),
    ).toBe("GA • Row 9 • Seats 2, 10 • Row 10 • Seats 2");
  });
});

describe("paymentMethodLabel", () => {
  it("reads '{brand} •••• {last4}' (ORDDETAIL-02)", () => {
    expect(paymentMethodLabel({ brand: "Visa", last4: "4242" })).toBe(
      "Visa •••• 4242",
    );
  });

  it("capitalises a lowercase brand as Billing stores it (ORDDETAIL-02)", () => {
    expect(paymentMethodLabel({ brand: "visa", last4: "4242" })).toBe(
      "Visa •••• 4242",
    );
    expect(paymentMethodLabel({ brand: "mastercard", last4: "0005" })).toBe(
      "Mastercard •••• 0005",
    );
  });

  it("shows — when there is no card (ORDDETAIL-02)", () => {
    expect(paymentMethodLabel(null)).toBe("—");
  });
});
