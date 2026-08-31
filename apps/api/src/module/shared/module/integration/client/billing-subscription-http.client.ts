import { Injectable } from '@nestjs/common';
import { BillingSubscriptionStatusApi } from '../interface/billing-integration.interface';
import { HttpClient } from '@sharedModules/http-client/client/http.client';
import { ConfigService } from '@sharedModules/config/service/config.service';
import { BillingApiUserSubscriptionActiveResponseDto } from '../http/dto/response/billing-api-subscription-status-response.dto';

@Injectable()
export class BillingSubscriptionHttpClient implements BillingSubscriptionStatusApi {
  constructor(
    private readonly httpClient: HttpClient,
    private readonly configService: ConfigService,
  ) {}

  async isUserSubscriptionActive(userId: string): Promise<boolean> {
    const options = {
      method: 'GET',
      headers: {
        accept: 'application/json',
        Authorization: `Bearer PUT SOMETHING`,
      },
    };

    const url = `${this.configService.get('billingApi').url}/subscription/user/${userId}/active`;

    const { isActive } =
      await this.httpClient.get<BillingApiUserSubscriptionActiveResponseDto>(
        url,
        options,
      );

    return isActive;
  }
}
