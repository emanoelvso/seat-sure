import Image from "next/image";
import type { ReactNode } from "react";
import type { Icon } from "@solar-icons/react/lib/types";
import {
  LetterIcon,
  MapPointIcon,
  PhoneCallingIcon,
} from "@solar-icons/react/linear";

const PHONE = "+132458900";
const EMAIL = "info@seatsure.com";
const CITY = "Las Vegas";

function ContactCard({
  icon: CardIcon,
  children,
}: {
  icon: Icon;
  children: ReactNode;
}) {
  return (
    <li className="flex flex-col items-center gap-7 rounded-3xl bg-neutral-700 pt-8 pb-10 text-2xl text-white">
      <span className="flex size-16 items-center justify-center rounded-full bg-shade-400 shadow-xl shadow-primary/40 ring-8 ring-shade-400/40">
        <CardIcon size={32} className="text-primary" />
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
        width={1224}
        height={314}
        className="mt-10 w-full rounded-3xl"
      />
    </section>
  );
}
