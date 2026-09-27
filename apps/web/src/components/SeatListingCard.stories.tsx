import { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, within } from "storybook/test";
import { GqlTicketType } from "@/lib/utils/ticket-listings";
import SeatListingCard from "./SeatListingCard";

const vip: GqlTicketType = {
  id: "tt-vip",
  sectionKey: "vip",
  name: "VIP",
  priceCents: 45000,
  currency: "USD",
  seatsAvailable: 40,
  maxPerOrder: 8,
  tags: ["discounted", "vip"],
};

const meta: Meta<typeof SeatListingCard> = {
  title: "Components/SeatListingCard",
  component: SeatListingCard,
  args: {
    ticketType: vip,
    quantity: 2,
    selected: false,
    onSelect: fn(),
  },
  decorators: [
    (Story) => (
      <div style={{ width: 392 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof SeatListingCard>;

export default meta;

type Story = StoryObj<typeof SeatListingCard>;

export const Default: Story = {
  play: async ({ canvas, args, userEvent }) => {
    const card = canvas.getByRole("button", { name: "Section VIP" });
    const inCard = within(card);

    await expect(inCard.getByText("Section VIP")).toBeVisible();
    await expect(inCard.getByText("Row —")).toBeVisible();
    await expect(inCard.getByText("$450")).toBeVisible();
    await expect(inCard.getByText("/per")).toBeVisible();
    await expect(inCard.getByText("2 tickets, seated together")).toBeVisible();
    await expect(
      Array.from(inCard.getByTestId("tags").children).map(
        (pill) => pill.textContent,
      ),
    ).toEqual(["discounted", "vip"]);

    await expect(card).toHaveAttribute("aria-pressed", "false");

    await userEvent.click(card);
    await expect(args.onSelect).toHaveBeenCalledTimes(1);
  },
};

export const SingleTicketNoTags: Story = {
  args: { quantity: 1, ticketType: { ...vip, tags: [] } },
  play: async ({ canvas }) => {
    const card = within(canvas.getByRole("button", { name: "Section VIP" }));

    await expect(card.getByText("1 ticket")).toBeVisible();
    await expect(card.queryByText(/seated together/)).toBeNull();
    await expect(card.queryByTestId("tags")).toBeNull();
  },
};

export const Selected: Story = {
  args: { selected: true },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole("button", { name: "Section VIP" }),
    ).toHaveAttribute("aria-pressed", "true");
  },
};
