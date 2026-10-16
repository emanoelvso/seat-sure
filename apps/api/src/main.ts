import { NestExpressApplication } from '@nestjs/platform-express';
import { ConfigService } from '@sharedModules/config/service/config.service';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { initializeTransactionalContext } from 'typeorm-transactional';
import { LoggerFactory } from '@sharedModules/logger/util/logger.factory';
import { applyGlobalValidation } from '@sharedModules/validation/util/global-validation.util';

async function bootstrap() {
  initializeTransactionalContext();
  const logger = LoggerFactory('application-main');
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
  });
  app.useLogger(logger);
  app.set(
    'trust proxy',
    app.get<ConfigService>(ConfigService).get('app.trustProxy'),
  );
  applyGlobalValidation(app);
  app.enableCors({
    origin: process.env.CORS_ORIGIN ?? 'http://localhost:3000',
    credentials: true,
  });
  await app.listen(process.env.PORT ?? 3001);
}
bootstrap();
