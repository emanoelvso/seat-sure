import { notFound, redirect } from "next/navigation";
import { Header } from "@/components/layouts/header";
import { paths } from "@/config/paths";
import { getCheckoutPageData } from "@/features/checkout/api/get-checkout-page-data";
import { confirmOrderPaymentAction } from "@/features/checkout/api/confirm-order-payment-action";
import { payOrderAction } from "@/features/checkout/api/pay-order-action";
import { simulatedBankAction } from "@/features/checkout/api/simulated-bank-action";
import { CheckoutView } from "@/features/checkout/components/checkout-view";

// No loading.tsx: the page awaits its data so notFound() still answers 404
// (AD-008). This segment's not-found.tsx covers it.
export default async function CheckoutOrderPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;
  const currentPath = paths.checkout.getHref(orderId);
  const { order, user, cards } = await getCheckoutPageData(
    orderId,
    currentPath,
  );

  if (!order) notFound();

  // PAY-56: a paid order's page is the success page, not the pay form.
  if (order.status === "PAID") {
    redirect(paths.checkoutSuccess.getHref(order.id));
  }

  return (
    <>
      <Header className="!mb-10" />
      <main className="px-27 pb-25">
        <CheckoutView
          order={order}
          user={user}
          cards={cards}
          payAction={payOrderAction}
          bankAction={simulatedBankAction}
          confirmAction={confirmOrderPaymentAction}
        />
      </main>
    </>
  );
}
