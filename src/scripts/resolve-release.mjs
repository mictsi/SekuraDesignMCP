/** Resolve an existing release tag once; later jobs check out this exact SHA. */
import { appendFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

export function resolveRelease(tag, cwd = process.cwd()) {
  const match = /^v((?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)(?:-[0-9A-Za-z]+(?:[.-][0-9A-Za-z]+)*)?)$/.exec(tag ?? '');
  if (!match) throw new Error('Use an existing version tag, for example v3.2.0.');
  const git = args => execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  let sha;
  try { sha = git(['rev-parse', '--verify', `refs/tags/${tag}^{commit}`]); }
  catch { throw new Error(`Release tag ${tag} does not identify an existing commit.`); }
  if (!/^[0-9a-f]{40}$/.test(sha)) throw new Error('Git returned an invalid release commit.');
  const pkg = JSON.parse(git(['show', `${sha}:package.json`]));
  if (pkg.version !== match[1]) throw new Error(`Tag ${tag} contains package version ${pkg.version}; expected ${match[1]}.`);
  return { tag, sha, version: pkg.version };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const release = resolveRelease(process.env.RELEASE_TAG);
    for (const [key, value] of Object.entries(release)) {
      console.log(`${key}: ${value}`);
      if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `${key}=${value}\n`);
    }
  } catch (error) {
    console.error(`Release resolution failed: ${error.message}`);
    process.exitCode = 1;
  }
}
