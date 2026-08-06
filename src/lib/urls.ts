/**
 * Where this server thinks it lives.
 *
 * Two different questions get confused constantly, so they are two separate
 * settings here:
 *
 *   1. **Where does the container listen?**  `SEKURA_BASE_PATH`.
 *      If you mount the app at `/design-system` and your proxy passes the whole
 *      path through, the app must answer on `/design-system/health`.
 *
 *   2. **What does the outside world see?**  `SEKURA_EXTERNAL_URL`.
 *      The public origin and path, used to *generate* links. Behind a proxy
 *      that terminates TLS this differs from what the app can observe: the app
 *      sees plain HTTP on port 8080 and a private hostname.
 *
 * They are equal in the simple case and different in the common one. A proxy
 * configured with `proxy_pass http://app:8080/` **strips** the prefix, so the
 * app must listen at `/` (base path unset) while still generating links under
 * `https://example.com/design-system` (external URL set). Collapsing these into
 * one variable makes that configuration impossible to express.
 *
 * When `SEKURA_EXTERNAL_URL` is not set, links are derived per request from
 * `X-Forwarded-Proto`, `X-Forwarded-Host` and `X-Forwarded-Prefix`, falling back
 * to the request's own host. That covers Traefik and most ingress controllers
 * with no configuration at all.
 */

/** Trim to a leading-slash, no-trailing-slash form. `/` becomes `''`. */
export function normalisePath(input: string | undefined | null): string {
  if (!input) return '';
  let p = String(input).trim();
  if (!p || p === '/') return '';
  if (!p.startsWith('/')) p = `/${p}`;
  while (p.endsWith('/')) p = p.slice(0, -1);
  return p;
}

/** Strip a trailing slash from an origin or absolute base URL. */
export function normaliseBaseUrl(input: string | undefined | null): string {
  if (!input) return '';
  let u = String(input).trim();
  while (u.endsWith('/')) u = u.slice(0, -1);
  return u;
}

export interface UrlConfig {
  /** Path prefix this process serves under. `''` means the root. */
  basePath: string;
  /** MCP endpoint, relative to `basePath`. Always starts with `/`. */
  mcpPath: string;
  /** Configured public base URL, or `''` to derive per request. */
  externalUrl: string;
  /** Honour `X-Forwarded-*`. Disable if the app is directly exposed. */
  trustProxy: boolean;
}

export function readUrlConfig(env: NodeJS.ProcessEnv = process.env): UrlConfig {
  const mcp = normalisePath(env.SEKURA_MCP_PATH ?? '/mcp');
  return {
    basePath: normalisePath(env.SEKURA_BASE_PATH),
    // An empty MCP path would collide with the index, so it has a floor.
    mcpPath: mcp || '/mcp',
    externalUrl: normaliseBaseUrl(env.SEKURA_EXTERNAL_URL),
    trustProxy: (env.SEKURA_TRUST_PROXY ?? 'true').toLowerCase() !== 'false',
  };
}

/** The subset of a request this module needs, so it can be tested without express. */
export interface RequestLike {
  protocol?: string;
  get(header: string): string | undefined;
}

/**
 * The absolute base URL to build links from, for one request.
 *
 * `SEKURA_EXTERNAL_URL` wins outright when set — it is an explicit statement by
 * whoever deployed this, and no header should override it.
 */
export function resolveExternalBase(cfg: UrlConfig, req?: RequestLike): string {
  if (cfg.externalUrl) return cfg.externalUrl;
  if (!req) return cfg.basePath;

  const forwarded = (name: string): string | undefined =>
    cfg.trustProxy ? req.get(name)?.split(',')[0]?.trim() : undefined;

  const proto = forwarded('x-forwarded-proto') ?? req.protocol ?? 'http';
  const host = forwarded('x-forwarded-host') ?? req.get('host');
  // Traefik and ingress-nginx send the prefix they stripped.
  const prefix = normalisePath(forwarded('x-forwarded-prefix')) || cfg.basePath;

  // No Host header at all (HTTP/1.0, or a synthetic request) — fall back to a
  // path-only base, which still produces working same-origin links.
  if (!host) return prefix;
  return `${proto}://${host}${prefix}`;
}

/** Join a base and a path without doubling or dropping the separator. */
export function joinUrl(base: string, path: string): string {
  const p = path === '/' ? '/' : normalisePath(path);
  const b = normaliseBaseUrl(base);
  if (!b) return p || '/';
  return p === '/' ? `${b}/` : `${b}${p}`;
}

/** Every object this server publishes, relative to the base. */
export const PUBLISHED_PATHS = {
  index: '/',
  health: '/health',
  manifest: '/manifest.json',
  tokensCss: '/tokens.css',
  tokensJson: '/tokens.json',
  css: '/css',
  js: '/js',
  docs: '/docs',
} as const;

export interface PublishedUrls {
  base: string;
  index: string;
  health: string;
  manifest: string;
  mcp: string;
  tokensCss: string;
  tokensJson: string;
  css: string;
  js: string;
  docs: string;
}

export function publishedUrls(cfg: UrlConfig, req?: RequestLike): PublishedUrls {
  const base = resolveExternalBase(cfg, req);
  return {
    base: base || '/',
    index: joinUrl(base, PUBLISHED_PATHS.index),
    health: joinUrl(base, PUBLISHED_PATHS.health),
    manifest: joinUrl(base, PUBLISHED_PATHS.manifest),
    mcp: joinUrl(base, cfg.mcpPath),
    tokensCss: joinUrl(base, PUBLISHED_PATHS.tokensCss),
    tokensJson: joinUrl(base, PUBLISHED_PATHS.tokensJson),
    css: `${joinUrl(base, PUBLISHED_PATHS.css)}/`,
    js: `${joinUrl(base, PUBLISHED_PATHS.js)}/`,
    docs: `${joinUrl(base, PUBLISHED_PATHS.docs)}/`,
  };
}
