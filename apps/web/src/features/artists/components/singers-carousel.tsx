import { Carousel } from "@/components/ui/carousel";
import { SingerCard } from "./singer-card";

export interface Singer {
  name: string;
  date: string;
  location: string;
  imageUrl?: string;
  href?: string;
}

export interface SingersCarouselProps {
  row1: Singer[];
  row2: Singer[];
}

export function SingersCarousel({ row1, row2 }: SingersCarouselProps) {
  return (
    <Carousel
      row1={row1}
      row2={row2}
      renderItem={(singer, i, loopCopy) => (
        <SingerCard
          key={i}
          name={singer.name}
          date={singer.date}
          location={singer.location}
          imageUrl={singer.imageUrl}
          href={singer.href}
          tabIndex={loopCopy ? -1 : undefined}
        />
      )}
    />
  );
}
