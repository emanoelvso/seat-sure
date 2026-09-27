import { gql } from "@apollo/client";

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

export interface GqlEvent {
  id: string;
  name: string;
  description?: string;
  coverImage: string;
  venue: string;
  city: string;
  country: string;
  date: string;
  startAt: string;
  status: string;
  price: number;
  category: string;
  tags?: string[];
}

export interface GetHomeSectionsData {
  getHomeSections: {
    concerts: {
      categories?: string[] | null;
      events?: GqlEvent[] | null;
    };
    shows: {
      categories?: string[] | null;
      events?: GqlEvent[] | null;
    };
    sports: {
      categories?: string[] | null;
      events?: GqlEvent[] | null;
    };
    festivals: {
      categories?: string[] | null;
      events?: GqlEvent[] | null;
    };
  };
}
