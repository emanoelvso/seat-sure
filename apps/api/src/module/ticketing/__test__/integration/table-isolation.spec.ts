import { readdirSync, readFileSync } from 'fs';
import { join, relative } from 'path';
import { Test, TestingModule } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';
import { testDbClient } from '@testInfra/knex.database';
import { TicketingPersistenceModule } from '@ticketingModule/persistence/ticketing-persistence.module';
import { DataSource } from 'typeorm';
import { initializeTransactionalContext } from 'typeorm-transactional';

// Seat locking stays inside Ticketing (ADR-006, ADR-015): no Ticketing
// transaction can map or name another module's table.
const MODULES_DIR = join(__dirname, '..', '..', '..');
const TICKETING_DIR = join(MODULES_DIR, 'ticketing');

const filesUnder = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory()
      ? filesUnder(join(dir, entry.name))
      : [join(dir, entry.name)],
  );

// Every table declared by an entity of a module other than Ticketing
const otherModulesTables = (): string[] =>
  readdirSync(MODULES_DIR)
    .filter((module) => module !== 'ticketing')
    .flatMap((module) =>
      filesUnder(join(MODULES_DIR, module)).filter((file) =>
        file.endsWith('.entity.ts'),
      ),
    )
    .flatMap((file) =>
      [...readFileSync(file, 'utf8').matchAll(/@Entity\('(\w+)'\)/g)].map(
        ([, table]) => table,
      ),
    );

// `table` quoted as an identifier or a string: "X", 'X' or `X`
const quotedTablesIn = (file: string, tables: string[]): string[] => {
  const source = readFileSync(file, 'utf8');
  return tables.filter((table) =>
    new RegExp(`["'\`]${table}["'\`]`).test(source),
  );
};

describe('Ticketing table isolation (integration)', () => {
  let module: TestingModule;
  let dataSource: DataSource;

  beforeAll(async () => {
    initializeTransactionalContext();
    module = await Test.createTestingModule({
      imports: [TicketingPersistenceModule],
    }).compile();
    dataSource = module.get<DataSource>(getDataSourceToken('ticketing'));
  });

  afterAll(async () => {
    await testDbClient.destroy();
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
  });

  it('maps only Ticketing tables on the ticketing datasource (HOLDV-09)', () => {
    const tables = dataSource.entityMetadatas
      .map((metadata) => metadata.tableName)
      .sort();

    expect(tables).toEqual([
      'TicketingOrder',
      'TicketingOrderItem',
      'TicketingSeatHold',
      'TicketingTicket',
    ]);
  });

  it("names no other module's table in Ticketing runtime source (HOLDV-10)", () => {
    const tables = otherModulesTables();
    const runtimeFiles = filesUnder(TICKETING_DIR).filter(
      (file) =>
        file.endsWith('.ts') &&
        !file.includes(`${join('persistence', 'migration')}`) &&
        !file.includes('__test__'),
    );

    const offenders = runtimeFiles.flatMap((file) =>
      quotedTablesIn(file, tables).map(
        (table) => `${relative(TICKETING_DIR, file)}: ${table}`,
      ),
    );

    expect(tables).toEqual(
      expect.arrayContaining(['CatalogSeat', 'CatalogEvent', 'BillingPayment']),
    );
    expect(runtimeFiles.map((file) => relative(TICKETING_DIR, file))).toEqual(
      expect.arrayContaining([
        join('persistence', 'repository', 'seat-hold.repository.ts'),
        join('core', 'service', 'checkout.service.ts'),
      ]),
    );
    expect(offenders).toEqual([]);
  });

  it('detects a quoted Catalog table, as in the demo seed migration that reads CatalogSeat (HOLDV-10)', () => {
    const seedMigration = join(
      TICKETING_DIR,
      'persistence',
      'migration',
      '1790881300000-migration.ts',
    );

    expect(quotedTablesIn(seedMigration, otherModulesTables())).toEqual(
      expect.arrayContaining(['CatalogEvent', 'CatalogSeat']),
    );
  });
});
