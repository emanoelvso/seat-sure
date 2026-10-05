import { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn } from "storybook/test";
import { ReviewStep } from "./review-step";

const meta: Meta<typeof ReviewStep> = {
  title: "Features/Checkout/ReviewStep",
  tags: ["autodocs"],
  component: ReviewStep,
  args: {
    user: {
      firstName: "Negar",
      lastName: "Khosravi",
      email: "negar.khosravi@example.com",
    },
    totalLabel: "$1,107",
    pending: false,
    onBack: fn(),
    onPay: fn(),
  },
} satisfies Meta<typeof ReviewStep>;

export default meta;

type Story = StoryObj<typeof ReviewStep>;

// PAY-34: the account's full name, email and the order total.
export const Contact: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByText("Negar Khosravi")).toBeVisible();
    await expect(canvas.getByText("negar.khosravi@example.com")).toBeVisible();
    await expect(canvas.getByText("Total price : $1,107")).toBeVisible();
  },
};

// Spec Assumptions, "Review step contact": no phone row - only the name,
// the email and the total are listed.
export const NoPhone: Story = {
  play: async ({ canvas }) => {
    const items = canvas.getAllByRole("listitem");
    await expect(items.map((item) => item.textContent)).toEqual([
      "Negar Khosravi",
      "negar.khosravi@example.com",
      "Total price : $1,107",
    ]);
  },
};

// PAY-34, PAY-35: "Back" and "Pay" call their own handlers.
export const Actions: Story = {
  play: async ({ args, canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Back" }));
    await expect(args.onBack).toHaveBeenCalledTimes(1);
    await expect(args.onPay).not.toHaveBeenCalled();

    await userEvent.click(canvas.getByRole("button", { name: "Pay" }));
    await expect(args.onPay).toHaveBeenCalledTimes(1);
  },
};

// PAY-49: while paying, the button reads "Paying…" and is disabled.
export const Pending: Story = {
  args: { pending: true },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("button", { name: "Paying…" })).toBeDisabled();
    await expect(canvas.queryByRole("button", { name: "Pay" })).toBeNull();
  },
};

// PAY-50: a declined card shows its copy and keeps both buttons enabled.
export const Declined: Story = {
  args: { error: "CARD_DECLINED" },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("alert")).toHaveTextContent(
      "Your card was declined. Check the details or use another card.",
    );
    await expect(canvas.getByRole("button", { name: "Back" })).toBeEnabled();
    await expect(canvas.getByRole("button", { name: "Pay" })).toBeEnabled();
  },
};

// PAY-53: any other failure shows the generic copy.
export const GenericError: Story = {
  args: { error: "GENERIC" },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("alert")).toHaveTextContent(
      "We couldn't process your payment. Try again.",
    );
  },
};
