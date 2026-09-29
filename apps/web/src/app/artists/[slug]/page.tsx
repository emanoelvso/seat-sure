import { Footer } from "@/components/layouts/footer";
import Artist from "./Artist";

export default async function ArtistPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return (
    <>
      <main>
        <Artist slug={slug} />
      </main>
      <Footer />
    </>
  );
}
