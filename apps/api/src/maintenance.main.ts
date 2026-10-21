import { INestApplicationContext } from '@nestjs/common';
import { DiscoveryService, NestFactory } from '@nestjs/core';
import { LoggerFactory } from '@sharedModules/logger/util/logger.factory';
import { MaintenanceRunner } from '@sharedModules/maintenance/maintenance-runner.service';
import { DataSource } from 'typeorm';
import { initializeTransactionalContext } from 'typeorm-transactional';
import { MaintenanceModule } from './maintenance.module';

// `app.close()` can't release the connections: @nestjs/typeorm looks up the
// default DataSource on shutdown, and every datasource here is named. The
// command closes them itself so the process can end.
async function destroyDataSources(app: INestApplicationContext): Promise<void> {
  const dataSources = app
    .get(DiscoveryService, { strict: false })
    .getProviders()
    .map((wrapper) => wrapper.instance)
    .filter(
      (instance): instance is DataSource => instance instanceof DataSource,
    );
  await Promise.all(
    dataSources
      .filter((dataSource) => dataSource.isInitialized)
      .map((dataSource) => dataSource.destroy()),
  );
}

// Run once per call by any scheduler: finishes pending account deletions and
// detaches orphan gateway tokens, then exits 0, or 1 when anything failed.
async function runMaintenance(): Promise<void> {
  initializeTransactionalContext();
  const logger = LoggerFactory('maintenance-main');
  const app = await NestFactory.createApplicationContext(MaintenanceModule, {
    bufferLogs: true,
  });
  app.useLogger(logger);
  try {
    process.exitCode = await app.get(MaintenanceRunner).run(new Date());
  } finally {
    await destroyDataSources(app);
  }
}

runMaintenance().catch((error: unknown) => {
  // Boot failed (for example the database is down): no app logger exists yet
  console.error('maintenance-boot-failed', error);
  process.exitCode = 1;
});
