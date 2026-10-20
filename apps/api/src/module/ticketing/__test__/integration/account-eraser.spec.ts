import { randomUUID } from 'crypto';
import { DiscoveryModule, DiscoveryService } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';
import { AccountErasure } from '@sharedModules/integration/interface/account-erasure.interface';
import { Tables } from '@testInfra/enum/table.enum';
import { testDbClient } from '@testInfra/knex.database';
import {
  orderFactory,
  orderItemFactory,
} from '@ticketingModule/__test__/factory/order.factory';
import { seatHoldFactory } from '@ticketingModule/__test__/factory/seat-hold.factory';
import { ticketFactory } from '@ticketingModule/__test__/factory/ticket.factory';
import { OrderStatus } from '@ticketingModule/core/enum/order-status.enum';
import { TicketStatus } from '@ticketingModule/core/enum/ticket-status.enum';
import { TicketingModule } from '@ticketingModule/ticketing.module';
import { DataSource } from 'typeorm';
import { initializeTransactionalContext } from 'typeorm-transactional';

interface TestEraser {
  name: string;
  findBlocker(userId: string, now: Date): Promise<string | null>;
  erase(userId: string): Promise<void>;
}

describe('TicketingAccountEraser (integration)', () => {
  let module: TestingModule;

  const now = new Date('2026-10-20T12:00:00Z');
  const future = new Date('2026-10-21T12:00:00Z');
  const past = new Date('2026-10-19T12:00:00Z');

  const eraser = () =>
    module
      .get(DiscoveryService)
      .getProviders({ metadataKey: AccountErasure.KEY })
      .map((wrapper) => wrapper.instance as TestEraser)
      .find((found) => found.name === 'ticketing') as TestEraser;

  const seedOrder = async (
    userId: string,
    data: { status?: OrderStatus; expiresAt?: Date; eventStartAt?: Date } = {},
  ) => {
    const order = orderFactory.build({
      userId,
      status: data.status ?? OrderStatus.PAID,
      expiresAt: data.expiresAt ?? past,
      eventStartAt: data.eventStartAt ?? future,
      paymentId: null,
    });
    const item = orderItemFactory.build({ orderId: order.id });
    await testDbClient(Tables.Order).insert(order);
    await testDbClient(Tables.OrderItem).insert(item);
    return { order, item };
  };

  const seedTicket = (
    userId: string,
    status: TicketStatus,
    orderItemId: string | null,
  ) =>
    testDbClient(Tables.Ticket).insert({
      ...ticketFactory.build({ userId, status }),
      orderItemId,
    });

  const cleanTables = async () => {
    await testDbClient(Tables.Ticket).del();
    await testDbClient(Tables.Order).del();
    await testDbClient(Tables.SeatHold).del();
  };

  beforeAll(async () => {
    initializeTransactionalContext();
    module = await Test.createTestingModule({
      imports: [TicketingModule, DiscoveryModule],
    }).compile();
  });

  beforeEach(cleanTables);

  afterAll(async () => {
    await cleanTables();
    await testDbClient.destroy();
    const dataSource = module.get<DataSource>(getDataSourceToken('ticketing'));
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
  });

  it('is discovered exactly once, named ticketing (DEL-07)', () => {
    const found = module
      .get(DiscoveryService)
      .getProviders({ metadataKey: AccountErasure.KEY })
      .filter(
        (wrapper) => (wrapper.instance as TestEraser).name === 'ticketing',
      );

    expect(found).toHaveLength(1);
  });

  describe('findBlocker, open orders (DEL-02)', () => {
    it.each([
      OrderStatus.PENDING,
      OrderStatus.PROCESSING,
      OrderStatus.REQUIRES_ACTION,
    ])('blocks on a %s order that has not expired', async (status) => {
      const userId = randomUUID();
      await seedOrder(userId, { status, expiresAt: future });

      await expect(eraser().findBlocker(userId, now)).resolves.toBe(
        'ACCOUNT_HAS_ACTIVE_ORDERS',
      );
    });

    it.each([
      OrderStatus.PENDING,
      OrderStatus.PROCESSING,
      OrderStatus.REQUIRES_ACTION,
    ])('does not block on a %s order past its expiresAt', async (status) => {
      const userId = randomUUID();
      await seedOrder(userId, { status, expiresAt: past });

      await expect(eraser().findBlocker(userId, now)).resolves.toBeNull();
    });

    it('does not block on an order whose expiresAt is exactly now', async () => {
      const userId = randomUUID();
      await seedOrder(userId, {
        status: OrderStatus.PENDING,
        expiresAt: now,
      });

      await expect(eraser().findBlocker(userId, now)).resolves.toBeNull();
    });

    it.each([OrderStatus.PAID, OrderStatus.FAILED, OrderStatus.CANCELLED])(
      'does not block on a %s order alone',
      async (status) => {
        const userId = randomUUID();
        await seedOrder(userId, { status, expiresAt: future });

        await expect(eraser().findBlocker(userId, now)).resolves.toBeNull();
      },
    );

    it("does not block on another user's active order", async () => {
      await seedOrder(randomUUID(), {
        status: OrderStatus.PENDING,
        expiresAt: future,
      });

      await expect(eraser().findBlocker(randomUUID(), now)).resolves.toBeNull();
    });
  });

  describe('findBlocker, tickets (DEL-02)', () => {
    it('blocks on an issued ticket whose order event starts after now', async () => {
      const userId = randomUUID();
      const { item } = await seedOrder(userId, { eventStartAt: future });
      await seedTicket(userId, TicketStatus.ISSUED, item.id);

      await expect(eraser().findBlocker(userId, now)).resolves.toBe(
        'ACCOUNT_HAS_ACTIVE_ORDERS',
      );
    });

    it('does not block on an issued ticket whose event already started', async () => {
      const userId = randomUUID();
      const { item } = await seedOrder(userId, { eventStartAt: past });
      await seedTicket(userId, TicketStatus.ISSUED, item.id);

      await expect(eraser().findBlocker(userId, now)).resolves.toBeNull();
    });

    it('does not block on an issued ticket whose event starts exactly now', async () => {
      const userId = randomUUID();
      const { item } = await seedOrder(userId, { eventStartAt: now });
      await seedTicket(userId, TicketStatus.ISSUED, item.id);

      await expect(eraser().findBlocker(userId, now)).resolves.toBeNull();
    });

    it.each([
      TicketStatus.USED,
      TicketStatus.CANCELLED,
      TicketStatus.REFUNDED,
      TicketStatus.TRANSFERRED,
    ])(
      'does not block on a %s ticket for an upcoming event',
      async (status) => {
        const userId = randomUUID();
        const { item } = await seedOrder(userId, { eventStartAt: future });
        await seedTicket(userId, status, item.id);

        await expect(eraser().findBlocker(userId, now)).resolves.toBeNull();
      },
    );

    it('blocks on an issued ticket that has no order item', async () => {
      const userId = randomUUID();
      await seedTicket(userId, TicketStatus.ISSUED, null);

      await expect(eraser().findBlocker(userId, now)).resolves.toBe(
        'ACCOUNT_HAS_ACTIVE_ORDERS',
      );
    });
  });

  describe('erase (DEL-07)', () => {
    it("deletes the user's seat holds only and leaves orders, items and tickets unchanged", async () => {
      const userId = randomUUID();
      const otherId = randomUUID();
      const { order, item } = await seedOrder(userId);
      await seedTicket(userId, TicketStatus.ISSUED, item.id);
      await testDbClient(Tables.SeatHold).insert([
        seatHoldFactory.build({ userId }),
        seatHoldFactory.build({ userId }),
        seatHoldFactory.build({ userId: otherId }),
      ]);

      await eraser().erase(userId);

      expect(await testDbClient(Tables.SeatHold).where({ userId })).toEqual([]);
      expect(
        await testDbClient(Tables.SeatHold).where({ userId: otherId }),
      ).toHaveLength(1);
      expect(
        await testDbClient(Tables.Order).where({ id: order.id }),
      ).toHaveLength(1);
      expect(
        await testDbClient(Tables.OrderItem).where({ id: item.id }),
      ).toHaveLength(1);
      expect(await testDbClient(Tables.Ticket).where({ userId })).toHaveLength(
        1,
      );
    });

    it('succeeds when erased twice and when the user has no holds', async () => {
      const userId = randomUUID();
      await testDbClient(Tables.SeatHold).insert(
        seatHoldFactory.build({ userId }),
      );

      await eraser().erase(userId);
      await expect(eraser().erase(userId)).resolves.toBeUndefined();
      await expect(eraser().erase(randomUUID())).resolves.toBeUndefined();
    });
  });
});
