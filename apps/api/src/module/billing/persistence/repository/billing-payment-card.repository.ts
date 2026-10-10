import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { BillingPaymentCard } from '@billingModule/persistence/entity/billing-payment-card.entity';
import { DefaultTypeOrmRepository } from '@sharedModules/persistence/typeorm/repository/default-typeorm.repository';
import { DataSource, EntityManager } from 'typeorm';

@Injectable()
export class BillingPaymentCardRepository extends DefaultTypeOrmRepository<BillingPaymentCard> {
  constructor(
    @InjectDataSource('billing')
    readonly datasource: DataSource,
  ) {
    super(BillingPaymentCard, datasource.manager);
  }

  // The user's cards, default first, then oldest saved first (CARD-01 AC 3)
  async listForUser(
    userId: string,
    manager: EntityManager = this.datasource.manager,
  ): Promise<BillingPaymentCard[]> {
    return manager.find(BillingPaymentCard, {
      where: { userId },
      order: { isDefault: 'DESC', createdAt: 'ASC', id: 'ASC' },
    });
  }

  // A real DELETE, not DefaultEntity's soft delete: the token row is gone and
  // the same card can be saved again under the (userId, fingerprint) unique
  async hardDelete(manager: EntityManager, id: string): Promise<void> {
    await manager.delete(BillingPaymentCard, { id });
  }

  async countForUser(manager: EntityManager, userId: string): Promise<number> {
    return manager.count(BillingPaymentCard, { where: { userId } });
  }

  async hasFingerprint(
    manager: EntityManager,
    userId: string,
    fingerprint: string,
  ): Promise<boolean> {
    return manager.exists(BillingPaymentCard, {
      where: { userId, fingerprint },
    });
  }

  async insert(
    manager: EntityManager,
    card: BillingPaymentCard,
  ): Promise<void> {
    await manager.insert(BillingPaymentCard, card);
  }

  async findForUser(
    manager: EntityManager,
    userId: string,
    id: string,
  ): Promise<BillingPaymentCard | null> {
    return manager.findOne(BillingPaymentCard, { where: { id, userId } });
  }

  // Clears the old default before setting the new one, as the partial unique
  // index allows one default per user at any moment
  async moveDefault(
    manager: EntityManager,
    userId: string,
    id: string,
  ): Promise<void> {
    await manager.update(
      BillingPaymentCard,
      { userId, isDefault: true },
      { isDefault: false },
    );
    await manager.update(
      BillingPaymentCard,
      { id, userId },
      { isDefault: true },
    );
  }
}
