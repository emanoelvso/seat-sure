import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { initializeTransactionalContext } from 'typeorm-transactional';
import { LoggerFactory } from '@sharedModules/logger/util/logger.factory';
import { applyGlobalValidation } from '@sharedModules/validation/util/global-validation.util';

async function bootstrap() {
  initializeTransactionalContext();
  const logger = LoggerFactory('application-main');
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(logger);
  applyGlobalValidation(app);
  app.enableCors({
    origin: process.env.CORS_ORIGIN ?? 'http://localhost:3000',
    credentials: true,
  });
  await app.listen(process.env.PORT ?? 3001);
}
bootstrap();
