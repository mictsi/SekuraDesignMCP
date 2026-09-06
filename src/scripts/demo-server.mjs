/** Local-only integration example; never mounted by the production MCP server. */
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { resolve, extname } from 'node:path';
import { pathToFileURL } from 'node:url';
export function createDemoServer() {
  const root = resolve('sample'); let version = 1; let project = null;
  return createServer(async (req, res) => {
    const json = (status, body) => { res.writeHead(status, { 'content-type': 'application/json', 'cache-control': 'no-store' }); res.end(JSON.stringify(body)); };
    // No CORS. Reject cross-origin mutations, including requests from unrelated local ports.
    if (req.headers.origin && req.headers.origin !== `http://${req.headers.host}`) { json(403, { message: 'Use the same-origin local demo page.' }); return; }
    let pathname;
    try { pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); } catch { json(400, { message: 'Invalid URL.' }); return; }
    if (pathname.startsWith('/demo-api/')) {
      if (req.method === 'GET' && pathname === '/demo-api/version') { json(200, { version, project }); return; }
      if (req.method === 'GET' && pathname === '/demo-api/name') {
        const value = new URL(req.url, 'http://localhost').searchParams.get('value') || '';
        setTimeout(() => json(200, { available: value.trim().length > 0 && value.toLowerCase() !== 'taken' }), 250); return;
      }
      if (req.method !== 'POST' || pathname !== '/demo-api/projects') { json(404, { message: 'Unknown demo route.' }); return; }
      if (!req.headers['content-type']?.startsWith('application/json')) { json(415, { message: 'JSON required.' }); return; }
      let text = '';
      try {
        for await (const chunk of req) { text += chunk; if (text.length > 16000) { json(413, { message: 'Request too large.' }); return; } }
        const body = JSON.parse(text);
        if (typeof body.name !== 'string' || !body.name.trim() || body.name.length > 80 || body.name.toLowerCase() === 'taken' || !Number.isInteger(body.version) || !({ design: ['Alex', 'Sam'], engineering: ['Jordan', 'Taylor'] }[body.team]?.includes(body.owner))) { json(422, { message: 'Check the project name, team and owner.' }); return; }
        setTimeout(() => {
          if (body.outcome === 'failure') { json(503, { message: 'The service is unavailable. Your draft is retained; try saving again.' }); return; }
          if (body.outcome === 'conflict') version++;
          if (body.version !== version) { json(409, { message: 'Another editor changed this project. Load its latest version before retrying.' }); return; }
          project = { name: body.name, team: body.team, owner: body.owner, notes: String(body.notes || '') }; version++;
          json(200, { version, project });
        }, 350);
      } catch { if (!res.headersSent) json(400, { message: 'Invalid JSON.' }); }
      return;
    }
    if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405).end(); return; }
    const file = resolve(root, '.' + (pathname === '/' ? '/form-lab.html' : pathname));
    if (!file.startsWith(root + '/')) { res.writeHead(404).end(); return; }
    try { res.setHeader('content-type', ({ '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' })[extname(file)] || 'application/octet-stream'); res.end(req.method === 'HEAD' ? undefined : readFileSync(file)); }
    catch { res.writeHead(404).end(); }
  });
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const server = createDemoServer(); server.listen(4173, '127.0.0.1', () => console.log('Form integration demo: http://127.0.0.1:4173/form-lab.html (memory storage; resets on restart)'));
}
