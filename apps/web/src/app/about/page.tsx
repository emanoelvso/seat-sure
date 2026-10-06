import type { Metadata } from "next";
import { Footer } from "@/components/layouts/footer";
import { AboutView } from "@/features/about/components/about-view";

export const metadata: Metadata = {
  title: "About us — SeatSure",
};

export default function AboutPage() {
  return (
    <>
      <AboutView />
      <Footer />
    </>
  );
}
