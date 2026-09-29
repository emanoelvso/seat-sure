import { gql } from "@apollo/client";
import { EventSummary } from "@/types/api";

export const GET_HOME_SECTIONS = gql`
  query GetHomeSections {
    getHomeSections {
      concerts {
        categories
        events {
          id
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
      }
      shows {
        categories
        events {
          id
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
      }
      sports {
        categories
        events {
          id
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
      }
      festivals {
        categories
        events {
          id
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
      }
    }
  }
`;

export interface GetHomeSectionsData {
  getHomeSections: {
    concerts: {
      categories?: string[] | null;
      events?: EventSummary[] | null;
    };
    shows: {
      categories?: string[] | null;
      events?: EventSummary[] | null;
    };
    sports: {
      categories?: string[] | null;
      events?: EventSummary[] | null;
    };
    festivals: {
      categories?: string[] | null;
      events?: EventSummary[] | null;
    };
  };
}
