import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect } from "storybook/test";
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

// WEB AC 4: `?accountDeleted=1` shows the notice.
export const AfterDeletion: Story = {
  parameters: {
    nextjs: { appDirectory: true, navigation: { query: { accountDeleted: "1" } } },
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("status")).toHaveTextContent(
      "Your account has been deleted.",
    );
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
