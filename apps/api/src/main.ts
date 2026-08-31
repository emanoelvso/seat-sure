import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { initializeTransactionalContext } from 'typeorm-transactional';
import { LoggerFactory } from '@sharedModules/logger/util/logger.factory';

async function bootstrap() {
  initializeTransactionalContext();
  const logger = LoggerFactory('application-main');
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(logger);
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
