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

  async cancel(manager: EntityManager, orderId: string): Promise<void> {
    await manager.update(
      Order,
      { id: orderId, status: OrderStatus.PENDING },
      { status: OrderStatus.CANCELLED },
    );
  }
}
