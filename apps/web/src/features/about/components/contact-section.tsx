import Image from "next/image";
import type { ReactNode } from "react";
import type { Icon } from "@solar-icons/react/lib/types";
import {
  LetterIcon,
  MapPointIcon,
  PhoneCallingIcon,
} from "@solar-icons/react/outline";

const PHONE = "+132458900";
const EMAIL = "info@seatsure.com";
const CITY = "Las Vegas";

// Four concentric rings that fade outwards.
const RINGS = [
  "size-18.5 border-primary/40",
  "size-22.75 border-primary/30",
  "size-27 border-primary/20",
  "size-31.5 border-primary/10",
];

function ContactCard({
  icon: CardIcon,
  children,
}: {
  icon: Icon;
  children: ReactNode;
}) {
  return (
    <li className="flex flex-col items-center gap-8 rounded-3xl bg-neutral-700 px-13.5 py-10 text-2xl font-medium text-white">
      <span className="relative flex size-12 items-center justify-center">
        {/* Glow and fading rings behind the icon, as drawn in Figma. */}
        <span
          aria-hidden="true"
          className="absolute size-13.5 rounded-full bg-shade-100 blur-xl"
        />
        {RINGS.map((ring) => (
          <span
            key={ring}
            aria-hidden="true"
            className={`absolute top-1/2 left-1/2 -translate-1/2 rounded-full border-2 ${ring}`}
          />
        ))}
        <CardIcon size={48} className="relative text-primary" />
      </span>
      {children}
    </li>
  );
}

export function ContactSection() {
  return (
    <section
      id="contact"
      aria-labelledby="contact-heading"
      className="flex flex-col items-center px-27"
    >
      <h2 id="contact-heading" className="text-3xl font-semibold text-white">
        Join to enjoy your moments!
      </h2>
      <p className="mt-2 text-neutral-200">
        Where every second becomes a memory
      </p>

      <ul className="mt-10 grid w-full grid-cols-3 gap-10">
        <ContactCard icon={PhoneCallingIcon}>
          <a href={`tel:${PHONE}`} className="hover:text-tint-400">
            {PHONE}
          </a>
        </ContactCard>
        <ContactCard icon={LetterIcon}>
          <a href={`mailto:${EMAIL}`} className="hover:text-tint-400">
            {EMAIL}
          </a>
        </ContactCard>
        <ContactCard icon={MapPointIcon}>
          <span>{CITY}</span>
        </ContactCard>
      </ul>

      <Image
        src="/about/map.png"
        alt="Map of Las Vegas with the SeatSure location pin"
        width={2448}
        height={628}
        className="mt-10 w-full rounded-4xl"
      />
    </section>
  );
}
