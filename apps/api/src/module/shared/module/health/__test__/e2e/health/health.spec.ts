import { INestApplication } from '@nestjs/common';
import { TestingModule } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';
import { createNestApp } from '@testInfra/test-e2e.setup';
import request from 'supertest';
import { DataSource } from 'typeorm';

describe('Public health endpoint (REL-32)', () => {
  let app: INestApplication;
  let module: TestingModule;

  beforeAll(async () => {
    ({ app, module } = await createNestApp());
  });
  afterAll(async () => {
    for (const name of [
      'catalog',
      'ticketing',
      'identity',
      'user-profile',
      'billing',
      'notifications',
    ]) {
      const datasource = module.get<DataSource>(getDataSourceToken(name));
      if (datasource.isInitialized) await datasource.destroy();
    }
    await app.getHttpServer().close();
  });

  it('returns exactly 200 and a small status payload without authentication', async () => {
    const response = await request(app.getHttpServer()).get('/health');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
  });

  it('ignores invalid bearer credentials and exposes no additional configuration', async () => {
    const response = await request(app.getHttpServer())
      .get('/health')
      .set('Authorization', 'Bearer invalid-fixture');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
    expect(Object.keys(response.body)).toEqual(['status']);
  });
});
