#!/usr/bin/env node
/**
 * Entry point. Supports two transports:
 *
 *   stdio (default) — for local MCP clients that spawn the process.
 *   http            — streamable HTTP, for the Docker image, so any number of
 *                     tools can be pointed at one running server.
 *
 * Select with SEKURA_MCP_TRANSPORT=http, or `--http`.
 */

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

import { createServer, SERVER_NAME, SERVER_VERSION } from './server.js';

const transport = (
  process.env.SEKURA_MCP_TRANSPORT ??
  (process.argv.includes('--http') ? 'http' : 'stdio')
).toLowerCase();

async function main(): Promise<void> {
  if (transport === 'http') {
    const { startHttpServer } = await import('./http.js');
    await startHttpServer();
    return;
  }

  const server = createServer();
  const stdio = new StdioServerTransport();
  await server.connect(stdio);

  // stdout is the protocol channel; anything logged there corrupts it.
  process.stderr.write(`${SERVER_NAME} ${SERVER_VERSION} ready on stdio\n`);
}

main().catch((err: unknown) => {
  process.stderr.write(`Fatal: ${err instanceof Error ? err.stack ?? err.message : String(err)}\n`);
  process.exit(1);
});
