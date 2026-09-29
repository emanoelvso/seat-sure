import { gql, type TypedDocumentNode } from "@apollo/client";
import type {
  FindEventsQuery,
  FindEventsQueryVariables,
} from "@/types/__generated__/graphql";

export const FIND_EVENTS: TypedDocumentNode<
  FindEventsQuery,
  FindEventsQueryVariables
> = gql`
  query findEvents($input: FindEventsInput) {
    findEvents(FindEventsInput: $input) {
      cities
      events {
        id
        type
        name
        description
        coverImage
        venue
        city
        country
        date
        startAt
        status
        price
        category
      }
      hasMore
    }
  }
`;
