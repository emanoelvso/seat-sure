import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { BillingCustomer } from '@billingModule/persistence/entity/billing-customer.entity';
import { DefaultTypeOrmRepository } from '@sharedModules/persistence/typeorm/repository/default-typeorm.repository';
import { DataSource, MoreThan } from 'typeorm';

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

  // One page of a provider's customers in id order, for a scan that keeps no
  // more than a page in memory
  async listPage(
    provider: string,
    afterId: string | null,
    limit: number,
  ): Promise<BillingCustomer[]> {
    return this.datasource.manager.find(BillingCustomer, {
      where: { provider, ...(afterId ? { id: MoreThan(afterId) } : {}) },
      order: { id: 'ASC' },
      take: limit,
    });
  }

  // Every customer of the user, whatever the provider
  async findAllForUser(userId: string): Promise<BillingCustomer[]> {
    return this.datasource.manager.find(BillingCustomer, {
      where: { userId },
    });
  }

  // A real DELETE, not DefaultEntity's soft delete: the row must really be
  // gone once its gateway customer is
  async hardDelete(id: string): Promise<void> {
    await this.datasource.manager.delete(BillingCustomer, { id });
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
