import { randomUUID } from 'crypto';
import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { TestingModule } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';
import { testDbClient } from '@testInfra/knex.database';
import { createNestApp } from '@testInfra/test-e2e.setup';
import { TicketingException } from '@ticketingModule/core/exception/ticketing.exception';
import { CheckoutService } from '@ticketingModule/core/service/checkout.service';
import { OrderPaymentService } from '@ticketingModule/core/service/order-payment.service';
import { TicketingModule } from '@ticketingModule/ticketing.module';
import request from 'supertest';
import { DataSource } from 'typeorm';

const START_CHECKOUT = `
  mutation StartCheckout($input: StartCheckoutInput!) {
    startCheckout(input: $input) { id }
  }
`;

const PAY_ORDER = `
  mutation PayOrder($input: PayOrderInput!) {
    payOrder(input: $input) { id }
  }
`;

const CARD = {
  number: '4242 4242 4242 4242',
  holder: 'Ada Lovelace',
  expiry: '12/40',
  cvv: '123',
};

describe('TicketingResolver admission control (e2e)', () => {
  const originalLimit = process.env.ADMISSION_MAX_CONCURRENT;
  let app: INestApplication;
  let module: TestingModule;
  let jwtService: JwtService;

  beforeAll(async () => {
    process.env.ADMISSION_MAX_CONCURRENT = '1';
    const nestTestSetup = await createNestApp([TicketingModule]);

    module = nestTestSetup.module;
    app = nestTestSetup.app;
    jwtService = module.get(JwtService);
  });

  afterAll(async () => {
    if (originalLimit === undefined) {
      delete process.env.ADMISSION_MAX_CONCURRENT;
    } else {
      process.env.ADMISSION_MAX_CONCURRENT = originalLimit;
    }
    await testDbClient.destroy();
    for (const name of ['ticketing', 'catalog']) {
      const dataSource = module.get<DataSource>(getDataSourceToken(name));
      if (dataSource.isInitialized) {
        await dataSource.destroy();
      }
    }
    await app.getHttpServer().close();
  });

  const token = () =>
    jwtService.sign({
      sub: randomUUID(),
      sid: randomUUID(),
      exp: Math.floor(Date.now() / 1000) + 900,
    });

  const send = async (query: string, input: Record<string, unknown>) => {
    const response = await request(app.getHttpServer())
      .post('/graphql')
      .set('Authorization', `Bearer ${token()}`)
      .send({ query, variables: { input } });
    return { status: response.status, body: response.body };
  };

  const startCheckout = () =>
    send(START_CHECKOUT, {
      eventId: randomUUID(),
      ticketTypeId: randomUUID(),
      seatIds: [randomUUID()],
    });

  const payOrder = () => send(PAY_ORDER, { orderId: randomUUID(), card: CARD });

  const busyReason = (body: {
    errors?: { extensions: { originalError?: { reason?: string } } }[];
  }) => body.errors?.[0]?.extensions.originalError?.reason;

  // Holds the first call open until released so the second one overlaps it
  const gated = () => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    let entered!: () => void;
    const started = new Promise<void>((resolve) => {
      entered = resolve;
    });
    return { gate, release, started, entered };
  };

  it('rejects a second concurrent startCheckout with BUSY and serves the next one once the first finishes', async () => {
    const checkoutService = module.get(CheckoutService);
    const { gate, release, started, entered } = gated();
    const start = jest
      .spyOn(checkoutService, 'start')
      .mockImplementation(async () => {
        entered();
        await gate;
        throw new TicketingException('SEATS_UNAVAILABLE', 'stub finished');
      });

    const first = startCheckout();
    await started;
    const second = await startCheckout();
    release();
    await first;
    const third = await startCheckout();

    expect(second.status).toBe(200);
    expect(busyReason(second.body)).toBe('BUSY');
    expect(second.body.errors[0].extensions.originalError.statusCode).toBe(422);
    expect(start).toHaveBeenCalledTimes(2);
    expect(busyReason(third.body)).not.toBe('BUSY');
  });

  it('rejects a second concurrent payOrder with BUSY', async () => {
    const paymentService = module.get(OrderPaymentService);
    const { gate, release, started, entered } = gated();
    const pay = jest
      .spyOn(paymentService, 'pay')
      .mockImplementation(async () => {
        entered();
        await gate;
        throw new TicketingException('SEATS_UNAVAILABLE', 'stub finished');
      });

    const first = payOrder();
    await started;
    const second = await payOrder();
    release();
    await first;

    expect(busyReason(second.body)).toBe('BUSY');
    expect(pay).toHaveBeenCalledTimes(1);
  });
});
