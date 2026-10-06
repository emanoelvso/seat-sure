import { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, within } from "storybook/test";
import { ExperienceSection } from "./experience-section";

const meta: Meta<typeof ExperienceSection> = {
  title: "Features/About/ExperienceSection",
  component: ExperienceSection,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof ExperienceSection>;

export default meta;

type Story = StoryObj<typeof ExperienceSection>;

export const Default: Story = {
  play: async ({ canvas, canvasElement }) => {
    await expect(
      canvas.getByRole("heading", {
        level: 2,
        name: "More Than Just a Ticket — The SeatSure Experience",
      }),
    ).toBeVisible();

    const lists = canvas.getAllByRole("list");
    await expect(lists).toHaveLength(2);
    for (const list of lists) {
      await expect(list.tagName).toBe("OL");
    }
    await expect(
      within(lists[0])
        .getAllByRole("listitem")
        .map((item) => item.textContent),
    ).toEqual([
      "Every ticket is the start of a memory, not just entry to an event.",
      "Whether it’s a concert, sports match, or theater show – your full experience matters.",
    ]);
    await expect(
      within(lists[1])
        .getAllByRole("listitem")
        .map((item) => item.textContent),
    ).toEqual([
      "SeatSure ensures a smooth and enjoyable journey from booking to the final moment.",
      "We connect you to world-class events with just a few clicks.",
      "Our platform is designed for ease, speed, and excitement.",
      "With SeatSure, every step feels like part of the show.",
    ]);

    // Content images: role "img" requires a non-empty alt.
    const images = canvas.getAllByRole("img");
    await expect(images).toHaveLength(2);
    await expect(images[0]).toHaveAttribute(
      "src",
      expect.stringContaining("concert-hall.jpg"),
    );
    await expect(images[1]).toHaveAttribute(
      "src",
      expect.stringContaining("laser-show.jpg"),
    );
    for (const image of images) {
      await expect(image.getAttribute("alt")?.trim()).not.toBe("");
    }

    // Frame order pairs each list with its image: concert hall + 2 items,
    // then 4 items + laser show.
    const order = [images[0], lists[0], lists[1], images[1]];
    for (let index = 1; index < order.length; index++) {
      await expect(
        order[index - 1].compareDocumentPosition(order[index]) &
          Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
    }

    await expect(canvasElement).not.toHaveTextContent(/Evenjo|Title:/);
  },
} satisfies Story;
