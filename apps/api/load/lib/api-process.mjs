import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { createServer } from 'node:net';
import { parseEnv } from 'node:util';
import { preflight } from './preflight.mjs';

const apiRoot = new URL('../../', import.meta.url);

const freePort = () =>
  new Promise((resolve) => {
    const server = createServer();
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
  });

// Starts the built API (dist/main.js, run `pnpm --filter api build` first)
// with the .env.test settings for the integration tests of the load helpers.
export const startApi = async () => {
  const entry = new URL('dist/main.js', apiRoot);
  if (!existsSync(entry)) {
    throw new Error('dist/main.js is missing. Run pnpm --filter api build.');
  }
  const testEnv = parseEnv(readFileSync(new URL('.env.test', apiRoot), 'utf8'));
  const port = await freePort();
  const baseUrl = `http://127.0.0.1:${port}/graphql`;
  const child = spawn(process.execPath, [entry.pathname], {
    cwd: apiRoot.pathname,
    env: { ...process.env, ...testEnv, PORT: String(port) },
    stdio: 'ignore',
  });

  const deadline = Date.now() + 30_000;
  for (;;) {
    try {
      await preflight(baseUrl);
      break;
    } catch (error) {
      if (Date.now() > deadline || child.exitCode !== null) {
        child.kill();
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }

  return {
    baseUrl,
    databaseUrl: testEnv.DATABASE_URL,
    stop: () =>
      new Promise((resolve) => {
        child.once('exit', resolve);
        child.kill();
      }),
  };
};
