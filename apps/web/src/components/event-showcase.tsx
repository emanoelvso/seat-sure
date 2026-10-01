"use client";

import Link from "next/link";
import { MainCard, MainCardProps } from "./main-card";
import { SubCategoriePill } from "@/components/ui/sub-categorie-pill";
import { paths } from "@/config/paths";
import { EventType } from "@/utils/event-types";
import { useState } from "react";

interface EventShowcaseProps {
  title: string;
  type: EventType;
  subCategories?: string[] | null;
  events: MainCardProps[];
}

export function EventShowcase({
  title,
  type,
  subCategories,
  events,
}: EventShowcaseProps) {
  const [activeCategory, setActiveCategory] = useState("All");
  const filteredEvents =
    activeCategory === "All"
      ? events
      : events.filter((e) => e.category === activeCategory);

  return (
    <section aria-label={title} className="w-full px-27 mb-25">
      <div className="flex items-center justify-between py-5">
        <h2 className="text-3xl font-semibold">{title}</h2>
        <Link
          href={paths.events.getHref(type)}
          className="text-neutral-200 hover:text-white transition"
        >
          See all
        </Link>
      </div>

      <hr className="border-neutral-700 w-full mb-6" />

      {subCategories && (
        <div className="flex gap-3">
          {["All", ...(subCategories ?? [])].map((subCategory, index) => (
            <SubCategoriePill
              key={index}
              variant={subCategory === activeCategory ? "active" : "default"}
              onClick={() => setActiveCategory(subCategory)}
            >
              {subCategory}
            </SubCategoriePill>
          ))}
        </div>
      )}

      <div className="flex gap-6 overflow-x-auto pb-20 [&::-webkit-scrollbar]:hidden">
        {filteredEvents.map((event) => (
          <MainCard
            className="mt-6"
            key={event.href}
            avatarUrl={event.avatarUrl}
            timeToEnd={event.timeToEnd}
            name={event.name}
            date={event.date}
            location={event.location}
            price={event.price}
            href={event.href}
          />
        ))}
      </div>
    </section>
  );
}
