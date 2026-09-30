import { gql, type TypedDocumentNode } from "@apollo/client";
import type {
  GetHomeSectionsQuery,
  GetHomeSectionsQueryVariables,
} from "@/types/__generated__/graphql";

export const GET_HOME_SECTIONS: TypedDocumentNode<
  GetHomeSectionsQuery,
  GetHomeSectionsQueryVariables
> = gql`
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
