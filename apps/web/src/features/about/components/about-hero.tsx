import Image from "next/image";
import { MicrophoneIcon } from "@solar-icons/react/linear";

export function AboutHero() {
  return (
    <section className="relative isolate flex h-158 flex-col items-center overflow-hidden px-6 pt-59 text-center">
      <Image
        src="/about/hero.png"
        alt="Concert crowd with raised hands"
        fill
        preload
        sizes="100vw"
        className="-z-10 object-cover"
      />

      {/*
        The microphone draws over an invisible "o", so the heading still reads
        "About us". Both stay inline: block-level children add word breaks to
        the accessible name.
      */}
      <h1 className="text-6xl leading-none font-bold text-white">
        Ab
        <span className="opacity-0">o</span>
        <MicrophoneIcon
          aria-hidden="true"
          size="1.3em"
          strokeWidth={1.2}
          className="-mr-2 -ml-10 inline translate-y-2 rotate-30 align-top"
        />
        ut us
      </h1>

      <p className="mt-18 max-w-247 text-xl leading-8 text-white">
        Welcome to SeatSure – your go-to platform for finding, booking, and
        enjoying top events worldwide. From concerts and sports to theater and
        festivals, we make unforgettable experiences easy to access. Behind the
        scenes, our friendly and passionate team is here to support you every
        step of the way. Got a question or need help? We’re just a message
        away!
      </p>
    </section>
  );
}
