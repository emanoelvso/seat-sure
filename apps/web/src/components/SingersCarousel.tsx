import SingerCard from "./SingerCard";

interface Singer {
  name: string;
  date: string;
  location: string;
  imageUrl?: string;
}

interface SingersCarouselProps {
  row1: Singer[];
  row2: Singer[];
}

function CarouselRow({
  singers,
  direction,
}: {
  singers: Singer[];
  direction: "left" | "right";
}) {
  return (
    <div className="overflow-hidden w-full">
      <div
        className={`flex w-max ${
          direction === "left" ? "animate-scroll-left" : "animate-scroll-right"
        }`}
      >
        {[0, 1, 2, 3].map((setIndex) => (
          <div key={setIndex} className="flex gap-4 pr-4">
            {singers.map((singer, i) => (
              <SingerCard
                key={i}
                name={singer.name}
                date={singer.date}
                location={singer.location}
                imageUrl={singer.imageUrl}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function SingersCarousel({ row1, row2 }: SingersCarouselProps) {
  return (
    <div className="flex flex-col gap-4 w-full overflow-hidden">
      <CarouselRow singers={row1} direction="left" />
      <CarouselRow singers={row2} direction="right" />
    </div>
  );
}
