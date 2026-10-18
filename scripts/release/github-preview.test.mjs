import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { main, previewItems, readOnlyGh, sanitize } from './github-preview.mjs';

const script = fileURLToPath(new URL('./github-preview.mjs', import.meta.url));

test('removes the board mirror footer and keeps the requirement text', () => {
  const text = 'Add a health endpoint.\n\n---\n_Mirrored from Hermes Kanban board `seat-sure`, task `t_ddea93fc`._';
  assert.equal(sanitize(text).text, 'Add a health endpoint.');
});

test('makes paths inside the local checkout repository-relative', () => {
  const { text } = sanitize('Baseline, identical at import to /Users/emanoel/projects/emanoelvso/seat-sure/todo.md and `/Users/emanoel/projects/emanoelvso/seat-sure/apps/api/src/main.ts`.');
  assert.equal(text, 'Baseline, identical at import to todo.md and `apps/api/src/main.ts`.');
});

test('replaces other local absolute paths without leaving the user name', () => {
  const { text } = sanitize('Log at /Users/someone/Downloads/run.log and /private/tmp/seat-sure-public-release/out.txt, also /home/dev/work/x.');
  assert.equal(text, 'Log at <local path> and <local path>, also <local path>.');
});

test('removes lines that name internal profiles or the board', () => {
  const text = 'Implement the filter.\nRecommended implementation profile after approval: seat-sure-codex.\nAdd tests.';
  assert.equal(sanitize(text).text, 'Implement the filter.\nAdd tests.');
});

test('keeps lines that state requirements, including attribution rules and repository docs', () => {
  const text = '- No tool attribution (`Co-Authored-By`, "Generated with ...") in any commit message.\n- See `docs/adrs/022-flash-sale-concurrency-hardening.md`.';
  const result = sanitize(text);
  assert.equal(result.text, text);
  assert.equal(result.changed, false);
});

test('reports tooling references for review instead of deleting them', () => {
  const text = 'Keep the spec in `.specs/features/x/spec.md`.\nRead AGENTS.md first.\nPlain line.';
  const result = sanitize(text);
  assert.equal(result.text, text);
  assert.deepEqual(result.review, [{ line: 1, text: 'Keep the spec in `.specs/features/x/spec.md`.' }, { line: 2, text: 'Read AGENTS.md first.' }]);
});

test('sanitizing twice gives the same text as sanitizing once', () => {
  const text = 'A /Users/emanoel/projects/emanoelvso/seat-sure/todo.md\nprofile seat-sure-codex\n/private/tmp/x\n\n---\n_Mirrored from Hermes Kanban board `seat-sure`, task `t_1`._\n';
  const once = sanitize(text).text;
  const twice = sanitize(once);
  assert.equal(twice.text, once);
  assert.equal(twice.changed, false);
});

test('handles missing text', () => {
  assert.deepEqual(sanitize(null), { text: '', changed: false, removed: [], review: [] });
});

test('collects titles, bodies, comments and reviews with their numbers', () => {
  const entries = previewItems('issue', [{ number: 7, title: 'Fix /Users/a/b', body: 'clean', url: 'u', comments: [{ body: 'see /private/tmp/z' }], reviews: [{ body: '' }] }]);
  assert.deepEqual(entries.map((e) => [e.number, e.field, e.after]), [[7, 'title', 'Fix <local path>'], [7, 'comment 1', 'see <local path>']]);
});

test('allows only read-only gh commands', () => {
  const calls = [];
  const run = (args) => { calls.push(args); return '[]'; };
  readOnlyGh(['issue', 'list', '--repo', 'o/r'], run);
  readOnlyGh(['pr', 'list'], run);
  readOnlyGh(['project', 'item-list', '3'], run);
  assert.equal(calls.length, 3);
  for (const args of [['issue', 'edit', '1'], ['pr', 'comment', '1'], ['api', '-X', 'PATCH', 'x'], ['project', 'item-edit']]) assert.throws(() => readOnlyGh(args, run), /not a read-only preview command/);
  assert.equal(calls.length, 3);
});

test('writes previews and a summary from fake read-only data and never edits', () => {
  const out = mkdtempSync(join(tmpdir(), 'preview-'));
  try {
    const seen = [];
    const gh = (args) => {
      seen.push(args.slice(0, 2).join(' '));
      return args[0] === 'issue' ? JSON.stringify([{ number: 1, title: 'T', body: 'x\n\n---\n_Mirrored from Hermes Kanban board `b`, task `t_1`._', url: 'https://example.test/1', comments: [] }]) : '[]';
    };
    assert.equal(main(['--repo', 'o/r', '--out', out], gh), 0);
    assert.deepEqual(seen, ['issue list', 'pr list']);
    assert.deepEqual(JSON.parse(readFileSync(join(out, 'summary.json'), 'utf8')), { repo: 'o/r', issues: 1, pullRequests: 0, board: 'not requested', texts: 1, changed: 1, reviewOnly: 0 });
    const markdown = readFileSync(join(out, 'previews.md'), 'utf8');
    assert.match(markdown, /Nothing has been changed on GitHub/);
    assert.match(markdown, /- mirror footer/);
  } finally { rmSync(out, { recursive: true, force: true }); }
});

test('exits 2 without reading anything when the output directory is missing', () => {
  const result = spawnSync(process.execPath, [script, '--repo', 'o/r'], { encoding: 'utf8' });
  assert.equal(result.status, 2);
  assert.match(result.stderr, /Usage:/);
});
