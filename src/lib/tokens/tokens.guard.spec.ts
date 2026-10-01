import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

/**
 * Architectural guard for the token layer.
 *
 * The kit's theming only works while components consume semantic roles: one
 * hard-coded colour or one primitive reference in a component stylesheet and the
 * second theme silently stops covering that component. This test fails on the
 * first regression instead of waiting for someone to notice a badge that did not
 * go dark.
 *
 * Stylesheets are read as source text, not compiled CSS, so the check runs
 * against what a reviewer reads in the diff.
 */
const ROOT = process.cwd();
const SRC = join(ROOT, 'src');
const TOKEN_DIR = join(SRC, 'lib', 'tokens');
const PRIMITIVES = join(TOKEN_DIR, '_primitives.scss');
const COLOUR_LITERAL = /#[0-9a-fA-F]{3,8}\b|\brgba?\(|\bhsla?\(/;

function collectScss(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    return statSync(path).isDirectory() ? collectScss(path) : entry.endsWith('.scss') ? [path] : [];
  });
}

/**
 * Comments are documentation, not style: prose that mentions an anti-pattern
 * must not fail the guard. Newlines are preserved so line numbers stay useful.
 */
function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, (comment) => comment.replace(/[^\n]/g, ' '))
    .replace(/\/\/[^\n]*/g, (comment) => ' '.repeat(comment.length));
}

function readSource(file: string): string {
  return stripComments(readFileSync(file, 'utf8'));
}

function matches(file: string, pattern: RegExp): string[] {
  return readSource(file)
    .split('\n')
    .flatMap((line, index) =>
      pattern.test(line) ? [`${relative(ROOT, file)}:${index + 1}  ${line.trim()}`] : [],
    );
}

/** Body of a mixin; the token mixins contain no nested blocks. */
function mixinBody(source: string, mixin: string): string {
  const marker = `@mixin ${mixin}`;
  const start = source.indexOf(marker);
  expect(start, `mixin ${mixin} not found`).toBeGreaterThan(-1);
  const open = source.indexOf('{', start);
  return source.slice(open, source.indexOf('\n}', open));
}

const allScss = collectScss(SRC);
const consumerScss = allScss.filter((file) => !file.startsWith(TOKEN_DIR));
const tokenScss = allScss.filter((file) => file.startsWith(TOKEN_DIR));

const FORBIDDEN = [
  { what: 'colour literal', pattern: COLOUR_LITERAL },
  { what: 'primitive colour token', pattern: /var\(--cw-(gray|blue|green|amber|red)-\d/ },
  { what: '!important', pattern: /!important/ },
  { what: '::ng-deep', pattern: /::ng-deep/ },
];

describe('token layer guard', () => {
  it('finds stylesheets to check', () => {
    expect(consumerScss.length).toBeGreaterThan(0);
    expect(tokenScss.length).toBeGreaterThan(0);
  });

  it('keeps component and app styles on semantic roles', () => {
    const offences = consumerScss.flatMap((file) =>
      FORBIDDEN.flatMap(({ what, pattern }) =>
        matches(file, pattern).map((hit) => `${what} -> ${hit}`),
      ),
    );

    expect(offences).toEqual([]);
  });

  it('only allows colour literals in the primitives file', () => {
    const offences = tokenScss
      .filter((file) => file !== PRIMITIVES)
      .flatMap((file) => matches(file, COLOUR_LITERAL));

    expect(offences).toEqual([]);
  });

  it('defines the same colour roles in every theme', () => {
    const roles = (file: string, mixin: string): string[] =>
      mixinBody(readSource(file), mixin).match(/--cw-color-[\w-]+:/g) ?? [];

    const light = roles(join(TOKEN_DIR, '_semantic.scss'), 'cw-tokens-light');
    const dark = roles(join(TOKEN_DIR, '_themes.scss'), 'cw-tokens-dark');

    expect(light.length).toBeGreaterThan(0);
    expect([...dark].sort()).toEqual([...light].sort());
  });
});
