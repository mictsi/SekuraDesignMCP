/** Probe each published platform by the immutable candidate image digest. */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { setTimeout as delay } from 'node:timers/promises';

const image = process.env.RELEASE_IMAGE;
const version = process.env.RELEASE_VERSION;
assert.match(image ?? '', /^ghcr\.io\/[a-z0-9._/-]+@sha256:[0-9a-f]{64}$/, 'An immutable GHCR image digest is required');
assert.ok(version, 'RELEASE_VERSION is required');
const docker = args => execFileSync('docker', args, { encoding: 'utf8', timeout: 180_000 }).trim();
const results = [];
for (const platform of ['linux/amd64', 'linux/arm64']) {
  const name = `sekura-release-${platform.split('/')[1]}`;
  let started = false;
  try {
    docker(['run', '-d', '--name', name, '--pull', 'always', '--platform', platform, '-p', '127.0.0.1::8080', image]);
    started = true;
    const binding = docker(['port', name, '8080/tcp']);
    assert.match(binding, /^127\.0\.0\.1:\d+$/);
    const base = `http://${binding}`;
    let health;
    for (let attempt = 0; attempt < 45; attempt++) {
      try {
        const response = await fetch(`${base}/health`, { signal: AbortSignal.timeout(5000) });
        if (response.ok) { health = await response.json(); break; }
      } catch { /* The container may still be starting. */ }
      await delay(1000);
    }
    assert.equal(health?.status, 'ok', `${platform}: healthy service`);
    assert.equal(health.version, version, `${platform}: release version`);
    assert.equal(health.contrastAudit?.passing, true, `${platform}: contrast audit`);
    for (const path of ['/manifest.json', '/css/sekura.css', '/js/sekura.iife.min.js', '/docs/']) {
      const response = await fetch(`${base}${path}`, { signal: AbortSignal.timeout(5000) });
      assert.equal(response.status, 200, `${platform}: ${path}`);
      assert.ok((await response.text()).length > 0, `${platform}: ${path} has content`);
    }
    const response = await fetch(`${base}/mcp`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' }), signal: AbortSignal.timeout(10_000),
    });
    assert.equal(response.status, 200, `${platform}: MCP responds`);
    const message = await response.json();
    assert.ok(message.result?.tools?.some(tool => tool.name === 'get_component'), `${platform}: MCP tool listing`);
    results.push({ platform, image, version, health: 'passed', assets: 'passed', mcp: 'passed' });
    console.log(`PASS release image: ${platform}, version ${version}, digest ${image.split('@')[1]}`);
  } catch (error) {
    if (started) console.error(docker(['logs', name]));
    throw error;
  } finally {
    if (started) docker(['rm', '-f', name]);
  }
}
writeFileSync('release-image-verification.json', JSON.stringify({ image, version, results }, null, 2) + '\n');
