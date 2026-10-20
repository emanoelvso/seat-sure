import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  NotFoundException,
  Param,
  Post,
} from '@nestjs/common';
import { SimulatedPaymentGateway } from '@billingModule/integration/provider/simulated-payment-gateway.provider';
import { ConfigService } from '@sharedModules/config/service/config.service';

// Stands in for the bank's 3-D Secure page in simulated mode (GW-20..GW-22).
// Unauthenticated on purpose: the client secret is a random value only the
// order owner receives, and no money moves.
@Controller('billing/simulated-3ds')
export class SimulatedBankController {
  constructor(
    private readonly configService: ConfigService,
    private readonly gateway: SimulatedPaymentGateway,
  ) {}

  @Post(':clientSecret')
  @HttpCode(204)
  async answer(
    @Param('clientSecret') clientSecret: string,
    @Body() body: { outcome?: unknown } | undefined,
  ): Promise<void> {
    if (this.configService.get('billing.gateway') !== 'simulated') {
      throw new NotFoundException();
    }

    const outcome = body?.outcome;
    if (outcome !== 'approve' && outcome !== 'fail') {
      throw new BadRequestException('outcome must be approve or fail');
    }

    const answered =
      outcome === 'approve'
        ? await this.gateway.approve(clientSecret)
        : await this.gateway.fail(clientSecret);
    if (!answered) {
      throw new NotFoundException();
    }
  }
}
