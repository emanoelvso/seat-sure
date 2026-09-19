"use client";
import Button from "@/components/Button";
import ComboBox from "@/components/ComboBox";
import DatePickerBox from "@/components/DatePickerBox";
import Faq from "@/components/Faq";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import MainCard from "@/components/MainCard";
import SelectBox from "@/components/SelectBox";
import SubCategoriePill from "@/components/SubCategoriePill";
import { useQuery } from "@apollo/client/react";
import { WidgetOutlineIcon } from "@solar-icons/react";
import {
  CalendarIcon,
  DollarMinimalisticIcon,
  MapPointIcon,
} from "@solar-icons/react/outline";
import { useEffect, useEffectEvent, useState } from "react";
import { DateRange } from "react-day-picker";
import formatLabel from "@/lib/utils/formatDateLabel";
import { FIND_EVENTS, FindEventsData } from "@/graphql/queries/find-events";
import EventsBanner from "@/components/EventsBanner";
import { GqlEvent } from "@/graphql/queries/home-sections";

function formatPrice(price: string | undefined) {
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

const EVENT_TYPE_LABELS = {
  CONCERT: "Concerts",
  SHOW: "Shows",
  SPORT: "Sports",
  FESTIVAL: "Festivals",
};

const PRICE_LABELS = {
  "-100": "Under $100",
  "100-300": "$100-300$",
  "300-500": "$300-$500",
  "+500": "Over $500",
};

export default function Events() {
  const [type, setEventType] = useState(undefined);
  const [price, setPrice] = useState(undefined);
  const [when, setWhen] = useState<DateRange | undefined>(undefined);
  const [city, setCity] = useState(undefined);
  const [offset, setOffset] = useState(0);
  const [allEvents, setAllEvents] = useState<GqlEvent[]>([]);

  const { data, previousData, error } = useQuery<FindEventsData>(FIND_EVENTS, {
    variables: {
      input: {
        type,
        city,
        dateRange: when,
        priceRange: formatPrice(price),
        offset,
      },
    },
  });

  function handleFilterChange<T>(setter: (v: T) => void) {
    return (value: T) => {
      setOffset(0);
      setAllEvents([]);
      setter(value);
    };
  }

  useEffect(() => {
    if (!data?.findEvents.events) return;

    if (offset === 0) {
      setAllEvents(data.findEvents.events);
    } else {
      setAllEvents((prev) => [...prev, ...data.findEvents.events]);
    }
  }, [data]);

  const {
    cities = [],
    events = [],
    hasMore,
  } = data?.findEvents ?? previousData?.findEvents ?? {};

  if (error)
    return <p className="text-red-400 py-20">Failed to load events.</p>;

  return (
    <>
      <Header className="py-4 px-27 mb-35" />
      <main>
        <div className="px-27 flex flex-col gap-8">
          <div className="flex gap-4 w-full">
            <SelectBox
              value={type}
              onChange={handleFilterChange(setEventType)}
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
              onChange={handleFilterChange(setWhen)}
              label="When"
              leftIcon={CalendarIcon}
            />
            <ComboBox
              label="Where"
              placeholder="Search city..."
              options={cities || []}
              value={city}
              onChange={handleFilterChange(setCity)}
              leftIcon={MapPointIcon}
            />
            <SelectBox
              value={price}
              onChange={handleFilterChange(setPrice)}
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
              <SubCategoriePill
                onClick={() => {
                  setAllEvents([]);
                  setEventType(undefined);
                }}
              >
                {EVENT_TYPE_LABELS[type]}
              </SubCategoriePill>
            )}
            {when?.from && (
              <SubCategoriePill
                onClick={() => {
                  setAllEvents([]);
                  setWhen(undefined);
                }}
              >
                {formatLabel(when)}
              </SubCategoriePill>
            )}
            {city && (
              <SubCategoriePill
                onClick={() => {
                  setAllEvents([]);
                  setCity(undefined);
                }}
              >
                {city}
              </SubCategoriePill>
            )}
            {price && (
              <SubCategoriePill
                onClick={() => {
                  setAllEvents([]);
                  setPrice(undefined);
                }}
              >
                {PRICE_LABELS[price]}
              </SubCategoriePill>
            )}
          </div>
        </div>

        <div className="px-27 grid grid-cols-4 gap-24 mb-40">
          {allEvents?.map((event, index) => (
            <MainCard
              className="mt-28 w-full"
              key={index}
              avatarUrl={event.coverImage}
              name={event.name}
              date={event.date}
              location={event.city}
              price={event.price}
            />
          ))}
        </div>

        {allEvents?.length ? (
          hasMore && (
            <div className="mx-auto flex items-center justify-center">
              <Button
                variant="primary"
                onClick={() => setOffset((prev) => prev + 20)}
              >
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
