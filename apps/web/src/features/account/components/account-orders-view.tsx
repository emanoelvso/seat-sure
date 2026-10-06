import { Pagination } from "@/components/ui/pagination";
import { paths } from "@/config/paths";
import type { AccountOrdersPage } from "@/features/account/api/find-account-orders";
import { OrderCard } from "@/features/account/components/order-card";
import { OrderSortMenu } from "@/features/account/components/order-sort-menu";
import { OrderStatusTabs } from "@/features/account/components/order-status-tabs";
import { OrdersEmptyState } from "@/features/account/components/orders-empty-state";
import {
  type AccountOrdersSearchParams,
  serializeAccountOrdersSearchParams,
} from "@/features/account/utils/account-orders-search-params";

interface AccountOrdersViewProps {
  data: AccountOrdersPage;
  params: AccountOrdersSearchParams;
}

// The ticket list page body (ORDLIST-02, ORDLIST-05, ORDEMPTY-01). Each
// account page builds its own content card: the list card is Figma
// 5011:121185, the empty-state card 5819:38819 (24px below the header where
// the layout leaves 22px, hence mt-0.5).
export function AccountOrdersView({ data, params }: AccountOrdersViewProps) {
  if (data.counts.all === 0) {
    return (
      <section className="mt-0.5 flex flex-col items-center gap-2 rounded-3xl bg-neutral-1000 px-[324px] py-[173px]">
        <h1 className="sr-only">Tickets</h1>
        <OrdersEmptyState />
      </section>
    );
  }

  const getHref = (page: number) =>
    serializeAccountOrdersSearchParams(paths.accountTickets.getHref(), {
      status: params.status,
      sort: params.sort,
      page,
    });

  return (
    <section className="flex min-h-[832px] flex-col gap-12 rounded-3xl bg-neutral-1000 p-10">
      <h1 className="sr-only">Tickets</h1>
      <div className="flex items-center justify-between gap-12">
        <OrderStatusTabs counts={data.counts} params={params} />
        <OrderSortMenu />
      </div>

      {data.items.length === 0 ? (
        <p className="text-base text-neutral-200">No orders in this tab.</p>
      ) : (
        <div className="flex flex-col gap-4">
          {data.items.map((order) => (
            <OrderCard key={order.id} order={order} />
          ))}
        </div>
      )}

      <Pagination
        page={data.page}
        totalPages={data.totalPages}
        getHref={getHref}
      />
    </section>
  );
}
