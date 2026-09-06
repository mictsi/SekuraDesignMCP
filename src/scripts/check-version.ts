/**
 * Fails the build when a version literal has drifted from package.json.
 *
 * The version used to be hard-coded in six places. Each is now derived, and this
 * gate stops one creeping back — the same reasoning as the contrast audit: a
 * promise the build does not check is a promise that eventually breaks.
 *
 * Run with `npm run check:version`.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

import { VERSION } from '../lib/version.js';

const ROOT = process.cwd();

/** Files that legitimately mention a version, and why. */
const ALLOWED = new Set([
  'package.json', // the source of truth
  'package-lock.json',
  'CHANGELOG.md', // historical entries
  'src/lib/version.ts',
  'src/scripts/check-version.ts', // this file describes the pattern it looks for
]);

interface Finding {
  file: string;
  line: number;
  text: string;
}

const findings: Finding[] = [];

/**
 * A string literal that is *entirely* a bare semver.
 *
 * Deliberately narrow. An earlier version flagged any semver-looking number
 * anywhere and produced 102 findings — WCAG criteria ("2.4.11"), example IPs
 * ("192.0.2.10"), ECMAScript years. A gate that cries wolf gets ignored, which
 * makes it worse than no gate. Only a quoted literal whose whole content is a
 * version can be a hard-coded product version.
 */
const QUOTED_SEMVER = /(['"`])(\d+\.\d+\.\d+(?:-[\w.]+)?)\1/g;

function scan(dir: string): void {
  for (const entry of readdirSync(dir)) {
    if (
      entry === 'node_modules' || entry === '.git' || entry === 'dist' ||
      entry === 'dist-react' || entry === 'dist-design-kit' ||
      entry === 'dist-css' || entry === 'dist-js' || entry === '.run' ||
      entry === 'sample' || entry === '.github'
    ) {
      continue;
    }
    const full = join(dir, entry);
    const rel = relative(ROOT, full);
    if (statSync(full).isDirectory()) {
      scan(full);
      continue;
    }
    if (!/\.(ts|mjs|js)$/.test(entry)) continue;
    if (ALLOWED.has(rel)) continue;

    readFileSync(full, 'utf8').split('\n').forEach((line, i) => {
      // Dependency ranges are not our version.
      if (/["']\^|["']~|>=/.test(line)) return;
      // Explicit opt-out for the handful of legitimate literals.
      if (line.includes('version-check-ignore')) return;
      for (const m of line.matchAll(QUOTED_SEMVER)) {
        findings.push({ file: rel, line: i + 1, text: `hard-coded version ${m[0]}` });
      }
    });
  }
}

/* The container tag must match, or a release ships an image nobody can find. */
function checkImageTags(): void {
  for (const file of ['docker-compose.yml']) {
    let content: string;
    try {
      content = readFileSync(resolve(ROOT, file), 'utf8');
    } catch {
      continue;
    }
    for (const m of content.matchAll(/sekura-design-mcp:([\w.$${}:-]+)/g)) {
      const tag = m[1];
      // A shell/compose interpolation is exactly what we want to see.
      if (!tag || tag.includes('$') || tag === 'latest') continue;
      if (tag !== VERSION) {
        findings.push({ file, line: 0, text: `image tag ${tag} != ${VERSION}` });
      }
    }
  }
}

scan(ROOT);
checkImageTags();

console.log('Sekura version check');
console.log('='.repeat(70));
console.log(`package.json version: ${VERSION}`);

if (findings.length === 0) {
  console.log('\nNo stale version literals. Everything derives from package.json.');
  process.exit(0);
}

console.log('\nStale or conflicting version literals:');
for (const f of findings) {
  console.log(`  ${f.file}${f.line ? `:${f.line}` : ''}  ${f.text}`);
}
console.log(`\n${findings.length} finding(s). Derive from src/lib/version.ts instead of hard-coding.`);
process.exit(1);
