import type { EventType } from "@/utils/event-types";

// The one place that builds app URLs. Path segments are encoded.
export const paths = {
  home: {
    getHref: () => "/",
  },
  events: {
    getHref: (type?: EventType) => (type ? `/events?type=${type}` : "/events"),
  },
  eventTickets: {
    getHref: (id: string) => `/events/${encodeURIComponent(id)}/tickets`,
  },
  eventSeats: {
    getHref: (eventId: string, ticketTypeId: string, quantity: number) =>
      `/events/${encodeURIComponent(eventId)}/tickets/${encodeURIComponent(ticketTypeId)}?quantity=${quantity}`,
  },
  artist: {
    getHref: (slug: string) => `/artists/${encodeURIComponent(slug)}`,
  },
  login: {
    getHref: (redirectTo?: string) =>
      redirectTo
        ? `/login?redirectTo=${encodeURIComponent(redirectTo)}`
        : "/login",
  },
  signup: {
    getHref: (redirectTo?: string) =>
      redirectTo
        ? `/signup?redirectTo=${encodeURIComponent(redirectTo)}`
        : "/signup",
  },
  verifyEmail: {
    getHref: () => "/verify-email",
  },
  forgotPassword: {
    getHref: () => "/forgot-password",
  },
  forgotPasswordVerify: {
    getHref: () => "/forgot-password/verify",
  },
  resetPassword: {
    getHref: () => "/reset-password",
  },
  session: {
    getHref: () => "/api/auth/session",
  },
};
