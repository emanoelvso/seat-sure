import Footer from "@/components/Footer";
import Header from "@/components/Header";
import Artist from "./Artist";

export default async function ArtistPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return (
    <>
      <Header />
      <main>
        <Artist slug={slug} />
      </main>
      <Footer />
    </>
  );
}
