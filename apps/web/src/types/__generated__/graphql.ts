/** Internal type. DO NOT USE DIRECTLY. */
type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
/** Internal type. DO NOT USE DIRECTLY. */
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
export type DateRange = {
  from: string;
  to?: string | null | undefined;
};

export type EventType =
  | 'CONCERT'
  | 'FESTIVAL'
  | 'SHOW'
  | 'SPORT';

export type FindArtistInput = {
  slug: string;
};

export type FindEventTicketsInput = {
  eventId: string;
};

export type FindEventsInput = {
  city?: string | null | undefined;
  dateRange?: DateRange | null | undefined;
  limit?: number | null | undefined;
  offset?: number | null | undefined;
  priceRange?: PriceRange | null | undefined;
  type?: EventType | null | undefined;
};

export type PriceRange = {
  max?: number | null | undefined;
  min?: number | null | undefined;
};

export type FindArtistBySlugQueryVariables = Exact<{
  input: FindArtistInput;
}>;


export type FindArtistBySlugQuery = { findArtistBySlug: { __typename: 'FindArtist', artist: { __typename: 'Artist', name: string, cover: string, bio: string } | null, eventsByCity: Array<{ __typename: 'EventsByCity', city: string, country: string, events: Array<{ __typename: 'Event', id: string, type: string, name: string, description: string | null, coverImage: string, venue: string, city: string, country: string, date: string, startAt: string, status: string, price: number, category: string, tags: Array<string> | null }> | null }> | null, nearbyEvents: Array<{ __typename: 'Event', id: string, type: string, name: string, description: string | null, coverImage: string, venue: string, city: string, country: string, date: string, startAt: string, status: string, price: number, category: string }> | null, featuredFestival: { __typename: 'Event', id: string, type: string, name: string, description: string | null, coverImage: string, venue: string, city: string, country: string, date: string, startAt: string, status: string, price: number, category: string } | null } };

export type FindEventsQueryVariables = Exact<{
  input?: FindEventsInput | null | undefined;
}>;


export type FindEventsQuery = { findEvents: { __typename: 'FindEvents', cities: Array<string> | null, hasMore: boolean, events: Array<{ __typename: 'Event', id: string, type: string, name: string, description: string | null, coverImage: string, venue: string, city: string, country: string, date: string, startAt: string, status: string, price: number, category: string }> | null } };

export type GetHomeSectionsQueryVariables = Exact<{ [key: string]: never; }>;


export type GetHomeSectionsQuery = { getHomeSections: { __typename: 'HomeSections', concerts: { __typename: 'EventSection', categories: Array<string> | null, events: Array<{ __typename: 'Event', id: string, name: string, description: string | null, coverImage: string, venue: string, city: string, country: string, date: string, startAt: string, status: string, price: number, category: string }> | null } | null, shows: { __typename: 'EventSection', categories: Array<string> | null, events: Array<{ __typename: 'Event', id: string, name: string, description: string | null, coverImage: string, venue: string, city: string, country: string, date: string, startAt: string, status: string, price: number, category: string }> | null } | null, sports: { __typename: 'EventSection', categories: Array<string> | null, events: Array<{ __typename: 'Event', id: string, name: string, description: string | null, coverImage: string, venue: string, city: string, country: string, date: string, startAt: string, status: string, price: number, category: string }> | null } | null, festivals: { __typename: 'EventSection', categories: Array<string> | null, events: Array<{ __typename: 'Event', id: string, name: string, description: string | null, coverImage: string, venue: string, city: string, country: string, date: string, startAt: string, status: string, price: number, category: string }> | null } | null } };

export type FindEventTicketsQueryVariables = Exact<{
  input: FindEventTicketsInput;
}>;


export type FindEventTicketsQuery = { findEventTickets: { __typename: 'EventTickets', event: { __typename: 'Event', id: string, name: string, type: string, coverImage: string, venue: string, city: string, country: string, startAt: string, endsAt: string } | null, seatMap: { __typename: 'SeatMap', id: string, name: string, viewBoxWidth: number, viewBoxHeight: number, labelSize: number, labelWeight: number, stage: { __typename: 'SeatMapStage', label: string | null, labelX: number | null, labelY: number | null, shapes: Array<{ __typename: 'SeatMapStageShape', path: string, color: string }> }, sections: Array<{ __typename: 'SeatMapSection', key: string, label: string, color: string, shapes: Array<{ __typename: 'SeatMapSectionShape', path: string, labelX: number, labelY: number, labelRotation: number }> }> } | null, ticketTypes: Array<{ __typename: 'TicketType', id: string, sectionKey: string, name: string, priceCents: number, currency: string, seatsAvailable: number, maxPerOrder: number, tags: Array<string> }> } };
