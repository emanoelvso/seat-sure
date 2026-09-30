import { notFound } from "next/navigation";
import { Footer } from "@/components/layouts/footer";
import { getArtist } from "@/features/artists/api/get-artist";
import { ArtistView } from "@/features/artists/components/artist-view";

export default async function ArtistPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const data = await getArtist(slug);

  if (!data.artist) notFound();

  return (
    <>
      <main>
        <ArtistView data={data} now={new Date().toISOString()} />
      </main>
      <Footer />
    </>
  );
}
