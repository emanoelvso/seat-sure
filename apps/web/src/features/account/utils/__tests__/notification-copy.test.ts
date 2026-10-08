import { describe, expect, it } from "vitest";
import { notificationCopy } from "@/features/account/utils/notification-copy";

describe("notificationCopy", () => {
  it("reads the welcome title with a SeatSure! highlight and the welcome body (View AC 14)", () => {
    expect(notificationCopy({ type: "WELCOME", eventName: null })).toEqual({
      title: "Welcome to ",
      titleHighlight: "SeatSure!",
      body: "We’re glad to have you here! 🎉\nExplore and book tickets for the best concerts, theaters, and events. To get started, complete your profile.",
    });
  });

  it("reads the purchase copy with the event name (View AC 15)", () => {
    expect(
      notificationCopy({ type: "PURCHASE_CONFIRMED", eventName: "Rock Night" }),
    ).toEqual({
      title: "Your purchase is confirmed ✅",
      body: "You can easily access your ticket for Rock Night anytime by heading over to the “Tickets” section of your account. Get ready for an unforgettable night filled with music, energy, and amazing vibes! 💃🎶",
    });
  });

  it("reads the payment-unsuccessful copy with the event name (View AC 16)", () => {
    expect(
      notificationCopy({
        type: "PAYMENT_UNSUCCESSFUL",
        eventName: "Rock Night",
      }),
    ).toEqual({
      title: "Your payment was unsuccessful ❌",
      body: "Your payment for Rock Night was not completed. Please try again or contact support.",
    });
  });

  it.each([null, undefined, ""])(
    "falls back to 'your order' when the event name is %j (edge case)",
    (eventName) => {
      expect(
        notificationCopy({ type: "PURCHASE_CONFIRMED", eventName })?.body,
      ).toContain("your ticket for your order anytime");
      expect(
        notificationCopy({ type: "PAYMENT_UNSUCCESSFUL", eventName })?.body,
      ).toBe(
        "Your payment for your order was not completed. Please try again or contact support.",
      );
    },
  );

  it("returns null for an unknown type (edge case)", () => {
    expect(notificationCopy({ type: "PROMOTION", eventName: "X" })).toBeNull();
  });
});
