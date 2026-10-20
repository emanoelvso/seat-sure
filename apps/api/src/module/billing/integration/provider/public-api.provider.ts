import { Injectable } from '@nestjs/common';
import {
  BillingApi,
  BillingCardFieldErrors,
  BillingCardInput,
  BillingPaymentCard,
  ChargeDto,
  ChargeSource,
  ChargeOutcome,
  PaymentAction,
  SettleOutcome,
} from '@sharedModules/integration/interface/billing-integration.interface';
import { BillingService } from '@billingModule/core/service/billing.service';

@Injectable()
export class BillingPublicApiProvider implements BillingApi {
  constructor(private readonly billingService: BillingService) {}

  async validateCard(
    card: BillingCardInput,
    now: Date,
  ): Promise<BillingCardFieldErrors> {
    return this.billingService.validateCard(card, now);
  }

  async acceptsSource(source: ChargeSource): Promise<boolean> {
    return this.billingService.acceptsSource(source);
  }

  async charge(input: ChargeDto): Promise<ChargeOutcome> {
    return this.billingService.charge(input);
  }

  async capture(paymentId: string): Promise<void> {
    return this.billingService.capture(paymentId);
  }

  async cancel(paymentId: string): Promise<void> {
    return this.billingService.cancel(paymentId);
  }

  async settle(paymentId: string): Promise<SettleOutcome> {
    return this.billingService.settle(paymentId);
  }

  async findPaymentAction(paymentId: string): Promise<PaymentAction | null> {
    return this.billingService.findPaymentAction(paymentId);
  }

  async refund(paymentId: string): Promise<void> {
    return this.billingService.refund(paymentId);
  }

  async findPaymentCard(paymentId: string): Promise<BillingPaymentCard | null> {
    return this.billingService.findPaymentCard(paymentId);
  }
}
