import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { BillingPayment } from '@billingModule/persistence/entity/billing-payment.entity';
import { DefaultTypeOrmRepository } from '@sharedModules/persistence/typeorm/repository/default-typeorm.repository';
import { DataSource } from 'typeorm';

@Injectable()
export class BillingPaymentRepository extends DefaultTypeOrmRepository<BillingPayment> {
  constructor(
    @InjectDataSource('billing')
    readonly datasource: DataSource,
  ) {
    super(BillingPayment, datasource.manager);
  }
}
