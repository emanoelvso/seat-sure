import { Injectable } from '@nestjs/common';
import { OrderStatus } from '@ticketingModule/core/enum/order-status.enum';
import { TicketingException } from '@ticketingModule/core/exception/ticketing.exception';
import {
  AccountOrderCountsModel,
  AccountOrdersPageModel,
  AccountOrdersSort,
  AccountOrdersTab,
  AccountOrderStatus,
} from '@ticketingModule/core/model/account-order.model';
import { OrderRepository } from '@ticketingModule/persistence/repository/order.repository';

// The page size is the web's choice; the cap bounds the query
const MAX_PAGE_SIZE = 20;

const TAB_COUNTS: Record<AccountOrdersTab, keyof AccountOrderCountsModel> = {
  [AccountOrdersTab.ALL]: 'all',
  [AccountOrdersTab.PENDING]: 'pending',
  [AccountOrdersTab.CANCELLED]: 'cancelled',
  [AccountOrdersTab.COMPLETED]: 'completed',
};

// Only listed orders reach here: paid, cancelled, or open and unexpired.
// `processing` is internal and reads as pending.
const toAccountOrderStatus = (status: OrderStatus): AccountOrderStatus => {
  if (status === OrderStatus.PAID) {
    return AccountOrderStatus.COMPLETED;
  }
  if (status === OrderStatus.CANCELLED) {
    return AccountOrderStatus.CANCELLED;
  }
  return AccountOrderStatus.PENDING;
};

@Injectable()
export class AccountOrdersService {
  constructor(private readonly orderRepository: OrderRepository) {}

  // One page of the user's orders in a tab plus the count of every tab. A
  // page past the end serves page 1 (ORDLIST-06). `now` is the API clock
  // (AD-025).
  async list({
    userId,
    tab,
    sort,
    page,
    pageSize,
    now,
  }: {
    userId: string;
    tab: AccountOrdersTab;
    sort: AccountOrdersSort;
    page: number;
    pageSize: number;
    now: Date;
  }): Promise<AccountOrdersPageModel> {
    if (page < 1 || pageSize < 1 || pageSize > MAX_PAGE_SIZE) {
      throw new TicketingException(
        'INVALID_PAGE',
        `page must be at least 1 and pageSize between 1 and ${MAX_PAGE_SIZE}.`,
      );
    }

    const counts = await this.orderRepository.countAccountTabs(userId, now);
    const totalPages = Math.ceil(counts[TAB_COUNTS[tab]] / pageSize);
    const effectivePage = page > totalPages ? 1 : page;

    const orders = await this.orderRepository.findAccountPage(
      userId,
      tab,
      sort,
      { offset: (effectivePage - 1) * pageSize, limit: pageSize },
      now,
    );

    return {
      items: orders.map((order) => ({
        id: order.id,
        status: toAccountOrderStatus(order.status),
        createdAt: order.createdAt,
        eventName: order.eventName,
        quantity: order.quantity,
        currency: order.currency,
        totalCents: order.totalCents,
      })),
      counts,
      page: effectivePage,
      totalPages,
    };
  }
}
