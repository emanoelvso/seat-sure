import { isValidElement, type ReactElement, type ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { notFound } from "next/navigation";
import { getCheckoutPageData } from "@/features/checkout/api/get-checkout-page-data";
import { PaymentSuccess } from "@/features/checkout/components/payment-success";
import CheckoutSuccessPage from "@/app/checkout/[orderId]/success/page";

const { NOT_FOUND } = vi.hoisted(() => ({
  NOT_FOUND: new Error("NEXT_NOT_FOUND"),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw NOT_FOUND;
  }),
}));
vi.mock("@/features/checkout/api/get-checkout-page-data", () => ({
  getCheckoutPageData: vi.fn(),
}));
vi.mock("@/features/checkout/components/payment-success", () => ({
  PaymentSuccess: vi.fn(),
}));

const mockedGetCheckoutPageData = vi.mocked(getCheckoutPageData);

type CheckoutPageData = Awaited<ReturnType<typeof getCheckoutPageData>>;

const user = {
  firstName: "Negar",
  lastName: "Khosravi",
  email: "negar.khosravi@example.com",
};

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

describe("CheckoutSuccessPage", () => {
  beforeEach(() => {
    mockedGetCheckoutPageData.mockReset();
    vi.mocked(notFound).mockClear();
  });

  it("renders PaymentSuccess with the account email for a paid order (PAY-54)", async () => {
    mockedGetCheckoutPageData.mockResolvedValue({
      order: { id: "order-81", status: "PAID" },
      user,
    } as unknown as CheckoutPageData);

    const page = await CheckoutSuccessPage(params("order-81"));

    expect(notFound).not.toHaveBeenCalled();
    expect(findElement(page, PaymentSuccess)?.props).toEqual({
      email: "negar.khosravi@example.com",
    });
  });

  it("404s a pending order (PAY-55)", async () => {
    mockedGetCheckoutPageData.mockResolvedValue({
      order: { id: "order-81", status: "PENDING" },
      user,
    } as unknown as CheckoutPageData);

    await expect(CheckoutSuccessPage(params("order-81"))).rejects.toBe(
      NOT_FOUND,
    );
  });

  it("404s an expired order (PAY-55)", async () => {
    mockedGetCheckoutPageData.mockResolvedValue({
      order: { id: "order-81", status: "EXPIRED" },
      user,
    } as unknown as CheckoutPageData);

    await expect(CheckoutSuccessPage(params("order-81"))).rejects.toBe(
      NOT_FOUND,
    );
  });

  it("404s a missing order (PAY-55)", async () => {
    mockedGetCheckoutPageData.mockResolvedValue({
      order: null,
      user,
    } as unknown as CheckoutPageData);

    await expect(CheckoutSuccessPage(params("order-81"))).rejects.toBe(
      NOT_FOUND,
    );
  });
});
