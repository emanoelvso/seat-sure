import { Injectable } from '@nestjs/common';
import {
  BillingApi,
  BillingCardFieldErrors,
  BillingCardInput,
  BillingPaymentCard,
  ChargeDto,
  ChargeOutcome,
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

  async charge(input: ChargeDto): Promise<ChargeOutcome> {
    return this.billingService.charge(input);
  }

  async saveCard(
    userId: string,
    card: BillingCardInput,
    now: Date,
  ): Promise<void> {
    await this.billingService.saveCard(userId, card, now);
  }

  async refund(paymentId: string): Promise<void> {
    return this.billingService.refund(paymentId);
  }

  async findPaymentCard(paymentId: string): Promise<BillingPaymentCard | null> {
    return this.billingService.findPaymentCard(paymentId);
  }
}
