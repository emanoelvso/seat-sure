import { INestApplication } from '@nestjs/common';
import { TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { testDbClient } from '@testInfra/knex.database';
import { Tables } from '@testInfra/enum/table.enum';
import { createNestApp } from '@testInfra/test-e2e.setup';
import { IdentityModule } from '@identityModule/identity.module';

describe('UserResolver (e2e)', () => {
  let app: INestApplication;
  let module: TestingModule;

  beforeAll(async () => {
    const nestTestSetup = await createNestApp([IdentityModule]);

    module = nestTestSetup.module;

    app = nestTestSetup.app;
    await app.init();
  });

  beforeEach(async () => {
    await testDbClient(Tables.User).del();
  });

  afterAll(async () => {
    await testDbClient(Tables.User).del();
    await module.close();
  });

  describe('Identity - createUser mutation', () => {
    it('creates a new user', async () => {
      const createUserInput = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'johndoe@example.com',
        password: 'password123',
      };

      const response = await request(app.getHttpServer())
        .post('/graphql')
        .send({
          query: `
            mutation {
              createUser(CreateUserInput: {
                firstName: "${createUserInput.firstName}",
                lastName: "${createUserInput.lastName}",
                email: "${createUserInput.email}",
                password: "${createUserInput.password}"
              }) {
                id
                firstName
                lastName
                email
              }
            }
          `,
        });
      const { id, firstName, lastName, email } = response.body.data.createUser;

      expect(id).toBeDefined();
      expect(firstName).toBe(createUserInput.firstName);
      expect(lastName).toBe(createUserInput.lastName);
      expect(email).toBe(createUserInput.email);
    });
    it('throws error for invalid email validation', async () => {
      const createUserInput = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'invalidemail',
        password: 'password123',
      };

      const response = await request(app.getHttpServer())
        .post('/graphql')
        .send({
          query: `
            mutation {
              createUser(CreateUserInput: {
                firstName: "${createUserInput.firstName}",
                lastName: "${createUserInput.lastName}",
                email: "${createUserInput.email}",
                password: "${createUserInput.password}"
              }) {
                id
                firstName
                lastName
                email
              }
            }
          `,
        })
        .expect(200);

      expect(response.body.errors[0].extensions.originalError.message[0]).toBe(
        'email must be an email',
      );
    });
  });
});
