/// <reference lib="dom" />
/*
 * The DOM lib is referenced per-file rather than added to the project: this
 * script runs in Node but its page.evaluate callbacks are browser code. The
 * server build must not see DOM globals.
 */

/**
 * Behaviour tests, driven through a real browser.
 *
 * This closes the gap the assessment identified: the specification defined exact
 * keyboard and ARIA contracts, and nothing verified that any implementation met
 * them. These tests press real keys against a real DOM and assert on focus,
 * attributes and announcements.
 *
 * Run with: npm run test:behaviours
 * Requires: a chromium available to playwright-core.
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';

const BUNDLE = resolve(process.cwd(), 'dist-js/sekura.iife.js');
if (!existsSync(BUNDLE)) {
  console.error('dist-js/sekura.iife.js missing. Run: npm run build:behaviours');
  process.exit(1);
}

/* ------------------------------------------------------------------ *
 * Fixtures — the markup each controller is documented to work against.
 * ------------------------------------------------------------------ */

const FIXTURES: Record<string, string> = {
  menu: `
    <button id="before">before</button>
    <button id="trigger" data-sk-menu-trigger="menu">Actions</button>
    <div id="menu" class="sk-menu">
      <button role="menuitem" id="m1">Edit project</button>
      <button role="menuitem" id="m2">Duplicate project</button>
      <button role="menuitem" id="m3" aria-disabled="true">Export</button>
      <button role="menuitem" id="m4">Delete project</button>
    </div>
    <button id="after">after</button>`,

  tabs: `
    <div id="tablist" data-sk-tabs>
      <button role="tab" id="t1" aria-controls="p1" aria-selected="true">One</button>
      <button role="tab" id="t2" aria-controls="p2" aria-selected="false">Two</button>
      <button role="tab" id="t3" aria-controls="p3" aria-selected="false">Three</button>
    </div>
    <div id="p1">Panel one</div>
    <div id="p2">Panel two</div>
    <div id="p3">Panel three</div>`,

  combobox: `
    <input id="input" data-sk-combobox="list" />
    <ul id="list">
      <li role="option" id="o1" data-value="alpha">alpha</li>
      <li role="option" id="o2" data-value="beta">beta</li>
      <li role="option" id="o3" data-value="gamma">gamma</li>
    </ul>`,

  disclosure: `
    <button id="trigger" data-sk-disclosure="panel">Advanced</button>
    <div id="panel"><button id="inner">inside</button></div>`,

  accordion: `
    <div id="acc" data-sk-accordion="single">
      <button data-sk-accordion-trigger aria-controls="ap1" id="ah1">One</button>
      <div id="ap1">One body</div>
      <button data-sk-accordion-trigger aria-controls="ap2" id="ah2">Two</button>
      <div id="ap2">Two body</div>
    </div>`,

  dialog: `
    <button id="opener" data-sk-dialog-open="dlg">Open</button>
    <dialog id="dlg" data-sk-dialog>
      <button id="cancel" autofocus>Cancel</button>
      <button id="confirm">Delete project</button>
    </dialog>`,

  segmented: `
    <div id="seg" data-sk-segmented role="radiogroup" aria-label="View">
      <button role="radio" id="s1" data-value="list" aria-checked="true">List</button>
      <button role="radio" id="s2" data-value="board" aria-checked="false">Board</button>
      <button role="radio" id="s3" data-value="cal" aria-checked="false">Calendar</button>
    </div>`,

  selection: `
    <table id="tbl" data-sk-selection="projects">
      <thead><tr><th><input type="checkbox" data-sk-select-all /></th><th>Name</th></tr></thead>
      <tbody>
        <tr><td><input type="checkbox" data-sk-select-row id="r1" /></td><td>a</td></tr>
        <tr><td><input type="checkbox" data-sk-select-row id="r2" /></td><td>b</td></tr>
      </tbody>
    </table>`,

  drawer: `
    <button id="opener" data-sk-drawer-open="dr">Open</button>
    <aside id="dr" data-sk-drawer data-sk-modal="true" hidden>
      <h2 id="dt">Details</h2>
      <button id="dclose" data-sk-drawer-close>Close</button>
    </aside>`,
};

function page(fixture: string, bundle: string): string {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>t</title>
<style>[hidden]{display:none!important}</style></head>
<body>${fixture}<script>${bundle}</script><script>Sekura.enhance();</script></body></html>`;
}

/* ------------------------------------------------------------------ *
 * Harness
 * ------------------------------------------------------------------ */

let passed = 0;
const failures: string[] = [];

function check(name: string, condition: boolean, detail = ''): void {
  if (condition) passed += 1;
  else failures.push(`${name}${detail ? ` — ${detail}` : ''}`);
}

async function main(): Promise<void> {
  const bundle = readFileSync(BUNDLE, 'utf8');

  // Serve over http: file:// restricts some APIs and is not how the bundle runs.
  const server = createServer((req, res) => {
    const name = (req.url ?? '/').replace(/^\//, '') || 'menu';
    const fixture = FIXTURES[name];
    if (!fixture) {
      res.writeHead(404).end('no fixture');
      return;
    }
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    res.end(page(fixture, bundle));
  });
  await new Promise<void>((r) => server.listen(0, r));
  const port = (server.address() as AddressInfo).port;
  const url = (name: string) => `http://127.0.0.1:${port}/${name}`;

  // playwright-core is a devDependency, so this resolves normally in CI.
  // SEKURA_PLAYWRIGHT overrides it for unusual local setups.
  const override = process.env.SEKURA_PLAYWRIGHT;
  const pw = override
    ? await import(resolve(override))
    : ((await import('playwright-core')) as unknown as typeof import('playwright-core'));
  const browser = await pw.chromium.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  const ctx = await browser.newContext();

  const active = (p: any) => p.evaluate(() => document.activeElement?.id ?? null);
  const attr = (p: any, sel: string, name: string) =>
    p.evaluate(([s, a]: [string, string]) => document.querySelector(s)?.getAttribute(a), [sel, name]);

  /* ---------------- Menu ---------------- */
  {
    const p = await ctx.newPage();
    await p.goto(url('menu'));

    check('menu: closed initially', (await attr(p, '#trigger', 'aria-expanded')) === 'false');
    check('menu: has aria-haspopup', (await attr(p, '#trigger', 'aria-haspopup')) === 'menu');

    // ArrowDown on the trigger opens and focuses the first item.
    await p.focus('#trigger');
    await p.keyboard.press('ArrowDown');
    check('menu: ArrowDown opens', (await attr(p, '#trigger', 'aria-expanded')) === 'true');
    check('menu: focus moves to first item', (await active(p)) === 'm1', `got ${await active(p)}`);

    // A menu moves REAL focus, unlike a combobox.
    await p.keyboard.press('ArrowDown');
    check('menu: ArrowDown moves focus', (await active(p)) === 'm2', `got ${await active(p)}`);

    // Disabled items are skipped.
    await p.keyboard.press('ArrowDown');
    check('menu: skips aria-disabled item', (await active(p)) === 'm4', `got ${await active(p)}`);

    // Wraps.
    await p.keyboard.press('ArrowDown');
    check('menu: wraps to first', (await active(p)) === 'm1', `got ${await active(p)}`);

    await p.keyboard.press('End');
    check('menu: End goes last', (await active(p)) === 'm4', `got ${await active(p)}`);
    await p.keyboard.press('Home');
    check('menu: Home goes first', (await active(p)) === 'm1', `got ${await active(p)}`);

    // Type-ahead.
    await p.keyboard.press('d');
    check('menu: typeahead jumps', (await active(p)) === 'm2', `got ${await active(p)}`);

    // Escape closes AND restores focus to the trigger.
    await p.keyboard.press('Escape');
    check('menu: Escape closes', (await attr(p, '#trigger', 'aria-expanded')) === 'false');
    check('menu: Escape restores focus to trigger', (await active(p)) === 'trigger', `got ${await active(p)}`);

    // Tab must not be trapped.
    await p.keyboard.press('ArrowDown');
    await p.keyboard.press('Tab');
    check('menu: Tab closes rather than trapping', (await attr(p, '#trigger', 'aria-expanded')) === 'false');

    await p.close();
  }

  /* ---------------- Tabs ---------------- */
  {
    const p = await ctx.newPage();
    await p.goto(url('tabs'));

    check('tabs: roving tabindex is one stop',
      await p.evaluate(() => {
        const tabs = Array.from(document.querySelectorAll('[role="tab"]')) as HTMLElement[];
        return tabs.filter((t) => t.tabIndex === 0).length === 1;
      }));
    check('tabs: unselected panels hidden',
      await p.evaluate(() => (document.getElementById('p2') as HTMLElement).hidden));

    await p.focus('#t1');
    await p.keyboard.press('ArrowRight');
    check('tabs: ArrowRight moves', (await active(p)) === 't2', `got ${await active(p)}`);
    check('tabs: automatic activation selects', (await attr(p, '#t2', 'aria-selected')) === 'true');
    check('tabs: panel revealed',
      await p.evaluate(() => !(document.getElementById('p2') as HTMLElement).hidden));
    check('tabs: previous panel hidden',
      await p.evaluate(() => (document.getElementById('p1') as HTMLElement).hidden));

    await p.keyboard.press('End');
    check('tabs: End goes last', (await active(p)) === 't3', `got ${await active(p)}`);
    await p.keyboard.press('ArrowRight');
    check('tabs: wraps', (await active(p)) === 't1', `got ${await active(p)}`);

    // RTL must mirror arrow direction — CSS flips the layout, the key handler
    // has to flip too.
    await p.evaluate(() => document.documentElement.setAttribute('dir', 'rtl'));
    await p.focus('#t1');
    await p.keyboard.press('ArrowLeft');
    check('tabs: RTL ArrowLeft moves forward', (await active(p)) === 't2', `got ${await active(p)}`);

    await p.close();
  }

  /* ---------------- Combobox ---------------- */
  {
    const p = await ctx.newPage();
    await p.goto(url('combobox'));

    check('combobox: role set', (await attr(p, '#input', 'role')) === 'combobox');
    check('combobox: closed initially', (await attr(p, '#input', 'aria-expanded')) === 'false');

    await p.focus('#input');
    await p.keyboard.press('ArrowDown');
    check('combobox: ArrowDown opens', (await attr(p, '#input', 'aria-expanded')) === 'true');

    // The defining property: DOM focus never leaves the input.
    check('combobox: focus STAYS on input', (await active(p)) === 'input', `got ${await active(p)}`);
    check('combobox: aria-activedescendant set', Boolean(await attr(p, '#input', 'aria-activedescendant')));
    check('combobox: first option active', (await attr(p, '#input', 'aria-activedescendant')) === 'o1');

    await p.keyboard.press('ArrowDown');
    check('combobox: cursor moves without focus', (await active(p)) === 'input');
    check('combobox: activedescendant advanced', (await attr(p, '#input', 'aria-activedescendant')) === 'o2');

    await p.keyboard.press('Enter');
    check('combobox: Enter commits value',
      await p.evaluate(() => (document.getElementById('input') as HTMLInputElement).value === 'beta'));
    check('combobox: closes after commit', (await attr(p, '#input', 'aria-expanded')) === 'false');

    // First Escape closes but keeps the text; a second clears it.
    await p.keyboard.press('ArrowDown');
    await p.keyboard.press('Escape');
    check('combobox: Escape closes', (await attr(p, '#input', 'aria-expanded')) === 'false');
    check('combobox: Escape keeps typed text',
      await p.evaluate(() => (document.getElementById('input') as HTMLInputElement).value === 'beta'));
    await p.keyboard.press('Escape');
    check('combobox: second Escape clears',
      await p.evaluate(() => (document.getElementById('input') as HTMLInputElement).value === ''));

    await p.close();
  }

  /* ---------------- Disclosure ---------------- */
  {
    const p = await ctx.newPage();
    await p.goto(url('disclosure'));

    check('disclosure: collapsed initially', (await attr(p, '#trigger', 'aria-expanded')) === 'false');
    check('disclosure: panel hidden, not just invisible',
      await p.evaluate(() => (document.getElementById('panel') as HTMLElement).hidden));
    check('disclosure: collapsed content out of tab order',
      await p.evaluate(() => {
        const inner = document.getElementById('inner') as HTMLElement;
        return inner.offsetParent === null;
      }));

    await p.click('#trigger');
    check('disclosure: expands', (await attr(p, '#trigger', 'aria-expanded')) === 'true');
    check('disclosure: panel revealed',
      await p.evaluate(() => !(document.getElementById('panel') as HTMLElement).hidden));
    await p.close();
  }

  /* ---------------- Accordion ---------------- */
  {
    const p = await ctx.newPage();
    await p.goto(url('accordion'));
    await p.click('#ah1');
    check('accordion: first opens', (await attr(p, '#ah1', 'aria-expanded')) === 'true');
    await p.click('#ah2');
    check('accordion: second opens', (await attr(p, '#ah2', 'aria-expanded')) === 'true');
    check('accordion: single mode closes the first', (await attr(p, '#ah1', 'aria-expanded')) === 'false');

    await p.focus('#ah1');
    await p.keyboard.press('ArrowDown');
    check('accordion: ArrowDown moves between headers', (await active(p)) === 'ah2', `got ${await active(p)}`);
    await p.close();
  }

  /* ---------------- Dialog ---------------- */
  {
    const p = await ctx.newPage();
    await p.goto(url('dialog'));

    await p.click('#opener');
    check('dialog: opens', await p.evaluate(() => (document.getElementById('dlg') as HTMLDialogElement).open));
    check('dialog: focuses [autofocus], the SAFE option', (await active(p)) === 'cancel', `got ${await active(p)}`);

    // Native modal traps Tab.
    await p.keyboard.press('Tab');
    const afterTab = await active(p);
    check('dialog: Tab stays inside', afterTab === 'confirm' || afterTab === 'cancel', `got ${afterTab}`);

    await p.keyboard.press('Escape');
    check('dialog: Escape closes', await p.evaluate(() => !(document.getElementById('dlg') as HTMLDialogElement).open));
    check('dialog: focus returns to opener', (await active(p)) === 'opener', `got ${await active(p)}`);
    await p.close();
  }

  /* ---------------- Segmented ---------------- */
  {
    const p = await ctx.newPage();
    await p.goto(url('segmented'));
    check('segmented: one tab stop',
      await p.evaluate(() => {
        const items = Array.from(document.querySelectorAll('[role="radio"]')) as HTMLElement[];
        return items.filter((i) => i.tabIndex === 0).length === 1;
      }));
    await p.focus('#s1');
    await p.keyboard.press('ArrowRight');
    check('segmented: arrow moves and checks', (await attr(p, '#s2', 'aria-checked')) === 'true');
    check('segmented: previous unchecked', (await attr(p, '#s1', 'aria-checked')) === 'false');
    await p.close();
  }

  /* ---------------- Selection ---------------- */
  {
    const p = await ctx.newPage();
    await p.goto(url('selection'));
    await p.click('#r1');
    check('selection: header goes indeterminate (announced "mixed")',
      await p.evaluate(() => (document.querySelector('[data-sk-select-all]') as HTMLInputElement).indeterminate));
    await p.click('#r2');
    check('selection: header checks when all selected',
      await p.evaluate(() => {
        const h = document.querySelector('[data-sk-select-all]') as HTMLInputElement;
        return h.checked && !h.indeterminate;
      }));
    check('selection: rows marked aria-selected',
      (await attr(p, 'tbody tr', 'aria-selected')) === 'true');
    await p.close();
  }

  /* ---------------- Drawer ---------------- */
  {
    const p = await ctx.newPage();
    await p.goto(url('drawer'));

    check('drawer: closed drawer is inert (no invisible tab stops)',
      await p.evaluate(() => document.getElementById('dr')!.hasAttribute('inert')));

    await p.click('#opener');
    check('drawer: modal sets aria-modal', (await attr(p, '#dr', 'aria-modal')) === 'true');
    check('drawer: modal sets role=dialog', (await attr(p, '#dr', 'role')) === 'dialog');
    check('drawer: inert removed when open',
      await p.evaluate(() => !document.getElementById('dr')!.hasAttribute('inert')));

    await p.keyboard.press('Escape');
    check('drawer: Escape closes', await p.evaluate(() => document.getElementById('dr')!.hidden));
    check('drawer: focus restored', (await active(p)) === 'opener', `got ${await active(p)}`);
    check('drawer: inert restored on close',
      await p.evaluate(() => document.getElementById('dr')!.hasAttribute('inert')));
    await p.close();
  }

  /* ---------------- Idempotent enhance ---------------- */
  {
    const p = await ctx.newPage();
    await p.goto(url('menu'));
    const second = await p.evaluate(() => (window as any).Sekura.enhance().count);
    check('enhance: idempotent — re-running wires nothing new', second === 0, `wired ${second}`);
    await p.close();
  }

  await browser.close();
  server.close();

  console.log('Sekura behaviour tests');
  console.log('='.repeat(64));
  console.log(`${passed} passed, ${failures.length} failed`);
  if (failures.length) {
    console.log('');
    for (const f of failures) console.log(`  ✗ ${f}`);
    process.exit(1);
  }
  console.log('');
  console.log('Keyboard and ARIA contracts verified against a real DOM.');
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
