import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { startSampler } from './sampler.mjs';

const databaseUrl =
  process.env.TEST_DATABASE_URL ||
  'postgresql://postgres:postgres@localhost:5432/seat-sure-test';
const script = fileURLToPath(new URL('./sampler.mjs', import.meta.url));
const dir = mkdtempSync(join(tmpdir(), 'sampler-'));
after(() => rmSync(dir, { recursive: true, force: true }));

const readLines = (file) =>
  readFileSync(file, 'utf8')
    .trim()
    .split('\n')
    .map((line) => JSON.parse(line));

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

test('samples every second with all four fields', async () => {
  const outFile = join(dir, 'a', 'resources.jsonl');
  const sampler = await startSampler({
    databaseUrl,
    outFile,
    apiPid: process.pid,
  });
  await sleep(3000);
  await sampler.stop();

  const lines = readLines(outFile);
  assert.ok(lines.length >= 3, `expected 3+ lines, got ${lines.length}`);
  for (const line of lines) {
    assert.ok(Number.isInteger(line.pgConnections) && line.pgConnections >= 1);
    assert.ok(Number.isInteger(line.waitingLocks) && line.waitingLocks >= 0);
    assert.ok(typeof line.apiCpuPercent === 'number');
    assert.ok(line.apiRssKb > 0);
  }
});

test('stops on SIGTERM with the samples flushed', async () => {
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

  assert.equal(await exited, 0);
  assert.ok(readLines(outFile).length >= 2);
});
