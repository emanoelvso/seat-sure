import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

// Builds local before/after previews of GitHub issue, pull request, comment and
// board-draft text. It only reads from GitHub; nothing here edits remote content.

const mirrorFooter = /\n*-{3,}[ \t]*\n_Mirrored from [^\n]*_[ \t]*$|^_Mirrored from [^\n]*_[ \t]*$/m;
const internalLine = /^[^\n]*\b(seat-sure-codex|Hermes)\b[^\n]*\n?/gm;
const pathEnd = /(?=[.,;:!?]*(?:[\s`'")\]]|$))/.source;
const repoPath = new RegExp(`/(?:Users|home)/[^/\\s\`'")\\]]+/(?:[^\\s\`'")\\]]*?/)?seat-sure/([^\\s\`'")\\]]*?)${pathEnd}`, 'g');
const localPath = new RegExp(`(?:/(?:Users|home)/[^/\\s\`'")\\]]+|/private/tmp)(?:/[^\\s\`'")\\]]*?)?${pathEnd}`, 'g');
const toolingReference = /(\.specs\b|AGENTS\.md|CLAUDE\.md|\.claude\b|\.codex\b|\.cursor\b|\.agents\b|\.figwright\b|ai-memory|tlc-spec-driven|STATE\.md|\bAD-\d{3}\b)/;

// Removes the leak classes that are safe to remove mechanically. Lines that
// merely mention tooling may be requirements, so they stay and are reported.
export function sanitize(text) {
  const before = text ?? '';
  const removed = [];
  let after = before.replace(mirrorFooter, () => { removed.push('mirror footer'); return ''; });
  after = after.replace(internalLine, (line) => { removed.push(`internal label line: ${line.trim()}`); return ''; });
  after = after.replace(repoPath, (_, rest) => { removed.push('local path made repository-relative'); return rest; });
  after = after.replace(localPath, () => { removed.push('local path'); return '<local path>'; });
  after = after.replace(/[ \t]+$/gm, '').replace(/\n{3,}/g, '\n\n').replace(/\s+$/, before.endsWith('\n') ? '\n' : '');
  const review = after.split('\n').flatMap((line, index) => (toolingReference.test(line) ? [{ line: index + 1, text: line.trim() }] : []));
  return { text: after, changed: after !== before, removed, review };
}

// One entry per piece of text that can leak: titles, bodies, comments and reviews.
export function previewItems(kind, items) {
  const entries = [];
  for (const item of items) {
    const fields = [['title', item.title], ['body', item.body]];
    for (const [i, comment] of (item.comments ?? []).entries()) fields.push([`comment ${i + 1}`, comment.body]);
    for (const [i, review] of (item.reviews ?? []).entries()) fields.push([`review ${i + 1}`, review.body]);
    for (const [field, before] of fields) {
      if (!before) continue;
      const result = sanitize(before);
      if (result.changed || result.review.length) entries.push({ kind, number: item.number ?? null, title: item.title ?? '', url: item.url ?? null, field, before, after: result.text, changed: result.changed, removed: result.removed, review: result.review });
    }
  }
  return entries;
}

const allowedGh = [['issue', 'list'], ['pr', 'list'], ['project', 'item-list']];
export function readOnlyGh(args, run = (a) => execFileSync('gh', a, { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 })) {
  if (!allowedGh.some(([group, action]) => args[0] === group && args[1] === action)) throw new Error(`gh ${args.slice(0, 2).join(' ')} is not a read-only preview command`);
  return run(args);
}

export function renderMarkdown(entries) {
  const lines = ['# GitHub metadata cleanup previews', '', 'Local proposals only. Nothing has been changed on GitHub.', ''];
  for (const entry of entries) {
    lines.push(`## ${entry.kind} ${entry.number === null ? '(draft)' : `#${entry.number}`}: ${entry.field}`, '', `Title: ${entry.title}`, entry.url ? `URL: ${entry.url}` : '', '');
    if (entry.changed) lines.push('Removed or rewritten:', ...[...new Set(entry.removed)].map((r) => `- ${r}`), '', '### Before', '', '```text', entry.before, '```', '', '### After', '', '```text', entry.after, '```', '');
    if (entry.review.length) lines.push('Tooling references kept for maintainer review:', ...entry.review.map((r) => `- line ${r.line}: ${r.text}`), '');
  }
  return lines.join('\n');
}

function option(args, name) {
  const index = args.indexOf(name);
  return index === -1 ? undefined : args[index + 1];
}

export function main(args, gh = readOnlyGh) {
  const repo = option(args, '--repo');
  const out = option(args, '--out');
  if (!repo || !out) { process.stderr.write('Usage: node scripts/release/github-preview.mjs --repo <owner/name> --out <directory> [--project <number> --owner <login>]\n'); return 2; }
  const read = (...a) => JSON.parse(gh(a));
  const issues = read('issue', 'list', '--repo', repo, '--state', 'all', '--limit', '1000', '--json', 'number,title,body,url,comments');
  const prs = read('pr', 'list', '--repo', repo, '--state', 'all', '--limit', '1000', '--json', 'number,title,body,url,comments,reviews');
  const entries = [...previewItems('issue', issues), ...previewItems('pull request', prs)];
  let board = 'not requested';
  const project = option(args, '--project');
  if (project) {
    try {
      const drafts = read('project', 'item-list', project, '--owner', option(args, '--owner') ?? repo.split('/')[0], '--limit', '1000', '--format', 'json').items ?? [];
      entries.push(...previewItems('board item', drafts.map((item) => ({ title: item.title, body: item.content?.body ?? item.body }))));
      board = `${drafts.length} items read`;
    } catch { board = 'unavailable (read failed; check the project scope of the gh login)'; }
  }
  mkdirSync(out, { recursive: true });
  writeFileSync(join(out, 'previews.md'), renderMarkdown(entries));
  const summary = { repo, issues: issues.length, pullRequests: prs.length, board, texts: entries.length, changed: entries.filter((e) => e.changed).length, reviewOnly: entries.filter((e) => !e.changed).length };
  writeFileSync(join(out, 'summary.json'), `${JSON.stringify(summary, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify(summary)}\n`);
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) process.exitCode = main(process.argv.slice(2));
