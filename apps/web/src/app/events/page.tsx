"use client";
import { Button } from "@/components/ui/button";
import { ComboBox } from "@/components/ui/combo-box";
import { DatePickerBox } from "@/components/ui/date-picker-box";
import Faq from "@/components/Faq";
import { Footer } from "@/components/layouts/footer";
import { Header } from "@/components/layouts/header";
import { MainCard } from "@/components/main-card";
import { SelectBox } from "@/components/ui/select-box";
import { SubCategoriePill } from "@/components/ui/sub-categorie-pill";
import { useQuery } from "@apollo/client/react";
import { WidgetOutlineIcon } from "@solar-icons/react";
import {
  CalendarIcon,
  DollarMinimalisticIcon,
  MapPointIcon,
} from "@solar-icons/react/outline";
import { useState } from "react";
import { DateRange } from "react-day-picker";
import { formatDateLabel } from "@/utils/format-date-label";
import { FIND_EVENTS, FindEventsData } from "@/graphql/queries/find-events";
import EventsBanner from "@/components/EventsBanner";
import { toCardProps } from "@/utils/card-props";

type EventType = "CONCERT" | "SHOW" | "SPORT" | "FESTIVAL";
type PriceRange = "-100" | "100-300" | "300-500" | "+500";

function formatPrice(price: PriceRange | undefined) {
  switch (price) {
    case "-100":
      return { min: 100 };
    case "100-300":
      return { min: 100, max: 300 };
    case "300-500":
      return { min: 300, max: 500 };
    case "+500":
      return { min: 500 };
  }
}

const EVENT_TYPE_LABELS: Record<EventType, string> = {
  CONCERT: "Concerts",
  SHOW: "Shows",
  SPORT: "Sports",
  FESTIVAL: "Festivals",
};

const PRICE_LABELS: Record<PriceRange, string> = {
  "-100": "Under $100",
  "100-300": "$100-300$",
  "300-500": "$300-$500",
  "+500": "Over $500",
};

export default function Events() {
  const [type, setEventType] = useState<EventType | undefined>(undefined);
  const [price, setPrice] = useState<PriceRange | undefined>(undefined);
  const [when, setWhen] = useState<DateRange | undefined>(undefined);
  const [city, setCity] = useState<string | undefined>(undefined);

  const { data, previousData, error, fetchMore } = useQuery<FindEventsData>(
    FIND_EVENTS,
    {
      variables: {
        input: {
          type,
          city,
          dateRange: when,
          priceRange: formatPrice(price),
          offset: 0,
        },
      },
      notifyOnNetworkStatusChange: true,
    },
  );

  const findEvents = data?.findEvents ?? previousData?.findEvents;
  const cities = findEvents?.cities ?? [];
  const events = findEvents?.events ?? [];
  const hasMore = findEvents?.hasMore ?? false;

  function loadMore() {
    fetchMore({
      variables: {
        input: {
          type,
          city,
          dateRange: when,
          priceRange: formatPrice(price),
          offset: events.length,
        },
      },
      updateQuery: (prev, { fetchMoreResult }) => ({
        findEvents: {
          ...fetchMoreResult.findEvents,
          events: [
            ...(prev.findEvents.events ?? []),
            ...(fetchMoreResult.findEvents.events ?? []),
          ],
        },
      }),
    });
  }

  if (error)
    return <p className="text-red-400 py-20">Failed to load events.</p>;

  return (
    <>
      <Header />
      <main>
        <div className="px-27 flex flex-col gap-8">
          <div className="flex gap-4 w-full">
            <SelectBox
              value={type}
              onChange={(v) => setEventType(v as EventType | undefined)}
              label="What"
              options={[
                { value: "CONCERT", label: "Concert" },
                { value: "SHOW", label: "Show" },
                { value: "SPORT", label: "Sport" },
                { value: "FESTIVAL", label: "Festival" },
              ]}
              leftIcon={WidgetOutlineIcon}
            />
            <DatePickerBox
              value={when}
              onChange={setWhen}
              label="When"
              leftIcon={CalendarIcon}
            />
            <ComboBox
              label="Where"
              placeholder="Search city..."
              options={cities || []}
              value={city}
              onChange={setCity}
              leftIcon={MapPointIcon}
            />
            <SelectBox
              value={price}
              onChange={(v) => setPrice(v as PriceRange | undefined)}
              label="Price"
              options={[
                { value: "-100", label: "Under $100" },
                { value: "100-300", label: "$100-300$" },
                { value: "300-500", label: "$300-$500" },
                { value: "+500", label: "Over $500" },
              ]}
              leftIcon={DollarMinimalisticIcon}
            />
          </div>
          <div className="flex items-center gap-4">
            <p className="font-xl text-white">your search:</p>
            {type && (
              <SubCategoriePill onClick={() => setEventType(undefined)}>
                {EVENT_TYPE_LABELS[type]}
              </SubCategoriePill>
            )}
            {when?.from && (
              <SubCategoriePill onClick={() => setWhen(undefined)}>
                {formatDateLabel(when)}
              </SubCategoriePill>
            )}
            {city && (
              <SubCategoriePill onClick={() => setCity(undefined)}>
                {city}
              </SubCategoriePill>
            )}
            {price && (
              <SubCategoriePill onClick={() => setPrice(undefined)}>
                {PRICE_LABELS[price]}
              </SubCategoriePill>
            )}
          </div>
        </div>

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
              <Button variant="primary" onClick={loadMore}>
                View more Events
              </Button>
            </div>
          )
        ) : (
          <span className="flex items-center justify-center">No Events</span>
        )}

        <EventsBanner />

        <Faq />
      </main>
      <Footer />
    </>
  );
}
