import Image from "next/image";

export function ExperienceSection() {
  return (
    <section
      aria-labelledby="experience-heading"
      className="flex flex-col gap-11 px-27"
    >
      <div className="flex items-center justify-between">
        <Image
          src="/about/concert-hall.png"
          alt="Orchestra performing on stage in a packed, purple-lit concert hall"
          width={434}
          height={434}
          className="rounded-3xl"
        />
        <div className="w-135">
          <h2
            id="experience-heading"
            className="text-3xl leading-tight font-semibold text-white"
          >
            <span className="block">More Than Just a Ticket</span>
            <span className="sr-only"> — </span>
            <span className="block">The SeatSure Experience</span>
          </h2>
          <ol className="mt-2 list-decimal pl-7 text-lg leading-10 text-white">
            <li>
              Every ticket is the start of a memory, not just entry to an event.
            </li>
            <li>
              Whether it’s a concert, sports match, or theater show – your full
              experience matters.
            </li>
          </ol>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <ol className="max-w-145 list-decimal pl-6 text-lg leading-8 text-white">
          <li>
            SeatSure ensures a smooth and enjoyable journey from booking to the
            final moment.
          </li>
          <li>We connect you to world-class events with just a few clicks.</li>
          <li>Our platform is designed for ease, speed, and excitement.</li>
          <li>With SeatSure, every step feels like part of the show.</li>
        </ol>
        <Image
          src="/about/laser-show.png"
          alt="Crowd under purple laser lights at a live show"
          width={434}
          height={434}
          className="rounded-3xl"
        />
      </div>
    </section>
  );
}
