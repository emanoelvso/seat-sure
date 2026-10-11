import { readdirSync, readFileSync } from 'fs';
import { resolve } from 'path';

const SHARED_KERNEL = 'shared';
const MODULE_DIR = resolve(__dirname, '../../../../..');
const COMPONENT_DOC = resolve(
  __dirname,
  '../../../../../../../../../docs/architecture/c4/component.md',
);

function listModuleDirectories(moduleDir: string): string[] {
  return readdirSync(moduleDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);
}

function listComponentIds(markdown: string): string[] {
  const block = markdown.match(/```mermaid\n([\s\S]*?)```/)?.[1] ?? '';
  return [...block.matchAll(/^\s*Component\(\s*([\w-]+)\s*,/gm)].map(
    (match) => match[1],
  );
}

function assertNoDrift(directories: string[], componentIds: string[]): void {
  const modules = directories.filter((name) => name !== SHARED_KERNEL);
  const components = componentIds.filter((id) => id !== SHARED_KERNEL);
  const missing = modules.filter((name) => !components.includes(name));
  const stale = components.filter((id) => !modules.includes(id));
  const problems = [
    ...missing.map((name) => `directory without a component: ${name}`),
    ...stale.map((id) => `component without a directory: ${id}`),
  ];
  if (problems.length > 0) {
    throw new Error(problems.join('\n'));
  }
}

describe('C4 component diagram drift guard', () => {
  it('matches the module directories in the repo', () => {
    const markdown = readFileSync(COMPONENT_DOC, 'utf8');

    expect(() =>
      assertNoDrift(
        listModuleDirectories(MODULE_DIR),
        listComponentIds(markdown),
      ),
    ).not.toThrow();
  });

  it('names a module directory that has no component', () => {
    expect(() =>
      assertNoDrift(['billing', 'catalog', 'refunds'], ['billing', 'catalog']),
    ).toThrow('directory without a component: refunds');
  });

  it('names a component that has no directory', () => {
    expect(() =>
      assertNoDrift(['billing'], ['billing', 'social-proof']),
    ).toThrow('component without a directory: social-proof');
  });

  it('does not treat the shared kernel as a module', () => {
    expect(() =>
      assertNoDrift(['billing', 'shared'], ['billing']),
    ).not.toThrow();
    expect(() =>
      assertNoDrift(['billing'], ['billing', 'shared']),
    ).not.toThrow();
  });

  it('reads component ids from the diagram, including hyphenated ones', () => {
    const markdown = [
      '```mermaid',
      'C4Component',
      '  Component(user-profile, "User Profile", "NestJS module")',
      '  Component(shared, "Shared kernel", "NestJS modules")',
      '```',
    ].join('\n');

    expect(listComponentIds(markdown)).toEqual(['user-profile', 'shared']);
  });
});
