import { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, userEvent, waitFor } from "storybook/test";
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
// no Signup link renders. ACCT-02: the avatar links to the account tickets
// and the menu (with the logout form) stays closed until hover or focus.
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
  play: async ({ canvas, canvasElement }) => {
    await expect(await canvas.findByText("NK")).toBeVisible();
    await expect(canvas.queryByRole("link", { name: "Signup" })).toBeNull();
    await expect(canvas.getByRole("link", { name: "Account" })).toHaveAttribute(
      "href",
      "/account/tickets",
    );
    await expect(canvasElement.querySelector("form")).toBeNull();
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
  play: async ({ canvas, canvasElement }) => {
    const avatar = await canvas.findByRole("img", { name: "Profile Avatar" });
    await expect(avatar).toBeVisible();
    const accountLink = canvas.getByRole("link", { name: "Account" });
    await expect(accountLink).toHaveAttribute("href", "/account/tickets");
    await expect(accountLink).toContainElement(avatar);
    await expect(canvasElement.querySelector("form")).toBeNull();
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

// PROFILE-10 AC 4: hovering the avatar opens a menu with "Tickets",
// "My account" and "Log out", in that order, linking to the tickets list and
// the personal info page, with Log out posting to the logout route; leaving
// or Escape closes it.
export const AvatarMenu: Story = {
  beforeEach: () => {
    stubFetch(() =>
      jsonResponse({
        user: {
          id: "user-3",
          email: "lena@example.com",
          firstName: "Lena",
          lastName: "Park",
          avatarUrl: null,
        },
      }),
    );
  },
  play: async ({ canvas, canvasElement }) => {
    const avatar = await canvas.findByRole("link", { name: "Account" });
    await expect(canvas.queryByRole("link", { name: "Tickets" })).toBeNull();
    await expect(canvas.queryByRole("button", { name: "Log out" })).toBeNull();

    await userEvent.hover(avatar);

    const tickets = await canvas.findByRole("link", { name: "Tickets" });
    await expect(tickets).toHaveAttribute("href", "/account/tickets");
    const myAccount = canvas.getByRole("link", { name: "My account" });
    await expect(myAccount).toHaveAttribute("href", "/account/personal-info");
    const logout = canvas.getByRole("button", { name: "Log out" });
    await expect(logout).toHaveAttribute("type", "submit");
    const form = canvasElement.querySelector("form");
    await expect(form).toHaveAttribute("action", "/api/auth/logout");
    await expect(form).toHaveAttribute("method", "post");
    await expect(form).toContainElement(logout);

    // Order: Tickets, My account, Log out.
    const items = [tickets, myAccount, logout];
    const sorted = [...items].sort((a, b) =>
      a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1,
    );
    await expect(sorted).toEqual(items);

    await userEvent.unhover(avatar);
    await waitFor(() =>
      expect(canvas.queryByRole("button", { name: "Log out" })).toBeNull(),
    );

    await userEvent.tab();
    await expect(
      await canvas.findByRole("link", { name: "Tickets" }),
    ).toBeVisible();
    await userEvent.keyboard("{Escape}");
    await waitFor(() =>
      expect(canvas.queryByRole("link", { name: "Tickets" })).toBeNull(),
    );
  },
};

// PROFILE-10: the open menu passes the a11y checks (a11y "error" makes the
// addon's violations fail the story).
export const OpenMenuA11y: Story = {
  parameters: { a11y: { test: "error" } },
  beforeEach: () => {
    stubFetch(() =>
      jsonResponse({
        user: {
          id: "user-4",
          email: "ines@example.com",
          firstName: "Ines",
          lastName: "Roca",
          avatarUrl: null,
        },
      }),
    );
  },
  play: async ({ canvas }) => {
    await userEvent.hover(await canvas.findByRole("link", { name: "Account" }));

    await expect(
      await canvas.findByRole("link", { name: "My account" }),
    ).toBeVisible();
    await expect(canvas.getByRole("link", { name: "Tickets" })).toBeVisible();
    await expect(canvas.getByRole("button", { name: "Log out" })).toBeVisible();
  },
};
