/**
 * Dependency policy gate.
 *
 * Two rules, both of which an automated dependency bot will otherwise break:
 *
 *  1. **No pre-release dependencies.** Nothing alpha, beta, rc, canary, next,
 *     dev or insiders may end up in the tree. A design system's whole value is
 *     that consumers can trust it; shipping an artefact built against a beta
 *     compiler quietly transfers that risk to them.
 *
 *  2. **Node LTS lines only.** Node's release policy is fixed: odd-numbered
 *     majors are *never* promoted to LTS, and even-numbered ones only become
 *     LTS in the October after release. A bot that offers `node:25-alpine`
 *     is offering a runtime that will be end-of-life in months. That check is
 *     purely arithmetic, so it works offline and cannot go stale.
 *
 * It also checks that every place the project names a Node version agrees —
 * Dockerfile, both workflows, .nvmrc and `engines` — because a container built
 * on one major and tested on another tests nothing.
 *
 * Run with `npm run check:deps`.
 */

import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = process.cwd();

/**
 * The supported window, as a closed interval of even majors.
 *
 * Even majors only, because odd ones are never promoted to LTS. But "even" is
 * not sufficient on its own in either direction:
 *
 *  - **Floor.** Node 20 (Iron) left maintenance in 2026, so a build still
 *    sitting on it is running unsupported.
 *  - **Ceiling.** An even major is *Current*, not LTS, until the October after
 *    it ships. Node 26 released in August 2026 and is not LTS until that
 *    October — and `@types/node@26` was on npm within days. A floor-only check
 *    waves that through, because 26 is even and above 22. It is still a
 *    pre-LTS runtime.
 *
 * Moving either bound is a deliberate decision with a CHANGELOG entry, not
 * something a dependency bot gets to make on a Monday morning.
 */
const MIN_LTS = 22; // Jod, maintenance
const MAX_LTS = 24; // Krypton, active

/** npm dist-tags and version suffixes that mean "not finished". */
const PRERELEASE = /-(?:alpha|beta|rc|canary|next|dev|insiders|experimental|nightly|pre)\b/i;

interface Finding {
  where: string;
  text: string;
  fix: string;
}

const findings: Finding[] = [];
const notes: string[] = [];

function read(rel: string): string | null {
  const path = resolve(ROOT, rel);
  return existsSync(path) ? readFileSync(path, 'utf8') : null;
}

/* ------------------------------------------------------------------ *
 * 1. No pre-release dependencies
 * ------------------------------------------------------------------ */

interface Pkg {
  name: string;
  version: string;
  engines?: { node?: string };
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

const pkg = JSON.parse(read('package.json')!) as Pkg;
const declared: Array<[string, string]> = [
  ...Object.entries(pkg.dependencies ?? {}),
  ...Object.entries(pkg.devDependencies ?? {}),
];

for (const [name, range] of declared) {
  if (PRERELEASE.test(range)) {
    findings.push({
      where: `package.json → ${name}`,
      text: `declared range "${range}" is a pre-release`,
      fix: 'pin to a stable release',
    });
  }
}

/**
 * The declared range is only half the story — `^1.0.0` can still resolve to a
 * pre-release if the lockfile was written when one was `latest`. So the
 * *resolved* versions are checked too, which is what actually ships.
 */
const lockRaw = read('package-lock.json');
if (lockRaw) {
  const lock = JSON.parse(lockRaw) as {
    packages?: Record<string, { version?: string; dev?: boolean }>;
  };
  let resolved = 0;
  for (const [path, entry] of Object.entries(lock.packages ?? {})) {
    if (!path || !entry.version) continue;
    resolved += 1;
    if (PRERELEASE.test(entry.version)) {
      findings.push({
        where: `package-lock.json → ${path.replace(/^node_modules\//, '')}`,
        text: `resolved to pre-release ${entry.version}`,
        fix: 'npm install <pkg>@latest, or add an override',
      });
    }
  }
  notes.push(`${resolved} resolved packages in the lockfile, none pre-release`);
} else {
  findings.push({
    where: 'package-lock.json',
    text: 'missing',
    fix: 'commit the lockfile so builds are reproducible',
  });
}

/* ------------------------------------------------------------------ *
 * 2. Node LTS lines only, and consistently
 * ------------------------------------------------------------------ */

interface NodeRef {
  where: string;
  major: number;
  /** Consistency is required of the build runtime, not of `engines`. */
  pinned: boolean;
}

const nodeRefs: NodeRef[] = [];

function addRef(where: string, major: number, pinned = true): void {
  nodeRefs.push({ where, major, pinned });
}

/* Dockerfile: FROM node:<major>-alpine */
const dockerfile = read('Dockerfile');
if (dockerfile) {
  for (const m of dockerfile.matchAll(/^FROM\s+node:(\d+)[.\d]*-/gm)) {
    addRef('Dockerfile', Number(m[1]));
  }
}

/* Workflows: node-version: <major> */
for (const wf of ['.github/workflows/ci.yml', '.github/workflows/release.yml']) {
  const content = read(wf);
  if (!content) continue;
  // Both the scalar form and the matrix list form.
  for (const m of content.matchAll(/node-version:\s*(?:\[([^\]]*)\]|(\d+))/g)) {
    const list = m[1] ? m[1].split(',') : [m[2]!];
    for (const v of list) {
      const major = Number(String(v).trim().replace(/['"]/g, ''));
      if (Number.isFinite(major)) addRef(wf, major, false);
    }
  }
  for (const m of content.matchAll(/node-version:\s*\$\{\{\s*matrix\.node\s*\}\}/g)) {
    void m; // resolved from the matrix list above
  }
  for (const m of content.matchAll(/^\s*node:\s*\[([^\]]*)\]/gm)) {
    for (const v of m[1]!.split(',')) {
      const major = Number(v.trim().replace(/['"]/g, ''));
      if (Number.isFinite(major)) addRef(wf, major, false);
    }
  }
}

/* .nvmrc */
const nvmrc = read('.nvmrc');
if (nvmrc) {
  const major = Number(nvmrc.trim().replace(/^v/, '').split('.')[0]);
  if (Number.isFinite(major)) addRef('.nvmrc', major);
}

/* engines.node — a floor, so only the floor itself must be an LTS line. */
const enginesRange = pkg.engines?.node;
if (enginesRange) {
  const m = /(\d+)/.exec(enginesRange);
  if (m) addRef('package.json → engines.node', Number(m[1]), false);
}

/* @types/node must track the Node line, or the types describe a different runtime. */
const typesNode = pkg.devDependencies?.['@types/node'];
if (typesNode) {
  const m = /(\d+)/.exec(typesNode);
  if (m) addRef('package.json → @types/node', Number(m[1]), false);
}

for (const ref of nodeRefs) {
  if (ref.major % 2 !== 0) {
    findings.push({
      where: ref.where,
      text: `Node ${ref.major} is an odd-numbered major`,
      fix: 'odd majors never become LTS — use the nearest even LTS line',
    });
  } else if (ref.major < MIN_LTS) {
    findings.push({
      where: ref.where,
      text: `Node ${ref.major} is below the supported floor`,
      fix: `use Node ${MIN_LTS} or newer`,
    });
  } else if (ref.major > MAX_LTS) {
    findings.push({
      where: ref.where,
      text: `Node ${ref.major} has not reached LTS yet`,
      fix:
        `an even major is Current, not LTS, until the October after it ships — ` +
        `use Node ${MAX_LTS}, or raise MAX_LTS once ${ref.major} is promoted`,
    });
  }
}

/* The runtime the image builds on must be one the workflows actually test. */
const pinnedMajors = [...new Set(nodeRefs.filter((r) => r.pinned).map((r) => r.major))];
const testedMajors = [...new Set(nodeRefs.filter((r) => !r.pinned).map((r) => r.major))];
for (const major of pinnedMajors) {
  if (testedMajors.length > 0 && !testedMajors.includes(major)) {
    findings.push({
      where: nodeRefs.find((r) => r.pinned && r.major === major)!.where,
      text: `builds on Node ${major}, which CI never runs`,
      fix: `add ${major} to the CI matrix, or build on one of: ${testedMajors.join(', ')}`,
    });
  }
}

if (nodeRefs.length > 0) {
  notes.push(
    `Node references: ${nodeRefs.map((r) => `${r.major} (${r.where})`).join(', ')}`
  );
}

/* ------------------------------------------------------------------ *
 * 3. GitHub Actions must be pinned to a major, not a floating branch
 * ------------------------------------------------------------------ */

for (const wf of ['ci.yml', 'release.yml']) {
  const content = read(join('.github/workflows', wf));
  if (!content) continue;
  for (const m of content.matchAll(/uses:\s*([\w.-]+\/[\w.-]+)@([^\s#]+)/g)) {
    const [, action, ref] = m as unknown as [string, string, string];
    if (/^v\d+(\.\d+){0,2}$/.test(ref)) continue; // v4, v4.1, v4.1.0
    if (/^[0-9a-f]{40}$/.test(ref)) continue; // a full commit SHA
    findings.push({
      where: `.github/workflows/${wf} → ${action}`,
      text: `pinned to "${ref}"`,
      fix: 'pin to a version tag or a commit SHA, never a branch',
    });
  }
}

/* ------------------------------------------------------------------ *
 * Report
 * ------------------------------------------------------------------ */

console.log('Sekura dependency policy');
console.log('='.repeat(70));
for (const note of notes) console.log(`  ${note}`);

if (findings.length === 0) {
  console.log('');
  console.log(
    `No pre-release dependencies, and every Node reference is an LTS line ` +
      `(${MIN_LTS}–${MAX_LTS}).`
  );
  process.exit(0);
}

console.log('');
console.log('Policy violations:');
for (const f of findings) {
  console.log(`  ${f.where}`);
  console.log(`      ${f.text}`);
  console.log(`      → ${f.fix}`);
}
console.log('');
console.log(`${findings.length} violation(s).`);
process.exit(1);
