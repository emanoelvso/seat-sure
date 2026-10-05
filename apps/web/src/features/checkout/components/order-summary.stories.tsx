import { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect } from "storybook/test";
import { OrderSummary } from "./order-summary";

const meta: Meta<typeof OrderSummary> = {
  title: "Features/Checkout/OrderSummary",
  tags: ["autodocs"],
  component: OrderSummary,
  args: {
    order: {
      quantity: 2,
      currency: "USD",
      unitPriceCents: 45000,
      unitServiceFeeCents: 6750,
      unitTaxCents: 3600,
      totalCents: 110700,
    },
  },
} satisfies Meta<typeof OrderSummary>;

export default meta;

type Story = StoryObj<typeof OrderSummary>;

// Reads the <dd> paired with the <dt> whose text is `term`.
function valueFor(canvasElement: HTMLElement, term: string) {
  const dt = Array.from(canvasElement.querySelectorAll("dt")).find(
    (el) => el.textContent === term,
  );
  return dt?.nextElementSibling?.tagName === "DD"
    ? dt.nextElementSibling.textContent
    : null;
}

// PAY-25: N=2 shows every line as "{N} * {unit}" and the order total.
export const TwoTickets: Story = {
  play: async ({ canvas, canvasElement }) => {
    await expect(
      canvas.getByRole("heading", { name: "Order summary" }),
    ).toBeVisible();
    await expect(valueFor(canvasElement, "Ticket price")).toBe("2 * $450");
    await expect(valueFor(canvasElement, "Service fee")).toBe("2 * $67.50");
    await expect(valueFor(canvasElement, "Tax")).toBe("2 * $36");
    await expect(valueFor(canvasElement, "Total price")).toBe("$1,107");
  },
};

// PAY-25: N=1 with distinct unit values, each line read from its own field.
export const OneTicket: Story = {
  args: {
    order: {
      quantity: 1,
      currency: "USD",
      unitPriceCents: 5500,
      unitServiceFeeCents: 825,
      unitTaxCents: 440,
      totalCents: 6765,
    },
  },
  play: async ({ canvasElement }) => {
    await expect(valueFor(canvasElement, "Ticket price")).toBe("1 * $55");
    await expect(valueFor(canvasElement, "Service fee")).toBe("1 * $8.25");
    await expect(valueFor(canvasElement, "Tax")).toBe("1 * $4.40");
    await expect(valueFor(canvasElement, "Total price")).toBe("$67.65");
  },
};
