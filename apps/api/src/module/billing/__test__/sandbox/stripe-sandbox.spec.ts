import { randomUUID } from 'crypto';
import { StripePaymentGateway } from '@billingModule/integration/provider/stripe-payment-gateway.provider';
import { BillingCustomer } from '@billingModule/persistence/entity/billing-customer.entity';
import { BillingCustomerRepository } from '@billingModule/persistence/repository/billing-customer.repository';
import { ConfigService } from '@sharedModules/config/service/config.service';
import Stripe from 'stripe';

// Opt-in smoke test against Stripe's test mode (GW-46). Run with
// `STRIPE_SECRET_KEY=sk_test_... pnpm --filter api test:stripe-sandbox`.
// Without a test-mode key every case is skipped and the run still succeeds
// (GW-47); a live key is never used.
const key = process.env.STRIPE_SECRET_KEY ?? '';
const enabled = /^(sk|rk)_test_/.test(key);

if (!enabled) {
  const reason = key
    ? 'STRIPE_SECRET_KEY is not a test-mode key (sk_test_ or rk_test_)'
    : 'STRIPE_SECRET_KEY is not set';
  process.stdout.write(`Stripe sandbox tests skipped: ${reason}.\n`);
}

// In-memory stand-in for the BillingCustomer table: this suite needs no DB
class MemoryCustomers {
  private readonly rows = new Map<string, BillingCustomer>();

  async findForUser(userId: string, provider: string) {
    return this.rows.get(`${userId}:${provider}`) ?? null;
  }

  async insertOnce(customer: BillingCustomer) {
    this.rows.set(`${customer.userId}:${customer.provider}`, customer);
    return customer;
  }
}

const suite = enabled ? describe : describe.skip;

suite('Stripe sandbox (opt-in, test mode)', () => {
  let stripe: Stripe;
  let gateway: StripePaymentGateway;
  const customers = new MemoryCustomers();
  const created: string[] = [];

  beforeAll(() => {
    stripe = new Stripe(key);
    gateway = new StripePaymentGateway(
      stripe,
      {
        get: () => 'sandbox-fingerprint-secret-0123456789',
      } as unknown as ConfigService,
      customers as unknown as BillingCustomerRepository,
    );
  });

  afterAll(async () => {
    for (const id of created) {
      await stripe.customers.del(id).catch(() => undefined);
    }
  });

  const authorize = (paymentMethod: string, key = randomUUID()) =>
    gateway.authorize(
      {
        amountCents: 1000,
        currency: 'USD',
        source: { type: 'token', token: paymentMethod },
      },
      `${key}:authorize`,
    );

  it('authorizes and captures pm_card_visa', async () => {
    const result = await authorize('pm_card_visa');

    expect(result.status).toBe('authorized');
    if (result.status !== 'authorized') return;
    expect(await gateway.getPayment(result.providerPaymentId)).toEqual({
      status: 'authorized',
    });

    await gateway.capture(result.providerPaymentId, `${randomUUID()}:capture`);

    expect(await gateway.getPayment(result.providerPaymentId)).toEqual({
      status: 'captured',
    });
  });

  it('pauses pm_card_authenticationRequired for a challenge, then cancels it', async () => {
    const result = await authorize('pm_card_authenticationRequired');

    expect(result.status).toBe('requires_action');
    if (result.status !== 'requires_action') return;
    expect(result.clientSecret).toMatch(/_secret_/);
    expect(await gateway.getPayment(result.providerPaymentId)).toEqual({
      status: 'requires_action',
      clientSecret: result.clientSecret,
    });

    await gateway.cancel(result.providerPaymentId, `${randomUUID()}:cancel`);

    expect(await gateway.getPayment(result.providerPaymentId)).toEqual({
      status: 'cancelled',
    });
  });

  it('declines pm_card_chargeDeclined', async () => {
    await expect(authorize('pm_card_chargeDeclined')).resolves.toEqual({
      status: 'failed',
      reason: 'card_declined',
    });
  });

  it('returns the same payment for a repeated idempotency key', async () => {
    const key = randomUUID();
    const first = await authorize('pm_card_visa', key);
    const again = await authorize('pm_card_visa', key);

    expect(again).toEqual(first);
    if (first.status === 'authorized') {
      await gateway.cancel(first.providerPaymentId, `${key}:cancel`);
    }
  });

  it('attaches a card to a test customer and detaches it', async () => {
    const userId = randomUUID();
    const method = await stripe.paymentMethods.create({
      type: 'card',
      card: { token: 'tok_visa' },
      billing_details: { name: 'Sandbox Tester' },
    });

    const result = await gateway.attachPaymentMethod(method.id, userId);

    expect(result.status).toBe('succeeded');
    if (result.status !== 'succeeded') return;
    created.push(result.customerId);
    expect(result).toMatchObject({
      brand: 'visa',
      last4: '4242',
      holder: 'Sandbox Tester',
    });
    expect(result.fingerprint).toMatch(/^[0-9a-f]{64}$/);

    await gateway.detach(result.token);

    expect(
      (await stripe.paymentMethods.retrieve(method.id)).customer,
    ).toBeNull();
  });

  it('lists a customer methods, detaches twice and deletes the customer', async () => {
    const userId = randomUUID();
    const method = await stripe.paymentMethods.create({
      type: 'card',
      card: { token: 'tok_visa' },
    });
    const attached = await gateway.attachPaymentMethod(method.id, userId);
    if (attached.status !== 'succeeded') {
      throw new Error('expected the attach to succeed');
    }
    created.push(attached.customerId);

    const listed = await gateway.listCustomerPaymentMethods(
      attached.customerId,
    );
    expect(listed.status).toBe('found');
    if (listed.status === 'found') {
      expect(listed.methods.map((m) => m.token)).toEqual([method.id]);
      expect(listed.methods[0].createdAt).toBeInstanceOf(Date);
    }

    await gateway.detach(method.id);
    await expect(gateway.detach(method.id)).resolves.toBeUndefined();

    await gateway.deleteCustomer(attached.customerId);
    await expect(
      gateway.deleteCustomer(attached.customerId),
    ).resolves.toBeUndefined();
  });
});
