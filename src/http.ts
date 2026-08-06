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
 * the forwarded headers otherwise — see `lib/urls.ts` for why those are two
 * separate settings rather than one.
 */

import { existsSync } from 'node:fs';
import { resolve as resolvePath } from 'node:path';

import express, { type Request, type Response, type Router } from 'express';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';

import { components } from './data/components/index.js';
import { foundations } from './data/foundations.js';
import { layouts } from './data/layouts.js';
import { patterns } from './data/patterns.js';
import { auditThemes, semanticTokens, THEMES } from './data/tokens.js';
import { exportTokens } from './lib/exporters.js';
import { publishedUrls, readUrlConfig } from './lib/urls.js';
import { createServer, SERVER_NAME, SERVER_VERSION } from './server.js';

const PORT = Number(process.env.PORT ?? process.env.SEKURA_MCP_PORT ?? 8080);
const HOST = process.env.HOST ?? '0.0.0.0';

/**
 * Static roots. Present in the container image; when running from a source
 * checkout they may not be built yet, so each is served only if it exists and
 * the index reports honestly either way.
 */
const ROOTS = {
  css: resolvePath(process.cwd(), 'dist-css'),
  js: resolvePath(process.cwd(), 'dist-js'),
  docs: resolvePath(process.cwd(), 'sample'),
};

export async function startHttpServer(): Promise<void> {
  const cfg = readUrlConfig();
  const app = express();

  // Needed for req.protocol to reflect X-Forwarded-Proto behind a TLS-terminating
  // proxy. Only enabled when we are configured to trust the proxy at all.
  if (cfg.trustProxy) app.set('trust proxy', true);

  // Specs are large; the default 100kb limit rejects validate_markup payloads.
  app.use(express.json({ limit: '8mb' }));

  const api: Router = express.Router();

  /* ---------------- Health ---------------- */

  // Also runs the contrast audit, so an image built with a broken palette
  // reports unhealthy rather than serving it.
  api.get('/health', (req: Request, res: Response) => {
    const failures = auditThemes().filter((r) => !r.pass);
    const healthy = failures.length === 0;
    const urls = publishedUrls(cfg, req);
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
      contrastAudit: {
        passing: healthy,
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
    const urls = publishedUrls(cfg, req);
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
        tokensJson: { url: urls.tokensJson, type: 'application/json', format: 'w3c-dtcg', available: true },
        stylesheet: { url: `${urls.css}sekura.css`, type: 'text/css', available: existsSync(ROOTS.css) },
        stylesheets: { url: urls.css, description: 'Per-component CSS and native exports', available: existsSync(ROOTS.css) },
        behaviours: { url: `${urls.js}sekura.iife.min.js`, type: 'text/javascript', available: existsSync(ROOTS.js) },
        documentation: { url: urls.docs, type: 'text/html', available: existsSync(ROOTS.docs) },
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
    res.type('text/css').send(exportTokens('css'));
  });

  api.get('/tokens.json', (_req: Request, res: Response) => {
    res.type('application/json').send(exportTokens('dtcg'));
  });

  /* ---------------- Static artefacts ----------------
     Immutable for a given image tag, so they are cached hard. The documentation
     site is not: it is HTML a person reads, and a stale page after an upgrade is
     worse than a revalidation. */

  if (existsSync(ROOTS.css)) {
    api.use('/css', express.static(ROOTS.css, { maxAge: '1y', immutable: true }));
  }
  if (existsSync(ROOTS.js)) {
    api.use('/js', express.static(ROOTS.js, { maxAge: '1y', immutable: true }));
  }
  if (existsSync(ROOTS.docs)) {
    api.use('/docs', express.static(ROOTS.docs, { extensions: ['html'], maxAge: '5m' }));
  }

  /* ---------------- Index ---------------- */

  api.get('/', (req: Request, res: Response) => {
    const u = publishedUrls(cfg, req);
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
    const server = createServer({ urls: publishedUrls(cfg, req) });
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
      process.stderr.write(`MCP request failed: ${String(err)}\n`);
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

  app.use(cfg.basePath || '/', api);

  /**
   * Mounted under a prefix, a request to `/` is a misconfiguration somewhere —
   * usually a proxy that was meant to pass the prefix through and stripped it,
   * or a person with the wrong URL. Redirecting is friendlier than a bare 404
   * and makes the mistake self-explaining.
   */
  if (cfg.basePath) {
    app.get('/', (_req: Request, res: Response) => {
      res.redirect(302, `${cfg.basePath}/`);
    });
  }

  await new Promise<void>((done) => {
    const httpServer = app.listen(PORT, HOST, () => {
      const u = publishedUrls(cfg);
      process.stderr.write(
        `${SERVER_NAME} ${SERVER_VERSION} listening on ` +
          `http://${HOST}:${PORT}${cfg.basePath}${cfg.mcpPath}\n` +
          (cfg.externalUrl ? `Generating links against ${u.base}\n` : '')
      );
      done();
    });

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
