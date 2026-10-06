import Image from "next/image";
import type { ReactNode } from "react";

// The cards are free-form frames in Figma (no auto layout), so their content
// is placed at Figma's coordinates.

interface FeatureCardProps {
  className?: string;
  /** Position of the blurred purple glow, which Figma draws over the card. */
  glowClassName: string;
  children: ReactNode;
}

function FeatureCard({ className, glowClassName, children }: FeatureCardProps) {
  return (
    <li
      className={`bg-dust-card relative isolate h-80.75 overflow-hidden rounded-3xl ${className ?? ""}`}
    >
      {children}
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute h-66.5 w-69.5 rounded-full bg-shade-100/50 blur-glow ${glowClassName}`}
      />
    </li>
  );
}

function FeatureText({
  className,
  title,
  children,
}: {
  className: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className={`absolute flex flex-col ${className}`}>
      <h3 className="text-2xl leading-tight font-bold text-white">{title}</h3>
      <p className="text-lg leading-tight text-neutral-100">{children}</p>
    </div>
  );
}

export function WhyChooseSection() {
  return (
    <section className="flex flex-col items-center px-27">
      <h2 className="text-section font-semibold text-white">
        Why Choose SeatSure?
      </h2>
      <p className="mt-2 text-neutral-200">
        Experience excellence with a team that truly cares
      </p>

      <ul className="mt-12 grid w-full grid-cols-3 gap-6">
        <FeatureCard className="col-span-2" glowClassName="-top-28.25 left-150">
          <FeatureText
            className="top-21.5 left-11.5 w-95.75 gap-6"
            title="Your Ticket is on the Way!"
          >
            We’re sending your ticket straight to your email. Just confirm your
            name and email below, and you’re all set for an unforgettable
            experience! 🚀
          </FeatureText>
          <Image
            src="/about/phone-frame.svg"
            alt=""
            width={344}
            height={278}
            className="absolute top-11.25 left-116"
          />
          <Image
            src="/about/ticket-on-the-way.svg"
            alt=""
            width={162}
            height={162}
            className="absolute top-33 left-137.25"
          />
        </FeatureCard>

        <FeatureCard glowClassName="top-44.75 left-60.5">
          <Image
            src="/about/online-purchasing.svg"
            alt=""
            width={120}
            height={120}
            className="absolute top-3.75 left-34"
          />
          <FeatureText
            className="top-37.5 left-11.5 w-79.75 gap-4.5"
            title="Online Ticket Purchasing"
          >
            Allows users to browse events, select seats, and buy tickets
            instantly via secure payment methods 🎭
          </FeatureText>
        </FeatureCard>

        <FeatureCard glowClassName="top-41.75 -left-37.25">
          <FeatureText
            className="top-9.75 left-11.5 w-66.5 gap-4.5"
            title="Customer Support"
          >
            24/7 live chat, email, or phone support for booking issues.🌟
          </FeatureText>
          <Image
            src="/about/customer-support.svg"
            alt=""
            width={120}
            height={120}
            className="absolute top-39.75 left-53.25"
          />
        </FeatureCard>

        <FeatureCard
          className="col-span-2"
          glowClassName="-top-23.5 -left-8.25"
        >
          <FeatureText
            className="top-22.75 left-11.75 w-138.25 gap-6"
            title="Event Discovery"
          >
            Personalized suggestions based on user preferences, location, and
            past bookings Filters for categories venues, and price ranges. The
            goal is to detect meaningful occurrences (events) in analysis, or
            automated responses.💰
          </FeatureText>
          <Image
            src="/about/event-discovery.svg"
            alt=""
            width={120}
            height={120}
            className="absolute top-11 left-157.75"
          />
        </FeatureCard>
      </ul>
    </section>
  );
}
