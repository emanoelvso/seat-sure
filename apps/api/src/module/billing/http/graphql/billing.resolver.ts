import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { PaymentCardService } from '@billingModule/core/service/payment-card.service';
import { AuthGuard } from '@sharedModules/auth/guard/auth.guard';
import { ClsService } from 'nestjs-cls';
import { AddPaymentMethodInput } from './type/add-payment-method-input.type';
import { AddPaymentCardInput } from './type/add-payment-card-input.type';
import { PaymentCardIdInput } from './type/payment-card-id-input.type';
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

  @UseGuards(AuthGuard)
  @Mutation(() => [PaymentCard])
  async addPaymentCard(
    @Args('input') input: AddPaymentCardInput,
  ): Promise<PaymentCard[]> {
    return this.paymentCardService.add(
      this.clsService.get<string>('userId'),
      input,
      new Date(),
    );
  }

  // Stripe mode: saves a PaymentMethod made in the browser (GW-37)
  @UseGuards(AuthGuard)
  @Mutation(() => [PaymentCard])
  async addPaymentMethod(
    @Args('input') input: AddPaymentMethodInput,
  ): Promise<PaymentCard[]> {
    return this.paymentCardService.addPaymentMethod(
      this.clsService.get<string>('userId'),
      input.paymentMethodId,
      new Date(),
    );
  }

  @UseGuards(AuthGuard)
  @Mutation(() => [PaymentCard])
  async setDefaultPaymentCard(
    @Args('input') input: PaymentCardIdInput,
  ): Promise<PaymentCard[]> {
    return this.paymentCardService.setDefault(
      this.clsService.get<string>('userId'),
      input.id,
      new Date(),
    );
  }

  @UseGuards(AuthGuard)
  @Mutation(() => [PaymentCard])
  async removePaymentCard(
    @Args('input') input: PaymentCardIdInput,
  ): Promise<PaymentCard[]> {
    return this.paymentCardService.remove(
      this.clsService.get<string>('userId'),
      input.id,
      new Date(),
    );
  }
}
