import { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn } from "storybook/test";
import { createFakeStripe } from "@/components/stripe/fake-stripe";
import { StripeCardFields } from "@/components/stripe/stripe-card-fields";
import { StripeProvider } from "@/components/stripe/stripe-provider";

const fake = createFakeStripe({ paymentMethodId: "pm_fake_123" });

const failing = createFakeStripe({
  paymentMethodError: { code: "card_declined", message: "Your card was declined." },
});

const meta: Meta<typeof StripeCardFields> = {
  title: "Components/Stripe/StripeCardFields",
  component: StripeCardFields,
  tags: ["autodocs"],
  args: { submitLabel: "Review order", onPaymentMethod: fn() },
  beforeEach: () => {
    fake.createPaymentMethod.mockClear();
  },
  decorators: [
    (Story) => (
      <StripeProvider stripe={fake.stripe}>
        <div className="w-[556px]">
          <Story />
        </div>
      </StripeProvider>
    ),
  ],
} satisfies Meta<typeof StripeCardFields>;

export default meta;

type Story = StoryObj<typeof StripeCardFields>;
type Play = NonNullable<Story["play"]>;
type PlayContext = Parameters<Play>[0];

async function fillCard({ canvas, userEvent }: PlayContext) {
  await userEvent.type(await canvas.findByRole("textbox", { name: "Card number" }), "4242424242424242");
  await userEvent.type(canvas.getByRole("textbox", { name: "Card holder" }), "Sara Lee");
  await userEvent.type(canvas.getByRole("textbox", { name: "Expiry" }), "1239");
  await userEvent.type(canvas.getByRole("textbox", { name: "CVC" }), "123");
}

// GW-41: only the PaymentMethod id leaves the form, with the holder as the
// billing name; no card field is ever handed to the callback.
export const SendsOnlyThePaymentMethodId: Story = {
  play: async (context) => {
    const { args, canvas, userEvent } = context;
    await fillCard(context);
    await userEvent.click(canvas.getByRole("button", { name: "Review order" }));

    await expect(args.onPaymentMethod).toHaveBeenCalledTimes(1);
    await expect(args.onPaymentMethod).toHaveBeenCalledWith("pm_fake_123");
    await expect(fake.createPaymentMethod).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "card",
        billing_details: { name: "Sara Lee" },
      }),
    );
  },
};

// GW-44: an incomplete field shows Stripe's message under it and nothing is
// created or sent.
export const IncompleteFieldBlocksSubmit: Story = {
  play: async ({ args, canvas, userEvent }) => {
    await userEvent.type(await canvas.findByRole("textbox", { name: "Card number" }), "4242");
    await userEvent.type(canvas.getByRole("textbox", { name: "Card holder" }), "Sara Lee");
    await userEvent.type(canvas.getByRole("textbox", { name: "Expiry" }), "1239");
    await userEvent.type(canvas.getByRole("textbox", { name: "CVC" }), "123");
    await userEvent.click(canvas.getByRole("button", { name: "Review order" }));

    await expect(
      await canvas.findByText("Your card number is incomplete."),
    ).toBeVisible();
    await expect(fake.createPaymentMethod).not.toHaveBeenCalled();
    await expect(args.onPaymentMethod).not.toHaveBeenCalled();
  },
};

// GW-44: a field that was never filled is reported on submit as well.
export const EmptyFormBlocksSubmit: Story = {
  play: async ({ args, canvas, userEvent }) => {
    await canvas.findByRole("textbox", { name: "Card number" });
    await userEvent.click(canvas.getByRole("button", { name: "Review order" }));

    await expect(
      await canvas.findByText("Your card number is incomplete."),
    ).toBeVisible();
    await expect(
      canvas.getByText("Your card's expiration date is incomplete."),
    ).toBeVisible();
    await expect(
      canvas.getByText("Your card's security code is incomplete."),
    ).toBeVisible();
    await expect(canvas.getByText("Enter the name on the card")).toBeVisible();
    await expect(fake.createPaymentMethod).not.toHaveBeenCalled();
    await expect(args.onPaymentMethod).not.toHaveBeenCalled();
  },
};

// GW-44: an invalid number shows Stripe's message as soon as it is typed.
export const InvalidNumberShowsStripesMessage: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.type(await canvas.findByRole("textbox", { name: "Card number" }), "4000000000000003");

    await expect(
      await canvas.findByText("Your card number is invalid."),
    ).toBeVisible();
  },
};

// A rejected PaymentMethod keeps the buyer on the form with Stripe's message.
export const PaymentMethodError: Story = {
  decorators: [
    (Story) => {
      return (
        <StripeProvider stripe={failing.stripe}>
          <div className="w-[556px]">
            <Story />
          </div>
        </StripeProvider>
      );
    },
  ],
  play: async (context) => {
    const { args, canvas, userEvent } = context;
    await fillCard(context);
    await userEvent.click(canvas.getByRole("button", { name: "Review order" }));

    await expect(await canvas.findByRole("alert")).toHaveTextContent(
      "Your card was declined.",
    );
    await expect(args.onPaymentMethod).not.toHaveBeenCalled();
  },
};
