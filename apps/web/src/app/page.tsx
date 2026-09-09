import EventShowcase from "@/components/EventShowcase";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import SearchBox from "@/components/SearchBox";
import SingersCarousel from "@/components/SingersCarousel";

export default function Home() {
  return (
    <>
      <Header className="py-4 px-8 mb-35" />
      <div className="flex flex-col items-center">
        <h2 className="font-bold text-7xl max-w-3xl text-center mb-8">
          What <span className="text-tint-400">Concert</span> would you like to
          go to?
        </h2>
        <p className="text-xl mb-22">
          More than 100 concerts in different countries are now available to
          you.
        </p>

        <SearchBox />

        <EventShowcase
          title="Concert"
          subCategories={[
            "All",
            "Pop",
            "Rock",
            "Jazz & Blues",
            "Hip-Hop & Rap",
            "Alternative",
            "Classical",
            "Opera",
            "Country",
          ]}
          events={[
            {
              avatarUrl:
                "https://sb.kaleidousercontent.com/67418/1920x1545/c5f15ac173/samuel-raita-ridxdghg7pw-unsplash.jpg",
              timeToEnd: "06:34:15",
              name: "Nora Bayes",
              date: "May 6, 2025",
              location: "Hagen",
              price: 779.58,
            },
            {
              avatarUrl:
                "https://sb.kaleidousercontent.com/67418/1920x1545/c5f15ac173/samuel-raita-ridxdghg7pw-unsplash.jpg",
              name: "Tony Bennet",
              date: "Aug 2, 2025",
              location: "Salem (OR)",
              price: 589.99,
            },
            {
              avatarUrl:
                "https://sb.kaleidousercontent.com/67418/1920x1545/c5f15ac173/samuel-raita-ridxdghg7pw-unsplash.jpg",
              name: "Joan Baez",
              date: "Dec 29, 2025",
              location: "Naltchik",
              price: 406.27,
            },
          ]}
        />

        <EventShowcase
          title="Show"
          subCategories={[
            "All",
            "Teather",
            "Comedy",
            "Magic",
            "Musical",
            "Circus",
            "Dance",
            "Puppetry",
            "Live Drama",
          ]}
          events={[
            {
              avatarUrl:
                "https://sb.kaleidousercontent.com/67418/1920x1545/c5f15ac173/samuel-raita-ridxdghg7pw-unsplash.jpg",
              name: "Slave's Snow",
              date: "Mar 6, 2025",
              location: "Chelyabinsk",
              price: 473.85,
            },
            {
              avatarUrl:
                "https://sb.kaleidousercontent.com/67418/1920x1545/c5f15ac173/samuel-raita-ridxdghg7pw-unsplash.jpg",
              name: "Amaluna",
              date: "Aug 24, 2025",
              location: "Bahía Blanca",
              price: 576.28,
            },
            {
              avatarUrl:
                "https://sb.kaleidousercontent.com/67418/1920x1545/c5f15ac173/samuel-raita-ridxdghg7pw-unsplash.jpg",
              timeToEnd: "11:22:15",
              name: "Fire of Anatalia",
              date: "Nov 7, 2025",
              location: "La Plata",
              price: 328.85,
            },
          ]}
        />

        <h3 className="font-medium text-2xl mb-2">Top Singers</h3>
        <p className="text-[#999999] mb-8">
          Find the singers you&apos;re looking for quickly.{" "}
          <span className="text-tint-400">You can see more</span>.
        </p>
        <SingersCarousel
          row1={[
            { name: "Adele", date: "5 May", location: "New York" },
            { name: "Drake", date: "20 June", location: "Toronto" },
            { name: "Taylor Swift", date: "10 July", location: "Nashville" },
            { name: "Ed Sheeran", date: "25 August", location: "Los Angeles" },
            { name: "Billie Eilish", date: "30 September", location: "Chicago" },
          ]}
          row2={[
            { name: "Adele", date: "5 May", location: "New York" },
            { name: "Drake", date: "30 June", location: "Toronto" },
            { name: "Taylor Swift", date: "13 July", location: "Nashville" },
            { name: "Ed Sheeran", date: "25 August", location: "Dublin" },
            { name: "Billie Eilish", date: "10 September", location: "Los Angeles" },
          ]}
        />

        <EventShowcase
          title="Sport"
          subCategories={[
            "All",
            "Runniing",
            "Basketball",
            "Football",
            "Soccer",
            "Golf",
            "Vollyball",
            "Tennis",
            "Hockey",
            "Motor",
            "Snow Sport",
            "Rugby",
            "Yoga",
          ]}
          events={[
            {
              avatarUrl:
                "https://sb.kaleidousercontent.com/67418/1920x1545/c5f15ac173/samuel-raita-ridxdghg7pw-unsplash.jpg",
              name: "Slave's Snow",
              date: "Mar 6, 2025",
              location: "Chelyabinsk",
              price: 473.85,
            },
            {
              avatarUrl:
                "https://sb.kaleidousercontent.com/67418/1920x1545/c5f15ac173/samuel-raita-ridxdghg7pw-unsplash.jpg",
              name: "Amaluna",
              date: "Aug 24, 2025",
              location: "Bahía Blanca",
              price: 576.28,
            },
            {
              avatarUrl:
                "https://sb.kaleidousercontent.com/67418/1920x1545/c5f15ac173/samuel-raita-ridxdghg7pw-unsplash.jpg",
              timeToEnd: "11:22:15",
              name: "Fire of Anatalia",
              date: "Nov 7, 2025",
              location: "La Plata",
              price: 328.85,
            },
          ]}
        />
      </div>
      <Footer />
    </>
  );
}
