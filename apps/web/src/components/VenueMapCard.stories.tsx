import { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect } from "storybook/test";
import VenueMapCard from "./VenueMapCard";

const meta: Meta<typeof VenueMapCard> = {
  title: "Components/VenueMapCard",
  component: VenueMapCard,
  args: { address: "The Colosseum at Caesars Palace, Las Vegas, USA" },
  decorators: [
    (Story) => (
      <div style={{ width: 288 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof VenueMapCard>;

export default meta;

type Story = StoryObj<typeof VenueMapCard>;

export const Default: Story = {
  play: async ({ canvas }) => {
    const link = canvas.getByRole("link", {
      name: "The Colosseum at Caesars Palace, Las Vegas, USA",
    });

    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute(
      "href",
      "https://www.google.com/maps/search/?api=1&query=The%20Colosseum%20at%20Caesars%20Palace%2C%20Las%20Vegas%2C%20USA",
    );
    await expect(link).toHaveAttribute("target", "_blank");
    await expect(link).toHaveAttribute("rel", "noopener noreferrer");
  },
};
