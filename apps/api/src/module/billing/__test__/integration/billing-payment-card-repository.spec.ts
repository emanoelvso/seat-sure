import { randomUUID } from 'crypto';
import { Test, TestingModule } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';
import { billingPaymentCardFactory } from '@billingModule/__test__/factory/billing-payment-card.factory';
import { BillingPersistenceModule } from '@billingModule/persistence/billing-persistence.module';
import { BillingPaymentCard } from '@billingModule/persistence/entity/billing-payment-card.entity';
import { BillingPaymentCardRepository } from '@billingModule/persistence/repository/billing-payment-card.repository';
import { Tables } from '@testInfra/enum/table.enum';
import { testDbClient } from '@testInfra/knex.database';
import { DataSource } from 'typeorm';
import { initializeTransactionalContext } from 'typeorm-transactional';

describe('BillingPaymentCardRepository (integration)', () => {
  let module: TestingModule;
  let dataSource: DataSource;
  let repository: BillingPaymentCardRepository;

  const at = (iso: string) => new Date(iso);

  beforeAll(async () => {
    initializeTransactionalContext();
    module = await Test.createTestingModule({
      imports: [BillingPersistenceModule],
    }).compile();
    dataSource = module.get<DataSource>(getDataSourceToken('billing'));
    repository = module.get(BillingPaymentCardRepository);
  });

  beforeEach(async () => {
    await testDbClient(Tables.BillingPaymentCard).del();
  });

  afterAll(async () => {
    await testDbClient(Tables.BillingPaymentCard).del();
    await testDbClient.destroy();
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
  });

  describe('listForUser', () => {
    it('returns the default first, then oldest saved first (CARD-01 AC 3)', async () => {
      const userId = randomUUID();
      const oldest = billingPaymentCardFactory.build({
        userId,
        last4: '1111',
        createdAt: at('2026-01-01T00:00:00Z'),
      });
      const middle = billingPaymentCardFactory.build({
        userId,
        last4: '2222',
        createdAt: at('2026-02-01T00:00:00Z'),
      });
      const defaultCard = billingPaymentCardFactory.build({
        userId,
        last4: '3333',
        isDefault: true,
        createdAt: at('2026-03-01T00:00:00Z'),
      });
      const newest = billingPaymentCardFactory.build({
        userId,
        last4: '4444',
        createdAt: at('2026-04-01T00:00:00Z'),
      });
      // Inserted out of order, so the result can't follow insertion order
      await testDbClient(Tables.BillingPaymentCard).insert([
        newest,
        middle,
        defaultCard,
        oldest,
      ]);

      const cards = await repository.listForUser(userId, 'simulated');

      expect(cards.map((card) => card.id)).toEqual([
        defaultCard.id,
        oldest.id,
        middle.id,
        newest.id,
      ]);
    });

    it("returns only that user's cards (CARD-02 AC 9)", async () => {
      const userId = randomUUID();
      const mine = billingPaymentCardFactory.build({ userId, isDefault: true });
      const theirs = billingPaymentCardFactory.build({ isDefault: true });
      await testDbClient(Tables.BillingPaymentCard).insert([mine, theirs]);

      const cards = await repository.listForUser(userId, 'simulated');

      expect(cards.map((card) => card.id)).toEqual([mine.id]);
    });

    it("returns only the asked provider's cards (GW-39)", async () => {
      const userId = randomUUID();
      const simulated = billingPaymentCardFactory.build({
        userId,
        isDefault: true,
      });
      const stripe = billingPaymentCardFactory.build({
        userId,
        provider: 'stripe',
        isDefault: true,
      });
      await testDbClient(Tables.BillingPaymentCard).insert([simulated, stripe]);

      const cards = await repository.listForUser(userId, 'stripe');

      expect(cards.map((card) => card.id)).toEqual([stripe.id]);
    });

    it('returns an empty list for a user with no cards', async () => {
      await testDbClient(Tables.BillingPaymentCard).insert(
        billingPaymentCardFactory.build({ isDefault: true }),
      );

      await expect(
        repository.listForUser(randomUUID(), 'simulated'),
      ).resolves.toEqual([]);
    });
  });

  describe('constraints', () => {
    it('rejects a second card with the same fingerprint for one user (CARD-04 AC 9)', async () => {
      const userId = randomUUID();
      const first = billingPaymentCardFactory.build({
        userId,
        isDefault: true,
      });
      await repository.save(new BillingPaymentCard(first));

      await expect(
        repository.save(
          new BillingPaymentCard(
            billingPaymentCardFactory.build({
              userId,
              fingerprint: first.fingerprint,
            }),
          ),
        ),
      ).rejects.toThrow(/unique/i);

      const rows = await testDbClient(Tables.BillingPaymentCard).where({
        userId,
      });
      expect(rows.map((row) => row.id)).toEqual([first.id]);
    });

    it('allows the same fingerprint for another user', async () => {
      const first = billingPaymentCardFactory.build({ isDefault: true });
      await repository.save(new BillingPaymentCard(first));
      const other = billingPaymentCardFactory.build({
        fingerprint: first.fingerprint,
        isDefault: true,
      });

      await repository.save(new BillingPaymentCard(other));

      const rows = await testDbClient(Tables.BillingPaymentCard).where({
        fingerprint: first.fingerprint,
      });
      expect(rows).toHaveLength(2);
    });

    it('rejects a second default card for one user (single default)', async () => {
      const userId = randomUUID();
      const first = billingPaymentCardFactory.build({
        userId,
        isDefault: true,
      });
      await repository.save(new BillingPaymentCard(first));

      await expect(
        repository.save(
          new BillingPaymentCard(
            billingPaymentCardFactory.build({ userId, isDefault: true }),
          ),
        ),
      ).rejects.toThrow(/unique/i);

      const defaults = await testDbClient(Tables.BillingPaymentCard).where({
        userId,
        isDefault: true,
      });
      expect(defaults.map((row) => row.id)).toEqual([first.id]);
    });

    it('allows any number of non-default cards for one user', async () => {
      const userId = randomUUID();
      await repository.save(
        new BillingPaymentCard(
          billingPaymentCardFactory.build({ userId, isDefault: true }),
        ),
      );
      await repository.save(
        new BillingPaymentCard(billingPaymentCardFactory.build({ userId })),
      );
      await repository.save(
        new BillingPaymentCard(billingPaymentCardFactory.build({ userId })),
      );

      const rows = await testDbClient(Tables.BillingPaymentCard).where({
        userId,
      });
      expect(rows).toHaveLength(3);
    });
  });

  describe('hardDelete', () => {
    it('removes the row for good, so no soft-deleted copy remains (CARD-10 AC 7)', async () => {
      const card = billingPaymentCardFactory.build({ isDefault: true });
      const kept = billingPaymentCardFactory.build({ userId: card.userId });
      await testDbClient(Tables.BillingPaymentCard).insert([card, kept]);

      await repository.hardDelete(dataSource.manager, card.id);

      await expect(
        dataSource.manager.findOne(BillingPaymentCard, {
          where: { id: card.id },
          withDeleted: true,
        }),
      ).resolves.toBeNull();
      const rows = await testDbClient(Tables.BillingPaymentCard).where({
        id: card.id,
      });
      expect(rows).toEqual([]);
      await expect(repository.findOneById(kept.id)).resolves.toMatchObject({
        id: kept.id,
      });
    });

    it('lets the same fingerprint be saved again after the delete', async () => {
      const card = billingPaymentCardFactory.build({ isDefault: true });
      await testDbClient(Tables.BillingPaymentCard).insert(card);

      await repository.hardDelete(dataSource.manager, card.id);
      await repository.save(
        new BillingPaymentCard(
          billingPaymentCardFactory.build({
            userId: card.userId,
            fingerprint: card.fingerprint,
            isDefault: true,
          }),
        ),
      );

      const rows = await testDbClient(Tables.BillingPaymentCard).where({
        userId: card.userId,
      });
      expect(rows).toHaveLength(1);
    });
  });
});
