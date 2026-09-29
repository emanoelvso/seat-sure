import { artistFactory } from '@catalogModule/__test__/factory/artist.factory';
import { CatalogPersistenceModule } from '@catalogModule/persistence/catalog-persistence.module';
import { Artist } from '@catalogModule/persistence/entity/artist.entity';
import { ArtistRepository } from '@catalogModule/persistence/repository/artist.repository';
import { INestApplication, Injectable, Module } from '@nestjs/common';
import { Query, Resolver } from '@nestjs/graphql';
import { TestingModule } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';
import { Tables } from '@testInfra/enum/table.enum';
import { testDbClient } from '@testInfra/knex.database';
import { createNestApp } from '@testInfra/test-e2e.setup';
import { DataSource } from 'typeorm';
import { Transactional } from 'typeorm-transactional';

@Injectable()
class TransactionProbe {
  constructor(private readonly artistRepository: ArtistRepository) {}

  @Transactional({ connectionName: 'catalog' })
  async saveAndThrow(artist: Artist): Promise<void> {
    await this.artistRepository.save(artist);
    throw new Error('rollback');
  }

  @Transactional({ connectionName: 'catalog' })
  async saveAndReturn(artist: Artist): Promise<Artist> {
    return this.artistRepository.save(artist);
  }
}

// SPEC_DEVIATION: createNestApp() now always prepends the shared GraphqlModule
// (T5), and Nest's code-first schema builder requires a Query root type. This
// module has no real resolver, so a trivial one keeps schema generation valid
// without pulling in CatalogModule (which would not re-export ArtistRepository
// for DI here, since CatalogModule doesn't export it).
@Resolver()
class TransactionProbeResolver {
  @Query(() => Boolean)
  transactionProbeHealthCheck(): boolean {
    return true;
  }
}

@Module({
  imports: [CatalogPersistenceModule],
  providers: [TransactionProbe, TransactionProbeResolver],
})
class TransactionTestModule {}

const buildArtist = () => {
  const row = artistFactory.build();
  return new Artist({ ...row, genres: row.genres.split(',') });
};

describe('Catalog transactional DataSource (e2e)', () => {
  let app: INestApplication;
  let module: TestingModule;
  let probe: TransactionProbe;

  beforeAll(async () => {
    const nestTestSetup = await createNestApp([TransactionTestModule]);

    module = nestTestSetup.module;
    app = nestTestSetup.app;
    probe = module.get(TransactionProbe);
  });

  beforeEach(async () => {
    await testDbClient(Tables.Artist).del();
  });

  afterAll(async () => {
    await testDbClient(Tables.Artist).del();
    await testDbClient.destroy();
    const dataSource = module.get<DataSource>(getDataSourceToken('catalog'));
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
    await app.getHttpServer().close();
  });

  it('leaves no row when the transactional method saves and throws', async () => {
    const artist = buildArtist();

    await expect(probe.saveAndThrow(artist)).rejects.toThrow('rollback');

    const stored = await testDbClient(Tables.Artist)
      .where({ id: artist.id })
      .first();
    expect(stored).toBeUndefined();
  });

  it('stores the row when the transactional method saves and returns', async () => {
    const artist = buildArtist();

    await probe.saveAndReturn(artist);

    const stored = await testDbClient(Tables.Artist)
      .where({ id: artist.id })
      .first();
    expect(stored?.slug).toBe(artist.slug);
  });
});
