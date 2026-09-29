import { gql, type TypedDocumentNode } from "@apollo/client";
import type {
  FindArtistBySlugQuery,
  FindArtistBySlugQueryVariables,
} from "@/types/__generated__/graphql";

export const FIND_ARTIST_BY_SLUG: TypedDocumentNode<
  FindArtistBySlugQuery,
  FindArtistBySlugQueryVariables
> = gql`
  query FindArtistBySlug($input: FindArtistInput!) {
    findArtistBySlug(FindArtistInput: $input) {
      artist {
        name
        cover
        bio
      }
      eventsByCity {
        city
        country
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
          tags
        }
      }
      nearbyEvents {
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
      featuredFestival {
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
    }
  }
`;

export type FindArtistBySlug = FindArtistBySlugQuery["findArtistBySlug"];
