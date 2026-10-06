import { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect } from "storybook/test";
import { NotFoundView } from "./not-found-view";

const meta: Meta<typeof NotFoundView> = {
  title: "Components/NotFoundView",
  component: NotFoundView,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof NotFoundView>;

export default meta;

type Story = StoryObj<typeof NotFoundView>;

export const Default: Story = {
  play: async ({ canvas, canvasElement }) => {
    await expect(
      canvas.getByRole("heading", {
        level: 1,
        name: "Oops! The page you're looking for doesn't exist or may have been moved.",
      }),
    ).toBeVisible();
    await expect(
      canvas.getByRole("link", { name: "Back to Homepage" }),
    ).toHaveAttribute("href", "/");

    const code = canvas.getByText("404");
    await expect(code).toHaveAttribute("aria-hidden", "true");

    // An empty alt makes the image presentational, so query it by selector.
    const background = canvasElement.querySelector('img[src*="background"]');
    await expect(background).not.toBeNull();
    await expect(background).toHaveAttribute("alt", "");

    await expect(canvas.getByRole("banner")).toBeVisible();
  },
} satisfies Story;
