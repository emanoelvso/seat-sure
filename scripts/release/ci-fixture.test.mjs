import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

test('workflow produces a complete newline-delimited disposable API fixture', () => {
  const workflow = readFileSync(new URL('../../.github/workflows/ci.yml', import.meta.url), 'utf8');
  const script = workflow.split("node --input-type=module <<'JS'\n")[1].split('\n          JS')[0].replace(/^          /gm, '');
  const cwd = mkdtempSync(join(tmpdir(), 'seat-sure-ci-fixture-'));
  try {
    mkdirSync(join(cwd, 'apps/api'), { recursive: true });
    assert.equal(spawnSync(process.execPath, ['--input-type=module'], { input: script, cwd }).status, 0);
    const contents = readFileSync(join(cwd, 'apps/api/.env.test'), 'utf8');
    assert.equal(readFileSync(join(cwd, 'apps/api/.env'), 'utf8'), contents);
    const lines = contents.split('\n');
    const config = Object.fromEntries(lines.map(line => { const i = line.indexOf('='); return [line.slice(0, i), line.slice(i + 1)]; }));
    assert.equal(config.NODE_ENV, 'test');
    assert.equal(config.DATABASE_NAME, 'seat-sure-test');
    assert.equal(config.DATABASE_URL, 'postgresql://postgres:postgres@127.0.0.1:5432/seat-sure-test');
    for (const key of ['JWT_SECRET', 'BILLING_FINGERPRINT_SECRET']) assert.match(config[key], /^[a-f0-9]{64}$/);
    assert.deepEqual(Object.keys(config).sort(), ['NODE_ENV', 'PORT', 'DATABASE_URL', 'DATABASE_HOST', 'DATABASE_PORT', 'DATABASE_NAME', 'DATABASE_USERNAME', 'DATABASE_PASSWORD', 'REDIS_HOST', 'REDIS_PORT', 'AUTH_CODE_SENDER', 'JWT_SECRET', 'BILLING_FINGERPRINT_SECRET'].sort());
  } finally { rmSync(cwd, { recursive: true, force: true }); }
});
