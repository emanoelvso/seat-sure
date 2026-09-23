"use client";

import {
  FIND_ARTIST_BY_SLUG,
  FindArtistBySlugData,
} from "@/graphql/queries/find-artist-by-slug";
import { useQuery } from "@apollo/client/react";

export default function Artist({ slug }: { slug: string }) {
  const { data } = useQuery<FindArtistBySlugData>(FIND_ARTIST_BY_SLUG, {
    variables: {
      input: {
        slug,
      },
    },
  });

  const artist = data?.findArtistBySlug.artist;

  return (
    <div className="px-27 flex flex-col gap-4">
      <span className="text-6xl font-bold">{artist?.name}</span>
      <p className="text-lg font-medium">{artist?.bio}</p>
    </div>
  );
}
