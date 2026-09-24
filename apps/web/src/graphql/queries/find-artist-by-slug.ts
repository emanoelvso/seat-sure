import { gql } from "@apollo/client";
import { GqlEvent } from "./home-sections";

export const FIND_ARTIST_BY_SLUG = gql`
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
    }
  }
`;

export interface FindArtistBySlugData {
  findArtistBySlug: FindArtistBySlug;
}

interface Artist {
  name: string;
  cover: string;
  bio: string;
}

interface EventsByCity {
  city: string;
  country: string;
  events?: GqlEvent[] | null;
}

interface FindArtistBySlug {
  artist?: Artist | null;
  eventsByCity?: EventsByCity[] | null;
  nearbyEvents?: GqlEvent[] | null;
}
