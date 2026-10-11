import { execFile } from 'node:child_process';
import { appendFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { loadConfig } from './config.mjs';

const run = promisify(execFile);
const INTERVAL_MS = 1000;

// Pid of the process listening on the port of `baseUrl`.
export const findApiPid = async (baseUrl) => {
  const { port } = new URL(baseUrl);
  const { stdout } = await run('lsof', ['-ti', `tcp:${port}`, '-sTCP:LISTEN']);
  return Number(stdout.trim().split('\n')[0]);
};

const processUsage = async (pid) => {
  try {
    const { stdout } = await run('ps', ['-o', '%cpu=,rss=', '-p', String(pid)]);
    const [cpu, rss] = stdout.trim().split(/\s+/).map(Number);
    return { apiCpuPercent: cpu, apiRssKb: rss };
  } catch {
    return { apiCpuPercent: null, apiRssKb: null };
  }
};

// Appends one JSON line per second: Postgres connections of the database,
// ungranted locks, and the API process CPU percent and RSS in KB.
// `stop()` takes a last sample and resolves once everything is written.
export const startSampler = async ({ databaseUrl, outFile, apiPid }) => {
  mkdirSync(dirname(outFile), { recursive: true });
  const db = new pg.Client({ connectionString: databaseUrl });
  await db.connect();

  const sample = async () => {
    const { rows } = await db.query(
      `SELECT
         (SELECT count(*)::int FROM pg_stat_activity WHERE datname = current_database()) AS "pgConnections",
         (SELECT count(*)::int FROM pg_locks WHERE NOT granted) AS "waitingLocks"`,
    );
    const line = {
      ts: new Date().toISOString(),
      ...rows[0],
      ...(await processUsage(apiPid)),
    };
    appendFileSync(outFile, `${JSON.stringify(line)}\n`);
  };

  let pending = sample();
  const timer = setInterval(() => {
    pending = pending.then(sample);
  }, INTERVAL_MS);

  return {
    stop: async () => {
      clearInterval(timer);
      await pending;
      await sample();
      await db.end();
    },
  };
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [outFile, apiPid] = process.argv.slice(2);
  const { databaseUrl } = loadConfig();
  const sampler = await startSampler({
    databaseUrl,
    outFile,
    apiPid: Number(apiPid),
  });
  process.once('SIGTERM', async () => {
    await sampler.stop();
    process.exit(0);
  });
}
