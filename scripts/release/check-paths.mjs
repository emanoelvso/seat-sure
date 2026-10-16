import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const directories = new Set(['.specs', '.claude', '.codex', '.cursor', '.windsurf', '.agents', '.figwright']);
const files = new Set(['AGENTS.md', 'CLAUDE.md', '.ai-memory.toml', 'skills-lock.json']);

export function forbiddenPaths(diff) {
  const fields = diff.split('\0');
  const rejected = [];
  for (let i = 0; i < fields.length && fields[i];) {
    const status = fields[i++];
    let path = fields[i++];
    if (/^[RC]/.test(status)) path = fields[i++];
    if (status === 'D') continue;
    const parts = path.split('/');
    if (parts.some((part) => directories.has(part)) || files.has(parts.at(-1)) || /(^|\/)docs\/ai-memory\.md$/.test(path)) rejected.push(path);
  }
  return rejected;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [base, head = 'HEAD'] = process.argv.slice(2);
  if (!base) { process.stderr.write('Usage: node scripts/release/check-paths.mjs <base> [head]\n'); process.exit(2); }
  const diff = execFileSync('git', ['diff', '--name-status', '-z', '--find-renames', base, head], { encoding: 'utf8' });
  const rejected = forbiddenPaths(diff);
  for (const path of rejected) process.stderr.write(`${JSON.stringify(path)}\n`);
  process.exitCode = rejected.length ? 1 : 0;
}
