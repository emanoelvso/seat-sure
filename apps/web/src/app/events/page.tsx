import type { SearchParams } from "nuqs/server";
import { Footer } from "@/components/layouts/footer";
import { Header } from "@/components/layouts/header";
import { getEvents } from "@/features/events/api/get-events";
import { EventsBanner } from "@/features/events/components/events-banner";
import { EventsFilters } from "@/features/events/components/events-filters";
import { EventsList } from "@/features/events/components/events-list";
import {
  loadEventsSearchParams,
  serializeEventsSearchParams,
} from "@/features/events/utils/events-search-params";
import { Faq } from "@/features/faq/components/faq";

export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await loadEventsSearchParams(searchParams);
  const { events, cities, hasMore } = await getEvents(params);
  const nextPageHref = serializeEventsSearchParams("/events", {
    ...params,
    page: Math.min(params.page, 50) + 1,
  });

  return (
    <>
      <Header />
      <main>
        <EventsFilters cities={cities} />
        <EventsList
          events={events ?? []}
          hasMore={hasMore}
          nextPageHref={nextPageHref}
        />
        <EventsBanner />
        <Faq />
      </main>
      <Footer />
    </>
  );
}
