import { gql } from "@apollo/client";

export const GET_HOME_SECTIONS = gql`
  query GetHomeSections {
    getHomeSections {
      concerts {
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
      shows {
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
      sports {
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
      festivals {
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
}

export interface GetHomeSectionsData {
  getHomeSections: {
    concerts: GqlEvent[] | null;
    shows: GqlEvent[] | null;
    sports: GqlEvent[] | null;
    festivals: GqlEvent[] | null;
  };
}
