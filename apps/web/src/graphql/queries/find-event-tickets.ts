import { gql } from "@apollo/client";

export const FIND_EVENT_TICKETS = gql`
  query FindEventTickets($input: FindEventTicketsInput!) {
    findEventTickets(FindEventTicketsInput: $input) {
      event {
        id
        name
        coverImage
        venue
        city
        country
        startAt
        endsAt
      }
      seatMap {
        id
        name
        viewBoxWidth
        viewBoxHeight
        stage {
          label
          path
          labelX
          labelY
        }
        sections {
          key
          label
          path
          color
          labelX
          labelY
        }
      }
      ticketTypes {
        id
        sectionKey
        name
        priceCents
        currency
        seatsAvailable
        maxPerOrder
        tags
      }
    }
  }
`;

export interface GqlTicketsEvent {
  id: string;
  name: string;
  coverImage: string;
  venue: string;
  city: string;
  country: string;
  startAt: string;
  endsAt: string;
}

export interface GqlSeatMapShape {
  label: string;
  path: string;
  labelX: number;
  labelY: number;
}

export interface GqlSeatMapSection extends GqlSeatMapShape {
  key: string;
  color: string;
}

export interface GqlSeatMap {
  id: string;
  name: string;
  viewBoxWidth: number;
  viewBoxHeight: number;
  stage: GqlSeatMapShape;
  sections: GqlSeatMapSection[];
}

export interface GqlTicketType {
  id: string;
  sectionKey: string;
  name: string;
  priceCents: number;
  currency: string;
  seatsAvailable: number;
  maxPerOrder: number;
  tags: string[];
}

export interface FindEventTickets {
  event: GqlTicketsEvent | null;
  seatMap: GqlSeatMap | null;
  ticketTypes: GqlTicketType[];
}

export interface FindEventTicketsData {
  findEventTickets: FindEventTickets;
}
