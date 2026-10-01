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
  artist: {
    getHref: (slug: string) => `/artists/${encodeURIComponent(slug)}`,
  },
};
