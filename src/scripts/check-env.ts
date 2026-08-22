/**
 * Environment documentation gate.
 *
 * `.env.example` is the one place a deployer looks to find out what they can
 * set. That only holds while it is complete, and nothing keeps it complete on
 * its own: a variable added to the server in one commit and forgotten here is
 * invisible until somebody needs it and cannot find it.
 *
 * So the gate runs both directions:
 *
 *  - Every variable the code reads must be documented, or it is undiscoverable.
 *  - Every variable documented must be read by something, or it is a lie — a
 *    setting someone will set, restart for, and watch do nothing.
 *
 * Run with `npm run check:env`.
 */

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = process.cwd();

/**
 * Read but deliberately undocumented, with the reason.
 *
 * `.env.example` is for deploying the container. A switch that only exists to
 * make a test suite skip a browser is noise there, and documenting it would
 * invite someone to set it in production.
 */
const NOT_DEPLOYMENT_SETTINGS = new Map<string, string>([
  ['SEKURA_PLAYWRIGHT', 'test-only: selects the Playwright binary in CI'],
  ['SEKURA_ENV_FILE', 'bootstrap: names the env file itself, so it cannot live inside it'],
  ['NO_COLOR', 'a de facto standard read by run.sh, not a Sekura setting'],
]);

/**
 * Variables that must never appear in `.env.example`.
 *
 * `.env` is read by the host tooling as well as the container, so a setting
 * that changes how the host's toolchain behaves is a trap rather than a
 * configuration option. `NODE_ENV=production` is the one that bit: it makes
 * npm omit devDependencies, so the next install silently removes the compiler
 * and the build fails with "tsc: not found" — an error pointing nowhere near
 * the file that caused it.
 */
const NEVER_IN_ENV_FILE = new Map<string, string>([
  [
    'NODE_ENV',
    'it makes npm omit devDependencies, so the next install strips the compiler. ' +
      'The Dockerfile sets it for the container, which is the only place it means anything',
  ],
  ['PATH', 'overriding the host PATH from a config file breaks every tool at once'],
  ['NPM_CONFIG_PRODUCTION', 'same failure as NODE_ENV, by a different name'],
]);

interface Finding {
  variable: string;
  problem: string;
  fix: string;
}

const findings: Finding[] = [];

/* ------------------------------------------------------------------ *
 * What the code reads
 * ------------------------------------------------------------------ */

/** `process.env.X`, and `env.X` where `env` is a NodeJS.ProcessEnv parameter. */
const TS_READ = /(?:process\.)?env\.([A-Z_][A-Z0-9_]*)/g;
/** `${VAR}` / `$VAR` in shell, and `${VAR:-default}`. */
const SH_READ = /\$\{([A-Z_][A-Z0-9_]*)(?::-[^}]*)?\}/g;
/** `VAR: ...` and `${VAR}` in compose; `ENV VAR=` in a Dockerfile. */
const DOCKER_ENV = /^ENV\s+([A-Z_][A-Z0-9_]*)=|\\\s*\n\s+([A-Z_][A-Z0-9_]*)=/gm;

const readers = new Map<string, Set<string>>();

function note(variable: string, where: string): void {
  if (!readers.has(variable)) readers.set(variable, new Set());
  readers.get(variable)!.add(where);
}

function scanTs(dir: string): void {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      scanTs(full);
      continue;
    }
    if (!/\.(ts|mjs|js)$/.test(entry)) continue;
    // This file names variables in order to talk about them.
    if (full.endsWith('check-env.ts')) continue;
    const src = readFileSync(full, 'utf8');
    for (const m of src.matchAll(TS_READ)) note(m[1]!, `src/${entry}`);
  }
}

scanTs(resolve(ROOT, 'src'));

/**
 * A shell variable the script assigns is a local, not configuration.
 * `MCP_PORT="${SEKURA_PORT:-8080}"` reads one setting and defines one local;
 * only the first is something a deployer can set.
 */
for (const file of ['run.sh']) {
  const path = resolve(ROOT, file);
  if (!existsSync(path)) continue;
  const src = readFileSync(path, 'utf8');
  const assigned = new Set<string>();
  for (const m of src.matchAll(/^\s*(?:local\s+|export\s+|declare\s+)?([A-Z_][A-Z0-9_]*)=/gm)) {
    assigned.add(m[1]!);
  }
  for (const m of src.matchAll(SH_READ)) {
    if (assigned.has(m[1]!)) continue;
    note(m[1]!, file);
  }
}

for (const file of ['docker-compose.yml', 'Dockerfile']) {
  const path = resolve(ROOT, file);
  if (!existsSync(path)) continue;
  const src = readFileSync(path, 'utf8');
  for (const m of src.matchAll(SH_READ)) note(m[1]!, file);
  for (const m of src.matchAll(DOCKER_ENV)) note((m[1] ?? m[2])!, file);
}

/* Shell built-ins and colour variables are not configuration. */
const SHELL_NOISE =
  /^(BASH_SOURCE|RED|GREEN|YELLOW|BLUE|BOLD|DIM|RESET|IFS|PWD|HOME|PATH|USER|SHELL|GITHUB_[A-Z_]+)$/;
for (const key of [...readers.keys()]) {
  if (SHELL_NOISE.test(key)) readers.delete(key);
}

/* ------------------------------------------------------------------ *
 * What the example documents
 * ------------------------------------------------------------------ */

const examplePath = resolve(ROOT, '.env.example');
if (!existsSync(examplePath)) {
  console.error('.env.example is missing. It is the only documentation of what can be set.');
  process.exit(1);
}

const documented = new Set<string>();
for (const line of readFileSync(examplePath, 'utf8').split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const eq = trimmed.indexOf('=');
  if (eq === -1) continue;
  documented.add(trimmed.slice(0, eq).trim());

  /* `docker run --env-file` passes values through verbatim, quotes included, so
     a quoted value becomes part of the string. Compose strips them and Docker
     does not, which makes this the kind of bug that only appears in one of the
     two ways the project documents starting the container. */
  const name = trimmed.slice(0, eq).trim();
  const banned = NEVER_IN_ENV_FILE.get(name);
  if (banned) {
    findings.push({
      variable: name,
      problem: 'must not be in .env.example',
      fix: banned,
    });
  }

  const value = trimmed.slice(eq + 1).trim();
  if (/^".*"$|^'.*'$/.test(value)) {
    findings.push({
      variable: trimmed.slice(0, eq).trim(),
      problem: 'the value is quoted',
      fix: 'docker run --env-file keeps the quotes as part of the value — remove them',
    });
  }
}

/* ------------------------------------------------------------------ *
 * Both directions
 * ------------------------------------------------------------------ */

for (const [variable, where] of readers) {
  if (documented.has(variable)) continue;
  if (NOT_DEPLOYMENT_SETTINGS.has(variable)) continue;
  // Banned from the file by name, so "undocumented" is the intended state.
  if (NEVER_IN_ENV_FILE.has(variable)) continue;
  findings.push({
    variable,
    problem: `read by ${[...where].sort().join(', ')} but not in .env.example`,
    fix: 'document it, or add it to NOT_DEPLOYMENT_SETTINGS with a reason',
  });
}

for (const variable of documented) {
  if (NEVER_IN_ENV_FILE.has(variable)) continue; // already reported above
  if (readers.has(variable)) continue;
  findings.push({
    variable,
    problem: 'documented in .env.example but nothing reads it',
    fix: 'remove it — a setting that does nothing is worse than an undocumented one',
  });
}

/* ------------------------------------------------------------------ *
 * Report
 * ------------------------------------------------------------------ */

console.log('Sekura environment documentation');
console.log('='.repeat(70));
console.log(`  ${documented.size} documented, ${readers.size} read by code`);
for (const [v, why] of NOT_DEPLOYMENT_SETTINGS) {
  if (readers.has(v)) console.log(`  ${v} deliberately undocumented — ${why}`);
}

if (findings.length === 0) {
  console.log('');
  console.log('.env.example documents every setting, and every setting it lists is read.');
  process.exit(0);
}

console.log('');
console.log('Problems:');
for (const f of findings) {
  console.log(`  ${f.variable}`);
  console.log(`      ${f.problem}`);
  console.log(`      → ${f.fix}`);
}
console.log('');
console.log(`${findings.length} problem(s).`);
process.exit(1);
