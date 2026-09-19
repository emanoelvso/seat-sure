import { gql } from "@apollo/client";
import { GqlEvent } from "./home-sections";

export const FIND_EVENTS = gql`
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

export interface FindEventsData {
  findEvents: FindEvents;
}

interface FindEvents {
  cities: string[];
  events?: GqlEvent[] | null;
  hasMore: boolean;
}
