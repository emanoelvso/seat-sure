import { SubscriptionService } from '@billingModule/core/service/subscription.service';
import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { SubscriptionResponseDto } from '../dto/response/subscription-response.dto';
import { CreateSubscriptionRequestDto } from '../dto/request/create-subscription-request.dto';
import { plainToInstance } from 'class-transformer';
import { UserSubscriptionActiveResponseDto } from '../dto/response/user-subscription-active-response.dto';
import { AuthGuard } from '@sharedModules/auth/guard/auth.guard';

@Controller('subscription')
export class SubscriptionController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  @Post()
  @UseGuards(AuthGuard)
  async createSubscription(
    @Body() createSubscriptionRequest: CreateSubscriptionRequestDto,
  ): Promise<SubscriptionResponseDto> {
    const createdSubscription =
      await this.subscriptionService.createSubscription(
        createSubscriptionRequest,
      );

    // TODO: validate
    return plainToInstance(SubscriptionResponseDto, {
      ...createdSubscription,
      ...{ plan: createdSubscription.plan },
    });
  }

  @Get('/user/:userId/active')
  @UseGuards(AuthGuard)
  async isUserSubscriptionActive(
    userId: string,
  ): Promise<UserSubscriptionActiveResponseDto> {
    const isActive =
      await this.subscriptionService.isUserSubscriptionActive(userId);

    return plainToInstance(
      UserSubscriptionActiveResponseDto,
      { isActive },
      {
        excludeExtraneousValues: true,
      },
    );
  }
}
