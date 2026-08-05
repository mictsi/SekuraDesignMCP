/**
 * Static server for the sample site.
 *
 * The sample works when opened straight from the filesystem, but serving it
 * matches how it would really be deployed — and lets you exercise it on a phone
 * on the same network.
 *
 *   npm run sample
 */

import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve } from 'node:path';

const ROOT = resolve(process.cwd(), 'sample');
const PORT = Number(process.env.SAMPLE_PORT ?? 4173);

const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
  '.woff2': 'font/woff2',
  '.md': 'text/markdown; charset=utf-8',
};

if (!existsSync(ROOT)) {
  console.error(`No sample directory at ${ROOT}. Run: node sample/build.mjs`);
  process.exit(1);
}

const server = createServer((req, res) => {
  const url = new URL(req.url ?? '/', 'http://localhost');
  let pathname = decodeURIComponent(url.pathname);
  if (pathname === '/') pathname = '/index.html';

  // Contain the served path inside ROOT.
  const filePath = join(ROOT, normalize(pathname).replace(/^(\.\.[/\\])+/, ''));
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403).end('Forbidden');
    return;
  }

  if (!existsSync(filePath) || !statSync(filePath).isFile()) {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    res.end(`Not found: ${pathname}\n`);
    return;
  }

  res.writeHead(200, {
    'content-type': TYPES[extname(filePath)] ?? 'application/octet-stream',
    'cache-control': 'no-cache',
  });
  createReadStream(filePath).pipe(res);
});

server.listen(PORT, () => {
  console.log(`Sekura Design System docs  →  http://localhost:${PORT}`);
  console.log('');
  console.log('  /                    Overview');
  console.log('  /color.html          Colour guide — ramps, semantic tokens, contrast contract');
  console.log('  /dark-mode.html      How dark mode differs, and what breaks silently');
  console.log('  /typography.html     Type specimen');
  console.log('  /layout.html         Flex-first layout, with resizable demos');
  console.log('  /tokens.html         Every token, filterable, in all four themes');
  console.log('  /components.html     55 components');
  console.log('  /example-*.html      The system in a real product');
  console.log('');
  console.log('Ctrl+C to stop.');
});
