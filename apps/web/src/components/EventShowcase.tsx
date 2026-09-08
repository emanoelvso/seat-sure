import MainCard, { MainCardProps } from "./MainCard";
import SubCategoriePill from "./SubCategoriePill";

interface EventShowcaseProps {
  title: string;
  subCategories: string[];
  events: MainCardProps[];
}

export default function EventShowcase({
  title,
  subCategories,
  events,
}: EventShowcaseProps) {
  return (
    <div className="w-full px-27 mb-25">
      <div className="flex items-center justify-between py-5">
        <span className="text-3xl font-semibold">{title}</span>
        <span>See all</span>
      </div>

      <hr className="border-neutral-700 w-full mb-6" />

      <div className="flex gap-3">
        {subCategories.map((subCategorie, index) => (
          <SubCategoriePill
            key={index}
            variant={index === 0 ? "active" : "default"}
          >
            {subCategorie}
          </SubCategoriePill>
        ))}
      </div>

      <div className="flex gap-6">
        {events.map((event, index) => (
          <MainCard
            key={index}
            avatarUrl={event.avatarUrl}
            timeToEnd={event.timeToEnd}
            name={event.name}
            date={event.date}
            location={event.location}
            price={event.price}
          />
        ))}
      </div>
    </div>
  );
}
