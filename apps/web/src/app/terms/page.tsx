import type { Metadata } from "next";
import { Footer } from "@/components/layouts/footer";
import { Header } from "@/components/layouts/header";
import { TermsView } from "@/features/legal/components/terms-view";

export const metadata: Metadata = {
  title: "Terms & Privacy Policy — SeatSure",
};

export default function TermsPage() {
  return (
    <>
      {/* Without the default bottom margin; the view sets Figma's top spacing. */}
      <Header transparent />
      <main>
        <TermsView />
      </main>
      <Footer />
    </>
  );
}
