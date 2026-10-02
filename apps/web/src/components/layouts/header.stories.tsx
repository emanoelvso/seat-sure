import { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, within } from "storybook/test";
import { Header } from "./header";

// HeaderAccount (rendered inside Header) fetches the session on mount; stub
// it to a signed-out response so these stories don't hit the network.
function stubSignedOutFetch() {
  Object.defineProperty(window, "fetch", {
    value: fn(() =>
      Promise.resolve(
        new Response(JSON.stringify({ user: null }), {
          headers: { "Content-Type": "application/json" },
        }),
      ),
    ),
    configurable: true,
  });
}

const meta: Meta<typeof Header> = {
  title: "Components/Header",
  tags: ["autodocs"],
  component: Header,
};

export default meta;

type Story = StoryObj<typeof Header>;

export const Default: Story = {
  beforeEach: () => {
    stubSignedOutFetch();
  },
} satisfies Story;

export const NavigationLinks: Story = {
  beforeEach: () => {
    stubSignedOutFetch();
  },
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
