import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { buildSchema, parse, validate } = createRequire(require.resolve('@nestjs/graphql'))('graphql');
const schema = buildSchema(await readFile(new URL('../schema.gql', import.meta.url), 'utf8'));

test('demo sign-in exposes the existing complete session token contract', () => {
  assert.equal(String(schema.getMutationType().getFields().demoSignIn.type), 'SessionTokens!');
  const fields = schema.getType('SessionTokens').getFields();
  assert.deepEqual(Object.fromEntries(Object.entries(fields).map(([key, field]) => [key, String(field.type)])), {
    accessToken:'String!', expiresAt:'DateTime!', persistent:'Boolean!', refreshToken:'String',
  });
  assert.deepEqual(validate(schema, parse('mutation { demoSignIn { accessToken refreshToken expiresAt persistent } }')), []);
});
test('schema retains all six production bounded contexts instead of a partial test application', () => {
  const queries = schema.getQueryType().getFields();
  for (const query of ['findEvents','findAccountOrders','myProfile','me','myPaymentCards','myNotifications']) assert.ok(queries[query], query);
});
