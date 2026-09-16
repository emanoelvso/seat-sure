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
import {
  GET_HOME_SECTIONS,
  GetHomeSectionsData,
  GqlEvent,
} from "@/graphql/queries/home-sections";
import { useQuery } from "@apollo/client/react";
import { WidgetOutlineIcon } from "@solar-icons/react";
import {
  CalendarIcon,
  DollarMinimalisticIcon,
  MapPointIcon,
} from "@solar-icons/react/outline";
import Image from "next/image";
import { useState } from "react";
import { DateRange } from "react-day-picker";
import formatLabel from "@/lib/utils/formatDateLabel";

export default function Events() {
  const [eventType, setEventType] = useState("");
  const [price, setPrice] = useState("");
  const [when, setWhen] = useState<DateRange | undefined>(undefined);
  const [city, setCity] = useState("");

  console.info(when);

  const { data, loading, error } =
    useQuery<GetHomeSectionsData>(GET_HOME_SECTIONS);

  if (loading) return <p className="text-neutral-400 py-20">Loading events…</p>;
  if (error)
    return <p className="text-red-400 py-20">Failed to load events.</p>;

  const { concerts, shows, sports, festivals } = data!.getHomeSections;
  const allEvents: GqlEvent[] = [
    ...concerts!.events!,
    ...shows!.events!,
    ...sports!.events!,
    ...festivals!.events!,
  ];

  const cities = [...new Set(allEvents.map((e) => e.city))].sort();

  const events = city
    ? allEvents.filter((e) => e.city.toLowerCase().includes(city.toLowerCase()))
    : allEvents;

  return (
    <>
      <Header className="py-4 px-27 mb-35" />
      <main>
        {/* Filters */}
        <div className="px-27 flex flex-col gap-8">
          <div className="flex gap-4 w-full">
            <SelectBox
              value={eventType}
              onChange={setEventType}
              label="What"
              options={[
                { value: "concerts", label: "Concerts" },
                { value: "shows", label: "Shows" },
                { value: "sports", label: "Sports" },
                { value: "festivals", label: "Festivals" },
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
              options={cities}
              value={city}
              onChange={setCity}
              leftIcon={MapPointIcon}
            />
            <SelectBox
              value={price}
              onChange={setPrice}
              label="Price"
              options={[
                { value: "under-100", label: "Under $100" },
                { value: "100-300", label: "$100-300$" },
                { value: "300-500", label: "$300-$500" },
                { value: "over-500", label: "Over $500" },
              ]}
              leftIcon={DollarMinimalisticIcon}
            />
          </div>
          <div className="flex items-center gap-4">
            <p className="font-xl text-white">your search:</p>
            {eventType && <SubCategoriePill>{eventType}</SubCategoriePill>}
            {when?.from && (
              <SubCategoriePill>{formatLabel(when)}</SubCategoriePill>
            )}
            {city && <SubCategoriePill>{city}</SubCategoriePill>}
            {price && <SubCategoriePill>{price}</SubCategoriePill>}
          </div>
        </div>

        <div className="px-27 grid grid-cols-4 gap-24">
          {events.map((event, index) => (
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

        <div className="mt-40 mb-32 mx-auto flex items-center justify-center">
          <Button variant="primary">View more Events</Button>
        </div>
        <div className="relative w-full h-[336px] rounded-2xl overflow-hidden">
          <Image
            className="object-cover"
            src={"/artists.png"}
            alt="Avatar"
            fill
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(to right, #0F0F0F 10%, rgba(19,15,20,0.97) 26%, rgba(29,14,34,0.91) 48%, rgba(172,0,229,0) 170%)",
            }}
          />
          <div className="absolute inset-0 pl-27 flex flex-col justify-center gap-4">
            <span className="font-bold text-4xl">
              Start exploring event today!
            </span>
            <span className="font-medium text-neutral-100 text-2xl">
              Find concerts, shows, and more near you.
            </span>
            <Button className="w-fit" size="lg">
              Start
            </Button>
          </div>
        </div>

        <Faq />
      </main>
      <Footer />
    </>
  );
}
