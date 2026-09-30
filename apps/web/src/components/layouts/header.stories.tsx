import { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, within } from "storybook/test";
import { Header } from "./header";

const meta: Meta<typeof Header> = {
  title: "Components/Header",
  tags: ["autodocs"],
  component: Header,
  argTypes: {
    avatarUrl: {
      control: { type: "boolean" },
      mapping: {
        true: "https://sb.kaleidousercontent.com/67418/1920x1545/c5f15ac173/samuel-raita-ridxdghg7pw-unsplash.jpg",
        false: undefined,
      },
    },
  },
};

export default meta;

type Story = StoryObj<typeof Header>;

export const Default: Story = {} satisfies Story;

export const NavigationLinks: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("link", { name: "SeatSure" })).toHaveAttribute(
      "href",
      "/",
    );

    const navLinks = within(canvas.getByRole("navigation")).getAllByRole("link");
    await expect(
      navLinks.map((link) => [link.textContent, link.getAttribute("href")]),
    ).toEqual([
      ["Home", "/"],
      ["Shows", "/events?type=SHOW"],
      ["Concerts", "/events?type=CONCERT"],
      ["Sports", "/events?type=SPORT"],
      ["Festivals", "/events?type=FESTIVAL"],
    ]);
  },
};
