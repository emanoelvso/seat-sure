import { gql } from "@apollo/client";
import { EventSummary } from "@/types/api";

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

export interface FindArtistBySlugData {
  findArtistBySlug: FindArtistBySlug;
}

interface Artist {
  name: string;
  cover: string;
  bio: string;
}

export interface EventsByCity {
  city: string;
  country: string;
  events?: EventSummary[] | null;
}

export interface FindArtistBySlug {
  artist?: Artist | null;
  eventsByCity?: EventsByCity[] | null;
  nearbyEvents?: EventSummary[] | null;
  featuredFestival?: EventSummary | null;
}
