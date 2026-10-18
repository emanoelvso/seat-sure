import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { forbiddenPaths } from './check-paths.mjs';

for (const path of ['.specs/spec.md', 'apps/web/.codex/config', '.claude/a', '.cursor/a', '.windsurf/a', '.agents/a', '.figwright/snapshots/a.json', 'AGENTS.md', 'apps/web/CLAUDE.md', '.ai-memory.toml', 'docs/ai-memory.md', 'apps/web/skills-lock.json']) {
  test(`rejects ${path}`, () => assert.deepEqual(forbiddenPaths(`A\0${path}\0`), [path]));
}
test('permits deletion of tooling', () => assert.deepEqual(forbiddenPaths('D\0AGENTS.md\0D\0.specs/a\0'), []));
test('checks rename destination only', () => {
  assert.deepEqual(forbiddenPaths('R100\0AGENTS.md\0docs/architecture.md\0'), []);
  assert.deepEqual(forbiddenPaths('R100\0docs/architecture.md\0apps/AGENTS.md\0'), ['apps/AGENTS.md']);
});
test('handles modified files, spaces and newlines without splitting paths', () => assert.deepEqual(forbiddenPaths('M\0apps/a b/.specs/a\nb.md\0'), ['apps/a b/.specs/a\nb.md']));
test('permits project documentation and similarly named files', () => assert.deepEqual(forbiddenPaths('A\0docs/adrs/decision.md\0M\0apps/api/README.md\0A\0src/agents.ts\0'), []));
test('real git diff fails a forbidden addition and permits its later deletion', () => {
  const cwd = mkdtempSync(join(tmpdir(), 'seat-sure-paths-'));
  const git = (...args) => execFileSync('git', args, { cwd, stdio: 'pipe' }).toString().trim();
  try {
    git('init', '-q'); git('-c', 'user.name=Fixture', '-c', 'user.email=fixture@demo.invalid', 'commit', '--allow-empty', '-qm', 'base');
    const base = git('rev-parse', 'HEAD');
    mkdirSync(dirname(join(cwd, '.specs/a b\nc.md')), { recursive: true });
    writeFileSync(join(cwd, '.specs/a b\nc.md'), 'fixture'); git('add', '.specs');
    git('-c', 'user.name=Fixture', '-c', 'user.email=fixture@demo.invalid', 'commit', '-qm', 'addition');
    const script = resolve('scripts/release/check-paths.mjs');
    const added = spawnSync(process.execPath, [script, base, 'HEAD'], { cwd, encoding: 'utf8' });
    assert.equal(added.status, 1); assert.deepEqual(added.stderr.trim(), '".specs/a b\\nc.md"');
    const beforeDelete = git('rev-parse', 'HEAD'); git('rm', '.specs/a b\nc.md');
    git('-c', 'user.name=Fixture', '-c', 'user.email=fixture@demo.invalid', 'commit', '-qm', 'removal');
    assert.equal(spawnSync(process.execPath, [script, beforeDelete, 'HEAD'], { cwd }).status, 0);
  } finally { rmSync(cwd, { recursive: true, force: true }); }
});
