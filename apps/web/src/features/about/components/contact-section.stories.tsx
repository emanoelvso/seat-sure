import { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, within } from "storybook/test";
import { ContactSection } from "./contact-section";

const meta: Meta<typeof ContactSection> = {
  title: "Features/About/ContactSection",
  component: ContactSection,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof ContactSection>;

export default meta;

type Story = StoryObj<typeof ContactSection>;

export const Default: Story = {
  play: async ({ canvas, canvasElement }) => {
    const section = canvas.getByRole("region", {
      name: "Join to enjoy your moments!",
    });
    await expect(section).toHaveAttribute("id", "contact");
    await expect(
      within(section).getByRole("heading", {
        level: 2,
        name: "Join to enjoy your moments!",
      }),
    ).toBeVisible();
    await expect(
      within(section).getByText("Where every second becomes a memory"),
    ).toBeVisible();

    const cards = within(section).getAllByRole("listitem");
    await expect(cards).toHaveLength(3);
    await expect(
      within(cards[0]).getByRole("link", { name: "+132458900" }),
    ).toHaveAttribute("href", "tel:+132458900");
    await expect(
      within(cards[1]).getByRole("link", { name: "info@seatsure.com" }),
    ).toHaveAttribute("href", "mailto:info@seatsure.com");
    await expect(within(cards[2]).getByText("Las Vegas")).toBeVisible();

    // Content image: role "img" requires a non-empty alt.
    const map = within(section).getByRole("img");
    await expect(map).toHaveAttribute("src", expect.stringContaining("map.png"));
    await expect(map.getAttribute("alt")?.trim()).not.toBe("");
    // The map sits below the contact cards.
    await expect(
      cards[2].compareDocumentPosition(map) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();

    await expect(canvasElement).not.toHaveTextContent(/Evenjo|momemts/);
  },
} satisfies Story;
