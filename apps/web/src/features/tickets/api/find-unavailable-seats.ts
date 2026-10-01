import { gql, type TypedDocumentNode } from "@apollo/client";
import type {
  FindUnavailableSeatsQuery,
  FindUnavailableSeatsQueryVariables,
} from "@/types/__generated__/graphql";

export const FIND_UNAVAILABLE_SEATS: TypedDocumentNode<
  FindUnavailableSeatsQuery,
  FindUnavailableSeatsQueryVariables
> = gql`
  query FindUnavailableSeats($input: FindUnavailableSeatsInput!) {
    findUnavailableSeats(FindUnavailableSeatsInput: $input) {
      seatIds
    }
  }
`;
