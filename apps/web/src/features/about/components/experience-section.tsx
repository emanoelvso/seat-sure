import Image from "next/image";

export function ExperienceSection() {
  return (
    <section
      aria-labelledby="experience-heading"
      className="flex flex-col gap-11 px-27"
    >
      <div className="flex items-center justify-between">
        <Image
          src="/about/concert-hall.jpg"
          alt="Orchestra performing on stage in a packed, purple-lit concert hall"
          width={736}
          height={981}
          sizes="434px"
          className="size-108.5 rounded-3xl object-cover"
        />
        <div className="w-136">
          <h2
            id="experience-heading"
            className="text-section font-bold text-white"
          >
            <span className="block">More Than Just a Ticket</span>
            <span className="sr-only"> — </span>
            <span className="block">The SeatSure Experience</span>
          </h2>
          <ol className="list-decimal pl-7 text-xl leading-10 font-medium text-white">
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
        <ol className="w-150 list-decimal pl-7 text-xl leading-8 font-medium text-white">
          <li>
            SeatSure ensures a smooth and enjoyable journey from booking to the
            final moment.
          </li>
          <li>We connect you to world-class events with just a few clicks.</li>
          <li>Our platform is designed for ease, speed, and excitement.</li>
          <li>With SeatSure, every step feels like part of the show.</li>
        </ol>
        <Image
          src="/about/laser-show.jpg"
          alt="Crowd under purple laser lights at a live show"
          width={736}
          height={414}
          sizes="434px"
          className="size-108.5 rounded-3xl object-cover"
        />
      </div>
    </section>
  );
}
