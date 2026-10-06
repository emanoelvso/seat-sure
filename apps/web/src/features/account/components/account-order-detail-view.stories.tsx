import { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, within } from "storybook/test";
import {
  accountOrderDetail,
  accountUser,
  canceledOrderDetail,
} from "@/testing/account-orders.fixture";
import { AccountOrderDetailView } from "./account-order-detail-view";

const meta: Meta<typeof AccountOrderDetailView> = {
  title: "Features/Account/AccountOrderDetailView",
  component: AccountOrderDetailView,
  tags: ["autodocs"],
  // a11y "error" makes the addon's violations fail the story (preview.tsx
  // only reports them).
  parameters: { a11y: { test: "error" } },
  args: { order: accountOrderDetail(), user: accountUser },
} satisfies Meta<typeof AccountOrderDetailView>;

export default meta;

type Story = StoryObj<typeof AccountOrderDetailView>;

// The value shown under a field label ("Total paid" → "$260").
const fieldValue = (canvasElement: HTMLElement, label: string) =>
  within(canvasElement).getByText(label, { selector: "dt" })
    .nextElementSibling as HTMLElement;

// ORDDETAIL-01 AC 1-3, ORDDETAIL-02 AC 4-5: every field of a completed order.
export const Completed: Story = {
  play: async ({ canvas, canvasElement }) => {
    // AC 1: back to the list.
    await expect(
      canvas.getByRole("link", { name: "Back to ticket" }),
    ).toHaveAttribute("href", "/account/tickets");

    // AC 2: cover, name, order heading, tracking code, order date, badge.
    const cover = canvasElement.querySelector("img");
    await expect(cover?.getAttribute("src")).toContain("map.png");
    await expect(
      canvas.getByRole("heading", { name: "Adele Concert" }),
    ).toBeVisible();
    await expect(
      canvas.getByRole("heading", { name: "Order Details" }),
    ).toBeVisible();
    await expect(
      fieldValue(canvasElement, "Order Tracking Code"),
    ).toHaveTextContent(/^# 3F2A9C1B$/);
    await expect(fieldValue(canvasElement, "Order Date")).toHaveTextContent(
      /^Fri 12 Sep • 1:57 PM$/,
    );
    await expect(canvas.getByText("Completed")).toBeVisible();

    // AC 3: event details.
    await expect(
      canvas.getByRole("heading", { name: "Event Details" }),
    ).toBeVisible();
    const location = fieldValue(canvasElement, "Location");
    await expect(
      within(location).getByText("American Airlines Center"),
    ).toBeVisible();
    await expect(within(location).getByText("Dallas, USA")).toBeVisible();
    await expect(fieldValue(canvasElement, "Event Date")).toHaveTextContent(
      /^Tue 30 Sep • 7:30 PM$/,
    );
    await expect(fieldValue(canvasElement, "Selected Seat")).toHaveTextContent(
      /^VIP • Row 7 • Seats 07, 10$/,
    );

    // AC 4: payment (transaction costs = $15 fee + $5 tax).
    await expect(
      canvas.getByRole("heading", { name: "Payment" }),
    ).toBeVisible();
    const payment: [string, string][] = [
      ["Ticket count", "2 tickets"],
      ["Transaction costs", "$20"],
      ["Total paid", "$260"],
      ["Paid by", "Negar Khosravi"],
      ["Payment method", "Visa •••• 4242"],
      ["Transaction ID", "7984bd83-3827-4c1a-9e2f-5a6b7c8d9e0f"],
    ];
    for (const [label, value] of payment) {
      await expect(fieldValue(canvasElement, label)).toHaveTextContent(
        new RegExp(`^${value.replace(/[$.]/g, "\\$&")}$`),
      );
    }

    // AC 5: the QR code of a completed order.
    await expect(
      canvas.getByRole("img", { name: "Order QR code" }),
    ).toBeVisible();
  },
};

// ORDDETAIL-02 AC 6: a canceled order has no QR code, and the payment fields
// it has no value for read "—". Edge case: one seat reads "1 ticket".
export const Canceled: Story = {
  args: { order: canceledOrderDetail },
  play: async ({ canvas, canvasElement }) => {
    await expect(canvas.getByText("Canceled")).toBeVisible();
    await expect(
      canvas.queryByRole("img", { name: "Order QR code" }),
    ).toBeNull();
    await expect(fieldValue(canvasElement, "Payment method")).toHaveTextContent(
      /^—$/,
    );
    await expect(fieldValue(canvasElement, "Transaction ID")).toHaveTextContent(
      /^—$/,
    );
    await expect(fieldValue(canvasElement, "Ticket count")).toHaveTextContent(
      /^1 ticket$/,
    );
    await expect(
      fieldValue(canvasElement, "Transaction costs"),
    ).toHaveTextContent(/^\$10$/);
  },
};

// External-dependency failure: a paid order whose payment Billing can't find
// shows "—" as its payment method.
export const MissingPaymentCard: Story = {
  args: { order: accountOrderDetail({ paymentCard: null }) },
  play: async ({ canvasElement }) => {
    await expect(fieldValue(canvasElement, "Payment method")).toHaveTextContent(
      /^—$/,
    );
  },
};

// ORDDETAIL-03 AC 7: refund and download are disabled buttons.
export const DisabledActions: Story = {
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole("button", { name: "Refound ticket" }),
    ).toBeDisabled();
    await expect(
      canvas.getByRole("button", { name: "Download ticket" }),
    ).toBeDisabled();
  },
};
