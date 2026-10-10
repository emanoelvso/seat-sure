import { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, within } from "storybook/test";
import { Footer } from "./footer";

const meta: Meta<typeof Footer> = {
  title: "Components/Footer",
  tags: ["autodocs"],
  component: Footer,
} satisfies Meta<typeof Footer>;

export default meta;

type Story = StoryObj<typeof Footer>;

export const Default: Story = {
  play: async ({ canvas }) => {
    const nav = canvas.getByRole("navigation");
    const links = [
      ["Home", "/"],
      ["Contact us", "/about#contact"],
      ["About us", "/about"],
      ["Privacy Policy", "/terms"],
    ] as const;

    for (const [name, href] of links) {
      await expect(within(nav).getByRole("link", { name })).toHaveAttribute(
        "href",
        href,
      );
    }

    const social = [
      ["Facebook", "https://facebook.com/seatsure"],
      ["Instagram", "https://instagram.com/seatsure"],
      ["LinkedIn", "https://linkedin.com/company/seatsure"],
      ["YouTube", "https://youtube.com/@seatsure"],
      ["Telegram", "https://t.me/seatsure"],
    ] as const;

    for (const [name, href] of social) {
      const link = canvas.getByRole("link", { name });
      await expect(link).toHaveAttribute("href", href);
      await expect(link).toHaveAttribute("target", "_blank");
      await expect(link).toHaveAttribute("rel", "noopener noreferrer");
    }

    await expect(
      canvas.getByRole("link", { name: "SeatSure" }),
    ).toHaveAttribute("href", "/");
  },
} satisfies Story;
