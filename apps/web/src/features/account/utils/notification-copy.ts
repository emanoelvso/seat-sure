import type { NotificationType } from "@/types/__generated__/schema";

export interface NotificationCopy {
  title: string;
  titleHighlight?: string;
  body: string;
}

const NO_EVENT_NAME = "your order";

// The card's words for each notification type (NOTIF-07). The API stores the
// type and the event name; the copy lives here. `null` for a type this build
// doesn't know, so the list skips that card.
export function notificationCopy({
  type,
  eventName,
}: {
  type: NotificationType | (string & {});
  eventName: string | null | undefined;
}): NotificationCopy | null {
  const event = eventName || NO_EVENT_NAME;

  switch (type) {
    case "WELCOME":
      return {
        title: "Welcome to ",
        titleHighlight: "SeatSure!",
        body: "We’re glad to have you here! 🎉\nExplore and book tickets for the best concerts, theaters, and events. To get started, complete your profile.",
      };
    case "PURCHASE_CONFIRMED":
      return {
        title: "Your purchase is confirmed ✅",
        body: `You can easily access your ticket for ${event} anytime by heading over to the “Tickets” section of your account. Get ready for an unforgettable night filled with music, energy, and amazing vibes! 💃🎶`,
      };
    case "PAYMENT_UNSUCCESSFUL":
      return {
        title: "Your payment was unsuccessful ❌",
        body: `Your payment for ${event} was not completed. Please try again or contact support.`,
      };
    default:
      return null;
  }
}
