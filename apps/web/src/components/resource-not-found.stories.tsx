import { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect } from "storybook/test";
import { ResourceNotFound } from "./resource-not-found";

const meta: Meta<typeof ResourceNotFound> = {
  title: "Components/ResourceNotFound",
  component: ResourceNotFound,
} satisfies Meta<typeof ResourceNotFound>;

export default meta;

type Story = StoryObj<typeof ResourceNotFound>;

export const ArtistNotFound: Story = {
  args: { title: "Artist not found" },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole("heading", { level: 1, name: "Artist not found" }),
    ).toBeVisible();
    await expect(
      canvas.getByRole("link", { name: "Browse events" }),
    ).toHaveAttribute("href", "/events");
    await expect(canvas.getByRole("banner")).toBeVisible();
  },
};

export const EventNotFound: Story = {
  args: { title: "Event not found" },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole("heading", { level: 1, name: "Event not found" }),
    ).toBeVisible();
    await expect(
      canvas.getByRole("link", { name: "Browse events" }),
    ).toHaveAttribute("href", "/events");
    await expect(canvas.getByRole("banner")).toBeVisible();
  },
};
