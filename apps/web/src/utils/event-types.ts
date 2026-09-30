export const EVENT_TYPES = ["CONCERT", "SHOW", "SPORT", "FESTIVAL"] as const;

export type EventType = (typeof EVENT_TYPES)[number];

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  CONCERT: "Concerts",
  SHOW: "Shows",
  SPORT: "Sports",
  FESTIVAL: "Festivals",
};
