import { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn } from "storybook/test";
import { HeaderAccount } from "./header-account";
import { paths } from "@/config/paths";

type Spy = ReturnType<typeof fn>;

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    headers: { "Content-Type": "application/json" },
  });
}

// Stubs the global fetch HeaderAccount calls on mount, the way
// share-button.stories.tsx stubs navigator (per story, via beforeEach).
function stubFetch(respond: () => Response | Promise<Response>): Spy {
  const spy = fn(() => Promise.resolve(respond()));
  Object.defineProperty(window, "fetch", { value: spy, configurable: true });
  return spy;
}

const meta: Meta<typeof HeaderAccount> = {
  title: "Components/HeaderAccount",
  component: HeaderAccount,
} satisfies Meta<typeof HeaderAccount>;

export default meta;

type Story = StoryObj<typeof HeaderAccount>;

// AUTH-40, AUTH-48: signed out shows a Signup link carrying the current
// page as redirectTo.
export const SignedOut: Story = {
  beforeEach: () => {
    stubFetch(() => jsonResponse({ user: null }));
  },
  play: async ({ canvas }) => {
    const link = await canvas.findByRole("link", { name: "Signup" });
    const redirectTo = `${window.location.pathname}${window.location.search}`;
    await expect(link).toHaveAttribute(
      "href",
      paths.signup.getHref(redirectTo),
    );
  },
};

// AUTH-42, AUTH-43: signed in without an avatar falls back to initials, and
// no Signup link renders.
export const SignedInWithoutAvatar: Story = {
  beforeEach: () => {
    stubFetch(() =>
      jsonResponse({
        user: {
          id: "user-1",
          email: "nadia@example.com",
          firstName: "Nadia",
          lastName: "Kahn",
          avatarUrl: null,
        },
      }),
    );
  },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText("NK")).toBeVisible();
    await expect(canvas.queryByRole("link", { name: "Signup" })).toBeNull();
  },
};

// Signed in with a different name and a real avatar: an <img> replaces the
// initials fallback (deliberately different from the story above, L-006).
export const SignedInWithAvatar: Story = {
  beforeEach: () => {
    stubFetch(() =>
      jsonResponse({
        user: {
          id: "user-2",
          email: "marcus@example.com",
          firstName: "Marcus",
          lastName: "Oduya",
          avatarUrl:
            "https://sb.kaleidousercontent.com/67418/1920x1545/c5f15ac173/samuel-raita-ridxdghg7pw-unsplash.jpg",
        },
      }),
    );
  },
  play: async ({ canvas }) => {
    const avatar = await canvas.findByRole("img", { name: "Profile Avatar" });
    await expect(avatar).toBeVisible();
  },
};

// Before the fetch resolves, neither the signed-out nor signed-in UI shows.
export const Loading: Story = {
  beforeEach: () => {
    stubFetch(() => new Promise<Response>(() => {}));
  },
  play: async ({ canvas }) => {
    await expect(canvas.queryByRole("link", { name: "Signup" })).toBeNull();
    await expect(canvas.queryByRole("img")).toBeNull();
    await expect(canvas.queryByText("NK")).toBeNull();
  },
};
