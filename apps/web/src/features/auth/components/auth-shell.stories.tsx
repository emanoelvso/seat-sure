import { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect } from "storybook/test";
import { AuthShell } from "./auth-shell";

const meta: Meta<typeof AuthShell> = {
  title: "Features/Auth/AuthShell",
  tags: ["autodocs"],
  component: AuthShell,
  args: {
    title: "Welcome back",
    subtitle: "Log in to continue booking tickets.",
  },
} satisfies Meta<typeof AuthShell>;

export default meta;

type Story = StoryObj<typeof AuthShell>;

// AUTH-01, AUTH-29: logo links home, title/subtitle render, children render,
// and the decorative background is hidden from the accessibility tree.
export const Default: Story = {
  args: {
    children: <div>Form goes here</div>,
  },
  play: async ({ canvas, canvasElement }) => {
    const logo = canvas.getByRole("link", { name: "SeatSure" });
    await expect(logo).toHaveAttribute("href", "/");

    await expect(
      canvas.getByRole("heading", { name: "Welcome back" }),
    ).toBeVisible();
    await expect(
      canvas.getByText("Log in to continue booking tickets."),
    ).toBeVisible();
    await expect(canvas.getByText("Form goes here")).toBeVisible();

    const decoration = canvasElement.querySelector('[aria-hidden="true"]');
    expect(decoration).not.toBeNull();
  },
} satisfies Story;
