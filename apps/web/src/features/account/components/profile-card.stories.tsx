import { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect } from "storybook/test";
import { ProfileCard } from "./profile-card";

// a11y "error" makes the addon's violations fail the story (preview.tsx
// only reports them).
const meta: Meta<typeof ProfileCard> = {
  title: "Features/Account/ProfileCard",
  component: ProfileCard,
  tags: ["autodocs"],
  parameters: { a11y: { test: "error" } },
  args: {
    firstName: "Negar",
    lastName: "Khosravi",
    email: "negarkhosravii@yahoo.com",
    avatarUrl: null,
  },
  decorators: [
    (Story) => (
      <div className="w-[1128px]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ProfileCard>;

export default meta;

type Story = StoryObj<typeof ProfileCard>;

// PROFILE-01 AC 2: greeting with the first name, the email, initials when
// there is no avatar image, and a disabled "Edit" button.
export const WithInitials: Story = {
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole("heading", { name: "Hey Negar!" }),
    ).toBeVisible();
    await expect(canvas.getByText("negarkhosravii@yahoo.com")).toBeVisible();
    await expect(
      canvas.getByRole("img", { name: "Profile Avatar" }),
    ).toHaveTextContent("NK");
    await expect(canvas.getByRole("button", { name: "Edit" })).toBeDisabled();
  },
};

// PROFILE-01 AC 2: the avatar image when avatarUrl is set (no initials).
export const WithAvatarImage: Story = {
  args: {
    avatarUrl:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=190",
  },
  play: async ({ canvas }) => {
    const avatar = canvas.getByRole("img", { name: "Profile Avatar" });
    await expect(avatar.tagName).toBe("IMG");
    await expect(avatar).toHaveAttribute(
      "src",
      expect.stringContaining("images.unsplash.com"),
    );
    await expect(canvas.queryByText("NK")).toBeNull();
    await expect(canvas.getByRole("button", { name: "Edit" })).toHaveAttribute(
      "disabled",
    );
  },
};
