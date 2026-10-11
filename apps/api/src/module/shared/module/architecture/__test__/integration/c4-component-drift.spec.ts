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

type Edge = string;

function listRelationships(markdown: string): Edge[] {
  const block = markdown.match(/```mermaid\n([\s\S]*?)```/)?.[1] ?? '';
  return [...block.matchAll(/^\s*Rel\(\s*([\w-]+)\s*,\s*([\w-]+)\s*,/gm)].map(
    (match) => `${match[1]} -> ${match[2]}`,
  );
}

function toKebab(camel: string): string {
  return camel.replace(/([A-Z])/g, '-$1').toLowerCase();
}

// An edge A -> B exists where A's `<A>.module.ts` imports B's Nest module.
function listModuleImports(moduleDir: string, directory: string): Edge[] {
  const source = readFileSync(
    resolve(moduleDir, directory, `${directory}.module.ts`),
    'utf8',
  );
  return [...source.matchAll(/from '@(\w+)Module\/[\w-]+\.module'/g)]
    .map((match) => toKebab(match[1]))
    .filter((target) => target !== directory)
    .map((target) => `${directory} -> ${target}`);
}

function assertNoRelationshipDrift(expected: Edge[], drawn: Edge[]): void {
  const problems = [
    ...expected
      .filter((edge) => !drawn.includes(edge))
      .map((edge) => `import without a relationship: ${edge}`),
    ...drawn
      .filter((edge) => !expected.includes(edge))
      .map((edge) => `relationship without an import: ${edge}`),
  ];
  if (problems.length > 0) {
    throw new Error(problems.join('\n'));
  }
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

  describe('relationships', () => {
    it('match the module imports in the repo', () => {
      const markdown = readFileSync(COMPONENT_DOC, 'utf8');
      const expected = listModuleDirectories(MODULE_DIR)
        .filter((name) => name !== SHARED_KERNEL)
        .flatMap((name) => listModuleImports(MODULE_DIR, name));

      expect(expected.length).toBeGreaterThan(0);
      expect(() =>
        assertNoRelationshipDrift(expected, listRelationships(markdown)),
      ).not.toThrow();
    });

    it('names an import that has no relationship', () => {
      expect(() =>
        assertNoRelationshipDrift(
          ['ticketing -> billing', 'ticketing -> catalog'],
          ['ticketing -> billing'],
        ),
      ).toThrow('import without a relationship: ticketing -> catalog');
    });

    it('names a relationship that has no import', () => {
      expect(() =>
        assertNoRelationshipDrift(
          ['ticketing -> billing'],
          ['ticketing -> billing', 'ticketing -> user-profile'],
        ),
      ).toThrow('relationship without an import: ticketing -> user-profile');
    });

    it('treats a reversed relationship as a missing and an extra one', () => {
      expect(() =>
        assertNoRelationshipDrift(
          ['identity -> user-profile'],
          ['user-profile -> identity'],
        ),
      ).toThrow(
        'import without a relationship: identity -> user-profile\nrelationship without an import: user-profile -> identity',
      );
    });

    it('reads Rel pairs from the diagram, including hyphenated ids', () => {
      const markdown = [
        '```mermaid',
        'C4Component',
        '  Rel(identity, user-profile, "Imports module")',
        '```',
      ].join('\n');

      expect(listRelationships(markdown)).toEqual(['identity -> user-profile']);
    });
  });
});
