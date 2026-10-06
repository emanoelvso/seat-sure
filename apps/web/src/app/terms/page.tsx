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
      <Header />
      <main>
        <TermsView />
      </main>
      <Footer />
    </>
  );
}
