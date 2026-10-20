import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { SimulatedPaymentStatus } from '@billingModule/core/enum/simulated-payment-status.enum';
import { BillingSimulatedPayment } from '@billingModule/persistence/entity/billing-simulated-payment.entity';
import { DefaultTypeOrmRepository } from '@sharedModules/persistence/typeorm/repository/default-typeorm.repository';
import { DataSource } from 'typeorm';

const UNIQUE_VIOLATION = '23505';

@Injectable()
export class BillingSimulatedPaymentRepository extends DefaultTypeOrmRepository<BillingSimulatedPayment> {
  constructor(
    @InjectDataSource('billing')
    readonly datasource: DataSource,
  ) {
    super(BillingSimulatedPayment, datasource.manager);
  }

  async findByKey(
    idempotencyKey: string,
  ): Promise<BillingSimulatedPayment | null> {
    return this.findOne({ where: { idempotencyKey } });
  }

  async findByClientSecret(
    clientSecret: string,
  ): Promise<BillingSimulatedPayment | null> {
    return this.findOne({ where: { clientSecret } });
  }

  // Inserts the payment, or returns the one a concurrent call with the same
  // key inserted first
  async insertOnce(
    payment: BillingSimulatedPayment,
  ): Promise<BillingSimulatedPayment> {
    try {
      return await this.save(payment);
    } catch (error) {
      if ((error as { code?: string }).code !== UNIQUE_VIOLATION) {
        throw error;
      }
      const existing = await this.findByKey(payment.idempotencyKey);
      if (!existing) {
        throw error;
      }
      return existing;
    }
  }

  // Moves a payment from one status to another only if it is still in `from`.
  // Returns whether this call made the move.
  async transition(
    id: string,
    from: SimulatedPaymentStatus[],
    to: SimulatedPaymentStatus,
  ): Promise<boolean> {
    const result = await this.entityManager
      .createQueryBuilder()
      .update(BillingSimulatedPayment)
      .set({ status: to })
      .where('id = :id AND status IN (:...from)', { id, from })
      .execute();

    return (result.affected ?? 0) > 0;
  }
}
