import { notFound } from "next/navigation";
import { paths } from "@/config/paths";
import { getCheckoutPageData } from "@/features/checkout/api/get-checkout-page-data";
import { PaymentSuccess } from "@/features/checkout/components/payment-success";

// No loading.tsx: the page awaits its data so notFound() still answers 404
// (AD-008). The [orderId] segment's not-found.tsx covers it.
export default async function CheckoutSuccessPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;
  const currentPath = paths.checkoutSuccess.getHref(orderId);
  const { order, user } = await getCheckoutPageData(orderId, currentPath);

  // PAY-55: only a paid order's success page renders.
  if (!order || order.status !== "PAID") notFound();

  return <PaymentSuccess email={user.email} />;
}
