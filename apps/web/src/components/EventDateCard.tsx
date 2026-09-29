import Link from "next/link";
import {
  BookmarkIcon,
  CalendarIcon,
  ClockCircleIcon,
  MapPointIcon,
} from "@solar-icons/react/outline";
import { buttonVariants } from "@/components/ui/button";
import { ShareButton } from "@/components/ui/share-button";
import { TagPill } from "@/components/ui/tag-pill";
import { GqlEvent } from "@/graphql/queries/home-sections";
import {
  formatEventDate,
  formatEventLocation,
  formatEventTime,
} from "@/utils/event-format";

interface EventDateCardProps {
  event: GqlEvent;
  shareTitle: string;
}

export default function EventDateCard({
  event,
  shareTitle,
}: EventDateCardProps) {
  return (
    <article className="flex flex-col gap-6 rounded-3xl bg-neutral-900 p-6">
      <div className="flex items-start justify-between gap-6 border-b border-dashed border-neutral-300 pb-3.5">
        <div className="flex min-w-0 items-center gap-2">
          <MapPointIcon size={24} className="shrink-0 text-primary" />
          <h3 className="truncate text-xl font-bold">
            {formatEventLocation(event)}
          </h3>
        </div>
        <div className="flex shrink-0 items-center gap-4">
          <ShareButton title={shareTitle} />
          <span aria-hidden="true" data-testid="bookmark-icon" className="flex">
            <BookmarkIcon size={24} />
          </span>
          <Link
            href={`/events/${event.id}/tickets`}
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            Get Tickets
          </Link>
        </div>
      </div>

      <div className="flex items-end justify-between gap-4">
        <div className="flex flex-col gap-2 px-8 text-neutral-200">
          <span className="flex items-center gap-1">
            <CalendarIcon size={16} />
            {formatEventDate(event.startAt)}
          </span>
          <span className="flex items-center gap-1">
            <ClockCircleIcon size={16} />
            {formatEventTime(event.startAt)}
          </span>
        </div>
        {event.tags && event.tags.length > 0 && (
          <ul aria-label="Tags" className="flex flex-wrap justify-end gap-4">
            {event.tags.map((tag) => (
              <li key={tag}>
                <TagPill size="xs">{tag}</TagPill>
              </li>
            ))}
          </ul>
        )}
      </div>
    </article>
  );
}
