import { paths } from "@/config/paths";
import { getPaymentPageData } from "@/features/account/api/get-payment-page-data";
import { PaymentView } from "@/features/account/components/payment-view";

// The signed-in user's saved cards (CARD-01, CARD-02). The loader redirects
// a visitor without a session; any other failure falls to
// app/account/error.tsx. PaymentView runs the add, set default, and remove
// Server Actions itself (its default action props).
export default async function AccountPaymentPage() {
  const { cards } = await getPaymentPageData(paths.accountPayment.getHref());

  return <PaymentView cards={cards} />;
}
