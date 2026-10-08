import { randomUUID } from 'crypto';
import { Test, TestingModule } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';
import { NotificationsModule } from '@notificationsModule/notifications.module';
import { NotificationsApi } from '@sharedModules/integration/interface/notifications-integration.interface';
import { Tables } from '@testInfra/enum/table.enum';
import { testDbClient } from '@testInfra/knex.database';
import { DataSource } from 'typeorm';
import { initializeTransactionalContext } from 'typeorm-transactional';

describe('NotificationsPublicApiProvider (integration)', () => {
  let module: TestingModule;
  let notificationsApi: NotificationsApi;

  const now = new Date('2026-10-05T16:42:00Z');

  const rowsOf = (userId: string) =>
    testDbClient(Tables.NotificationsNotification).where({ userId });

  beforeAll(async () => {
    initializeTransactionalContext();
    module = await Test.createTestingModule({
      imports: [NotificationsModule],
    }).compile();
    notificationsApi = module.get<NotificationsApi>(NotificationsApi);
  });

  afterEach(async () => {
    await testDbClient(Tables.NotificationsNotification).del();
  });

  afterAll(async () => {
    await testDbClient.destroy();
    const dataSource = module.get<DataSource>(
      getDataSourceToken('notifications'),
    );
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
  });

  it('stores an unread welcome with the user as its source and an empty payload (NOTIF-01 AC 1, 9)', async () => {
    const userId = randomUUID();

    await notificationsApi.notifyWelcome({ userId, now });

    const rows = await rowsOf(userId);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      userId,
      type: 'welcome',
      channel: 'in_app',
      sourceId: userId,
      payload: {},
      readAt: null,
    });
    expect(new Date(rows[0].createdAt).toISOString()).toBe(now.toISOString());
  });

  it('stores a purchase confirmed with the order as its source and the event name (NOTIF-02 AC 2)', async () => {
    const userId = randomUUID();
    const orderId = randomUUID();

    await notificationsApi.notifyPurchaseConfirmed({
      userId,
      orderId,
      eventName: 'Rock in Rio',
      now,
    });

    const rows = await rowsOf(userId);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      userId,
      type: 'purchase_confirmed',
      channel: 'in_app',
      sourceId: orderId,
      payload: { eventName: 'Rock in Rio' },
      readAt: null,
    });
    expect(new Date(rows[0].createdAt).toISOString()).toBe(now.toISOString());
  });

  it('stores a payment unsuccessful with the payment as its source and the event name (NOTIF-03 AC 3)', async () => {
    const userId = randomUUID();
    const paymentId = randomUUID();

    await notificationsApi.notifyPaymentUnsuccessful({
      userId,
      paymentId,
      eventName: 'Rock in Rio',
      now,
    });

    const rows = await rowsOf(userId);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      userId,
      type: 'payment_unsuccessful',
      channel: 'in_app',
      sourceId: paymentId,
      payload: { eventName: 'Rock in Rio' },
      readAt: null,
    });
    expect(new Date(rows[0].createdAt).toISOString()).toBe(now.toISOString());
  });

  it('stores one row when a notify method is called twice with the same source (NOTIF-02 AC 4)', async () => {
    const userId = randomUUID();
    const orderId = randomUUID();
    const paymentId = randomUUID();

    await notificationsApi.notifyWelcome({ userId, now });
    await notificationsApi.notifyWelcome({ userId, now });
    await notificationsApi.notifyPurchaseConfirmed({
      userId,
      orderId,
      eventName: 'Rock in Rio',
      now,
    });
    await notificationsApi.notifyPurchaseConfirmed({
      userId,
      orderId,
      eventName: 'Rock in Rio',
      now,
    });
    await notificationsApi.notifyPaymentUnsuccessful({
      userId,
      paymentId,
      eventName: 'Rock in Rio',
      now,
    });
    await notificationsApi.notifyPaymentUnsuccessful({
      userId,
      paymentId,
      eventName: 'Rock in Rio',
      now,
    });

    const rows = await rowsOf(userId);
    expect(rows.map((r) => r.type).sort()).toEqual([
      'payment_unsuccessful',
      'purchase_confirmed',
      'welcome',
    ]);
  });
});
