import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DefaultTypeOrmRepository } from '@sharedModules/persistence/typeorm/repository/default-typeorm.repository';
import { OrderItem } from '@ticketingModule/persistence/entity/order-item.entity';
import { OrderStatus } from '@ticketingModule/core/enum/order-status.enum';
import {
  AccountOrderCountsModel,
  AccountOrdersSort,
  AccountOrdersTab,
} from '@ticketingModule/core/model/account-order.model';
import { Order } from '@ticketingModule/persistence/entity/order.entity';
import { DataSource, EntityManager } from 'typeorm';

// Which orders each account tab shows, on the alias `o` (ORDLIST-01). A
// pending or processing order is listed until it expires by the API clock
// (`:now`, AD-025). Expired and failed orders are never listed.
const COMPLETED_CONDITION = 'o.status = :paid';
const CANCELLED_CONDITION = 'o.status = :cancelled';
const PENDING_CONDITION = '(o.status IN (:...open) AND o.expiresAt >= :now)';

const TAB_CONDITIONS: Record<AccountOrdersTab, string> = {
  [AccountOrdersTab.COMPLETED]: COMPLETED_CONDITION,
  [AccountOrdersTab.CANCELLED]: CANCELLED_CONDITION,
  [AccountOrdersTab.PENDING]: PENDING_CONDITION,
  [AccountOrdersTab.ALL]: `(${COMPLETED_CONDITION} OR ${CANCELLED_CONDITION} OR ${PENDING_CONDITION})`,
};

const tabParameters = (now: Date) => ({
  paid: OrderStatus.PAID,
  cancelled: OrderStatus.CANCELLED,
  open: [
    OrderStatus.PENDING,
    OrderStatus.PROCESSING,
    OrderStatus.REQUIRES_ACTION,
  ],
  now,
});

// Amount sorts break ties by newest first (ORDLIST-04)
const SORT_ORDERS: Record<
  AccountOrdersSort,
  Array<[string, 'ASC' | 'DESC']>
> = {
  [AccountOrdersSort.NEWEST]: [['o.createdAt', 'DESC']],
  [AccountOrdersSort.OLDEST]: [['o.createdAt', 'ASC']],
  [AccountOrdersSort.HIGHEST_AMOUNT]: [
    ['o.totalCents', 'DESC'],
    ['o.createdAt', 'DESC'],
  ],
  [AccountOrdersSort.LOWEST_AMOUNT]: [
    ['o.totalCents', 'ASC'],
    ['o.createdAt', 'DESC'],
  ],
};

@Injectable()
export class OrderRepository extends DefaultTypeOrmRepository<Order> {
  constructor(
    @InjectDataSource('ticketing')
    readonly datasource: DataSource,
  ) {
    super(Order, datasource.manager);
  }

  async insertWithItems(
    manager: EntityManager,
    order: Order,
    items: OrderItem[],
  ): Promise<void> {
    await manager.insert(Order, order);
    await manager.insert(OrderItem, items);
  }

  // The user's pending orders for the event, expired or not, with their items
  async findPendingWithItems(
    manager: EntityManager,
    userId: string,
    eventId: string,
  ): Promise<Order[]> {
    return manager.find(Order, {
      where: { userId, eventId, status: OrderStatus.PENDING },
      relations: { items: true },
    });
  }

  // Claims the payment attempt: only one caller can move a pending, unexpired
  // order to processing (PAY-45). `now` is the API clock (AD-025).
  async claimPayment(orderId: string, now: Date): Promise<boolean> {
    const [rows]: [{ id: string }[], number] = await this.entityManager.query(
      `
      UPDATE "TicketingOrder" SET "status" = $1, "updatedAt" = now()
      WHERE "id" = $2 AND "status" = $3 AND "expiresAt" >= $4
      RETURNING "id"
      `,
      [OrderStatus.PROCESSING, orderId, OrderStatus.PENDING, now],
    );

    return rows.length === 1;
  }

  // Pauses a claimed attempt on the buyer's 3-D Secure challenge, keeping the
  // payment it waits on. Only a processing order can pause (GW-08).
  async markRequiresAction(
    orderId: string,
    paymentId: string,
  ): Promise<boolean> {
    const result = await this.entityManager.update(
      Order,
      { id: orderId, status: OrderStatus.PROCESSING },
      { status: OrderStatus.REQUIRES_ACTION, paymentId },
    );

    return result.affected === 1;
  }

  // Claims a paused order for settlement: only one caller can move it from
  // requires_action back to processing (GW-14). Expiry is checked by the
  // caller, which cancels the payment of an expired order (GW-12).
  async claimConfirm(orderId: string): Promise<boolean> {
    const [rows]: [{ id: string }[], number] = await this.entityManager.query(
      `
      UPDATE "TicketingOrder" SET "status" = $1, "updatedAt" = now()
      WHERE "id" = $2 AND "status" = $3
      RETURNING "id"
      `,
      [OrderStatus.PROCESSING, orderId, OrderStatus.REQUIRES_ACTION],
    );

    return rows.length === 1;
  }

  // Ends a payment attempt that charged nothing, so the buyer can retry
  async releasePayment(orderId: string): Promise<void> {
    await this.entityManager.update(
      Order,
      { id: orderId, status: OrderStatus.PROCESSING },
      { status: OrderStatus.PENDING, paymentId: null },
    );
  }

  // A charged attempt whose seats were lost, after its refund (PAY-46)
  async markFailed(orderId: string): Promise<void> {
    await this.entityManager.update(
      Order,
      { id: orderId, status: OrderStatus.PROCESSING },
      { status: OrderStatus.FAILED },
    );
  }

  async markPaid(
    manager: EntityManager,
    orderId: string,
    { paymentId, paidAt }: { paymentId: string; paidAt: Date },
  ): Promise<void> {
    await manager.update(
      Order,
      { id: orderId, status: OrderStatus.PROCESSING },
      { status: OrderStatus.PAID, paymentId, paidAt },
    );
  }

  async cancel(manager: EntityManager, orderId: string): Promise<void> {
    await manager.update(
      Order,
      { id: orderId, status: OrderStatus.PENDING },
      { status: OrderStatus.CANCELLED },
    );
  }

  // The user's order count per account tab, in one query (ORDLIST-02)
  async countAccountTabs(
    userId: string,
    now: Date,
  ): Promise<AccountOrderCountsModel> {
    const counts = await this.entityManager
      .createQueryBuilder(Order, 'o')
      .select(`COUNT(*) FILTER (WHERE ${TAB_CONDITIONS.ALL})`, 'all')
      .addSelect(`COUNT(*) FILTER (WHERE ${TAB_CONDITIONS.PENDING})`, 'pending')
      .addSelect(
        `COUNT(*) FILTER (WHERE ${TAB_CONDITIONS.CANCELLED})`,
        'cancelled',
      )
      .addSelect(
        `COUNT(*) FILTER (WHERE ${TAB_CONDITIONS.COMPLETED})`,
        'completed',
      )
      .where('o.userId = :userId', { userId })
      .setParameters(tabParameters(now))
      .getRawOne<Record<keyof AccountOrderCountsModel, string>>();

    return {
      all: Number(counts?.all ?? 0),
      pending: Number(counts?.pending ?? 0),
      cancelled: Number(counts?.cancelled ?? 0),
      completed: Number(counts?.completed ?? 0),
    };
  }

  // One page of the user's orders in a tab, each with its seat count as
  // `quantity` (ORDLIST-01, ORDLIST-04, ORDLIST-05).
  // SPEC_DEVIATION: the design names `loadRelationCountAndMap` for the count.
  // Reason: TypeORM 1.x removed it, so a correlated subquery counts the items.
  async findAccountPage(
    userId: string,
    tab: AccountOrdersTab,
    sort: AccountOrdersSort,
    { offset, limit }: { offset: number; limit: number },
    now: Date,
  ): Promise<Array<Order & { quantity: number }>> {
    const query = this.entityManager
      .createQueryBuilder(Order, 'o')
      .addSelect(
        (subQuery) =>
          subQuery
            .select('COUNT(*)')
            .from(OrderItem, 'i')
            .where('i.orderId = o.id'),
        'quantity',
      )
      .where('o.userId = :userId', { userId })
      .andWhere(TAB_CONDITIONS[tab])
      .setParameters(tabParameters(now))
      .offset(offset)
      .limit(limit);
    for (const [column, direction] of SORT_ORDERS[sort]) {
      query.addOrderBy(column, direction);
    }

    const { entities, raw } = await query.getRawAndEntities<{
      o_id: string;
      quantity: string;
    }>();
    const quantities = new Map(
      raw.map((row) => [row.o_id, Number(row.quantity)]),
    );

    return entities.map((order) =>
      Object.assign(order, { quantity: quantities.get(order.id) ?? 0 }),
    );
  }

  // An order that still holds the buyer's seats and payment: open and not
  // yet expired by the API clock. Expired orders never block (AD-025).
  async hasOpenOrder(userId: string, now: Date): Promise<boolean> {
    return this.entityManager
      .createQueryBuilder(Order, 'o')
      .where('o.userId = :userId', { userId })
      .andWhere('o.status IN (:...open)', {
        open: [
          OrderStatus.PENDING,
          OrderStatus.PROCESSING,
          OrderStatus.REQUIRES_ACTION,
        ],
      })
      .andWhere('o.expiresAt > :now', { now })
      .getExists();
  }
}
