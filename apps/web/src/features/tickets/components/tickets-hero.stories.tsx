import { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, within } from "storybook/test";
import {
  TicketsEvent,
  TicketType,
} from "@/features/tickets/api/find-event-tickets";
import { zonedIso } from "@/testing/dates";
import { TicketsHero } from "./tickets-hero";

const COVER = "/artist/map.png";
const VENUE = "The Colosseum at Caesars Palace";

const imageSource = (img: Element | null) => {
  const url = new URL(img?.getAttribute("src") ?? "", window.location.origin);
  return url.searchParams.get("url") ?? url.pathname;
};

const event: TicketsEvent = {
  __typename: "Event",
  id: "e1",
  name: "Adele",
  type: "concert",
  coverImage: COVER,
  venue: VENUE,
  city: "Las Vegas",
  country: "USA",
  startAt: zonedIso(2026, 2, 6, 20, 0),
  endsAt: zonedIso(2026, 2, 6, 22, 30),
  headliner: null,
};

const sectionB: TicketType = {
  __typename: "TicketType",
  id: "tt-b",
  sectionKey: "b",
  name: "B",
  priceCents: 30000,
  maxPriceCents: 30000,
  currency: "USD",
  seatsAvailable: 200,
  maxPerOrder: 8,
  tags: [],
};

const meta: Meta<typeof TicketsHero> = {
  title: "Components/TicketsHero",
  component: TicketsHero,
  args: { event },
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof TicketsHero>;

export default meta;

type Story = StoryObj<typeof TicketsHero>;

export const NoSelection: Story = {
  play: async ({ canvas, canvasElement }) => {
    const headings = canvas.getAllByRole("heading", { level: 1 });
    await expect(headings).toHaveLength(1);
    await expect(headings[0]).toHaveTextContent(/^Adele$/);

    await expect(imageSource(canvasElement.querySelector("section img"))).toBe(
      COVER,
    );
    await expect(canvas.getByText("Mar 06 - 2026")).toBeVisible();
    await expect(
      canvas.getByText(`${VENUE} - Las Vegas, USA`),
    ).toBeInTheDocument();
    await expect(canvas.getByText("8:00 PM - 10:30 PM")).toBeVisible();

    await expect(canvas.getByTestId("hero-sec")).toHaveTextContent(/^—$/);
    await expect(canvas.getByTestId("hero-row")).toHaveTextContent(/^—$/);
    await expect(canvas.getByTestId("hero-seat")).toHaveTextContent(/^—$/);
    await expect(canvas.getByTestId("hero-price")).toHaveTextContent(/^—$/);
  },
};

export const WithSelection: Story = {
  args: { selected: sectionB },
  play: async ({ canvas }) => {
    await expect(canvas.getByTestId("hero-sec")).toHaveTextContent(/^B$/);
    await expect(canvas.getByTestId("hero-price")).toHaveTextContent(/^\$300$/);
    await expect(canvas.getByTestId("hero-row")).toHaveTextContent(/^—$/);
    await expect(canvas.getByTestId("hero-seat")).toHaveTextContent(/^—$/);
  },
};

// The seat page's section: its name and price differ from section B's, and
// the picked seat's row differs from its number (L-006).
const vip: TicketType = {
  ...sectionB,
  id: "tt-vip",
  sectionKey: "vip",
  name: "VIP",
  priceCents: 45000,
};

export const PickedSeat: Story = {
  args: { selected: vip, seat: { row: "4", number: "09" } },
  play: async ({ canvas }) => {
    await expect(canvas.getByTestId("hero-sec")).toHaveTextContent(/^VIP$/);
    await expect(canvas.getByTestId("hero-price")).toHaveTextContent(/^\$450$/);
    await expect(canvas.getByTestId("hero-row")).toHaveTextContent(/^4$/);
    await expect(canvas.getByTestId("hero-seat")).toHaveTextContent(/^09$/);
  },
};

export const NoPickedSeat: Story = {
  args: { selected: vip },
  play: async ({ canvas }) => {
    await expect(canvas.getByTestId("hero-sec")).toHaveTextContent(/^VIP$/);
    await expect(canvas.getByTestId("hero-price")).toHaveTextContent(/^\$450$/);
    await expect(canvas.getByTestId("hero-row")).toHaveTextContent(/^—$/);
    await expect(canvas.getByTestId("hero-seat")).toHaveTextContent(/^—$/);
  },
};

let share: ReturnType<typeof fn>;

export const ShareAndHeart: Story = {
  beforeEach: () => {
    share = fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "share", {
      value: share,
      configurable: true,
    });
    return () => {
      delete (navigator as { share?: unknown }).share;
    };
  },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Share" }));

    await expect(share).toHaveBeenCalledWith({
      title: `Adele - ${VENUE}`,
      url: window.location.href,
    });

    const heart = canvas.getByTestId("heart-icon");
    await expect(heart).toHaveAttribute("aria-hidden", "true");
    await expect(heart.closest("button, a")).toBeNull();
  },
};

export const ConcertTitleUppercase: Story = {
  play: async ({ canvas }) => {
    const title = canvas.getByRole("heading", { level: 1 });

    await expect(getComputedStyle(title).textTransform).toBe("uppercase");
  },
};

export const SportTitleKeepsStoredCasing: Story = {
  args: {
    event: { ...event, name: "São Paulo vs Corinthians", type: "sport" },
  },
  play: async ({ canvas }) => {
    const title = canvas.getByRole("heading", { level: 1 });

    await expect(getComputedStyle(title).textTransform).toBe("none");
    await expect(title).toHaveTextContent(/^São Paulo vs Corinthians$/);
  },
};

// STAD-20 covers every non-concert type, so a second one guards against a
// sport-only check.
export const FestivalTitleKeepsStoredCasing: Story = {
  args: {
    event: { ...event, name: "Rock in Rio", type: "festival" },
  },
  play: async ({ canvas }) => {
    const title = canvas.getByRole("heading", { level: 1 });

    await expect(getComputedStyle(title).textTransform).toBe("none");
    await expect(title).toHaveTextContent(/^Rock in Rio$/);
  },
};

// The event name differs from the headliner's, and the slug isn't either name
// slugified, so a link built from a name, or showing the headliner's name,
// can't pass.
export const TitleLinksToHeadliner: Story = {
  args: {
    event: {
      ...event,
      name: "Adele Live",
      headliner: {
        __typename: "EventHeadliner",
        slug: "adele-adkins",
        name: "Adele",
      },
    },
  },
  play: async ({ canvas }) => {
    const title = canvas.getByRole("heading", { level: 1 });
    const link = within(title).getByRole("link");

    await expect(title).toHaveTextContent(/^Adele Live$/);
    await expect(link).toHaveAttribute("href", "/artists/adele-adkins");
    await expect(link).toHaveTextContent(/^Adele Live$/);
  },
};

export const TitleWithoutHeadliner: Story = {
  play: async ({ canvas }) => {
    const title = canvas.getByRole("heading", { level: 1 });

    await expect(title).toHaveTextContent(/^Adele$/);
    await expect(within(title).queryByRole("link")).toBeNull();
  },
};

export const FromPrice: Story = {
  args: { selected: vip, price: { cents: 45000, from: true } },
  play: async ({ canvas }) => {
    await expect(canvas.getByTestId("hero-price")).toHaveTextContent(
      /^From \$450$/,
    );
  },
};

export const PriceOverridesTheSelectedPrice: Story = {
  args: { selected: vip, price: { cents: 60000, from: false } },
  play: async ({ canvas }) => {
    await expect(canvas.getByTestId("hero-price")).toHaveTextContent(/^\$600$/);
  },
};
