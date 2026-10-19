import { randomUUID } from 'crypto';
import { Test, TestingModule } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';
import { BillingModule } from '@billingModule/billing.module';
import { billingPaymentCardFactory } from '@billingModule/__test__/factory/billing-payment-card.factory';
import { PaymentGateway } from '@billingModule/core/adapter/payment-gateway.adapter.interface';
import { NewPaymentCard } from '@billingModule/core/model/payment-card.model';
import { MAX_PAYMENT_CARDS } from '@billingModule/core/service/payment-card.service';
import { PendingCardService } from '@billingModule/core/service/pending-card.service';
import { Tables } from '@testInfra/enum/table.enum';
import { testDbClient } from '@testInfra/knex.database';
import { DataSource } from 'typeorm';
import { initializeTransactionalContext } from 'typeorm-transactional';

describe('PendingCardService (integration)', () => {
  let module: TestingModule;
  let service: PendingCardService;
  let detach: jest.SpyInstance;
  const userId = randomUUID();

  const cardToSave = (overrides: Partial<NewPaymentCard> = {}) => {
    const row = billingPaymentCardFactory.build();
    return {
      provider: 'simulated',
      providerToken: row.providerToken,
      fingerprint: row.fingerprint,
      brand: 'visa',
      last4: '4242',
      expMonth: 12,
      expYear: 2039,
      holder: 'Ada Lovelace',
      ...overrides,
    } satisfies NewPaymentCard;
  };
  const savedCards = () =>
    testDbClient(Tables.BillingPaymentCard).where({ userId });
  const pendingRows = () => testDbClient(Tables.BillingPendingCard).select();

  beforeAll(async () => {
    initializeTransactionalContext();
    module = await Test.createTestingModule({
      imports: [BillingModule],
    }).compile();
    service = module.get(PendingCardService);
    detach = jest.spyOn(module.get<PaymentGateway>(PaymentGateway), 'detach');
  });

  beforeEach(async () => {
    detach.mockClear();
    await testDbClient(Tables.BillingPendingCard).del();
    await testDbClient(Tables.BillingPaymentCard).del();
  });

  afterAll(async () => {
    await testDbClient(Tables.BillingPendingCard).del();
    await testDbClient(Tables.BillingPaymentCard).del();
    await testDbClient.destroy();
    const dataSource = module.get<DataSource>(getDataSourceToken('billing'));
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
  });

  it('holds a card without saving it', async () => {
    await service.hold(randomUUID(), userId, cardToSave());

    expect(await pendingRows()).toHaveLength(1);
    expect(await savedCards()).toEqual([]);
  });

  it('promotes the held card as the first and default card, and removes the hold', async () => {
    const paymentId = randomUUID();
    const card = cardToSave({ holder: 'Grace Hopper' });
    await service.hold(paymentId, userId, { ...card, customerId: 'cus_1' });

    await service.promote(paymentId);

    expect(await savedCards()).toEqual([
      expect.objectContaining({
        userId,
        providerToken: card.providerToken,
        customerId: 'cus_1',
        fingerprint: card.fingerprint,
        brand: 'visa',
        last4: '4242',
        holder: 'Grace Hopper',
        isDefault: true,
      }),
    ]);
    expect(await pendingRows()).toEqual([]);
    expect(detach).not.toHaveBeenCalled();
  });

  it('promotes a later card as a non-default card', async () => {
    await testDbClient.batchInsert(Tables.BillingPaymentCard, [
      billingPaymentCardFactory.build({ userId, isDefault: true }),
    ]);
    const paymentId = randomUUID();
    await service.hold(paymentId, userId, cardToSave());

    await service.promote(paymentId);

    const cards = await savedCards();
    expect(cards).toHaveLength(2);
    expect(cards.filter((card) => card.isDefault)).toHaveLength(1);
  });

  it('drops a duplicate card and detaches its token without saving it', async () => {
    const existing = billingPaymentCardFactory.build({ userId });
    await testDbClient.batchInsert(Tables.BillingPaymentCard, [existing]);
    const paymentId = randomUUID();
    const card = cardToSave({ fingerprint: existing.fingerprint });
    await service.hold(paymentId, userId, card);

    await service.promote(paymentId);

    expect(await savedCards()).toHaveLength(1);
    expect(await pendingRows()).toEqual([]);
    expect(detach).toHaveBeenCalledTimes(1);
    expect(detach).toHaveBeenCalledWith(card.providerToken);
  });

  it(`drops the card and detaches its token when ${MAX_PAYMENT_CARDS} cards are already saved`, async () => {
    await testDbClient.batchInsert(
      Tables.BillingPaymentCard,
      billingPaymentCardFactory
        .buildList(MAX_PAYMENT_CARDS, { userId })
        .map((card, index) => ({ ...card, isDefault: index === 0 })),
    );
    const paymentId = randomUUID();
    const card = cardToSave();
    await service.hold(paymentId, userId, card);

    await service.promote(paymentId);

    expect(await savedCards()).toHaveLength(MAX_PAYMENT_CARDS);
    expect(await pendingRows()).toEqual([]);
    expect(detach).toHaveBeenCalledWith(card.providerToken);
  });

  it('discards a held card: the row is gone and its token is detached', async () => {
    const paymentId = randomUUID();
    const card = cardToSave();
    await service.hold(paymentId, userId, card);

    await service.discard(paymentId);

    expect(await pendingRows()).toEqual([]);
    expect(await savedCards()).toEqual([]);
    expect(detach).toHaveBeenCalledWith(card.providerToken);
  });

  it('does nothing when promoting or discarding a payment with no held card', async () => {
    await service.hold(randomUUID(), userId, cardToSave());

    await expect(service.promote(randomUUID())).resolves.toBeUndefined();
    await expect(service.discard(randomUUID())).resolves.toBeUndefined();

    expect(await pendingRows()).toHaveLength(1);
    expect(await savedCards()).toEqual([]);
    expect(detach).not.toHaveBeenCalled();
  });

  it('keeps a held card of another payment untouched when one is promoted', async () => {
    const first = randomUUID();
    await service.hold(first, userId, cardToSave());
    await service.hold(randomUUID(), userId, cardToSave());

    await service.promote(first);

    expect(await savedCards()).toHaveLength(1);
    expect(await pendingRows()).toHaveLength(1);
  });
});
