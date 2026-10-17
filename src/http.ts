/**
 * Streamable HTTP transport, plus the static artefacts.
 *
 * Runs stateless: a fresh server and transport per request, so there is no session
 * state to lose and the container can be scaled or restarted freely. The design
 * system is entirely read-only, so nothing is gained by keeping sessions.
 *
 * ## Publishing under a path
 *
 * Everything is mounted on a Router attached at `SEKURA_BASE_PATH`, so the same
 * image serves at `/`, at `/design-system`, or at `/internal/ui/sekura` with no
 * rebuild. Generated links come from `SEKURA_EXTERNAL_URL` when set, and from
 * validated forwarded headers otherwise — see `lib/urls.ts` for why those are two
 * separate settings rather than one.
 */

import { existsSync, readFileSync } from 'node:fs';
import { isAbsolute, resolve as resolvePath } from 'node:path';
import { fileURLToPath } from 'node:url';

import express, { type Request, type Response, type Router, type ErrorRequestHandler } from 'express';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';

import { components } from './data/components/index.js';
import { foundations } from './data/foundations.js';
import { layouts } from './data/layouts.js';
import { patterns } from './data/patterns.js';
import { auditThemes, semanticTokens, THEMES } from './data/tokens.js';
import { exportTokens } from './lib/exporters.js';
import { publishedUrls, readUrlConfig, requestBoundaryError, type RequestLike } from './lib/urls.js';
import { createServer, SERVER_NAME, SERVER_VERSION } from './server.js';

/*
 * The port inside the container. The published port is a host concern — it is
 * set on the port mapping, never in here, so there is exactly one place each
 * lives and they cannot disagree.
 */
const PORT = Number(process.env.PORT ?? 8080);
const HOST = process.env.HOST ?? '127.0.0.1';

/** Docker sets /.dockerenv; Podman sets /run/.containerenv. */
function inContainer(): boolean {
  if (existsSync('/.dockerenv') || existsSync('/run/.containerenv')) return true;
  try {
    return /docker|containerd|kubepods/.test(readFileSync('/proc/self/cgroup', 'utf8'));
  } catch {
    return false;
  }
}

/**
 * Binding a container to its own loopback is always a mistake, and it is a
 * mistake that looks fine from every angle except the one that matters.
 *
 * `-p 8080:8080` forwards to the container's *external* interface. A server
 * listening on 127.0.0.1 inside the container is not on that interface, so the
 * mapping has nothing to forward to and every connection from the host is
 * refused — while the container's own HEALTHCHECK, which probes 127.0.0.1 from
 * inside, passes. Docker then reports the container healthy and the service is
 * unreachable, which is the worst pairing available.
 *
 * Not fatal, because `--network host` is a legitimate arrangement where a
 * loopback bind does work. So: say it loudly, and name the symptom.
 */
function warnIfUnreachable(): void {
  const loopback = /^(127\.|::1$|localhost$)/.test(HOST);
  if (!loopback || !inContainer()) return;
  process.stderr.write(
    `\nWARNING: HOST is ${HOST}, and this process is running in a container.\n` +
      `A published port (-p) forwards to the container's external interface, and\n` +
      `${HOST} is not on it — so connections from the host will be refused even\n` +
      `though the container's own health check passes and Docker reports it\n` +
      `healthy. Set HOST=0.0.0.0 unless you are using --network host.\n\n`
  );
}

/**
 * Static roots. Present in the container image; when running from a source
 * checkout they may not be built yet, so each is served only if it exists and
 * the index reports honestly either way.
 */
export function readAssetRoots(env: NodeJS.ProcessEnv = process.env): { css: string; js: string; docs: string } {
  const override = env.SEKURA_ASSET_ROOT;
  if (override && !isAbsolute(override)) throw new Error('SEKURA_ASSET_ROOT must be an absolute path.');
  const root = override || fileURLToPath(new URL('../', import.meta.url));
  return { css: resolvePath(root, 'dist-css'), js: resolvePath(root, 'dist-js'), docs: resolvePath(root, 'sample') };
}

export function createHttpApp(env: NodeJS.ProcessEnv = process.env): express.Express {
  const cfg = readUrlConfig(env);
  const ROOTS = readAssetRoots(env);
  const app = express();
  app.disable('x-powered-by');
  if (cfg.trustProxy) app.set('trust proxy', cfg.trustedProxies);
  const requestContext = (req: Request): RequestLike => ({
    protocol: req.protocol,
    trustedProxy: cfg.trustProxy && !!(app.get('trust proxy fn') as (address: string, hop: number) => boolean)(req.socket.remoteAddress ?? '', 0),
    get: name => req.get(name),
  });
  app.use((req, res, next) => {
    const reason = requestBoundaryError(cfg, requestContext(req));
    if (reason) {
      process.stderr.write(`${JSON.stringify({ event: 'http_boundary_rejected', reason })}\n`);
      res.status(403).json({ error: { code: 'FORBIDDEN_REQUEST', message: 'Request host, origin or forwarding headers are not allowed.' } });
      return;
    }
    next();
  });
  // The transport envelope has its own limit. validate_markup additionally
  // bounds parsed structure and naming work so small pathological HTML is safe.
  app.use(express.json({ limit: '1mb' }));

  const api: Router = express.Router();

  /* ---------------- Health ---------------- */

  // Also runs the contrast audit, so an image built with a broken palette
  // reports unhealthy rather than serving it.
  api.get('/health', (req: Request, res: Response) => {
    const failures = auditThemes().filter((r) => !r.pass);
    const artifacts = {
      stylesheet: existsSync(resolvePath(ROOTS.css, 'sekura.css')),
      behaviours: existsSync(resolvePath(ROOTS.js, 'sekura.iife.min.js')),
      documentation: existsSync(resolvePath(ROOTS.docs, 'index.html')),
    };
    const healthy = failures.length === 0 && artifacts.stylesheet && artifacts.behaviours;
    const urls = publishedUrls(cfg, requestContext(req));
    res.status(healthy ? 200 : 503).json({
      status: healthy ? 'ok' : 'degraded',
      server: SERVER_NAME,
      version: SERVER_VERSION,
      transport: 'streamable-http',
      endpoint: urls.mcp,
      basePath: cfg.basePath || '/',
      externalUrl: urls.base,
      contentCounts: {
        components: components.length,
        foundations: foundations.length,
        patterns: patterns.length,
        layouts: layouts.length,
        semanticTokens: semanticTokens.length,
        themes: THEMES.length,
      },
      artifacts,
      requiredArtifacts: ['stylesheet', 'behaviours'],
      contrastAudit: {
        passing: failures.length === 0,
        failures: failures.length,
        detail: failures.slice(0, 5).map((f) => `${f.theme}: ${f.foreground} on ${f.background} = ${f.display}`),
      },
    });
  });

  /* ---------------- Manifest ----------------
     One machine-readable document listing every published object with its
     absolute URL. A consumer behind a proxy should read this rather than
     assemble paths by hand, because only the server knows the prefix it is
     actually reachable on. */

  api.get('/manifest.json', (req: Request, res: Response) => {
    const urls = publishedUrls(cfg, requestContext(req));
    res.json({
      name: SERVER_NAME,
      version: SERVER_VERSION,
      base: urls.base,
      endpoints: {
        mcp: { url: urls.mcp, method: 'POST', protocol: 'streamable-http' },
        health: { url: urls.health, method: 'GET' },
        manifest: { url: urls.manifest, method: 'GET' },
      },
      artefacts: {
        tokensCss: { url: urls.tokensCss, type: 'text/css', available: true },
        tokensJson: { url: urls.tokensJson, type: 'application/json', format: 'w3c-dtcg', formatVersion: '2025.10', available: true },
        stylesheet: { url: `${urls.css}sekura.css`, type: 'text/css', available: existsSync(resolvePath(ROOTS.css, 'sekura.css')) },
        stylesheets: { url: urls.css, description: 'Per-component CSS and native exports', available: existsSync(ROOTS.css) },
        behaviours: { url: `${urls.js}sekura.iife.min.js`, type: 'text/javascript', available: existsSync(resolvePath(ROOTS.js, 'sekura.iife.min.js')) },
        documentation: { url: urls.docs, type: 'text/html', available: existsSync(resolvePath(ROOTS.docs, 'index.html')) },
      },
      counts: {
        components: components.length,
        foundations: foundations.length,
        patterns: patterns.length,
        layouts: layouts.length,
        semanticTokens: semanticTokens.length,
        themes: THEMES.length,
      },
    });
  });

  /* ---------------- Token artefacts ----------------
     Generated on demand rather than read from disk, so they are correct even in
     a source checkout that has never run `emit:css`. */

  api.get('/tokens.css', (_req: Request, res: Response) => {
    res.set('Cache-Control', 'public, max-age=0, must-revalidate').type('text/css').send(exportTokens('css'));
  });

  api.get('/tokens.json', (_req: Request, res: Response) => {
    res.set('Cache-Control', 'public, max-age=0, must-revalidate').type('application/json').send(exportTokens('dtcg'));
  });

  /* ---------------- Static artefacts ----------------
     These paths are stable across upgrades and rollbacks. Revalidate them; an
     image tag does not version a browser URL. ETags still avoid unchanged transfers. */

  if (existsSync(ROOTS.css)) {
    api.use('/css', express.static(ROOTS.css, { maxAge: 0, setHeaders: res => res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate') }));
  }
  if (existsSync(ROOTS.js)) {
    api.use('/js', express.static(ROOTS.js, { maxAge: 0, setHeaders: res => res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate') }));
  }
  if (existsSync(ROOTS.docs)) {
    api.use('/docs', express.static(ROOTS.docs, { extensions: ['html'], maxAge: 0, setHeaders: res => res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate') }));
  }

  /* ---------------- Index ---------------- */

  api.get('/', (req: Request, res: Response) => {
    const u = publishedUrls(cfg, requestContext(req));
    const row = (label: string, value: string, note = '') =>
      `${label.padEnd(22)} ${value}${note ? `   ${note}` : ''}`;
    res.type('text/plain').send(
      `${SERVER_NAME} ${SERVER_VERSION}\n\n` +
        `${row('MCP endpoint (POST)', u.mcp)}\n` +
        `${row('Health', u.health)}\n` +
        `${row('Manifest', u.manifest, '— machine-readable index of everything below')}\n` +
        `${row('Token CSS', u.tokensCss)}\n` +
        `${row('Token JSON (DTCG)', u.tokensJson)}\n` +
        `${row('Stylesheets', u.css, existsSync(ROOTS.css) ? '' : '(not built)')}\n` +
        `${row('Behaviours JS', u.js, existsSync(ROOTS.js) ? '' : '(not built)')}\n` +
        `${row('Documentation', u.docs, existsSync(ROOTS.docs) ? '' : '(not built)')}\n\n` +
        `Listening under ${cfg.basePath || '/'}; links generated against ${u.base}.\n` +
        `SEKURA_BASE_PATH changes where this listens; SEKURA_EXTERNAL_URL changes\n` +
        `the links it generates. They differ when a proxy strips the prefix.\n\n` +
        `${components.length} components, ${foundations.length} foundations, ` +
        `${patterns.length} patterns, ${layouts.length} layouts, ` +
        `${semanticTokens.length} semantic tokens across ${THEMES.length} themes.\n`
    );
  });

  /* ---------------- MCP ---------------- */

  const handleMcp = async (req: Request, res: Response): Promise<void> => {
    // Stateless: a new server and transport per request. Nothing to leak, nothing
    // to lose on restart. The public URLs are passed in so tools hand out
    // fetchable links rather than paths the caller must guess a prefix for.
    const server = createServer({ urls: publishedUrls(cfg, requestContext(req)) });
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    });

    res.on('close', () => {
      void transport.close();
      void server.close();
    });

    try {
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    } catch (err) {
      process.stderr.write(`${JSON.stringify({ event: 'mcp_request_failed', error: err instanceof Error ? err.name : 'unknown' })}\n`);
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: '2.0',
          error: { code: -32603, message: 'Internal server error' },
          id: null,
        });
      }
    }
  };

  api.post(cfg.mcpPath, handleMcp);

  // Streamable HTTP is POST-only in stateless mode; be explicit rather than 404.
  const methodNotAllowed = (_req: Request, res: Response): void => {
    res.status(405).json({
      jsonrpc: '2.0',
      error: { code: -32000, message: 'This server is stateless. Use POST for MCP requests.' },
      id: null,
    });
  };
  api.get(cfg.mcpPath, methodNotAllowed);
  api.delete(cfg.mcpPath, methodNotAllowed);

  /*
   * Everything this server exposes lives on this router, and the router is
   * mounted at exactly one place. There is deliberately no route outside the
   * app path — not even a redirect from `/`. A prefixed deployment that also
   * answered at the root would be reachable by two different URLs, which is
   * how a link, a bookmark or a proxy rule ends up pointing at the one that is
   * not the real address.
   */
  app.use(cfg.basePath || '/', api);

  const errors: ErrorRequestHandler = (error, _req, res, _next) => {
    const status = error?.type === 'entity.too.large' ? 413 : error instanceof SyntaxError ? 400 : 500;
    process.stderr.write(`${JSON.stringify({ event: 'http_request_rejected', status })}\n`);
    res.status(status).json({ error: { code: status === 413 ? 'PAYLOAD_TOO_LARGE' : status === 400 ? 'INVALID_JSON' : 'INTERNAL_ERROR', message: status === 500 ? 'Internal server error.' : 'Request body is invalid or exceeds the 1 MiB limit.' } });
  };
  app.use(errors);
  return app;
}

export async function startHttpServer(): Promise<void> {
  const cfg = readUrlConfig();
  const app = createHttpApp();
  if (!Number.isInteger(PORT) || PORT < 1 || PORT > 65535) throw new Error('PORT must be an integer from 1 to 65535.');
  await new Promise<void>((done, reject) => {
    warnIfUnreachable();
    const httpServer = app.listen(PORT, HOST, () => {
      const u = publishedUrls(cfg);
      process.stderr.write(
        `${SERVER_NAME} ${SERVER_VERSION} listening on ` +
          `http://${HOST}:${PORT}${cfg.basePath}${cfg.mcpPath}\n` +
          (cfg.externalUrl ? `Generating links against ${u.base}\n` : '')
      );
      done();
    });

    httpServer.once('error', reject);
    const shutdown = (signal: string) => () => {
      process.stderr.write(`\nReceived ${signal}, shutting down.\n`);
      httpServer.close(() => process.exit(0));
      // Do not wait forever for lingering connections.
      setTimeout(() => process.exit(0), 5000).unref();
    };
    process.on('SIGTERM', shutdown('SIGTERM'));
    process.on('SIGINT', shutdown('SIGINT'));
  });
}
