import { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect } from "storybook/test";
import { MainCard } from "./main-card";

const HREF = "/events/e-42/tickets";

const meta: Meta<typeof MainCard> = {
  title: "Components/MainCard",
  component: MainCard,
  tags: ["autodocs"],
  argTypes: {
    avatarUrl: {
      table: { disable: true },
      control: { type: "boolean" },
      mapping: {
        true: "https://sb.kaleidousercontent.com/67418/1920x1545/c5f15ac173/samuel-raita-ridxdghg7pw-unsplash.jpg",
        false: undefined,
      },
    },
    timeToEnd: {
      control: "boolean",
      mapping: {
        true: "06:34:15",
        false: undefined,
      },
    },
    name: { table: { disable: true } },
    date: { table: { disable: true } },
    location: { table: { disable: true } },
    price: { table: { disable: true } },
    href: { table: { disable: true } },
  },
  args: {
    name: "Jennifer Lopez",
    date: "22 November",
    location: "Myanmar",
    price: 140,
    href: HREF,
  },
} satisfies Meta<typeof MainCard>;

export default meta;

type Story = StoryObj<typeof MainCard>;

export const Default: Story = {};

export const LinksToTheEvent: Story = {
  play: async ({ canvas }) => {
    const links = canvas.getAllByRole("link");
    await expect(links).toHaveLength(1);

    const [card] = links;
    await expect(card).toHaveAttribute("href", HREF);
    await expect(card).toHaveAccessibleName(/Jennifer Lopez/);
    // The whole card is the link, not just its title.
    await expect(card).toContainElement(canvas.getByText("Myanmar"));
    await expect(card.querySelector("img")).not.toBeNull();
  },
};
