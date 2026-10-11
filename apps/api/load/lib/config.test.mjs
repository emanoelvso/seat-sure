import assert from 'node:assert/strict';
import { test } from 'node:test';
import { loadConfig } from './config.mjs';

test('defaults BASE_URL to the local GraphQL endpoint', () => {
  assert.equal(loadConfig({}).baseUrl, 'http://localhost:3000/graphql');
});

test('accepts localhost, 127.0.0.1 and host.docker.internal', () => {
  for (const host of ['localhost', '127.0.0.1', 'host.docker.internal']) {
    const url = `http://${host}:3000/graphql`;
    assert.equal(loadConfig({ BASE_URL: url }).baseUrl, url);
  }
});

test('rejects any other host and names the allowed hosts', () => {
  assert.throws(
    () => loadConfig({ BASE_URL: 'http://example.com/graphql' }),
    (error) =>
      ['localhost', '127.0.0.1', 'host.docker.internal'].every((host) =>
        error.message.includes(host),
      ),
  );
});

test('rejects a host that only contains an allowed name', () => {
  assert.throws(
    () => loadConfig({ BASE_URL: 'http://localhost.evil.com/graphql' }),
    /not allowed/,
  );
});

test('rejects a non-local database host', () => {
  assert.throws(
    () =>
      loadConfig({ LOAD_DATABASE_URL: 'postgresql://u:p@db.example.com/x' }),
    /not allowed/,
  );
});

test('rejects a value that is not a URL', () => {
  assert.throws(() => loadConfig({ BASE_URL: 'not a url' }), /not a valid URL/);
});
