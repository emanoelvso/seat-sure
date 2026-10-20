import { randomUUID } from 'crypto';
import { Test, TestingModule } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';
import { Tables } from '@testInfra/enum/table.enum';
import { testDbClient } from '@testInfra/knex.database';
import { orderFactory } from '@ticketingModule/__test__/factory/order.factory';
import { OrderStatus } from '@ticketingModule/core/enum/order-status.enum';
import { OrderRepository } from '@ticketingModule/persistence/repository/order.repository';
import { TicketingPersistenceModule } from '@ticketingModule/persistence/ticketing-persistence.module';
import { DataSource } from 'typeorm';
import { initializeTransactionalContext } from 'typeorm-transactional';

describe('OrderRepository payment states (integration)', () => {
  let module: TestingModule;
  let dataSource: DataSource;
  let orders: OrderRepository;

  const insertOrder = async (status: OrderStatus) => {
    const order = orderFactory.build({ status, paymentId: null });
    await testDbClient.batchInsert(Tables.Order, [order]);
    return order;
  };

  const rowOf = (orderId: string) =>
    testDbClient(Tables.Order).where({ id: orderId }).first();

  beforeAll(async () => {
    initializeTransactionalContext();
    module = await Test.createTestingModule({
      imports: [TicketingPersistenceModule],
    }).compile();
    dataSource = module.get<DataSource>(getDataSourceToken('ticketing'));
    orders = module.get(OrderRepository);
  });

  beforeEach(async () => {
    await testDbClient(Tables.Order).del();
  });

  afterAll(async () => {
    await testDbClient(Tables.Order).del();
    await testDbClient.destroy();
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
  });

  describe('claimConfirm (GW-14)', () => {
    it('lets exactly one of 2 concurrent calls move a requires_action order to processing', async () => {
      const order = await insertOrder(OrderStatus.REQUIRES_ACTION);

      const results = await Promise.all([
        orders.claimConfirm(order.id),
        orders.claimConfirm(order.id),
      ]);

      expect(results.filter(Boolean)).toHaveLength(1);
      expect((await rowOf(order.id)).status).toBe('processing');
    });

    it.each([
      OrderStatus.PENDING,
      OrderStatus.PROCESSING,
      OrderStatus.PAID,
      OrderStatus.FAILED,
      OrderStatus.CANCELLED,
    ])('does not claim a %s order', async (status) => {
      const order = await insertOrder(status);

      await expect(orders.claimConfirm(order.id)).resolves.toBe(false);
      expect((await rowOf(order.id)).status).toBe(status);
    });
  });

  describe('markRequiresAction (GW-08)', () => {
    it('pauses a processing order and keeps the payment it waits on', async () => {
      const order = await insertOrder(OrderStatus.PROCESSING);
      const paymentId = randomUUID();

      await expect(
        orders.markRequiresAction(order.id, paymentId),
      ).resolves.toBe(true);

      expect(await rowOf(order.id)).toMatchObject({
        status: 'requires_action',
        paymentId,
      });
    });

    it.each([
      OrderStatus.PENDING,
      OrderStatus.REQUIRES_ACTION,
      OrderStatus.PAID,
      OrderStatus.FAILED,
      OrderStatus.CANCELLED,
    ])('leaves a %s order unchanged', async (status) => {
      const order = await insertOrder(status);

      await expect(
        orders.markRequiresAction(order.id, randomUUID()),
      ).resolves.toBe(false);

      expect(await rowOf(order.id)).toMatchObject({ status, paymentId: null });
    });
  });

  describe('releasePayment', () => {
    it('returns a processing order to pending and forgets its payment', async () => {
      const order = await insertOrder(OrderStatus.PROCESSING);
      await testDbClient(Tables.Order)
        .where({ id: order.id })
        .update({ paymentId: randomUUID() });

      await orders.releasePayment(order.id);

      expect(await rowOf(order.id)).toMatchObject({
        status: 'pending',
        paymentId: null,
      });
    });

    it('leaves a requires_action order alone', async () => {
      const order = await insertOrder(OrderStatus.REQUIRES_ACTION);

      await orders.releasePayment(order.id);

      expect((await rowOf(order.id)).status).toBe('requires_action');
    });
  });
});
