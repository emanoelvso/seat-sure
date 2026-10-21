import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, type MockInstance, spyOn, waitFor } from "storybook/test";
import { AccountDeletedNotice } from "./account-deleted-notice";

// a11y "error" makes the addon's violations fail the story (preview.tsx
// only reports them).
const meta = {
  title: "Features/Account/AccountDeletedNotice",
  component: AccountDeletedNotice,
  parameters: { a11y: { test: "error" } },
} satisfies Meta<typeof AccountDeletedNotice>;

export default meta;

type Story = StoryObj<typeof meta>;

let replaceState: MockInstance<History["replaceState"]>;

// WEB AC 4: `?accountDeleted=1` shows the notice.
export const AfterDeletion: Story = {
  args: { durationMs: 300 },
  beforeEach: () => {
    // Stubbed so the Storybook frame URL stays intact
    replaceState = spyOn(window.history, "replaceState").mockImplementation(
      () => {},
    );
  },
  parameters: {
    nextjs: {
      appDirectory: true,
      navigation: { query: { accountDeleted: "1", keep: "me" } },
    },
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("status")).toHaveTextContent(
      "Your account has been deleted.",
    );
    // A reload must not show it again: the flag leaves the URL, other
    // parameters stay.
    const url = String(replaceState.mock.calls[0][2]);
    await expect(url).toContain("keep=me");
    await expect(url).not.toContain("accountDeleted");
    // It goes away on its own
    await waitFor(() => expect(canvas.queryByRole("status")).toBeNull());
  },
};

// Without the flag nothing renders.
export const WithoutTheFlag: Story = {
  parameters: { nextjs: { appDirectory: true, navigation: { query: {} } } },
  play: async ({ canvas }) => {
    await expect(canvas.queryByRole("status")).toBeNull();
  },
};

// Only the exact value `1` counts.
export const OtherValues: Story = {
  parameters: {
    nextjs: { appDirectory: true, navigation: { query: { accountDeleted: "0" } } },
  },
  play: async ({ canvas }) => {
    await expect(canvas.queryByRole("status")).toBeNull();
    await expect(canvas.queryByText("Your account has been deleted.")).toBeNull();
  },
};
