import { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, screen, waitFor, within } from "storybook/test";
import type { AddPaymentCardState } from "@/features/account/api/add-payment-card-action";
import type { PaymentCard } from "@/features/account/api/find-my-payment-cards";
import type { PaymentCardActionResult } from "@/features/account/api/payment-card-actions";
import type { CardInput } from "@/utils/card";
import { PaymentView } from "./payment-view";

function makeCard(
  last4: string,
  overrides: Partial<PaymentCard> = {},
): PaymentCard {
  return {
    __typename: "PaymentCard",
    id: `card-${last4}`,
    brand: "visa",
    last4,
    expMonth: 8,
    expYear: 2030,
    holder: "Negar Khosravi",
    isDefault: false,
    expired: false,
    ...overrides,
  };
}

const VISA = makeCard("8557", { isDefault: true });
const MASTERCARD = makeCard("4444", {
  brand: "mastercard",
  holder: "Ada Lovelace",
});

// Fake Server Actions. Saving answers with the saved list (the first card
// becomes the default, as the API does); set default and remove answer as
// the API would for the two-card fixture.
const addAction = fn(
  async (
    _prev: AddPaymentCardState,
    card: CardInput,
  ): Promise<AddPaymentCardState> => ({
    status: "saved",
    cards: [
      makeCard(card.number.replace(/\D/g, "").slice(-4), {
        holder: card.holder,
        isDefault: true,
      }),
    ],
  }),
);
const setDefaultAction = fn(
  async (cardId: string): Promise<PaymentCardActionResult> => ({
    cards:
      cardId === MASTERCARD.id
        ? [
            { ...MASTERCARD, isDefault: true },
            { ...VISA, isDefault: false },
          ]
        : [VISA, MASTERCARD],
  }),
);
const removeAction = fn(
  async (cardId: string): Promise<PaymentCardActionResult> => ({
    cards: [VISA, MASTERCARD].filter((card) => card.id !== cardId),
  }),
);

// a11y "error" makes the addon's violations fail the story (preview.tsx
// only reports them).
const meta: Meta<typeof PaymentView> = {
  title: "Features/Account/PaymentView",
  component: PaymentView,
  tags: ["autodocs"],
  parameters: { a11y: { test: "error" } },
  args: {
    cards: [VISA, MASTERCARD],
    addAction,
    setDefaultAction,
    removeAction,
  },
  beforeEach: () => {
    addAction.mockClear();
    setDefaultAction.mockClear();
    removeAction.mockClear();
  },
  decorators: [
    (Story) => (
      <div className="w-[1128px]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof PaymentView>;

export default meta;

type Story = StoryObj<typeof PaymentView>;
type UserEvent = Parameters<NonNullable<Story["play"]>>[0]["userEvent"];

function cardOrder(canvas: HTMLElement) {
  return within(canvas)
    .getAllByRole("button", { name: /^Card options for/ })
    .map((trigger) => trigger.getAttribute("aria-label"));
}

async function chooseMenuItem(
  canvas: HTMLElement,
  userEvent: UserEvent,
  trigger: string,
  item: string,
) {
  await userEvent.click(within(canvas).getByRole("button", { name: trigger }));
  await userEvent.click(await screen.findByRole("menuitem", { name: item }));
  await waitFor(() => expect(screen.queryByRole("menu")).toBeNull());
}

// CARD-01 AC 1: no saved cards → the empty state, not the layout.
export const Empty: Story = {
  args: { cards: [] },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole("heading", { name: "You haven’t added a card yet!" }),
    ).toBeVisible();
    await expect(
      canvas.getByText(
        "Add one now so you can complete your payment and get your ticket",
      ),
    ).toBeVisible();
    await expect(
      canvas.getByRole("button", { name: "Add new card" }),
    ).toBeVisible();
    await expect(
      canvas.queryByRole("heading", { name: "Payment methods" }),
    ).toBeNull();
  },
};

// CARD-01 AC 2, CARD-03 AC 6: "Add new card" → the payment methods layout
// with the method buttons, the form (helper text shown), and the tile.
export const EmptyThenAdd: Story = {
  args: { cards: [] },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Add new card" }));

    await expect(
      canvas.getByRole("heading", { name: "Payment methods" }),
    ).toBeVisible();
    await expect(canvas.getByRole("button", { name: "Card" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(canvas.getByLabelText("Name on card")).toBeVisible();
    await expect(
      canvas.getByText("This credit card will be used by default for billing."),
    ).toBeVisible();
    await expect(
      canvas.getByRole("button", { name: "Add payment method" }),
    ).toBeVisible();
    await expect(
      canvas.queryByRole("button", { name: "Add new card" }),
    ).toBeNull();
  },
};

// CARD-01 AC 3: 1+ cards → the layout directly, one visual per card in the
// given order, the default with its badge; no helper text (CARD-03 AC 6).
export const WithCards: Story = {
  play: async ({ canvasElement, canvas }) => {
    await expect(
      canvas.getByRole("heading", { name: "Payment methods" }),
    ).toBeVisible();
    await expect(cardOrder(canvasElement)).toEqual([
      "Card options for Visa ending in 8557",
      "Card options for Mastercard ending in 4444",
    ]);
    const items = canvas.getAllByRole("listitem");
    await expect(within(items[0]).getByText("Default")).toBeVisible();
    await expect(within(items[1]).queryByText("Default")).toBeNull();
    await expect(
      canvas.queryByText(
        "This credit card will be used by default for billing.",
      ),
    ).toBeNull();
    await expect(canvas.queryByRole("alert")).toBeNull();
  },
};

// CARD-03 AC 3-4: saving shows "Card saved." in a status and the new card,
// which is the default.
export const SaveFirstCard: Story = {
  args: { cards: [] },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Add new card" }));
    await userEvent.type(canvas.getByLabelText("Name on card"), "Ada Lovelace");
    await userEvent.type(
      canvas.getByLabelText("Card number"),
      "4242424242424242",
    );
    await userEvent.type(canvas.getByLabelText("Expiry"), "1235");
    await userEvent.type(canvas.getByLabelText("CVC/CVV"), "123");
    await userEvent.click(canvas.getByRole("button", { name: "Save card" }));

    await waitFor(() =>
      expect(canvas.getByRole("status")).toHaveTextContent("Card saved."),
    );
    const items = canvas.getAllByRole("listitem");
    await expect(items).toHaveLength(1);
    await expect(
      within(items[0]).getByText("•••• •••• •••• 4242"),
    ).toBeVisible();
    await expect(within(items[0]).getByText("Default")).toBeVisible();
    await expect(canvas.getByLabelText("Name on card")).toHaveValue("");
  },
};

// CARD-10 AC 4: "Set as default" moves the badge and the card first.
export const SetDefault: Story = {
  play: async ({ canvasElement, canvas, userEvent }) => {
    await chooseMenuItem(
      canvasElement,
      userEvent,
      "Card options for Mastercard ending in 4444",
      "Set as default",
    );

    await expect(setDefaultAction).toHaveBeenCalledWith(MASTERCARD.id);
    await waitFor(() =>
      expect(cardOrder(canvasElement)).toEqual([
        "Card options for Mastercard ending in 4444",
        "Card options for Visa ending in 8557",
      ]),
    );
    const items = canvas.getAllByRole("listitem");
    await expect(within(items[0]).getByText("Default")).toBeVisible();
    await expect(within(items[1]).queryByText("Default")).toBeNull();
  },
};

// CARD-10 AC 7: confirming "Remove" drops the card.
export const RemoveCard: Story = {
  play: async ({ canvasElement, canvas, userEvent }) => {
    await chooseMenuItem(
      canvasElement,
      userEvent,
      "Card options for Mastercard ending in 4444",
      "Remove",
    );
    await userEvent.click(
      within(
        await canvas.findByRole("dialog", { name: "Remove this card?" }),
      ).getByRole("button", { name: "Remove" }),
    );

    await expect(removeAction).toHaveBeenCalledWith(MASTERCARD.id);
    await waitFor(() =>
      expect(cardOrder(canvasElement)).toEqual([
        "Card options for Visa ending in 8557",
      ]),
    );
    await expect(canvas.queryByRole("dialog")).toBeNull();
  },
};

// CARD-10 AC 9: removing the last card shows the empty state.
export const RemoveLastCard: Story = {
  args: { cards: [makeCard("8557", { isDefault: true })] },
  play: async ({ canvasElement, canvas, userEvent }) => {
    removeAction.mockResolvedValueOnce({ cards: [] });
    await chooseMenuItem(
      canvasElement,
      userEvent,
      "Card options for Visa ending in 8557",
      "Remove",
    );
    await userEvent.click(
      within(
        await canvas.findByRole("dialog", { name: "Remove this card?" }),
      ).getByRole("button", { name: "Remove" }),
    );

    await expect(
      await canvas.findByRole("heading", {
        name: "You haven’t added a card yet!",
      }),
    ).toBeVisible();
    await expect(
      canvas.queryByRole("heading", { name: "Payment methods" }),
    ).toBeNull();
  },
};

// CARD-11 AC 10: a not-found result replaces the list with the reloaded one.
export const NotFoundReloads: Story = {
  play: async ({ canvasElement, userEvent }) => {
    setDefaultAction.mockResolvedValueOnce({
      notFound: true,
      cards: [makeCard("8557", { isDefault: true })],
    });
    await chooseMenuItem(
      canvasElement,
      userEvent,
      "Card options for Mastercard ending in 4444",
      "Set as default",
    );

    await waitFor(() =>
      expect(cardOrder(canvasElement)).toEqual([
        "Card options for Visa ending in 8557",
      ]),
    );
    await expect(within(canvasElement).queryByRole("alert")).toBeNull();
  },
};

// CARD-11 AC 11: any other failure shows the generic alert and keeps the
// list.
export const GenericError: Story = {
  play: async ({ canvasElement, canvas, userEvent }) => {
    setDefaultAction.mockResolvedValueOnce({
      error: "Something went wrong. Please try again.",
    });
    await chooseMenuItem(
      canvasElement,
      userEvent,
      "Card options for Mastercard ending in 4444",
      "Set as default",
    );

    await expect(await canvas.findByRole("alert")).toHaveTextContent(
      "Something went wrong. Please try again.",
    );
    await expect(cardOrder(canvasElement)).toEqual([
      "Card options for Visa ending in 8557",
      "Card options for Mastercard ending in 4444",
    ]);
  },
};

// CARD-03 AC 15: the tile clears the form and focuses "Name on card".
export const TileResetsForm: Story = {
  play: async ({ canvas, userEvent }) => {
    const name = canvas.getByLabelText("Name on card");
    await userEvent.type(name, "Ada Lovelace");
    await userEvent.type(canvas.getByLabelText("Card number"), "4242");

    await userEvent.click(
      canvas.getByRole("button", { name: "Add payment method" }),
    );

    await expect(name).toHaveValue("");
    await expect(canvas.getByLabelText("Card number")).toHaveValue("");
    await expect(name).toHaveFocus();
  },
};
