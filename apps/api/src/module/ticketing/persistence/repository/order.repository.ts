import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DefaultTypeOrmRepository } from '@sharedModules/persistence/typeorm/repository/default-typeorm.repository';
import { OrderItem } from '@ticketingModule/persistence/entity/order-item.entity';
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
}
