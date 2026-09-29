import { EventShowcase } from "@/components/event-showcase";
import { FeedbacksCarousel } from "@/features/testimonials/components/feedbacks-carousel";
import { Footer } from "@/components/layouts/footer";
import { Header } from "@/components/layouts/header";
import { InvestimentIcon } from "@/components/icons/investiment-icon";
import { SmartDealIcon } from "@/components/icons/smart-deal-icon";
import { WatchIcon } from "@/components/icons/watch-icon";
import { SearchBox } from "@/features/events/components/search-box";
import { Faq } from "@/features/faq/components/faq";
import { getHomeSections } from "@/features/events/api/get-home-sections";
import { TopSingers } from "@/features/artists/components/top-singers";
import { toCardProps } from "@/utils/card-props";

export const revalidate = 60;

export default async function Home() {
  const { concerts, shows, sports, festivals } = await getHomeSections();

  return (
    <>
      <Header />
      <main className="flex flex-col items-center">
        <section aria-label="Hero" className="flex flex-col items-center">
          <h1 className="font-bold text-7xl max-w-3xl text-center mb-8">
            What <span className="text-tint-400">Concert</span> would you like
            to go to?
          </h1>
          <p className="text-xl mb-22">
            More than 100 concerts in different countries are now available to
            you.
          </p>

          <SearchBox />
        </section>

        <EventShowcase
          title="Concert"
          subCategories={concerts.categories}
          events={toCardProps(concerts.events ?? [])}
        />
        <EventShowcase
          title="Show"
          subCategories={shows.categories}
          events={toCardProps(shows.events ?? [])}
        />
        <TopSingers concerts={concerts.events ?? []} />
        <EventShowcase
          title="Sport"
          subCategories={sports.categories}
          events={toCardProps(sports.events ?? [])}
        />
        <EventShowcase
          title="Festivals"
          subCategories={festivals.categories}
          events={toCardProps(festivals.events ?? [])}
        />

        <section aria-label="Features" className="flex gap-6 mt-53">
          <div className="flex flex-col gap-6">
            <div className="flex items-center bg-section-gradient pr-13 pl-27 py-11 rounded-2xl gap-28">
              <InvestimentIcon />
              <div className="flex flex-col text-center">
                <h2 className="text-2xl font-bold">Refundable Tickets</h2>
                <span className="max-w-2xs text-neutral-100">
                  You can pay a ticket in 2 portions throughout a fixed period
                  of time. Start invoicing for free.
                </span>
              </div>
            </div>
            <div className="flex items-center bg-section-gradient pr-13 pl-27 py-11 rounded-2xl gap-28">
              <SmartDealIcon />
              <div className="flex flex-col text-center">
                <h2 className="text-2xl font-bold">Smart Deals</h2>
                <span className="max-w-2xs text-neutral-100">
                  of You can pay a ticket in 2 portions throughout a fixed
                  period time. Start invoicing for free.
                </span>
              </div>
            </div>
          </div>
          <div className="flex flex-col items-center bg-section-gradient rounded-2xl gap-28 pt-8 px-12">
            <div className="flex flex-col text-center">
              <h2 className="text-2xl font-bold">Book Anytime!</h2>
              <span className="text-neutral-100">
                of You can pay a ticket in 2 portions throughout a fixed period
                time. Start invoicing for free.
              </span>
            </div>

            <WatchIcon />
          </div>
        </section>

        <section
          aria-label="Testimonials"
          className="flex flex-col items-center w-full"
        >
          <h2 className="font-medium text-2xl mt-49 mb-2">
            Loved by Thousands
          </h2>
          <p className="text-[#999999] mb-8">
            Smooth easy ticket buying - hear it from our happy users.
          </p>
          <FeedbacksCarousel
            row1={[
              {
                comment:
                  "Vestibulum eu quam nec neque pellentesque efficitur id eget nisl. Proin porta est convallis lacus.",
                name: "Jane Cooper",
                avatarUrl:
                  "https://sb.kaleidousercontent.com/67418/1920x1545/c5f15ac173/samuel-raita-ridxdghg7pw-unsplash.jpg",
                rating: 3.5,
              },
              {
                comment:
                  "Amazing experience! Tickets were easy to get and the event was unforgettable. Highly recommended.",
                name: "Mark Rivera",
                avatarUrl:
                  "https://sb.kaleidousercontent.com/67418/1920x1545/c5f15ac173/samuel-raita-ridxdghg7pw-unsplash.jpg",
                rating: 5,
              },
              {
                comment:
                  "Smooth checkout process and great seat selection. Will definitely use this platform again.",
                name: "Emily Zhao",
                avatarUrl:
                  "https://sb.kaleidousercontent.com/67418/1920x1545/c5f15ac173/samuel-raita-ridxdghg7pw-unsplash.jpg",
                rating: 4.5,
              },
              {
                comment:
                  "Love how easy it is to browse events. Found my favorite artist in seconds!",
                name: "Carlos Mendes",
                avatarUrl:
                  "https://sb.kaleidousercontent.com/67418/1920x1545/c5f15ac173/samuel-raita-ridxdghg7pw-unsplash.jpg",
                rating: 4,
              },
            ]}
            row2={[
              {
                comment:
                  "Refundable tickets gave me peace of mind. Great service overall!",
                name: "Sophia Larsson",
                avatarUrl:
                  "https://sb.kaleidousercontent.com/67418/1920x1545/c5f15ac173/samuel-raita-ridxdghg7pw-unsplash.jpg",
                rating: 5,
              },
              {
                comment:
                  "The smart deals feature saved me a lot of money. Best ticket platform I've tried.",
                name: "Liam O'Brien",
                avatarUrl:
                  "https://sb.kaleidousercontent.com/67418/1920x1545/c5f15ac173/samuel-raita-ridxdghg7pw-unsplash.jpg",
                rating: 4.5,
              },
              {
                comment:
                  "Booking was instant and customer support was super helpful. 10/10!",
                name: "Amara Nwosu",
                avatarUrl:
                  "https://sb.kaleidousercontent.com/67418/1920x1545/c5f15ac173/samuel-raita-ridxdghg7pw-unsplash.jpg",
                rating: 5,
              },
              {
                comment:
                  "Great variety of events. Found concerts I didn't even know were happening near me.",
                name: "Tomas Becker",
                avatarUrl:
                  "https://sb.kaleidousercontent.com/67418/1920x1545/c5f15ac173/samuel-raita-ridxdghg7pw-unsplash.jpg",
                rating: 4,
              },
            ]}
          />
        </section>

        <Faq />
      </main>
      <Footer />
    </>
  );
}
