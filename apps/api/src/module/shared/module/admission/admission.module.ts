import { Module } from '@nestjs/common';
import { ConfigModule } from '@sharedModules/config/config.module';
import { AdmissionLimiter } from './service/admission-limiter.service';

@Module({
  imports: [ConfigModule.forRoot()],
  providers: [AdmissionLimiter],
  exports: [AdmissionLimiter],
})
export class AdmissionModule {}
