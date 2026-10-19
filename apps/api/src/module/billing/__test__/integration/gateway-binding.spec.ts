import { BillingModule } from '@billingModule/billing.module';
import { PaymentGateway } from '@billingModule/core/adapter/payment-gateway.adapter.interface';
import { paymentGatewayFactory } from '@billingModule/integration/provider/payment-gateway.provider';
import { SimulatedPaymentGateway } from '@billingModule/integration/provider/simulated-payment-gateway.provider';
import { StripePaymentGateway } from '@billingModule/integration/provider/stripe-payment-gateway.provider';
import { BillingCustomerRepository } from '@billingModule/persistence/repository/billing-customer.repository';
import { ConfigService } from '@sharedModules/config/service/config.service';
import { Test, TestingModule } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';
import Stripe from 'stripe';
import { DataSource } from 'typeorm';
import { initializeTransactionalContext } from 'typeorm-transactional';

describe('PaymentGateway binding (integration)', () => {
  let module: TestingModule;

  beforeAll(async () => {
    initializeTransactionalContext();
    module = await Test.createTestingModule({
      imports: [BillingModule],
    }).compile();
  });

  afterAll(async () => {
    const dataSource = module.get<DataSource>(getDataSourceToken('billing'));
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
  });

  const configOf = (gateway: string) =>
    ({ get: () => gateway }) as unknown as ConfigService;

  it('binds the simulated gateway by default', () => {
    expect(module.get(PaymentGateway)).toBeInstanceOf(SimulatedPaymentGateway);
  });

  it('builds the simulated gateway when configured as simulated', () => {
    const simulated = module.get(SimulatedPaymentGateway);

    const gateway = paymentGatewayFactory(
      configOf('simulated'),
      simulated,
      null,
      module.get(BillingCustomerRepository),
    );

    expect(gateway).toBe(simulated);
  });

  it('builds the Stripe adapter when configured as stripe', () => {
    const gateway = paymentGatewayFactory(
      configOf('stripe'),
      module.get(SimulatedPaymentGateway),
      {} as Stripe,
      module.get(BillingCustomerRepository),
    );

    expect(gateway).toBeInstanceOf(StripePaymentGateway);
    expect(gateway.provider).toBe('stripe');
  });
});
