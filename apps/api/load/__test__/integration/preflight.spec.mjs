import { execFile } from 'node:child_process';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { preflight } from '../../lib/preflight.mjs';

const script = fileURLToPath(
  new URL('../../lib/preflight.mjs', import.meta.url),
);

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

const close = (server) => new Promise((resolve) => server.close(resolve));

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

describe('preflight', () => {
  it('resolves when the API answers { __typename }', async () => {
    const { server, url } = await listen(graphqlStub);
    try {
      await expect(preflight(url)).resolves.toBeUndefined();
    } finally {
      await close(server);
    }
  });

  it('rejects naming the URL when the API is unreachable', async () => {
    const { server, url } = await listen(graphqlStub);
    await close(server);
    await expect(preflight(url)).rejects.toThrow(url);
  });

  it('the CLI exits non-zero and prints the URL when unreachable', async () => {
    const { server, url } = await listen(graphqlStub);
    await close(server);
    const result = await runCli(url);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain(url);
  });

  it('the CLI exits 0 when the API is reachable', async () => {
    const { server, url } = await listen(graphqlStub);
    try {
      expect((await runCli(url)).status).toBe(0);
    } finally {
      await close(server);
    }
  });

  it('rejects when the server answers with an error status', async () => {
    const { server, url } = await listen((req, res) => {
      res.statusCode = 500;
      res.setHeader('content-type', 'application/json');
      res.end('{"errors":[]}');
    });
    try {
      await expect(preflight(url)).rejects.toThrow(/HTTP 500/);
    } finally {
      await close(server);
    }
  });
});
