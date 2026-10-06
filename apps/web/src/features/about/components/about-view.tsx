import { Header } from "@/components/layouts/header";
import { AboutHero } from "./about-hero";
import { ContactSection } from "./contact-section";
import { ExperienceSection } from "./experience-section";
import { StoryTimeline } from "./story-timeline";
import { WhyChooseSection } from "./why-choose-section";

export function AboutView() {
  return (
    <div className="relative">
      {/* The transparent header sits over the hero's crowd image. */}
      <div className="absolute inset-x-0 top-0">
        <Header transparent />
      </div>

      <main className="flex flex-col pb-32">
        <AboutHero />
        <div className="mt-20">
          <WhyChooseSection />
        </div>
        <div className="mt-26">
          <ExperienceSection />
        </div>
        <div className="mt-30">
          <StoryTimeline />
        </div>
        <div className="mt-41.5">
          <ContactSection />
        </div>
      </main>
    </div>
  );
}
