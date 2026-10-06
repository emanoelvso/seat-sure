import Image from "next/image";
import { HandMicrophoneIcon } from "@/components/icons/hand-microphone-icon";

export function AboutHero() {
  return (
    <section className="relative isolate flex h-158 flex-col items-center overflow-hidden px-6 pt-58 text-center">
      <Image
        src="/about/hero.jpg"
        alt="Concert crowd with raised hands"
        fill
        preload
        sizes="100vw"
        className="-z-10 object-cover"
      />
      {/* Figma's fill stack over the photo: a dark wash, then a fade into the page. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-neutral-1000/70"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-linear-to-b from-transparent to-background"
      />

      {/*
        The microphone draws over an invisible "o", so the heading still reads
        "About us". The "o" stays inline (padded to the gap Figma leaves for
        the icon): block-level children add word breaks to the accessible name.
      */}
      <h1 className="relative text-hero font-bold text-white">
        Ab
        <span className="px-2.75 opacity-0">o</span>
        ut us
        <HandMicrophoneIcon className="absolute top-6.75 left-12 size-20" />
      </h1>

      <p className="mt-18 max-w-247 text-xl leading-8 font-medium text-white">
        Welcome to SeatSure – your go-to platform for finding, booking, and
        enjoying top events worldwide. From concerts and sports to theater and
        festivals, we make unforgettable experiences easy to access. <br />
        Behind the scenes, our friendly and passionate team is here to support
        you every step of the way. <br />
        Got a question or need help? We’re just a message away!
      </p>
    </section>
  );
}
