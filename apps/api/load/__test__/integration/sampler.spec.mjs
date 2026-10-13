import { spawn } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { startSampler } from '../../lib/sampler.mjs';

const databaseUrl =
  process.env.TEST_DATABASE_URL ||
  'postgresql://postgres:postgres@localhost:5432/seat-sure-test';
const script = fileURLToPath(new URL('../../lib/sampler.mjs', import.meta.url));
const dir = mkdtempSync(join(tmpdir(), 'sampler-'));

const readLines = (file) =>
  readFileSync(file, 'utf8')
    .trim()
    .split('\n')
    .map((line) => JSON.parse(line));

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

describe('resource sampler', () => {
  afterAll(() => rmSync(dir, { recursive: true, force: true }));

  it('samples every second with all four fields', async () => {
    const outFile = join(dir, 'a', 'resources.jsonl');
    const sampler = await startSampler({
      databaseUrl,
      outFile,
      apiPid: process.pid,
    });
    await sleep(3000);
    await sampler.stop();

    const lines = readLines(outFile);
    expect(lines.length).toBeGreaterThanOrEqual(3);
    for (const line of lines) {
      expect(Number.isInteger(line.pgConnections)).toBe(true);
      expect(line.pgConnections).toBeGreaterThanOrEqual(1);
      expect(Number.isInteger(line.waitingLocks)).toBe(true);
      expect(line.waitingLocks).toBeGreaterThanOrEqual(0);
      expect(typeof line.apiCpuPercent).toBe('number');
      expect(line.apiRssKb).toBeGreaterThan(0);
    }
  });

  it('stops on SIGTERM with the samples flushed', async () => {
    const outFile = join(dir, 'b', 'resources.jsonl');
    const child = spawn(
      process.execPath,
      [script, outFile, String(process.pid)],
      {
        env: { ...process.env, LOAD_DATABASE_URL: databaseUrl },
        stdio: 'ignore',
      },
    );
    const exited = new Promise((resolve) =>
      child.once('exit', (code) => resolve(code)),
    );
    await sleep(2500);
    child.kill('SIGTERM');

    expect(await exited).toBe(0);
    expect(readLines(outFile).length).toBeGreaterThanOrEqual(2);
  });
});
