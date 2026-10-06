import { isValidElement, type ReactElement, type ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { notFound, redirect } from "next/navigation";
import { getCheckoutPageData } from "@/features/checkout/api/get-checkout-page-data";
import { payOrderAction } from "@/features/checkout/api/pay-order-action";
import { CheckoutView } from "@/features/checkout/components/checkout-view";
import CheckoutOrderPage from "@/app/checkout/[orderId]/page";

const { NOT_FOUND, REDIRECT_ERROR } = vi.hoisted(() => ({
  NOT_FOUND: new Error("NEXT_NOT_FOUND"),
  REDIRECT_ERROR: new Error("NEXT_REDIRECT"),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw NOT_FOUND;
  }),
  redirect: vi.fn(() => {
    throw REDIRECT_ERROR;
  }),
}));
vi.mock("@/features/checkout/api/get-checkout-page-data", () => ({
  getCheckoutPageData: vi.fn(),
}));
vi.mock("@/features/checkout/api/pay-order-action", () => ({
  payOrderAction: vi.fn(),
}));
vi.mock("@/features/checkout/components/checkout-view", () => ({
  CheckoutView: vi.fn(),
}));
// Loads next/font, which only runs in a Next.js build - the page is only
// checked for the elements and props it returns.
vi.mock("@/components/layouts/header", () => ({
  Header: vi.fn(),
}));

const mockedGetCheckoutPageData = vi.mocked(getCheckoutPageData);

type CheckoutPageData = Awaited<ReturnType<typeof getCheckoutPageData>>;

const user = {
  firstName: "Negar",
  lastName: "Khosravi",
  email: "negar.khosravi@example.com",
};

function order(status: string) {
  return {
    id: "order-81",
    status,
    secondsLeft: 583,
    quantity: 2,
    currency: "USD",
    totalCents: 110700,
    unitPriceCents: 45000,
    unitServiceFeeCents: 6750,
    unitTaxCents: 3600,
    event: {
      id: "event-12",
      name: "Adele",
      coverImage: "/artist/adele.png",
      venue: "Fontainbleau",
      city: "Las Vegas",
      country: "USA",
      startAt: "2026-07-30T19:30:00.000Z",
    },
    ticketType: { id: "type-34", name: "VIP" },
    items: [{ seatId: "seat-07", row: "7", number: "07" }],
  };
}

function params(orderId: string) {
  return { params: Promise.resolve({ orderId }) };
}

function findElement(node: ReactNode, type: unknown): ReactElement | undefined {
  if (Array.isArray(node)) {
    for (const child of node) {
      const found = findElement(child, type);
      if (found) return found;
    }
    return undefined;
  }
  if (!isValidElement(node)) return undefined;
  if (node.type === type) return node;

  return findElement((node.props as { children?: ReactNode }).children, type);
}

describe("CheckoutOrderPage", () => {
  beforeEach(() => {
    mockedGetCheckoutPageData.mockReset();
    vi.mocked(notFound).mockClear();
    vi.mocked(redirect).mockClear();
  });

  it("answers not found when the order is null (PAY-22)", async () => {
    mockedGetCheckoutPageData.mockResolvedValue({
      order: null,
      user,
    } as unknown as CheckoutPageData);

    await expect(CheckoutOrderPage(params("order-81"))).rejects.toBe(NOT_FOUND);
  });

  it("redirects a paid order to the success page (PAY-56)", async () => {
    mockedGetCheckoutPageData.mockResolvedValue({
      order: order("PAID"),
      user,
    } as unknown as CheckoutPageData);

    await expect(CheckoutOrderPage(params("order-81"))).rejects.toBe(
      REDIRECT_ERROR,
    );

    expect(redirect).toHaveBeenCalledWith("/checkout/order-81/success");
    expect(notFound).not.toHaveBeenCalled();
  });

  it("renders the view with the pending order and user", async () => {
    const pendingOrder = order("PENDING");
    mockedGetCheckoutPageData.mockResolvedValue({
      order: pendingOrder,
      user,
    } as unknown as CheckoutPageData);

    const page = await CheckoutOrderPage(params("order-81"));

    expect(notFound).not.toHaveBeenCalled();
    expect(redirect).not.toHaveBeenCalled();
    expect(findElement(page, CheckoutView)?.props).toEqual({
      order: pendingOrder,
      user,
      payAction: payOrderAction,
    });
  });

  it("renders the view for an expired order, leaving the dialog to decide", async () => {
    const expiredOrder = order("EXPIRED");
    mockedGetCheckoutPageData.mockResolvedValue({
      order: expiredOrder,
      user,
    } as unknown as CheckoutPageData);

    const page = await CheckoutOrderPage(params("order-81"));

    expect(notFound).not.toHaveBeenCalled();
    expect(redirect).not.toHaveBeenCalled();
    expect(findElement(page, CheckoutView)?.props).toEqual({
      order: expiredOrder,
      user,
      payAction: payOrderAction,
    });
  });

  it("loads with currentPath = /checkout/{id}", async () => {
    mockedGetCheckoutPageData.mockResolvedValue({
      order: order("PENDING"),
      user,
    } as unknown as CheckoutPageData);

    await CheckoutOrderPage(params("order-81"));

    expect(mockedGetCheckoutPageData).toHaveBeenCalledWith(
      "order-81",
      "/checkout/order-81",
    );
  });
});
