import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { BillingPendingCard } from '@billingModule/persistence/entity/billing-pending-card.entity';
import { DefaultTypeOrmRepository } from '@sharedModules/persistence/typeorm/repository/default-typeorm.repository';
import { DataSource, EntityManager } from 'typeorm';

@Injectable()
export class BillingPendingCardRepository extends DefaultTypeOrmRepository<BillingPendingCard> {
  constructor(
    @InjectDataSource('billing')
    readonly datasource: DataSource,
  ) {
    super(BillingPendingCard, datasource.manager);
  }

  async findByPaymentId(paymentId: string): Promise<BillingPendingCard | null> {
    return this.findOne({ where: { paymentId } });
  }

  // A real DELETE, not DefaultEntity's soft delete: the token must not stay
  // in the table once the card is saved or dropped
  async hardDelete(
    id: string,
    manager: EntityManager = this.datasource.manager,
  ): Promise<void> {
    await manager.delete(BillingPendingCard, { id });
  }

  // The tokens of every card held for the user, whatever the provider
  async listTokensForUser(
    userId: string,
    manager: EntityManager = this.datasource.manager,
  ): Promise<string[]> {
    const held = await manager.find(BillingPendingCard, {
      where: { userId },
      select: { providerToken: true },
    });
    return held.map((card) => card.providerToken);
  }

  async hardDeleteAllForUser(
    manager: EntityManager,
    userId: string,
  ): Promise<void> {
    await manager.delete(BillingPendingCard, { userId });
  }
}
