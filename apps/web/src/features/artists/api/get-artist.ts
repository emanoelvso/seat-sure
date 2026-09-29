import { graphqlServerFetch } from "@/lib/graphql-server";
import {
  FIND_ARTIST_BY_SLUG,
  FindArtistBySlugData,
} from "@/features/artists/api/find-artist-by-slug";

export async function getArtist(slug: string) {
  const data = await graphqlServerFetch<
    FindArtistBySlugData,
    { input: { slug: string } }
  >(FIND_ARTIST_BY_SLUG, { input: { slug } }, { tags: [`artist:${slug}`] });

  return data.findArtistBySlug;
}
