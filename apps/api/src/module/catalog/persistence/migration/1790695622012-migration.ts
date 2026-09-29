import { MigrationInterface, QueryRunner } from 'typeorm';

// Prefixes the Catalog tables with the module name (ADR-006). TypeORM derives
// constraint names from the table name, so every PK/FK/UQ/CHK is renamed to
// the name TypeORM computes for the new table. Renaming keeps the rows and the
// rows each foreign key points at.

const TABLES: [string, string][] = [
  ['Event', 'CatalogEvent'],
  ['Artist', 'CatalogArtist'],
  ['EventArtist', 'CatalogEventArtist'],
  ['Venue', 'CatalogVenue'],
  ['SeatMap', 'CatalogSeatMap'],
  ['TicketType', 'CatalogTicketType'],
];

const ENUM_TYPES: [string, string][] = [
  ['Event_type_enum', 'CatalogEvent_type_enum'],
  ['Event_status_enum', 'CatalogEvent_status_enum'],
];

// [table (new name), old constraint name, new constraint name]
const CONSTRAINTS: [string, string, string][] = [
  // Primary keys
  [
    'CatalogEvent',
    'PK_894abf6d0c8562b398c717414d6',
    'PK_239c30154783e1b9fed9f7dc74a',
  ],
  [
    'CatalogArtist',
    'PK_7c07e38dd0d817a103966c5876e',
    'PK_ab8e4debf73edcde27394bc8cc0',
  ],
  [
    'CatalogEventArtist',
    'PK_dbe1d4c37eed07f58003013a2cd',
    'PK_d3d933bc4dd461a81674dff1d1a',
  ],
  [
    'CatalogVenue',
    'PK_ec27dedc12b8fa53b5a31ace722',
    'PK_217f71d455f11eae275987ee41b',
  ],
  [
    'CatalogSeatMap',
    'PK_93423f3eaf606695e6364558597',
    'PK_2d53930a21b218cd5943032345f',
  ],
  [
    'CatalogTicketType',
    'PK_c7cbda99f4f03e4deeb5798c9d9',
    'PK_46641e7b14e882d6f0ff0ce4c43',
  ],
  // Unique constraints
  [
    'CatalogArtist',
    'UQ_b943c2b7131dbffe5162db77a72',
    'UQ_f353f282dbe90c9aa1331652d59',
  ],
  [
    'CatalogArtist',
    'UQ_377bcd3a2620d2f9551326af7f7',
    'UQ_637ec013c7b5f0bb09b28a5c91d',
  ],
  [
    'CatalogTicketType',
    'UQ_7f13e80da01dc57cf95024ec46a',
    'UQ_be655ff28fef7b9f55a4bb165ec',
  ],
  // Check constraints
  [
    'CatalogTicketType',
    'CHK_cf10e826fa99b0a92cfd74148e',
    'CHK_08532d91e589a470d514269147',
  ],
  [
    'CatalogTicketType',
    'CHK_659fe2c3ba461230b34fce2fe9',
    'CHK_e84d487827d512b8991a22a423',
  ],
  [
    'CatalogTicketType',
    'CHK_14eb042f3a107d4995c13c2b0e',
    'CHK_47235c8f522d99771c0843e7d1',
  ],
  // Foreign keys
  [
    'CatalogSeatMap',
    'FK_03b1b4862798fd6e808ad912589',
    'FK_adbf108db07f336bd221b37b818',
  ],
  [
    'CatalogTicketType',
    'FK_ae340fa1c5363a2721ff2346c0b',
    'FK_9d178807be2f1a3e1f6c9d5fb00',
  ],
  [
    'CatalogEvent',
    'FK_4b1d4fbcf126e0c86eefc7dc2d0',
    'FK_a8e1c28ac3f77c86a7f7059d59d',
  ],
  [
    'CatalogEventArtist',
    'FK_234a99f6eb4beed8263e5d38080',
    'FK_91226552091f33492fd97f28c21',
  ],
  [
    'CatalogEventArtist',
    'FK_7ca78d439d14e6250fcb7c4b090',
    'FK_e48a74bb092acf78e5753ab80f0',
  ],
];

export class Migration1790695622012 implements MigrationInterface {
  name = 'Migration1790695622012';

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const [oldName, newName] of TABLES) {
      await queryRunner.query(
        `ALTER TABLE "${oldName}" RENAME TO "${newName}"`,
      );
    }
    for (const [oldName, newName] of ENUM_TYPES) {
      await queryRunner.query(
        `ALTER TYPE "public"."${oldName}" RENAME TO "${newName}"`,
      );
    }
    for (const [table, oldName, newName] of CONSTRAINTS) {
      await queryRunner.query(
        `ALTER TABLE "${table}" RENAME CONSTRAINT "${oldName}" TO "${newName}"`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const [table, oldName, newName] of [...CONSTRAINTS].reverse()) {
      await queryRunner.query(
        `ALTER TABLE "${table}" RENAME CONSTRAINT "${newName}" TO "${oldName}"`,
      );
    }
    for (const [oldName, newName] of [...ENUM_TYPES].reverse()) {
      await queryRunner.query(
        `ALTER TYPE "public"."${newName}" RENAME TO "${oldName}"`,
      );
    }
    for (const [oldName, newName] of [...TABLES].reverse()) {
      await queryRunner.query(
        `ALTER TABLE "${newName}" RENAME TO "${oldName}"`,
      );
    }
  }
}
