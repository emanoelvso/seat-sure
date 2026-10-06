import { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect } from "storybook/test";
import { AboutView } from "./about-view";

const meta: Meta<typeof AboutView> = {
  title: "Features/About/AboutView",
  component: AboutView,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof AboutView>;

export default meta;

type Story = StoryObj<typeof AboutView>;

export const Default: Story = {
  play: async ({ canvas, canvasElement }) => {
    const banner = canvas.getByRole("banner");
    await expect(banner).toBeVisible();

    const title = canvas.getByRole("heading", { level: 1, name: "About us" });
    await expect(title).toBeVisible();

    // The five sections in frame order: the hero's h1, then the four h2s.
    const outline = canvas
      .getAllByRole("heading")
      .filter((heading) => ["H1", "H2"].includes(heading.tagName));
    await expect(outline.map((heading) => heading.textContent)).toEqual([
      "About us",
      "Why Choose SeatSure?",
      "More Than Just a Ticket — The SeatSure Experience",
      "What is the story of SeatSure?",
      "Join to enjoy your moments!",
    ]);

    // The header comes first and overlays the hero.
    await expect(
      banner.compareDocumentPosition(title) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    const heroImage = canvas.getByRole("img", {
      name: "Concert crowd with raised hands",
    });
    await expect(heroImage.getBoundingClientRect().top).toBeLessThanOrEqual(
      banner.getBoundingClientRect().top,
    );

    // Content images (hero, concert hall, laser show, map) have a non-empty
    // alt; the four card illustrations are decorative with an empty alt.
    const images = [...canvasElement.querySelectorAll("img")];
    const contentImages = images.filter((image) => image.alt.trim() !== "");
    const decorativeImages = images.filter(
      (image) => image.getAttribute("alt") === "",
    );
    await expect(contentImages).toHaveLength(4);
    await expect(decorativeImages).toHaveLength(4);
    await expect(images).toHaveLength(8);

    // The footer's "Contact us" link targets this anchor.
    await expect(canvasElement.querySelector("#contact")).not.toBeNull();
  },
} satisfies Story;
