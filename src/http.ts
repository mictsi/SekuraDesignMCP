/**
 * Streamable HTTP transport.
 *
 * Runs stateless: a fresh server and transport per request, so there is no session
 * state to lose and the container can be scaled or restarted freely. The design
 * system is entirely read-only, so nothing is gained by keeping sessions.
 */

import express, { type Request, type Response } from 'express';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';

import { components } from './data/components/index.js';
import { foundations } from './data/foundations.js';
import { layouts } from './data/layouts.js';
import { patterns } from './data/patterns.js';
import { auditThemes, semanticTokens, THEMES } from './data/tokens.js';
import { exportTokens } from './lib/exporters.js';
import { createServer, SERVER_NAME, SERVER_VERSION } from './server.js';

const PORT = Number(process.env.PORT ?? process.env.SEKURA_MCP_PORT ?? 8080);
const HOST = process.env.HOST ?? '0.0.0.0';
const MCP_PATH = process.env.SEKURA_MCP_PATH ?? '/mcp';

export async function startHttpServer(): Promise<void> {
  const app = express();
  // Specs are large; the default 100kb limit rejects validate_markup payloads.
  app.use(express.json({ limit: '8mb' }));

  // Health check for container orchestration. Also runs the contrast audit, so an
  // image built with a broken palette reports unhealthy rather than serving it.
  app.get('/health', (_req: Request, res: Response) => {
    const failures = auditThemes().filter((r) => !r.pass);
    const healthy = failures.length === 0;
    res.status(healthy ? 200 : 503).json({
      status: healthy ? 'ok' : 'degraded',
      server: SERVER_NAME,
      version: SERVER_VERSION,
      transport: 'streamable-http',
      endpoint: MCP_PATH,
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

  // Convenience: serve the stylesheet over plain HTTP so a build step can curl it
  // without speaking MCP.
  app.get('/tokens.css', (_req: Request, res: Response) => {
    res.type('text/css').send(exportTokens('css'));
  });

  app.get('/tokens.json', (_req: Request, res: Response) => {
    res.type('application/json').send(exportTokens('dtcg'));
  });

  app.get('/', (_req: Request, res: Response) => {
    res.type('text/plain').send(
      `${SERVER_NAME} ${SERVER_VERSION}\n\n` +
        `MCP endpoint (streamable HTTP): POST ${MCP_PATH}\n` +
        `Health:                        GET  /health\n` +
        `Token CSS:                     GET  /tokens.css\n` +
        `Token JSON (W3C DTCG):         GET  /tokens.json\n\n` +
        `${components.length} components, ${foundations.length} foundations, ` +
        `${patterns.length} patterns, ${layouts.length} layouts, ` +
        `${semanticTokens.length} semantic tokens across ${THEMES.length} themes.\n`
    );
  });

  const handleMcp = async (req: Request, res: Response): Promise<void> => {
    // Stateless: a new server and transport per request. Nothing to leak, nothing
    // to lose on restart.
    const server = createServer();
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

  app.post(MCP_PATH, handleMcp);

  // Streamable HTTP is POST-only in stateless mode; be explicit rather than 404.
  const methodNotAllowed = (_req: Request, res: Response): void => {
    res.status(405).json({
      jsonrpc: '2.0',
      error: { code: -32000, message: 'This server is stateless. Use POST for MCP requests.' },
      id: null,
    });
  };
  app.get(MCP_PATH, methodNotAllowed);
  app.delete(MCP_PATH, methodNotAllowed);

  await new Promise<void>((resolve) => {
    const httpServer = app.listen(PORT, HOST, () => {
      process.stderr.write(
        `${SERVER_NAME} ${SERVER_VERSION} listening on http://${HOST}:${PORT}${MCP_PATH}\n`
      );
      resolve();
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
