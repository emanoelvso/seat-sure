import { gql, type TypedDocumentNode } from "@apollo/client";
import type {
  FindEventTicketsQuery,
  FindEventTicketsQueryVariables,
} from "@/types/__generated__/graphql";

export const FIND_EVENT_TICKETS: TypedDocumentNode<
  FindEventTicketsQuery,
  FindEventTicketsQueryVariables
> = gql`
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
        headliner {
          slug
          name
        }
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

export type FindEventTickets = FindEventTicketsQuery["findEventTickets"];
export type TicketsEvent = NonNullable<FindEventTickets["event"]>;
export type SeatMapLayout = NonNullable<FindEventTickets["seatMap"]>;
export type SeatMapSection = SeatMapLayout["sections"][number];
export type TicketType = FindEventTickets["ticketTypes"][number];
