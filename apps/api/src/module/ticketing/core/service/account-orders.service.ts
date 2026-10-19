import { Inject, Injectable } from '@nestjs/common';
import { BillingApi } from '@sharedModules/integration/interface/billing-integration.interface';
import { OrderStatus } from '@ticketingModule/core/enum/order-status.enum';
import { TicketingException } from '@ticketingModule/core/exception/ticketing.exception';
import {
  AccountOrderCountsModel,
  AccountOrderDetailModel,
  AccountOrdersPageModel,
  AccountOrdersSort,
  AccountOrdersTab,
  AccountOrderStatus,
} from '@ticketingModule/core/model/account-order.model';
import { OrderRepository } from '@ticketingModule/persistence/repository/order.repository';
import { isUUID } from 'class-validator';

// The page size is the web's choice; the cap bounds the query
const MAX_PAGE_SIZE = 20;

const TAB_COUNTS: Record<AccountOrdersTab, keyof AccountOrderCountsModel> = {
  [AccountOrdersTab.ALL]: 'all',
  [AccountOrdersTab.PENDING]: 'pending',
  [AccountOrdersTab.CANCELLED]: 'cancelled',
  [AccountOrdersTab.COMPLETED]: 'completed',
};

// Only listed orders reach here: paid, cancelled, or open and unexpired.
// `processing` and `requires_action` read as pending.
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
  constructor(
    private readonly orderRepository: OrderRepository,
    @Inject(BillingApi)
    private readonly billingApi: BillingApi,
  ) {}

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

  // The caller's own Completed or Canceled order with its payment card, or
  // null for a malformed, unknown or foreign id, and for a pending, expired
  // or failed order (ORDDETAIL-04). A pending order resumes at checkout
  // instead.
  async findOne({
    userId,
    orderId,
  }: {
    userId: string;
    orderId: string;
  }): Promise<AccountOrderDetailModel | null> {
    if (!isUUID(orderId)) {
      return null;
    }

    const order = await this.orderRepository.findOne({
      where: { id: orderId, userId },
      relations: { items: true },
    });
    if (
      !order ||
      (order.status !== OrderStatus.PAID &&
        order.status !== OrderStatus.CANCELLED)
    ) {
      return null;
    }

    const paymentCard = order.paymentId
      ? await this.billingApi.findPaymentCard(order.paymentId)
      : null;

    return {
      id: order.id,
      status:
        order.status === OrderStatus.PAID
          ? AccountOrderStatus.COMPLETED
          : AccountOrderStatus.CANCELLED,
      createdAt: order.createdAt,
      event: {
        name: order.eventName,
        coverImage: order.eventCoverImage,
        venue: order.eventVenue,
        city: order.eventCity,
        country: order.eventCountry,
        startAt: order.eventStartAt,
      },
      ticketTypeName: order.ticketTypeName,
      items: order.items.map((item) => ({
        row: item.seatRow,
        number: item.seatNumber,
      })),
      quantity: order.items.length,
      currency: order.currency,
      serviceFeeCents: order.serviceFeeCents,
      taxCents: order.taxCents,
      totalCents: order.totalCents,
      paymentId: order.paymentId,
      paymentCard,
    };
  }
}
