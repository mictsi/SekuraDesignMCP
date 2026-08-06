/// <reference lib="dom" />
/*
 * DOM lib per-file: this runs in Node but its page.evaluate callbacks are
 * browser code.
 */

/**
 * Right-to-left regression tests.
 *
 * The design system claims that logical properties make RTL work with no extra
 * CSS. That claim was never verified, so this exists to check it.
 *
 * ## A note on how RTL overflow is measured
 *
 * The obvious check — `scrollWidth - clientWidth > 0` — is **wrong in RTL**.
 * Chromium reports a non-zero difference on containers where no content is
 * clipped and nothing escapes the box; the scrollable region is empty space.
 * Measuring that way produced a phantom "37px RTL overflow bug" that survived
 * three rounds of investigation before the measurement itself turned out to be
 * the fault.
 *
 * So overflow is measured the way a user experiences it: does any element
 * actually extend past its scroll container's box, in either direction? That is
 * the condition that clips content, and it is what WCAG 1.4.10 Reflow cares
 * about.
 */

import { existsSync } from 'node:fs';
import { createReadStream, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, resolve } from 'node:path';
import type { AddressInfo } from 'node:net';

const ROOT = resolve(process.cwd(), 'sample');
if (!existsSync(ROOT)) {
  console.error('sample/ missing. Run: npm run site:build');
  process.exit(1);
}

const PAGES = [
  'index.html',
  'color.html',
  'layout.html',
  'components.html',
  'example-dashboard.html',
  'example-list.html',
  'example-detail.html',
  'example-form.html',
  'example-states.html',
  'example-onboarding.html',
  'example-settings.html',
  'example-marketing.html',
];

const WIDTHS = [1280, 768, 390];

let passed = 0;
const failures: string[] = [];

function check(name: string, ok: boolean, detail = ''): void {
  if (ok) passed += 1;
  else failures.push(`${name}${detail ? ` — ${detail}` : ''}`);
}

const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.svg': 'image/svg+xml',
};

async function main(): Promise<void> {
  const server = createServer((req, res) => {
    const rel = decodeURIComponent((req.url ?? '/').split('?')[0]!).replace(/^\//, '') || 'index.html';
    const file = join(ROOT, rel);
    if (!file.startsWith(ROOT) || !existsSync(file) || !statSync(file).isFile()) {
      res.writeHead(404).end();
      return;
    }
    res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' });
    createReadStream(file).pipe(res);
  });
  await new Promise<void>((r) => server.listen(0, r));
  const port = (server.address() as AddressInfo).port;

  const { chromium } = await import('playwright-core');
  const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage'] });

  for (const dir of ['ltr', 'rtl'] as const) {
    for (const width of WIDTHS) {
      for (const file of PAGES) {
        const page = await browser.newPage({ viewport: { width, height: 900 } });
        await page.goto(`http://127.0.0.1:${port}/${file}`, { waitUntil: 'networkidle' });
        await page.evaluate((d) => document.documentElement.setAttribute('dir', d), dir);
        await page.waitForTimeout(150);

        const result = await page.evaluate(() => {
          const scroller =
            (document.querySelector('.sk-app-shell__main') as HTMLElement | null) ??
            document.documentElement;
          const box = scroller.getBoundingClientRect();
          const escapees: string[] = [];

          /**
           * Three things legitimately sit outside the container box and must not
           * be reported:
           *
           *  - anything inside a `position: fixed` ancestor, which includes an
           *    off-canvas drawer translated out of view below the lg breakpoint;
           *  - anything inside a horizontal scroll container, because a wide
           *    table or tab strip scrolling internally IS the design — that is
           *    what keeps the *page* from scrolling;
           *  - the deliberately-broken demo on the layout page, which exists to
           *    show what happens without `min-inline-size: 0`.
           */
          const exempt = (el: HTMLElement): boolean => {
            let node: HTMLElement | null = el;
            while (node && node !== scroller) {
              const cs = getComputedStyle(node);
              if (cs.position === 'fixed') return true;
              if (cs.overflowX === 'auto' || cs.overflowX === 'scroll') return true;
              if (node.hasAttribute('data-sk-overflow-demo')) return true;
              node = node.parentElement;
            }
            return false;
          };

          // Real overflow: an element whose box extends past the container's, in
          // either direction. NOT scrollWidth, which over-reports in RTL.
          for (const el of Array.from(scroller.querySelectorAll<HTMLElement>('*'))) {
            const r = el.getBoundingClientRect();
            if (r.width === 0 && r.height === 0) continue;
            if (exempt(el)) continue;
            const past = Math.max(r.right - box.right, box.left - r.left);
            if (past > 2) {
              escapees.push(
                `${el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/)[0] : el.tagName} by ${Math.round(past)}px`
              );
            }
          }

          return { escapees: escapees.slice(0, 3) };
        });

        check(
          `${dir} ${width}px ${file}: nothing escapes the container`,
          result.escapees.length === 0,
          result.escapees.join('; ')
        );
        await page.close();
      }
    }
  }

  /* --- Mirroring: the layout must actually flip, not merely not break. --- */
  {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    await page.goto(`http://127.0.0.1:${port}/example-list.html`, { waitUntil: 'networkidle' });

    const ltrNav = await page.evaluate(
      () => document.querySelector('.sk-side-nav')!.getBoundingClientRect().left
    );
    await page.evaluate(() => document.documentElement.setAttribute('dir', 'rtl'));
    await page.waitForTimeout(200);
    const rtlNav = await page.evaluate(
      () => document.querySelector('.sk-side-nav')!.getBoundingClientRect().left
    );

    check('rtl: navigation rail mirrors to the opposite side', ltrNav < 640 && rtlNav > 640,
      `ltr left=${Math.round(ltrNav)}, rtl left=${Math.round(rtlNav)}`);
    await page.close();
  }

  await browser.close();
  server.close();

  const total = PAGES.length * WIDTHS.length * 2 + 1;
  console.log('Sekura RTL regression');
  console.log('='.repeat(70));
  console.log(`${passed}/${total} passed, ${failures.length} failed`);
  if (failures.length) {
    console.log('');
    for (const f of failures.slice(0, 20)) console.log(`  ✗ ${f}`);
    process.exit(1);
  }
  console.log('');
  console.log('Logical properties mirror the layout with no additional CSS,');
  console.log('and nothing is clipped in either direction at any width.');
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
