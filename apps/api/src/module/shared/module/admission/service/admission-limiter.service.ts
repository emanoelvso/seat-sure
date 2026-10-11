import { Injectable } from '@nestjs/common';
import { ConfigService } from '@sharedModules/config/service/config.service';
import { AdmissionBusyException } from '../exception/admission-busy.exception';

// Bounds the work running at once. The excess is rejected right away with a
// retryable BUSY instead of queueing behind a saturated event loop.
@Injectable()
export class AdmissionLimiter {
  private readonly maxConcurrent: number;
  private inFlight = 0;

  constructor(configService: ConfigService) {
    this.maxConcurrent = configService.get('admission.maxConcurrent');
  }

  async run<T>(work: () => Promise<T>): Promise<T> {
    if (this.inFlight >= this.maxConcurrent) {
      throw new AdmissionBusyException();
    }

    this.inFlight += 1;
    try {
      return await work();
    } finally {
      this.inFlight -= 1;
    }
  }
}
