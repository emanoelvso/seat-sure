import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DefaultTypeOrmRepository } from '@sharedModules/persistence/typeorm/repository/default-typeorm.repository';
import { OrderItem } from '@ticketingModule/persistence/entity/order-item.entity';
import { OrderStatus } from '@ticketingModule/core/enum/order-status.enum';
import { Order } from '@ticketingModule/persistence/entity/order.entity';
import { DataSource, EntityManager } from 'typeorm';

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

  // Ends a payment attempt that charged nothing, so the buyer can retry
  async releasePayment(orderId: string): Promise<void> {
    await this.entityManager.update(
      Order,
      { id: orderId, status: OrderStatus.PROCESSING },
      { status: OrderStatus.PENDING },
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
}
