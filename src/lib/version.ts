/**
 * Single source of truth for the version.
 *
 * Read from package.json rather than duplicated as a literal. Six places
 * previously carried their own copy — server, docs site, behaviours bundle,
 * compose file, run.sh, smoke client — which is six opportunities for a release
 * to ship inconsistent numbers. `check-version.ts` enforces that nothing has
 * drifted back.
 */

import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

function findPackageJson(): string {
  // Walk up from this module so the lookup works from dist/ and from src/.
  let dir = dirname(fileURLToPath(import.meta.url));
  for (let i = 0; i < 6; i += 1) {
    const candidate = join(dir, 'package.json');
    try {
      readFileSync(candidate, 'utf8');
      return candidate;
    } catch {
      dir = resolve(dir, '..');
    }
  }
  throw new Error('Could not locate package.json for version resolution.');
}

const pkg = JSON.parse(readFileSync(findPackageJson(), 'utf8')) as {
  version: string;
  name: string;
};

export const VERSION: string = pkg.version;
export const PACKAGE_NAME: string = pkg.name;

/** Major.minor, for documentation that should not churn on every patch. */
export const MINOR_VERSION: string = VERSION.split('.').slice(0, 2).join('.');
