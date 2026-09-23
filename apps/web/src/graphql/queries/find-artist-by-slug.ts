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

interface FindArtistBySlug {
  artist?: Artist | null;
  events?: GqlEvent[] | null;
  nearbyEvents?: GqlEvent[] | null;
}
