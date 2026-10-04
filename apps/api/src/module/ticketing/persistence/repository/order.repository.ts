import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DefaultTypeOrmRepository } from '@sharedModules/persistence/typeorm/repository/default-typeorm.repository';
import { Order } from '@ticketingModule/persistence/entity/order.entity';
import { DataSource } from 'typeorm';

@Injectable()
export class OrderRepository extends DefaultTypeOrmRepository<Order> {
  constructor(
    @InjectDataSource('ticketing')
    readonly datasource: DataSource,
  ) {
    super(Order, datasource.manager);
  }
}
