import { randomUUID } from 'crypto';
import { DiscoveryModule, DiscoveryService } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';
import { BillingModule } from '@billingModule/billing.module';
import { billingPaymentCardFactory } from '@billingModule/__test__/factory/billing-payment-card.factory';
import { AccountErasure } from '@sharedModules/integration/interface/account-erasure.interface';
import { Tables } from '@testInfra/enum/table.enum';
import { testDbClient } from '@testInfra/knex.database';
import { DataSource } from 'typeorm';
import { initializeTransactionalContext } from 'typeorm-transactional';

describe('BillingAccountEraser (integration)', () => {
  let module: TestingModule;

  const erasers = () =>
    module
      .get(DiscoveryService)
      .getProviders({ metadataKey: AccountErasure.KEY })
      .map((wrapper) => wrapper.instance as Record<string, unknown>);

  beforeAll(async () => {
    initializeTransactionalContext();
    module = await Test.createTestingModule({
      imports: [BillingModule, DiscoveryModule],
    }).compile();
  });

  afterAll(async () => {
    await testDbClient(Tables.BillingPaymentCard).del();
    await testDbClient.destroy();
    const dataSource = module.get<DataSource>(getDataSourceToken('billing'));
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
  });

  it('is discovered exactly once, named billing, with no blocker check (ERASE-01)', () => {
    const found = erasers().filter((eraser) => eraser.name === 'billing');

    expect(found).toHaveLength(1);
    expect(found[0].findBlocker).toBeUndefined();
  });

  it("erases a seeded user's card through the discovered eraser (ERASE-01)", async () => {
    const userId = randomUUID();
    await testDbClient(Tables.BillingPaymentCard).insert(
      billingPaymentCardFactory.build({ userId, isDefault: true }),
    );
    const eraser = erasers().find((found) => found.name === 'billing') as {
      erase(id: string): Promise<void>;
    };

    await eraser.erase(userId);

    expect(
      await testDbClient(Tables.BillingPaymentCard).where({ userId }),
    ).toEqual([]);
  });
});
