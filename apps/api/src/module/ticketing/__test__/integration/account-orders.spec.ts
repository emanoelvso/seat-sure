import { randomUUID } from 'crypto';
import { Test, TestingModule } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';
import { Tables } from '@testInfra/enum/table.enum';
import { testDbClient } from '@testInfra/knex.database';
import {
  orderFactory,
  orderItemFactory,
} from '@ticketingModule/__test__/factory/order.factory';
import { OrderStatus } from '@ticketingModule/core/enum/order-status.enum';
import {
  AccountOrdersSort,
  AccountOrdersTab,
} from '@ticketingModule/core/model/account-order.model';
import { OrderRepository } from '@ticketingModule/persistence/repository/order.repository';
import { TicketingPersistenceModule } from '@ticketingModule/persistence/ticketing-persistence.module';
import { DataSource } from 'typeorm';
import { initializeTransactionalContext } from 'typeorm-transactional';

// A fixed clock far from the database's own: expiry must use the `now` passed
// in, never Postgres now() (AD-025).
const NOW = new Date('2031-03-15T12:00:00.000Z');
const at = (ms: number) => new Date(NOW.getTime() + ms);
const DAY = 24 * 60 * 60_000;

describe('OrderRepository account orders (integration)', () => {
  let module: TestingModule;
  let dataSource: DataSource;
  let orders: OrderRepository;

  const userId = randomUUID();
  const otherUserId = randomUUID();

  // The user's visible orders. B and C share a total, so the amount sorts
  // must break the tie by newest first. Each has a distinct seat count.
  const visible = {
    A: { status: OrderStatus.PAID, age: 5 * DAY, totalCents: 30000, seats: 1 },
    B: { status: OrderStatus.PAID, age: 1 * DAY, totalCents: 50000, seats: 2 },
    C: {
      status: OrderStatus.PENDING,
      age: 3 * DAY,
      totalCents: 50000,
      seats: 3,
      expiresIn: 5 * 60_000,
    },
    D: {
      status: OrderStatus.PROCESSING,
      age: 2 * DAY,
      totalCents: 10000,
      seats: 1,
      expiresIn: 5 * 60_000,
    },
    E: {
      status: OrderStatus.CANCELLED,
      age: 4 * DAY,
      totalCents: 20000,
      seats: 2,
    },
  };

  // Orders that must never be listed or counted. They are the newest and the
  // most expensive, so any leak shows up first in the sorts.
  const hidden = {
    expiredPending: {
      status: OrderStatus.PENDING,
      age: 0,
      totalCents: 99999,
      expiresIn: -1_000,
    },
    expiredProcessing: {
      status: OrderStatus.PROCESSING,
      age: 60_000,
      totalCents: 99998,
      expiresIn: -1_000,
    },
    failed: {
      status: OrderStatus.FAILED,
      age: 6 * 60 * 60_000,
      totalCents: 88888,
    },
  };

  const ids: Record<string, string> = {};

  const deleteRows = async () => {
    await testDbClient(Tables.OrderItem).del();
    await testDbClient(Tables.Order).del();
  };

  const insertOrder = async (
    key: string,
    {
      status,
      age,
      totalCents,
      seats = 1,
      expiresIn = 10 * 60_000,
      owner = userId,
    }: {
      status: OrderStatus;
      age: number;
      totalCents: number;
      seats?: number;
      expiresIn?: number;
      owner?: string;
    },
  ) => {
    const order = {
      ...orderFactory.build({
        userId: owner,
        status,
        totalCents,
        expiresAt: at(expiresIn),
      }),
      createdAt: at(-age),
    };
    const items = Array.from({ length: seats }, (_, index) =>
      orderItemFactory.build({
        orderId: order.id,
        seatRow: '7',
        seatNumber: String(index + 1),
      }),
    );
    await testDbClient.batchInsert(Tables.Order, [order]);
    await testDbClient.batchInsert(Tables.OrderItem, items);
    ids[key] = order.id;
  };

  const page = (
    tab: AccountOrdersTab,
    sort: AccountOrdersSort,
    { offset = 0, limit = 20 }: { offset?: number; limit?: number } = {},
  ) => orders.findAccountPage(userId, tab, sort, { offset, limit }, NOW);

  const keysOf = (rows: { id: string }[]) =>
    rows.map((row) => Object.entries(ids).find(([, id]) => id === row.id)?.[0]);

  beforeAll(async () => {
    initializeTransactionalContext();
    module = await Test.createTestingModule({
      imports: [TicketingPersistenceModule],
    }).compile();
    dataSource = module.get<DataSource>(getDataSourceToken('ticketing'));
    orders = module.get(OrderRepository);

    await deleteRows();
    for (const [key, spec] of Object.entries({ ...visible, ...hidden })) {
      await insertOrder(key, spec);
    }
    await insertOrder('otherUsersPaid', {
      status: OrderStatus.PAID,
      age: 60 * 60_000,
      totalCents: 77777,
      owner: otherUserId,
    });
  });

  afterAll(async () => {
    await deleteRows();
    await testDbClient.destroy();
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
  });

  describe('countAccountTabs (ORDLIST-02)', () => {
    it('counts only visible orders: all 5, pending 2, cancelled 1, completed 2', async () => {
      await expect(orders.countAccountTabs(userId, NOW)).resolves.toEqual({
        all: 5,
        pending: 2,
        cancelled: 1,
        completed: 2,
      });
    });

    it('counts zero in every tab for a user without orders', async () => {
      await expect(orders.countAccountTabs(randomUUID(), NOW)).resolves.toEqual(
        { all: 0, pending: 0, cancelled: 0, completed: 0 },
      );
    });
  });

  describe('findAccountPage visibility (ORDLIST-01)', () => {
    it("lists the user's paid, live pending/processing and cancelled orders, never another user's, expired or failed ones", async () => {
      const rows = await page(AccountOrdersTab.ALL, AccountOrdersSort.NEWEST);

      expect(keysOf(rows)).toEqual(['B', 'D', 'C', 'E', 'A']);
    });
  });

  describe('findAccountPage tabs (ORDLIST-02)', () => {
    it.each([
      [AccountOrdersTab.PENDING, ['D', 'C']],
      [AccountOrdersTab.CANCELLED, ['E']],
      [AccountOrdersTab.COMPLETED, ['B', 'A']],
    ])('lists only the %s tab statuses', async (tab, expected) => {
      const rows = await page(tab, AccountOrdersSort.NEWEST);

      expect(keysOf(rows)).toEqual(expected);
    });
  });

  describe('findAccountPage sort (ORDLIST-04)', () => {
    it.each([
      [AccountOrdersSort.NEWEST, ['B', 'D', 'C', 'E', 'A']],
      [AccountOrdersSort.OLDEST, ['A', 'E', 'C', 'D', 'B']],
      [AccountOrdersSort.HIGHEST_AMOUNT, ['B', 'C', 'A', 'E', 'D']],
      [AccountOrdersSort.LOWEST_AMOUNT, ['D', 'E', 'A', 'B', 'C']],
    ])('orders by %s, ties broken by newest first', async (sort, expected) => {
      const rows = await page(AccountOrdersTab.ALL, sort);

      expect(keysOf(rows)).toEqual(expected);
    });
  });

  describe('findAccountPage slice (ORDLIST-05)', () => {
    it.each([
      [0, 2, ['B', 'D']],
      [2, 2, ['C', 'E']],
      [4, 4, ['A']],
      [8, 4, []],
    ])(
      'returns offset %i limit %i as the right slice',
      async (offset, limit, expected) => {
        const rows = await page(
          AccountOrdersTab.ALL,
          AccountOrdersSort.NEWEST,
          {
            offset,
            limit,
          },
        );

        expect(keysOf(rows)).toEqual(expected);
      },
    );

    it('carries each order item count as quantity', async () => {
      const rows = await page(AccountOrdersTab.ALL, AccountOrdersSort.NEWEST);

      expect(
        Object.fromEntries(rows.map((row) => [row.id, row.quantity])),
      ).toEqual({
        [ids.A]: 1,
        [ids.B]: 2,
        [ids.C]: 3,
        [ids.D]: 1,
        [ids.E]: 2,
      });
    });
  });
});
