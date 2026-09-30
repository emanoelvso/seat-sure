import { TZDate } from "@date-fns/tz";
import { env } from "@/config/env";
import {
  SingersCarousel,
  Singer,
} from "@/features/artists/components/singers-carousel";
import { EventSummary } from "@/types/api";

function toSingerProps(events: EventSummary[]): Singer[] {
  return events.map((c) => {
    const date = new TZDate(c.date, env.timeZone);

    return {
      name: c.name,
      date: `${date.getDay()} ${date.toLocaleString("en-US", { month: "long" })}`,
      location: c.city,
      imageUrl: c.coverImage,
    };
  });
}

export function TopSingers({ concerts }: { concerts: EventSummary[] }) {
  const mid = Math.ceil(concerts.length / 2);

  return (
    <section
      aria-label="Top Singers"
      className="flex flex-col items-center w-full mb-25"
    >
      <h2 className="font-medium text-2xl mb-2">Top Singers</h2>
      <p className="text-neutral-200 mb-8">
        Find the singers you&apos;re looking for quickly.{" "}
        <span className="text-tint-400">You can see more</span>.
      </p>
      <SingersCarousel
        row1={toSingerProps(concerts.slice(0, mid))}
        row2={toSingerProps(concerts.slice(mid))}
      />
    </section>
  );
}
