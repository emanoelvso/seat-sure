import { gql } from "@apollo/client";

export const FIND_EVENT_TICKETS = gql`
  query FindEventTickets($input: FindEventTicketsInput!) {
    findEventTickets(FindEventTicketsInput: $input) {
      event {
        id
        name
        type
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
        labelSize
        labelWeight
        stage {
          label
          labelX
          labelY
          shapes {
            path
            color
          }
        }
        sections {
          key
          label
          color
          shapes {
            path
            labelX
            labelY
            labelRotation
          }
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
  type: string;
  coverImage: string;
  venue: string;
  city: string;
  country: string;
  startAt: string;
  endsAt: string;
}

export interface GqlSeatMapStageShape {
  path: string;
  color: string;
}

export interface GqlSeatMapStage {
  label: string | null;
  labelX: number | null;
  labelY: number | null;
  shapes: GqlSeatMapStageShape[];
}

export interface GqlSeatMapSectionShape {
  path: string;
  labelX: number;
  labelY: number;
  labelRotation: number;
}

export interface GqlSeatMapSection {
  key: string;
  label: string;
  color: string;
  shapes: GqlSeatMapSectionShape[];
}

export interface GqlSeatMap {
  id: string;
  name: string;
  viewBoxWidth: number;
  viewBoxHeight: number;
  labelSize: number;
  labelWeight: number;
  stage: GqlSeatMapStage;
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
