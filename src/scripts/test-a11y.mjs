/**
 * Accessibility scan — axe-core, WCAG 2.0/2.1/2.2 A + AA.
 *
 * Runs against the generated documentation site in BOTH themes, because a
 * dark-mode contrast failure is invisible to a light-mode-only scan. Serves the
 * site itself so it needs no separate server running.
 *
 * Automated tooling catches roughly a third of real barriers. Passing this is
 * necessary, not sufficient — keyboard and screen-reader testing still applies.
 */
import { createServer } from 'node:http';
import { extname, join, resolve as resolvePath } from 'node:path';
import { existsSync, statSync, createReadStream } from 'node:fs';

import { chromium } from 'playwright-core';
import { readFileSync } from 'node:fs';

import { createRequire } from 'node:module';
const require_ = createRequire(import.meta.url);
const AXE = readFileSync(require_.resolve('axe-core/axe.min.js'), 'utf8');

const PAGES = [
  'index.html', 'color.html', 'dark-mode.html', 'typography.html', 'layout.html',
  'tokens.html', 'components.html', 'patterns.html', 'recipes.html',
  'component-button.html', 'component-table.html', 'component-combobox.html',
  'component-dialog.html', 'component-form-field.html',
  'example-dashboard.html', 'example-list.html', 'example-detail.html',
  'component-accordion.html', 'component-disclosure.html',
  'component-date-picker.html', 'component-number-input.html',
  'component-tag-input.html', 'component-toolbar.html',
  'component-segmented-control.html', 'component-meter.html',
  'examples.html',
  'example-form.html', 'example-states.html', 'example-onboarding.html',
  'example-settings.html', 'example-marketing.html', 'example-signin.html',
];

const ROOT = resolvePath(process.cwd(), 'sample');
if (!existsSync(ROOT)) {
  console.error('sample/ missing. Run: npm run site:build');
  process.exit(1);
}
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml' };
const server = createServer((req, res) => {
  const p = join(ROOT, decodeURIComponent((req.url || '/').split('?')[0]).replace(/^\//, '') || 'index.html');
  if (!p.startsWith(ROOT) || !existsSync(p) || !statSync(p).isFile()) { res.writeHead(404).end(); return; }
  res.writeHead(200, { 'content-type': TYPES[extname(p)] || 'application/octet-stream' });
  createReadStream(p).pipe(res);
});
await new Promise((r) => server.listen(0, r));
const PORT = server.address().port;

const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const all = new Map(); // ruleId -> { impact, help, count, pages:Set, sample }

for (const theme of ['light', 'dark']) {
  for (const file of PAGES) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, colorScheme: theme });
    await page.goto(`http://127.0.0.1:${PORT}/${file}`, { waitUntil: 'networkidle' });
    await page.addScriptTag({ content: AXE });
    const res = await page.evaluate(async () => {
      // WCAG 2.0/2.1/2.2 A + AA, plus best practices reported separately.
      const r = await window.axe.run(document, {
        runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
        resultTypes: ['violations'],
      });
      return r.violations.map((v) => ({
        id: v.id, impact: v.impact, help: v.help, nodes: v.nodes.length,

        target: v.nodes[0] ? String(v.nodes[0].target) : '',
        summary: v.nodes[0] ? (v.nodes[0].failureSummary || '').split('\n').slice(0, 2).join(' ') : '',
      }));
    });
    for (const v of res) {
      const key = v.id;
      const e = all.get(key) || { impact: v.impact, help: v.help, count: 0, pages: new Set(), target: v.target, summary: v.summary };
      e.count += v.nodes;
      e.pages.add(`${file}:${theme}`);
      all.set(key, e);
    }
    await page.close();
  }
}
await browser.close();
server.close();

console.log(`axe-core — WCAG 2.0/2.1/2.2 A + AA`);
console.log(`${PAGES.length} pages x 2 themes = ${PAGES.length * 2} scans\n`);

if (all.size === 0) {
  console.log('0 violations.');
  console.log('\nAutomated checks catch about a third of real barriers.');
} else {
  const order = { critical: 0, serious: 1, moderate: 2, minor: 3 };
  const sorted = [...all.entries()].sort((a, b) => (order[a[1].impact] ?? 9) - (order[b[1].impact] ?? 9));
  for (const [id, e] of sorted) {
    console.log(`[${e.impact}] ${id} — ${e.help}`);
    console.log(`   ${e.count} node(s) across ${e.pages.size} scan(s)`);
    console.log(`   first: ${e.target}`);
    if (e.summary) console.log(`   ${e.summary.slice(0, 160)}`);
    console.log('');
  }
  console.log(`${all.size} distinct rule(s) violated.`);
  process.exit(1);
}
