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
 * When `SEKURA_EXTERNAL_URL` is not set, links use the validated request host.
 * Forwarded headers require an explicit trusted peer allowlist and an edge that
 * overwrites those headers. Pin the external URL for a stable public address.
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
  basePath: string;
  mcpPath: string;
  externalUrl: string;
  /** Forwarded headers are opt-in and additionally require a trusted peer. */
  trustProxy: boolean;
  trustedProxies: string[];
  /** Exact hostnames, optionally with ports. Wildcards are not supported. */
  allowedHosts: string[];
  /** Exact serialized HTTP(S) origins. */
  allowedOrigins: string[];
}

function configuredPath(value: string | undefined): string {
  const path = normalisePath(value);
  if (/[\s\\?#]/.test(path) || path.includes('//') || path.split('/').some(part => part === '.' || part === '..')) throw new Error('Invalid Sekura path configuration. Use an absolute URL path without query, fragment or dot segments.');
  return path;
}

function authority(value: string): string | null {
  if (!value || /[\s\\/@?#,*]/.test(value)) return null;
  try {
    const url = new URL(`http://${value}`);
    return url.hostname && url.pathname === '/' ? value.toLowerCase() : null;
  } catch { return null; }
}

function origin(value: string): string | null {
  try {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.pathname !== '/' || url.search || url.hash) return null;
    return url.origin;
  } catch { return null; }
}

export function readUrlConfig(env: NodeJS.ProcessEnv = process.env): UrlConfig {
  const external = normaliseBaseUrl(env.SEKURA_EXTERNAL_URL);
  let externalUrl = '';
  if (external) {
    const url = new URL(external);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) throw new Error('SEKURA_EXTERNAL_URL must be an HTTP(S) URL without credentials, query or fragment.');
    configuredPath(url.pathname);
    externalUrl = normaliseBaseUrl(url.href);
  }
  const entries = (value: string | undefined): string[] => value?.split(',').map(item => item.trim()).filter(Boolean) ?? [];
  const proxy = (env.SEKURA_TRUST_PROXY ?? 'false').trim();
  // Keep the legacy switch useful for local reverse proxies without granting
  // blanket trust to every network peer.
  const trustedProxies = /^(false|0|)$/i.test(proxy) ? [] : /^true$/i.test(proxy) ? ['loopback'] : entries(proxy);
  const allowedHosts = [...new Set(['localhost', '127.0.0.1', '[::1]', ...entries(env.SEKURA_ALLOWED_HOSTS), ...(externalUrl ? [new URL(externalUrl).host] : [])])];
  if (allowedHosts.some(host => !authority(host))) throw new Error('SEKURA_ALLOWED_HOSTS must contain exact hostnames or host:port values, without wildcards.');
  const configuredOrigins = entries(env.SEKURA_ALLOWED_ORIGINS);
  if (configuredOrigins.some(value => !origin(value))) throw new Error('SEKURA_ALLOWED_ORIGINS must contain exact HTTP(S) origins.');
  return {
    basePath: configuredPath(env.SEKURA_BASE_PATH),
    mcpPath: configuredPath(env.SEKURA_MCP_PATH ?? '/mcp') || '/mcp',
    externalUrl,
    trustProxy: trustedProxies.length > 0,
    trustedProxies,
    allowedHosts: allowedHosts.map(host => host.toLowerCase()),
    allowedOrigins: [...new Set([...configuredOrigins.map(value => origin(value)!), ...(externalUrl ? [new URL(externalUrl).origin] : [])])],
  };
}

/** The server sets trustedProxy after checking the socket peer against its allowlist. */
export interface RequestLike {
  protocol?: string;
  trustedProxy?: boolean;
  get(header: string): string | undefined;
}

function forwardedHeader(cfg: UrlConfig, req: RequestLike, name: string): string | undefined {
  if (!cfg.trustProxy || !req.trustedProxy) return undefined;
  const value = req.get(name)?.trim();
  // A trusted edge must overwrite these headers. Ambiguous appended chains
  // cannot establish which entry was supplied by the client.
  if (value?.includes(',')) throw new Error('Forwarded headers must contain one value supplied by the trusted proxy.');
  return value || undefined;
}

export function resolveExternalBase(cfg: UrlConfig, req?: RequestLike): string {
  if (cfg.externalUrl) return cfg.externalUrl;
  if (!req) return cfg.basePath;
  const proto = forwardedHeader(cfg, req, 'x-forwarded-proto') ?? req.protocol ?? 'http';
  const host = forwardedHeader(cfg, req, 'x-forwarded-host') ?? req.get('host');
  const prefix = configuredPath(forwardedHeader(cfg, req, 'x-forwarded-prefix')) || cfg.basePath;
  if (!['http', 'https'].includes(proto) || (host && !authority(host))) throw new Error('Invalid request URL headers.');
  return host ? `${proto}://${host}${prefix}` : prefix;
}

function hostAllowed(cfg: UrlConfig, value: string | undefined): boolean {
  if (!value || !authority(value)) return false;
  const parsed = new URL(`http://${value}`);
  return cfg.allowedHosts.some(allowed => {
    const candidate = new URL(`http://${allowed}`);
    // A host without an explicit port permits that host on the listening port.
    const hasPort = allowed.startsWith('[') ? allowed.includes(']:') : allowed.includes(':');
    return candidate.hostname === parsed.hostname && (!hasPort || allowed === value.toLowerCase());
  });
}

/** Reject before parsing a body or exposing any endpoint. Missing Origin is valid for non-browser MCP clients. */
export function requestBoundaryError(cfg: UrlConfig, req: RequestLike): 'host' | 'origin' | 'forwarded' | null {
  if (!hostAllowed(cfg, req.get('host'))) return 'host';
  let base: string;
  try {
    const forwardedHost = forwardedHeader(cfg, req, 'x-forwarded-host');
    if (forwardedHost && !hostAllowed(cfg, forwardedHost)) return 'host';
    base = resolveExternalBase(cfg, req);
  } catch { return 'forwarded'; }
  const supplied = req.get('origin');
  if (supplied === undefined) return null;
  const normalized = origin(supplied);
  if (!normalized) return 'origin';
  if (cfg.allowedOrigins.includes(normalized)) return null;
  try { return normalized === new URL(base).origin ? null : 'origin'; }
  catch { return 'origin'; }
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
