import { describe, expect, it } from "vitest";
import {
  countdownDigits,
  seatsLabel,
  ticketCountLine,
} from "@/features/checkout/utils/checkout-format";

describe("seatsLabel (PAY-21)", () => {
  it("sorts seat numbers numerically, '2' before '10'", () => {
    expect(seatsLabel([{ number: "10" }, { number: "2" }])).toBe(
      "Seats 2, 10",
    );
  });

  it("labels a single seat in the singular", () => {
    expect(seatsLabel([{ number: "07" }])).toBe("Seat 07");
  });
});

describe("ticketCountLine", () => {
  it("uses the singular with no bullet for 1 ticket", () => {
    expect(ticketCountLine(1)).toBe("1 ticket");
  });

  it("uses the plural with the seated-together note for more than 1", () => {
    expect(ticketCountLine(3)).toBe("3 tickets • Seated together");
  });
});

describe("countdownDigits (PAY-19)", () => {
  it("splits 583 seconds into MM:SS digit boxes", () => {
    expect(countdownDigits(583)).toEqual(["0", "9", "4", "3"]);
  });

  it("splits 0 seconds into all-zero digit boxes", () => {
    expect(countdownDigits(0)).toEqual(["0", "0", "0", "0"]);
  });

  it("caps above 99:59 at 99:59", () => {
    expect(countdownDigits(99 * 60 + 59 + 100)).toEqual(["9", "9", "5", "9"]);
  });

  it("never goes negative", () => {
    expect(countdownDigits(-5)).toEqual(["0", "0", "0", "0"]);
  });
});
