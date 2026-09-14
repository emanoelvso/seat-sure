import HomeSections from "@/components/HomeSections";
import FeedbacksCarousel from "@/components/FeedbacksCarousel";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import InvestimentIcon from "@/components/icons/InvestimentIcon";
import SmartDealIcon from "@/components/icons/SmartDealIcon";
import WatchIcon from "@/components/icons/WatchIcon";
import { QuestionAccordion } from "@/components/QuestionAccordion";
import SearchBox from "@/components/SearchBox";
import SingersCarousel from "@/components/SingersCarousel";
import EventShowcase from "@/components/EventShowcase";

export default function Home() {
  return (
    <>
      <Header className="py-4 px-8 mb-35" />
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

        <HomeSections />

        <section
          aria-label="Top Singers"
          className="flex flex-col items-center w-full"
        >
          <h2 className="font-medium text-2xl mb-2">Top Singers</h2>
          <p className="text-[#999999] mb-8">
            Find the singers you&apos;re looking for quickly.{" "}
            <span className="text-tint-400">You can see more</span>.
          </p>
          <SingersCarousel
            row1={[
              { name: "Adele", date: "5 May", location: "New York" },
              { name: "Drake", date: "20 June", location: "Toronto" },
              { name: "Taylor Swift", date: "10 July", location: "Nashville" },
              {
                name: "Ed Sheeran",
                date: "25 August",
                location: "Los Angeles",
              },
              {
                name: "Billie Eilish",
                date: "30 September",
                location: "Chicago",
              },
            ]}
            row2={[
              { name: "Adele", date: "5 May", location: "New York" },
              { name: "Drake", date: "30 June", location: "Toronto" },
              { name: "Taylor Swift", date: "13 July", location: "Nashville" },
              { name: "Ed Sheeran", date: "25 August", location: "Dublin" },
              {
                name: "Billie Eilish",
                date: "10 September",
                location: "Los Angeles",
              },
            ]}
          />
        </section>

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

        <section aria-label="FAQ" className="flex flex-col items-center w-full">
          <div className="mt-34 text-center max-w-xl">
            <h2 className="text-3xl font-bold mb-2">
              Frequently Asked <span className="text-tint-400">Questions</span>
            </h2>
            <p className="text-neutral-200">
              Explore the most common questions and detailed answers about our
              events ot concerts, and security to help guide your journey in the
              EVENJO.
            </p>
          </div>

          <div className="w-full max-w-3xl mt-10 mb-34 px-4">
            <QuestionAccordion
              items={[
                {
                  value: "q1",
                  question:
                    "When Exclusive Private Market for Event ticket sale Opportunities?",
                  answer:
                    "Our exclusive private market opens periodically for verified members. Sign up to receive early access notifications and be the first to grab limited ticket opportunities.",
                },
                {
                  value: "q2",
                  question: "How do refundable tickets work?",
                  answer:
                    "Refundable tickets can be returned up to 48 hours before the event for a full refund. Simply go to your order history and select the refund option.",
                },
                {
                  value: "q3",
                  question: "Can I split my payment into installments?",
                  answer:
                    "Yes! With Smart Deals you can split your ticket cost into 2 installments over a fixed period. No hidden fees — start for free.",
                },
                {
                  value: "q4",
                  question: "How do I find events near me?",
                  answer:
                    "Use the search box on the home page and filter by location. You can also browse by category to discover events you didn't know were happening nearby.",
                },
                {
                  value: "q5",
                  question: "Is my payment information secure?",
                  answer:
                    "Absolutely. All transactions are encrypted with industry-standard SSL and we never store your full card details on our servers.",
                },
              ]}
            />
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
