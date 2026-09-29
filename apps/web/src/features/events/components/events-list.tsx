import Link from "next/link";
import { MainCard } from "@/components/main-card";
import { buttonVariants } from "@/components/ui/button";
import { EventSummary } from "@/types/api";
import { toCardProps } from "@/utils/card-props";

interface EventsListProps {
  events: EventSummary[];
  hasMore: boolean;
  nextPageHref: string;
}

export function EventsList({ events, hasMore, nextPageHref }: EventsListProps) {
  return (
    <>
      <div className="px-27 grid grid-cols-4 gap-24 mb-40">
        {toCardProps(events).map((card, index) => (
          <MainCard
            className="mt-28 w-full"
            key={events[index].id}
            {...card}
          />
        ))}
      </div>

      {events.length ? (
        hasMore && (
          <div className="mx-auto flex items-center justify-center">
            <Link
              href={nextPageHref}
              scroll={false}
              className={buttonVariants({ variant: "primary" })}
            >
              View more Events
            </Link>
          </div>
        )
      ) : (
        <span className="flex items-center justify-center">No Events</span>
      )}
    </>
  );
}
