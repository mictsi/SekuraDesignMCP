/**
 * URL resolution tests.
 *
 * The whole point of `lib/urls.ts` is to be correct in deployments that cannot
 * be tried by hand — behind a TLS-terminating proxy, under a path prefix, with
 * the prefix stripped or passed through. Each case below is a real reverse-proxy
 * configuration, named for the way it is usually written.
 *
 * Run with `npm run test:urls`.
 */

import {
  joinUrl,
  normalisePath,
  normaliseBaseUrl,
  publishedUrls,
  readUrlConfig,
  resolveExternalBase,
  type RequestLike,
} from '../lib/urls.js';

let passed = 0;
const failures: string[] = [];

function eq(name: string, actual: unknown, expected: unknown): void {
  if (actual === expected) passed += 1;
  else failures.push(`${name}\n      expected: ${String(expected)}\n      actual:   ${String(actual)}`);
}

/** A request carrying the given headers. */
function req(headers: Record<string, string>, protocol = 'http'): RequestLike {
  const lower = Object.fromEntries(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v]));
  return { protocol, get: (h: string) => lower[h.toLowerCase()] };
}

/* ------------------------------------------------------------------ *
 * Normalisation
 * ------------------------------------------------------------------ */

eq('normalisePath: undefined is root', normalisePath(undefined), '');
eq('normalisePath: "/" is root', normalisePath('/'), '');
eq('normalisePath: empty is root', normalisePath(''), '');
eq('normalisePath: adds a leading slash', normalisePath('design'), '/design');
eq('normalisePath: strips a trailing slash', normalisePath('/design/'), '/design');
eq('normalisePath: strips several', normalisePath('/design///'), '/design');
eq('normalisePath: keeps nesting', normalisePath('internal/ui/sekura'), '/internal/ui/sekura');
eq('normalisePath: trims whitespace', normalisePath('  /design  '), '/design');

eq('normaliseBaseUrl: strips a trailing slash', normaliseBaseUrl('https://x.test/'), 'https://x.test');
eq('normaliseBaseUrl: leaves a bare origin', normaliseBaseUrl('https://x.test'), 'https://x.test');
eq('normaliseBaseUrl: keeps a path', normaliseBaseUrl('https://x.test/ds/'), 'https://x.test/ds');

eq('joinUrl: origin + path', joinUrl('https://x.test', '/health'), 'https://x.test/health');
eq('joinUrl: base with path', joinUrl('https://x.test/ds', '/health'), 'https://x.test/ds/health');
eq('joinUrl: root path keeps a slash', joinUrl('https://x.test/ds', '/'), 'https://x.test/ds/');
eq('joinUrl: empty base gives an absolute path', joinUrl('', '/health'), '/health');
eq('joinUrl: no double slash', joinUrl('https://x.test/ds/', '/health'), 'https://x.test/ds/health');

/* ------------------------------------------------------------------ *
 * Config
 * ------------------------------------------------------------------ */

{
  const cfg = readUrlConfig({});
  eq('config: default base path is root', cfg.basePath, '');
  eq('config: default MCP path', cfg.mcpPath, '/mcp');
  eq('config: default external URL is unset', cfg.externalUrl, '');
  eq('config: proxy trusted by default', cfg.trustProxy, true);
}
{
  const cfg = readUrlConfig({ SEKURA_MCP_PATH: '/' });
  // An MCP path of "/" would swallow the index, so it has a floor.
  eq('config: MCP path cannot be the root', cfg.mcpPath, '/mcp');
}
{
  const cfg = readUrlConfig({ SEKURA_TRUST_PROXY: 'false' });
  eq('config: proxy trust can be turned off', cfg.trustProxy, false);
}
{
  const cfg = readUrlConfig({ SEKURA_BASE_PATH: 'design/', SEKURA_EXTERNAL_URL: 'https://x.test/design/' });
  eq('config: base path normalised', cfg.basePath, '/design');
  eq('config: external URL normalised', cfg.externalUrl, 'https://x.test/design');
}

/* ------------------------------------------------------------------ *
 * Deployment shapes
 * ------------------------------------------------------------------ */

/* 1. Plain: docker run -p 8080:8080, no proxy at all. */
{
  const cfg = readUrlConfig({});
  const u = publishedUrls(cfg, req({ host: 'localhost:8080' }));
  eq('plain: base', u.base, 'http://localhost:8080');
  eq('plain: mcp', u.mcp, 'http://localhost:8080/mcp');
  eq('plain: docs has a trailing slash', u.docs, 'http://localhost:8080/docs/');
  eq('plain: stylesheet', `${u.css}sekura.css`, 'http://localhost:8080/css/sekura.css');
}

/* 2. TLS terminated upstream. The app only ever sees plain HTTP. */
{
  const cfg = readUrlConfig({});
  const u = publishedUrls(
    cfg,
    req({ host: 'app:8080', 'x-forwarded-proto': 'https', 'x-forwarded-host': 'design.example.com' })
  );
  eq('tls: scheme comes from the proxy', u.base, 'https://design.example.com');
  eq('tls: mcp is https', u.mcp, 'https://design.example.com/mcp');
}

/*
 * 3. Sub-path, prefix PASSED THROUGH.
 *
 *     location /design-system/ { proxy_pass http://app:8080/design-system/; }
 *
 * The app must both listen under the prefix and generate links under it.
 */
{
  const cfg = readUrlConfig({ SEKURA_BASE_PATH: '/design-system' });
  const u = publishedUrls(cfg, req({ host: 'example.com', 'x-forwarded-proto': 'https' }));
  eq('passthrough: listens under the prefix', cfg.basePath, '/design-system');
  eq('passthrough: base', u.base, 'https://example.com/design-system');
  eq('passthrough: mcp', u.mcp, 'https://example.com/design-system/mcp');
  eq('passthrough: docs', u.docs, 'https://example.com/design-system/docs/');
  eq('passthrough: tokens', u.tokensCss, 'https://example.com/design-system/tokens.css');
}

/*
 * 4. Sub-path, prefix STRIPPED — the case a single setting cannot express.
 *
 *     location /design-system/ { proxy_pass http://app:8080/; }
 *
 * The app sees `/health` and must keep listening at the root, while every link
 * it generates has to carry `/design-system`.
 */
{
  const cfg = readUrlConfig({ SEKURA_EXTERNAL_URL: 'https://example.com/design-system' });
  const u = publishedUrls(cfg, req({ host: 'app:8080' }));
  eq('stripped: still listens at the root', cfg.basePath, '');
  eq('stripped: links carry the prefix', u.base, 'https://example.com/design-system');
  eq('stripped: mcp', u.mcp, 'https://example.com/design-system/mcp');
  eq('stripped: docs', u.docs, 'https://example.com/design-system/docs/');
  eq('stripped: internal host never leaks', u.health.includes('app:8080'), false);
}

/* 5. Traefik / ingress-nginx announcing the prefix it stripped. */
{
  const cfg = readUrlConfig({});
  const u = publishedUrls(
    cfg,
    req({
      host: 'app:8080',
      'x-forwarded-proto': 'https',
      'x-forwarded-host': 'example.com',
      'x-forwarded-prefix': '/design-system',
    })
  );
  eq('forwarded-prefix: base', u.base, 'https://example.com/design-system');
  eq('forwarded-prefix: mcp', u.mcp, 'https://example.com/design-system/mcp');
}

/* 6. An explicit external URL outranks any header. Whoever set it meant it. */
{
  const cfg = readUrlConfig({ SEKURA_EXTERNAL_URL: 'https://cdn.example.com/ds' });
  const u = publishedUrls(
    cfg,
    req({ host: 'evil.test', 'x-forwarded-host': 'evil.test', 'x-forwarded-prefix': '/pwned' })
  );
  eq('explicit: headers cannot override it', u.base, 'https://cdn.example.com/ds');
  eq('explicit: mcp', u.mcp, 'https://cdn.example.com/ds/mcp');
}

/* 7. Proxy headers ignored when not trusted — the app is directly exposed. */
{
  const cfg = readUrlConfig({ SEKURA_TRUST_PROXY: 'false' });
  const u = publishedUrls(
    cfg,
    req({ host: 'real.test', 'x-forwarded-host': 'spoofed.test', 'x-forwarded-proto': 'https' })
  );
  eq('untrusted: forged host ignored', u.base, 'http://real.test');
}

/* 8. Deep nesting, and a custom MCP path. */
{
  const cfg = readUrlConfig({ SEKURA_BASE_PATH: '/internal/ui/sekura', SEKURA_MCP_PATH: 'rpc' });
  const u = publishedUrls(cfg, req({ host: 'example.com' }));
  eq('nested: mcp path normalised', cfg.mcpPath, '/rpc');
  eq('nested: mcp', u.mcp, 'http://example.com/internal/ui/sekura/rpc');
  eq('nested: manifest', u.manifest, 'http://example.com/internal/ui/sekura/manifest.json');
}

/* 9. No Host header at all — links stay same-origin-relative rather than broken. */
{
  const cfg = readUrlConfig({ SEKURA_BASE_PATH: '/ds' });
  const u = publishedUrls(cfg, req({}));
  eq('no host: base falls back to the path', u.base, '/ds');
  eq('no host: mcp is a usable relative URL', u.mcp, '/ds/mcp');
}

/* 10. No request at all — the startup banner, before anything is served. */
{
  const cfg = readUrlConfig({ SEKURA_EXTERNAL_URL: 'https://example.com/ds' });
  eq('no request: uses the configured URL', resolveExternalBase(cfg), 'https://example.com/ds');
  eq('no request, no config: root', resolveExternalBase(readUrlConfig({})), '');
}

/* 11. A comma-separated forwarded chain: the first entry is the client-facing one. */
{
  const cfg = readUrlConfig({});
  const u = publishedUrls(
    cfg,
    req({ host: 'app:8080', 'x-forwarded-proto': 'https, http', 'x-forwarded-host': 'example.com, inner.test' })
  );
  eq('chain: first proto wins', u.base.startsWith('https://'), true);
  eq('chain: first host wins', u.base, 'https://example.com');
}

/* ------------------------------------------------------------------ *
 * Report
 * ------------------------------------------------------------------ */

console.log('Sekura URL resolution');
console.log('='.repeat(70));
console.log(`${passed} passed, ${failures.length} failed`);
if (failures.length) {
  console.log('');
  for (const f of failures) console.log(`  ✗ ${f}`);
  process.exit(1);
}
console.log('');
console.log('Path prefixes, stripped prefixes, forwarded headers and explicit');
console.log('external URLs all resolve to the URLs a client can actually reach.');
