/** Regression gates for tag resolution, release provenance and runtime coverage. */
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { resolveRelease } from './resolve-release.mjs';

mkdirSync('tmp', { recursive: true });
const fixture = mkdtempSync(resolve('tmp/release-policy-'));
try {
  const git = args => execFileSync('git', args, { cwd: fixture, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  git(['init', '--initial-branch=main']);
  git(['config', 'user.name', 'Sekura release fixture']);
  git(['config', 'user.email', 'fixture@example.invalid']);
  writeFileSync(join(fixture, 'package.json'), JSON.stringify({ version: '1.2.3' })); // version-check-ignore: isolated historical release fixture
  git(['add', 'package.json']); git(['commit', '-m', 'Tagged fixture']);
  const tagged = git(['rev-parse', 'HEAD']);
  git(['tag', '-a', 'v1.2.3', '-m', 'Fixture tag']);
  writeFileSync(join(fixture, 'package.json'), JSON.stringify({ version: '1.2.4' })); // version-check-ignore: a newer dispatch branch must not replace the tag
  git(['add', 'package.json']); git(['commit', '-m', 'Different dispatch branch']);
  const resolved = resolveRelease('v1.2.3', fixture);
  assert.deepEqual(resolved, { tag: 'v1.2.3', sha: tagged, version: '1.2.3' }); // version-check-ignore: assert the fixture tag's own package version
  assert.notEqual(resolved.sha, git(['rev-parse', 'HEAD']));
  git(['tag', 'v9.9.9']);
  assert.throws(() => resolveRelease('v9.9.9', fixture), /package version/);
  assert.throws(() => resolveRelease('v5.0.0', fixture), /existing commit/);
  for (const tag of ['main', '--help', 'v1.2.3\nsha=other', 'v1.2.3;false']) assert.throws(() => resolveRelease(tag, fixture));
  console.log('PASS release resolution: annotated tag commit wins over dispatch branch; invalid/missing/mismatched tags fail');

  const policy = join(fixture, 'policy');
  mkdirSync(join(policy, '.github/workflows'), { recursive: true });
  for (const path of ['package.json', 'package-lock.json', 'Dockerfile', '.nvmrc', '.github/workflows/ci.yml', '.github/workflows/release.yml']) {
    cpSync(resolve(path), join(policy, path));
  }
  const check = () => spawnSync(process.execPath, [resolve('dist/scripts/check-deps.js')], { cwd: policy, encoding: 'utf8' });
  let result = check();
  assert.equal(result.status, 0, result.stdout + result.stderr);
  const ci = readFileSync(join(policy, '.github/workflows/ci.yml'), 'utf8');
  writeFileSync(join(policy, '.github/workflows/ci.yml'), ci.replace(/node:\s*\[22,\s*24\]/g, 'node: [22]').replace(/node-version:\s*24/g, 'node-version: 22'));
  result = check();
  assert.equal(result.status, 1, 'Node type packages and release setup must not count as CI runtime coverage');
  assert.match(result.stdout, /builds on Node 24, which CI never runs/);
  console.log('PASS dependency policy: Node 24 types, engine declarations and release setup cannot mask missing CI runtime coverage');

  const workflow = readFileSync('.github/workflows/release.yml', 'utf8');
  const jobs = Object.fromEntries([...workflow.matchAll(/^  ([a-z]+):\n([\s\S]*?)(?=^  [a-z]+:\n|$(?![\s\S]))/gm)].map(match => [match[1], match[2]]));
  for (const name of ['verify', 'image', 'publish']) {
    assert.match(jobs[name], /ref: \$\{\{ needs\.resolve\.outputs\.sha \}\}/, `${name}: checkout the resolved commit`);
  }
  assert.match(jobs.publish, /needs: \[resolve, verify, image\]/);
  assert.match(jobs.publish, /tag_name: \$\{\{ needs\.resolve\.outputs\.tag \}\}/);
  assert.match(jobs.publish, /target_commitish: \$\{\{ needs\.resolve\.outputs\.sha \}\}/);
  assert.match(jobs.image, /RELEASE_IMAGE: \$\{\{ steps\.name\.outputs\.image \}\}@\$\{\{ steps\.build\.outputs\.digest \}\}/);
  assert.ok(jobs.image.indexOf('run: node src/scripts/test-release-image.mjs') < jobs.image.indexOf('Promote the verified digest'));
  assert.match(jobs.image, /build-args: SEKURA_ARTIFACT_STAGE=verified/);
  assert.match(jobs.verify, /cd dist-site && zip/);
  assert.match(jobs.pages, /name: release-site/);
  assert.doesNotMatch(jobs.pages, /npm (?:ci|run)|actions\/checkout/);
  const dockerfile = readFileSync('Dockerfile', 'utf8');
  assert.match(dockerfile, /FROM \$\{SEKURA_ARTIFACT_STAGE\} AS artifacts/);
  assert.match(dockerfile, /COPY --from=artifacts/);
  console.log('PASS release workflow policy: one SHA, explicit release tag, verified site/runtime reuse, digest probe before promotion');
} finally { rmSync(fixture, { recursive: true, force: true }); }
