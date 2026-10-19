import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { BillingCustomer } from '@billingModule/persistence/entity/billing-customer.entity';
import { DefaultTypeOrmRepository } from '@sharedModules/persistence/typeorm/repository/default-typeorm.repository';
import { DataSource } from 'typeorm';

const UNIQUE_VIOLATION = '23505';

@Injectable()
export class BillingCustomerRepository extends DefaultTypeOrmRepository<BillingCustomer> {
  constructor(
    @InjectDataSource('billing')
    readonly datasource: DataSource,
  ) {
    super(BillingCustomer, datasource.manager);
  }

  async findForUser(
    userId: string,
    provider: string,
  ): Promise<BillingCustomer | null> {
    return this.findOne({ where: { userId, provider } });
  }

  // Inserts the customer, or returns the one a concurrent call inserted first
  async insertOnce(customer: BillingCustomer): Promise<BillingCustomer> {
    try {
      return await this.save(customer);
    } catch (error) {
      if ((error as { code?: string }).code !== UNIQUE_VIOLATION) {
        throw error;
      }
      const existing = await this.findForUser(
        customer.userId,
        customer.provider,
      );
      if (!existing) {
        throw error;
      }
      return existing;
    }
  }
}
