import { gql } from "@apollo/client";

export const GET_HOME_SECTIONS = gql`
  query GetHomeSections {
    getHomeSections {
      concerts {
        id
        name
        coverImage
        venue
        date
        startAt
        status
      }
      shows {
        id
        name
        coverImage
        venue
        date
        startAt
        status
      }
      sports {
        id
        name
        coverImage
        venue
        date
        startAt
        status
      }
      festivals {
        id
        name
        coverImage
        venue
        date
        startAt
        status
      }
    }
  }
`;

export interface GqlEvent {
  id: string;
  name: string;
  coverImage: string;
  venue: string;
  date: string;
  startAt: string;
  status: string;
}

export interface GetHomeSectionsData {
  getHomeSections: {
    concerts: GqlEvent[] | null;
    shows: GqlEvent[] | null;
    sports: GqlEvent[] | null;
    festivals: GqlEvent[] | null;
  };
}
