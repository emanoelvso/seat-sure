import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';

const ARCHITECTURE_DIR = resolve(
  __dirname,
  '../../../../../../../../../docs/architecture',
);
const C4_DIR = resolve(ARCHITECTURE_DIR, 'c4');
const VIDEO_URL = 'https://www.youtube.com/watch?v=0TMr8rsmU-k';
const PRODUCTION_WORDS =
  /production|\baws\b|\bgcp\b|azure|cloud|load balancer|kubernetes/i;

function read(path: string): string {
  return readFileSync(path, 'utf8');
}

function mermaidBlocks(markdown: string): string[] {
  return [...markdown.matchAll(/```mermaid\n([\s\S]*?)```/g)].map((m) => m[1]);
}

function hasSingleBlockOfType(markdown: string, type: string): boolean {
  const blocks = mermaidBlocks(markdown);
  return blocks.length === 1 && blocks[0].trimStart().startsWith(type);
}

function linkTargets(markdown: string): string[] {
  return [...markdown.matchAll(/\]\(([^)#]+)(?:#[^)]*)?\)/g)]
    .map((m) => m[1])
    .filter((target) => !/^https?:/.test(target));
}

function lessonRows(markdown: string): string[][] {
  return markdown
    .split('\n')
    .filter((line) => /^\| \d+ \|/.test(line))
    .map((line) =>
      line
        .split('|')
        .slice(1, -1)
        .map((cell) => cell.trim()),
    );
}

function badLessonRows(markdown: string): string[] {
  const timestampRange = /^\d{2}:\d{2}:\d{2}-\d{2}:\d{2}:\d{2}$/;
  const mapping = /ADR-\d{3}|`[a-z-]+` module|^no current mapping$/;
  return lessonRows(markdown)
    .filter((row) => !timestampRange.test(row[2]) || !mapping.test(row[3]))
    .map((row) => row[0]);
}

function firstSection(markdown: string): string {
  const [, section = ''] = markdown.split(/^## /m);
  return section;
}

describe('C4 docs structure', () => {
  describe('diagram files (C4-01, C4-02, C4-05)', () => {
    it.each([
      ['context.md', 'C4Context'],
      ['container.md', 'C4Container'],
      ['component.md', 'C4Component'],
      ['deployment.md', 'C4Deployment'],
    ])('%s holds exactly one %s block', (file, type) => {
      expect(hasSingleBlockOfType(read(resolve(C4_DIR, file)), type)).toBe(
        true,
      );
    });

    it('rejects a file with two blocks or the wrong type', () => {
      const twoBlocks =
        '```mermaid\nC4Context\n```\n```mermaid\nC4Context\n```';
      const wrongType = '```mermaid\nC4Container\n```';

      expect(hasSingleBlockOfType(twoBlocks, 'C4Context')).toBe(false);
      expect(hasSingleBlockOfType(wrongType, 'C4Context')).toBe(false);
    });

    it('context shows the buyer, Seat Sure, and the external payment gateway as planned', () => {
      const context = read(resolve(C4_DIR, 'context.md'));

      expect(context).toMatch(/Person\(buyer,/);
      expect(context).toMatch(/System\(seatSure,/);
      expect(context).toMatch(
        /System_Ext\(gateway, "Payment gateway \(planned\)"/,
      );
    });

    it('container shows web, API, PostgreSQL, and a planned Redis with labelled links', () => {
      const container = read(resolve(C4_DIR, 'container.md'));

      expect(container).toMatch(/Container\(web, "Web app", "Next\.js/);
      expect(container).toMatch(/Container\(api, "API", "NestJS/);
      expect(container).toMatch(/ContainerDb\(db, "PostgreSQL 15"/);
      expect(container).toMatch(
        /ContainerDb\(redis, "Redis \(planned\)".*\$tags="planned"/,
      );
      expect(container).toMatch(/Rel\(web, api, [^)]*"GraphQL over HTTP/);
      expect(container).toMatch(/Rel\(api, db, [^)]*"PostgreSQL protocol/);
    });

    it('deployment shows PostgreSQL 15 on 5432, the API on 3000, and a planned Redis', () => {
      const deployment = read(resolve(C4_DIR, 'deployment.md'));

      expect(deployment).toMatch(/postgres:15-alpine, port 5432/);
      expect(deployment).toMatch(/seat-sure-monolith.*port 3000/);
      expect(deployment).toMatch(
        /ContainerDb\(redis, "Redis \(planned\)".*\$tags="planned"/,
      );
    });

    it('deployment names no production host, cloud provider, or load balancer', () => {
      expect(read(resolve(C4_DIR, 'deployment.md'))).not.toMatch(
        PRODUCTION_WORDS,
      );
    });

    it('detects a production word in a fixture', () => {
      expect('Deployment_Node(lb, "Load balancer")').toMatch(PRODUCTION_WORDS);
    });
  });

  describe('README and target-state header (C4-06)', () => {
    const readme = read(resolve(C4_DIR, 'README.md'));

    it.each(['context.md', 'container.md', 'component.md', 'deployment.md'])(
      'lists %s',
      (file) => {
        expect(readme).toContain(`(./${file})`);
      },
    );

    it.each([
      '001-graphql-primary-api',
      '002-postgresql-and-redis',
      '006-modular-monolith',
      '../architecture.mmd',
    ])('links %s', (target) => {
      expect(readme).toContain(target);
    });

    it('describes architecture.mmd as target state', () => {
      expect(readme).toMatch(
        /\[architecture\.mmd\]\(\.\.\/architecture\.mmd\): .*target state/,
      );
    });

    it('links only to files that exist', () => {
      const missing = linkTargets(readme).filter(
        (target) => !existsSync(resolve(C4_DIR, target)),
      );

      expect(missing).toEqual([]);
    });

    it('starts architecture.mmd with a %% TARGET STATE comment', () => {
      const firstLine = read(
        resolve(ARCHITECTURE_DIR, 'architecture.mmd'),
      ).split('\n')[0];

      expect(firstLine).toMatch(/^%% TARGET STATE.*not the current system/);
    });
  });

  describe('scaling lessons (C4-07)', () => {
    const lessons = read(resolve(ARCHITECTURE_DIR, 'scaling-lessons.md'));

    it('names the video as the source in its first section', () => {
      expect(firstSection(lessons)).toContain(VIDEO_URL);
    });

    it('gives every lesson row a timestamp range and a mapping', () => {
      expect(lessonRows(lessons).length).toBeGreaterThan(0);
      expect(badLessonRows(lessons)).toEqual([]);
    });

    it('cites ADR-015 and the ticketing module for seat-hold lessons', () => {
      const holdRows = lessonRows(lessons).filter(
        (row) => /seat/i.test(row[1]) && /\bhold/i.test(row[1]),
      );

      expect(holdRows.length).toBeGreaterThan(0);
      for (const row of holdRows) {
        expect(row[3]).toContain('ADR-015');
        expect(row[3]).toContain('`ticketing` module');
      }
    });

    it('states the illustrative-numbers caveat', () => {
      expect(lessons).toMatch(/invented numbers for illustration/);
    });

    it('flags a row without a timestamp or without a mapping in a fixture', () => {
      const fixture = [
        '| 1 | A lesson | none | ADR-015 |',
        '| 2 | Another | 00:01:00-00:02:00 | somewhere |',
        '| 3 | Good | 00:01:00-00:02:00 | no current mapping |',
      ].join('\n');

      expect(badLessonRows(fixture)).toEqual(['1', '2']);
    });

    it('rejects a first section without the video URL in a fixture', () => {
      expect(
        firstSection(
          '# T\n\n## Source\n\nno link\n\n## Lessons\n\n' + VIDEO_URL,
        ),
      ).not.toContain(VIDEO_URL);
    });
  });
});

describe('planned tags (C4-01)', () => {
  it.each([
    ['context.md', /System_Ext\(gateway,.*\$tags="planned"\)/],
    ['context.md', /Rel\(seatSure, gateway,.*\$tags="planned"\)/],
    ['container.md', /ContainerDb\(redis,.*\$tags="planned"\)/],
    ['container.md', /Rel\(api, redis,.*\$tags="planned"\)/],
    ['deployment.md', /Rel\(api, redis,.*\$tags="planned"\)/],
  ])('%s tags %s with planned', (file, element) => {
    expect(read(resolve(C4_DIR, file))).toMatch(element);
  });
});
