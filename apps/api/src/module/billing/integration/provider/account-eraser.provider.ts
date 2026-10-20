import { Injectable } from '@nestjs/common';
import { BillingAccountErasureService } from '@billingModule/core/service/account-erasure.service';
import {
  AccountEraser,
  AccountErasure,
} from '@sharedModules/integration/interface/account-erasure.interface';

// Found by Identity through DiscoveryService when it deletes an account
@AccountErasure()
@Injectable()
export class BillingAccountEraser implements AccountEraser {
  readonly name = 'billing';

  constructor(private readonly erasure: BillingAccountErasureService) {}

  async erase(userId: string): Promise<void> {
    return this.erasure.erase(userId);
  }
}
