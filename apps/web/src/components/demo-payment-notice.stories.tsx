import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect } from "storybook/test";
import { DemoPaymentNotice } from "./demo-payment-notice";

const meta = {
  title: "Components/DemoPaymentNotice",
  component: DemoPaymentNotice,
} satisfies Meta<typeof DemoPaymentNotice>;
export default meta;
type Story = StoryObj<typeof DemoPaymentNotice>;

export const Instructions: Story = {
  play: async ({ canvas }) => {
    const notice = canvas.getByRole("note", { name: "Demo payment instructions" });
    await expect(notice).toBeVisible();
    await expect(notice).toHaveTextContent("Demo only. Do not enter real card details.");
    await expect(notice).toHaveTextContent("Success: 4242 4242 4242 4242");
    await expect(notice).toHaveTextContent("Decline: 4000 0000 0000 0002");
    await expect(notice).toHaveTextContent("Saved-card payment decline: 4000 0000 0000 0341");
    await expect(notice).toHaveTextContent("Use any future expiry (MM/YY) and a 3-digit CVV such as 123.");
    await expect(notice).toHaveTextContent("Demo data resets daily. Your temporary session, orders and saved cards may disappear.");
  },
};
