import { notFound } from "next/navigation";
import { paths } from "@/config/paths";
import { getAccountOrderPageData } from "@/features/account/api/get-account-order-page-data";
import { AccountOrderDetailView } from "@/features/account/components/account-order-detail-view";

// A Completed or Canceled order of the signed-in user (ORDDETAIL-04). The API
// returns null for an unknown, foreign, pending, expired or failed order, or
// a malformed id: that is this segment's not-found page, HTTP 404. No
// loading.tsx, so notFound() still answers 404 (AD-008).
export default async function AccountTicketPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;
  const currentPath = paths.accountTicket.getHref(orderId);
  const { order, user } = await getAccountOrderPageData(orderId, currentPath);

  if (!order) notFound();

  return <AccountOrderDetailView order={order} user={user} />;
}
