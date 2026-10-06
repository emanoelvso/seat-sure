import { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect } from "storybook/test";
import { AboutHero } from "./about-hero";

const meta: Meta<typeof AboutHero> = {
  title: "Features/About/AboutHero",
  component: AboutHero,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof AboutHero>;

export default meta;

type Story = StoryObj<typeof AboutHero>;

export const Default: Story = {
  play: async ({ canvas, canvasElement }) => {
    const heading = canvas.getByRole("heading", { level: 1 });
    await expect(heading).toHaveAccessibleName("About us");
    await expect(heading).toBeVisible();

    const microphone = heading.querySelector("svg");
    await expect(microphone).not.toBeNull();
    await expect(microphone).toHaveAttribute("aria-hidden", "true");

    await expect(
      canvas.getByText(
        "Welcome to SeatSure – your go-to platform for finding, booking, and enjoying top events worldwide. From concerts and sports to theater and festivals, we make unforgettable experiences easy to access. Behind the scenes, our friendly and passionate team is here to support you every step of the way. Got a question or need help? We’re just a message away!",
      ),
    ).toBeVisible();

    await expect(
      canvas.getByRole("img", { name: "Concert crowd with raised hands" }),
    ).toHaveAttribute("src", expect.stringContaining("hero.jpg"));

    await expect(canvasElement).not.toHaveTextContent(/Evenjo/);
  },
} satisfies Story;
