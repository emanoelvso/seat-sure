import Carousel from "./Carousel";
import SingerCard from "./SingerCard";

export interface Singer {
  name: string;
  date: string;
  location: string;
  imageUrl?: string;
}

export interface SingersCarouselProps {
  row1: Singer[];
  row2: Singer[];
}

export default function SingersCarousel({ row1, row2 }: SingersCarouselProps) {
  return (
    <Carousel
      row1={row1}
      row2={row2}
      renderItem={(singer, i) => (
        <SingerCard
          key={i}
          name={singer.name}
          date={singer.date}
          location={singer.location}
          imageUrl={singer.imageUrl}
        />
      )}
    />
  );
}
