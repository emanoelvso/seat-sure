import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { createServer } from 'node:http';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { preflight } from './preflight.mjs';

const script = fileURLToPath(new URL('./preflight.mjs', import.meta.url));

const listen = (handler) =>
  new Promise((resolve) => {
    const server = createServer(handler);
    server.listen(0, '127.0.0.1', () =>
      resolve({
        server,
        url: `http://127.0.0.1:${server.address().port}/graphql`,
      }),
    );
  });

const graphqlStub = (req, res) => {
  let body = '';
  req.on('data', (chunk) => (body += chunk));
  req.on('end', () => {
    res.setHeader('content-type', 'application/json');
    res.end(
      JSON.stringify({
        data: JSON.parse(body).query.includes('__typename')
          ? { __typename: 'Query' }
          : null,
      }),
    );
  });
};

test('resolves when the API answers { __typename }', async () => {
  const { server, url } = await listen(graphqlStub);
  try {
    await assert.doesNotReject(preflight(url));
  } finally {
    server.close();
  }
});

test('rejects naming the URL when the API is unreachable', async () => {
  const { server, url } = await listen(graphqlStub);
  await new Promise((resolve) => server.close(resolve));
  await assert.rejects(preflight(url), (error) => error.message.includes(url));
});

const runCli = (baseUrl) =>
  new Promise((resolve) => {
    execFile(
      process.execPath,
      [script],
      { env: { ...process.env, BASE_URL: baseUrl } },
      (error, stdout, stderr) =>
        resolve({ status: error ? error.code : 0, stderr }),
    );
  });

test('the CLI exits non-zero and prints the URL when unreachable', async () => {
  const { server, url } = await listen(graphqlStub);
  await new Promise((resolve) => server.close(resolve));
  const result = await runCli(url);
  assert.equal(result.status, 1);
  assert.ok(result.stderr.includes(url));
});

test('the CLI exits 0 when the API is reachable', async () => {
  const { server, url } = await listen(graphqlStub);
  try {
    assert.equal((await runCli(url)).status, 0);
  } finally {
    server.close();
  }
});

test('rejects when the server answers with an error status', async () => {
  const { server, url } = await listen((req, res) => {
    res.statusCode = 500;
    res.setHeader('content-type', 'application/json');
    res.end('{"errors":[]}');
  });
  try {
    await assert.rejects(preflight(url), /HTTP 500/);
  } finally {
    server.close();
  }
});
