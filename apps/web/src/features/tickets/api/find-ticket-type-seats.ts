import { gql, type TypedDocumentNode } from "@apollo/client";
import type {
  FindTicketTypeSeatsQuery,
  FindTicketTypeSeatsQueryVariables,
} from "@/types/__generated__/graphql";

// Selects the same event, seat map and ticket type fields as
// FIND_EVENT_TICKETS, so the seat page can pass them to TicketsHero,
// SeatMapPreview and the ticket summary parts.
export const FIND_TICKET_TYPE_SEATS: TypedDocumentNode<
  FindTicketTypeSeatsQuery,
  FindTicketTypeSeatsQueryVariables
> = gql`
  query FindTicketTypeSeats($input: FindTicketTypeSeatsInput!) {
    findTicketTypeSeats(FindTicketTypeSeatsInput: $input) {
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
      ticketType {
        id
        sectionKey
        name
        priceCents
        currency
        seatsAvailable
        maxPerOrder
        tags
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
      seats {
        id
        row
        number
        x
        y
      }
    }
  }
`;

export type FindTicketTypeSeats = FindTicketTypeSeatsQuery["findTicketTypeSeats"];
export type Seat = FindTicketTypeSeats["seats"][number];
