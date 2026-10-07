import { UseGuards } from '@nestjs/common';
import { Query, Resolver } from '@nestjs/graphql';
import { PaymentCardService } from '@billingModule/core/service/payment-card.service';
import { AuthGuard } from '@sharedModules/auth/guard/auth.guard';
import { ClsService } from 'nestjs-cls';
import { PaymentCard } from './type/payment-card.type';

// The caller is always the session's user: no operation takes a user id
// (CARD-02 AC 9)
@Resolver()
export class BillingResolver {
  constructor(
    private readonly paymentCardService: PaymentCardService,
    private readonly clsService: ClsService,
  ) {}

  @UseGuards(AuthGuard)
  @Query(() => [PaymentCard])
  async myPaymentCards(): Promise<PaymentCard[]> {
    return this.paymentCardService.list(
      this.clsService.get<string>('userId'),
      new Date(),
    );
  }
}
