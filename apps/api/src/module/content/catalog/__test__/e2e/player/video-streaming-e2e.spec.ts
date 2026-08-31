import { HttpStatus, INestApplication } from '@nestjs/common';
import { TestingModule } from '@nestjs/testing';
import fs from 'fs';
import request from 'supertest';
import nock, { cleanAll } from 'nock';
import { createNestApp } from '@testInfra/test-e2e.setup';
import { ContentModule } from '@contentModule/content.module';
import { testDbClient } from '@testInfra/knex.database';
import { Tables } from '@testInfra/enum/table.enum';
import { videoFactory } from '@contentModule/__test__/factory/video.factory';
import { CONTENT_TEST_FIXTURES } from '@contentModule/__test__/test.constant';
import { faker } from '@faker-js/faker';
import { movieFactory } from '@contentModule/__test__/factory/movie.factory';
import { contentFactory } from '@contentModule/__test__/factory/content.factory';
import { ContentType } from '@contentModule/shared/core/enum/conten-type.enum';
import { ContentCatalogModule } from '@contentModule/catalog/content-catalog.module';

const fakeUserId = faker.string.uuid();
jest.mock('jsonwebtoken', () => ({
  verify: (_token: string, _secret: string, _options: any, callback: any) => {
    callback(null, { sub: fakeUserId });
  },
}));

describe('ContentController (e2e)', () => {
  let module: TestingModule;
  let app: INestApplication;

  beforeAll(async () => {
    const nestTestSetup = await createNestApp([ContentCatalogModule]);
    app = nestTestSetup.app;
    module = nestTestSetup.module;

    await app.init();
  });

  beforeEach(() => {
    jest
      .useFakeTimers({ advanceTimers: true })
      .setSystemTime(new Date('2023-01-01'));
  });

  afterEach(async () => {
    await testDbClient(Tables.VideoMetadata).del();
    await testDbClient(Tables.Video).del();
    await testDbClient(Tables.Movie).del();
    await testDbClient(Tables.Content).del();
    cleanAll();
  });

  afterAll(async () => {
    await module.close();
    fs.rmSync('./uploads', { recursive: true, force: true });
  });

  describe('GET /stream/:videoId', () => {
    it('streams a video', async () => {
      const fakeContent = contentFactory.build({
        type: ContentType.MOVIE,
      });
      const fakeMovie = movieFactory.build({
        contentId: fakeContent.id,
      });
      const fakeVideo = videoFactory.build({
        url: `${CONTENT_TEST_FIXTURES}/sample.mp4`,
        movieId: fakeMovie.id,
      });

      await testDbClient(Tables.Content).insert(fakeContent);
      await testDbClient(Tables.Movie).insert(fakeMovie);
      await testDbClient(Tables.Video).insert(fakeVideo);

      const fileSize = 1430145;
      const range = `bytes=0-${fileSize - 1}`;

      const response = await request(app.getHttpServer())
        .get(`/stream/${fakeVideo.id}`)
        .set('Range', range)
        .set('Authorization', `Bearer fake-token`)
        .expect(HttpStatus.PARTIAL_CONTENT);

      expect(response.headers['content-range']).toBe(
        `bytes 0-${fileSize - 1}/${fileSize}`,
      );
      expect(response.headers['accept-ranges']).toBe('bytes');
      expect(response.headers['content-length']).toBe(String(fileSize));
      expect(response.headers['content-type']).toBe('video/mp4');
    });

    it('returns 404 if the video is not found', async () => {
      await request(app.getHttpServer())
        .get('/stream/45705b56-a47f-4869-b736-8f6626c940f8')
        .set('Authorization', `Bearer fake-token`)
        .expect(HttpStatus.NOT_FOUND);
    });
  });
});
