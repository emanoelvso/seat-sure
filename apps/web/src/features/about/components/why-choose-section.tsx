import Image from "next/image";
import type { ReactNode } from "react";

interface FeatureCardProps {
  className?: string;
  /** Corner classes that place the purple glow, e.g. "-top-24 -right-24". */
  glowClassName: string;
  children: ReactNode;
}

function FeatureCard({ className, glowClassName, children }: FeatureCardProps) {
  return (
    <li
      className={`relative isolate h-81 overflow-hidden rounded-3xl bg-section-gradient ${className}`}
    >
      <div
        aria-hidden="true"
        className={`absolute -z-10 size-96 rounded-full bg-shade-200/40 blur-3xl ${glowClassName}`}
      />
      {children}
    </li>
  );
}

function FeatureTitle({ children }: { children: ReactNode }) {
  return <h3 className="text-2xl font-semibold text-white">{children}</h3>;
}

function FeatureDescription({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <p className={`text-lg leading-snug text-neutral-100 ${className}`}>
      {children}
    </p>
  );
}

export function WhyChooseSection() {
  return (
    <section className="flex flex-col items-center px-27">
      <h2 className="text-3xl font-semibold text-white">
        Why Choose SeatSure?
      </h2>
      <p className="mt-2 text-neutral-200">
        Experience excellence with a team that truly cares
      </p>

      <ul className="mt-12 grid w-full grid-cols-3 gap-6">
        <FeatureCard
          className="col-span-2 flex items-center px-12"
          glowClassName="-top-48 -right-24"
        >
          <div className="max-w-sm">
            <FeatureTitle>Your Ticket is on the Way!</FeatureTitle>
            <FeatureDescription className="mt-7">
              We’re sending your ticket straight to your email. Just confirm
              your name and email below, and you’re all set for an
              unforgettable experience! 🚀
            </FeatureDescription>
          </div>
          {/* Phone outline behind the envelope illustration. */}
          <div
            aria-hidden="true"
            className="absolute top-16 left-130 h-108 w-56 -rotate-30 rounded-4xl border-2 border-neutral-300"
          />
          <Image
            src="/about/ticket-on-the-way.png"
            alt=""
            width={162}
            height={162}
            className="absolute top-34 left-140 size-40"
          />
        </FeatureCard>

        <FeatureCard
          className="flex flex-col px-11.5 pt-5"
          glowClassName="-right-32 -bottom-48"
        >
          <Image
            src="/about/online-purchasing.png"
            alt=""
            width={120}
            height={120}
            className="size-30 self-center"
          />
          <div className="mt-4">
            <FeatureTitle>Online Ticket Purchasing</FeatureTitle>
            <FeatureDescription className="mt-4">
              Allows users to browse events, select seats, and buy tickets
              instantly via secure payment methods 🎭
            </FeatureDescription>
          </div>
        </FeatureCard>

        <FeatureCard
          className="flex flex-col px-12 pt-12"
          glowClassName="-bottom-48 -left-32"
        >
          <FeatureTitle>Customer Support</FeatureTitle>
          <FeatureDescription className="mt-4 max-w-64">
            24/7 live chat, email, or phone support for booking issues.🌟
          </FeatureDescription>
          <Image
            src="/about/customer-support.png"
            alt=""
            width={120}
            height={120}
            className="mt-auto mr-3 mb-11 size-30 self-end"
          />
        </FeatureCard>

        <FeatureCard
          className="col-span-2 flex items-center px-12"
          glowClassName="-top-48 -left-24"
        >
          <div className="max-w-137">
            <FeatureTitle>Event Discovery</FeatureTitle>
            <FeatureDescription className="mt-7">
              Personalized suggestions based on user preferences, location, and
              past bookings Filters for categories venues, and price ranges. The
              goal is to detect meaningful occurrences (events) in analysis, or
              automated responses.💰
            </FeatureDescription>
          </div>
          <Image
            src="/about/event-discovery.png"
            alt=""
            width={120}
            height={120}
            className="absolute top-11 right-16 size-30"
          />
        </FeatureCard>
      </ul>
    </section>
  );
}
