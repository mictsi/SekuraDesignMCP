/** Navigation tree behavior, legacy compatibility and the working workspace example. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createDemoServer } from './demo-server.mjs';

const pw = await import(process.env.SEKURA_PLAYWRIGHT
  ? pathToFileURL(resolve(process.env.SEKURA_PLAYWRIGHT)).href : 'playwright-core');
const bundle = readFileSync(resolve(process.env.SEKURA_BEHAVIOUR_BUNDLE || 'dist-js/sekura.iife.js'), 'utf8');
const browser = await pw.chromium.launch({
  executablePath: process.env.SK_BROWSER || process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});
const failures = []; let passed = 0;
const style = '<style>[hidden]{display:none!important}body{font:16px sans-serif}.sk-tree{max-width:360px;padding:0}.sk-tree__row{display:flex;align-items:center;min-height:36px}.sk-tree__toggle{display:inline-flex;align-items:center;justify-content:center;width:28px;min-height:28px}.sk-tree__label{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}[role=group]{padding-inline-start:24px}</style>';
const toggle = '<span class="sk-tree__toggle" aria-hidden="true"><svg class="sk-tree__chevron" width="16" height="16"><path d="m4 6 4 4 4-4"/></svg></span>';
const leaf = (id, label, attributes = '') => `<li id="${id}" class="sk-tree__item" role="treeitem" data-value="${id}" ${attributes}><span class="sk-tree__row"><span class="sk-tree__label">${label}</span></span></li>`;
const fixture = `
<h1 id="destination" tabindex="-1">Destination</h1><input id="filter" aria-label="Find loaded pages">
<ul id="tree" class="sk-tree" role="tree" aria-label="Pages" data-sk-custom-tree data-sk-tree-navigation>
  <li id="engineering" class="sk-tree__item" role="treeitem" data-value="engineering" aria-expanded="true" tabindex="0"><span class="sk-tree__row">${toggle}<span class="sk-tree__label">Engineering</span></span>
    <ul role="group"><li id="handbook" class="sk-tree__item" role="treeitem" data-value="handbook" aria-expanded="true"><span class="sk-tree__row">${toggle}<span class="sk-tree__label">Handbook</span></span><ul role="group">${leaf('working', 'Working together', 'aria-current="page"')}${leaf('guidelines', 'Navigation guidelines')}</ul></li></ul>
  </li>
  <li id="projects" class="sk-tree__item" role="treeitem" data-value="projects" aria-expanded="false"><span class="sk-tree__row">${toggle}<span class="sk-tree__label">Projects</span></span><ul role="group" hidden>${leaf('plan', 'Navigation plan')}${leaf('overview', 'Overview')}</ul></li>
  <li id="lazy" class="sk-tree__item" role="treeitem" data-value="lazy" data-sk-loadable aria-expanded="false"><span class="sk-tree__row">${toggle}<span class="sk-tree__label">Lazy pages</span></span></li>
  <li id="private" class="sk-tree__item" role="treeitem" data-value="private" aria-expanded="true" hidden><span class="sk-tree__row">${toggle}<span class="sk-tree__label">Private navigation</span></span><ul role="group">${leaf('private-child', 'Navigation secret')}</ul></li>
</ul><button id="after">After tree</button>`;
const active = page => page.evaluate(() => document.activeElement?.id);
const expanded = (page, id) => page.locator('#' + id).getAttribute('aria-expanded');
const clickToggle = (page, id) => page.locator('#' + id + ' > .sk-tree__row > .sk-tree__toggle').click();

async function mount(page, markup = fixture, options = {}) {
  await page.setContent(style + markup);
  await page.addScriptTag({ content: bundle });
  await page.evaluate(options => {
    window.activations = []; window.selections = []; window.requests = [];
    const root = document.getElementById('tree');
    root.addEventListener('sk:tree:select', event => selections.push(event.detail.value));
    window.tree = Sekura.createTree(root, {
      ...options,
      onActivate: (item, id) => activations.push(id),
      loadChildren: (item, signal) => new Promise((resolve, reject) => requests.push({ item, signal, resolve, reject })),
    });
    window.newTreeItem = (id, label = id) => {
      const item = document.createElement('li'); item.className = 'sk-tree__item'; item.setAttribute('role', 'treeitem'); item.dataset.value = id; item.id = id;
      const row = document.createElement('span'); row.className = 'sk-tree__row'; const text = document.createElement('span'); text.className = 'sk-tree__label'; text.textContent = label; row.appendChild(text); item.appendChild(row); return item;
    };
  }, options);
}
async function test(label, run, viewport = { width: 1280, height: 900 }) {
  const page = await browser.newPage({ viewport, reducedMotion: 'reduce', isMobile: viewport.width <= 480, hasTouch: viewport.width <= 480 });
  const errors = []; page.on('pageerror', error => errors.push(error.message)); page.setDefaultTimeout(5000);
  try { await run(page); assert.deepEqual(errors, [], 'uncaught browser errors'); passed++; console.log('PASS navigation tree: ' + label); }
  catch (error) { failures.push(label + ': ' + error.message); console.error('FAIL navigation tree: ' + label + ': ' + error.message); }
  finally { await page.close(); }
}

let server;
try {
  await test('current entry focus works inside an initially hidden drawer', async page => {
    await mount(page, '<div id="closed" hidden>' + fixture + '</div>');
    assert.equal(await page.locator('#working').getAttribute('tabindex'), '0');
    await page.locator('#closed').evaluate(el => el.hidden = false);
    await page.locator('#filter').focus(); await page.keyboard.press('Tab');
    assert.equal(await active(page), 'working');
    assert.equal(await page.locator('#tree [aria-selected]').count(), 0);
    assert.equal(await page.locator('#tree [tabindex="0"]').count(), 1);
  });
  await test('disclosure never activates; activation waits for host route acknowledgement', async page => {
    await mount(page); await clickToggle(page, 'handbook');
    assert.equal(await expanded(page, 'handbook'), 'false');
    assert.deepEqual(await page.evaluate(() => activations), []);
    await page.locator('#handbook > .sk-tree__row > .sk-tree__label').click();
    assert.deepEqual(await page.evaluate(() => activations), ['handbook']);
    assert.equal(await expanded(page, 'handbook'), 'false');
    assert.equal(await page.evaluate(() => tree.current), 'working');
    await page.evaluate(() => tree.setCurrent('handbook'));
    assert.equal(await page.evaluate(() => tree.current), 'handbook');
    assert.equal(await page.evaluate(() => tree.setCurrent('missing')), false);
    assert.equal(await page.evaluate(() => tree.current), 'handbook');
    await page.evaluate(() => document.getElementById('tree').addEventListener('sk:tree:activate', event => event.preventDefault(), { once: true }));
    await page.locator('#handbook').press('Enter');
    assert.deepEqual(await page.evaluate(() => activations), ['handbook']);
  });
  await test('APG keys explore visible nodes without navigating, including RTL', async page => {
    await mount(page); await page.locator('#working').focus();
    await page.keyboard.press('ArrowDown'); assert.equal(await active(page), 'guidelines');
    await page.keyboard.press('Home'); assert.equal(await active(page), 'engineering');
    await page.keyboard.press('End'); assert.equal(await active(page), 'lazy');
    await page.keyboard.press('n'); assert.equal(await active(page), 'guidelines');
    await page.keyboard.press('ArrowLeft'); assert.equal(await active(page), 'handbook');
    await page.keyboard.press('ArrowLeft'); assert.equal(await expanded(page, 'handbook'), 'false');
    await page.locator('#tree').evaluate(el => el.dir = 'rtl');
    await page.keyboard.press('ArrowLeft'); assert.equal(await expanded(page, 'handbook'), 'true');
    await page.keyboard.press('ArrowLeft'); assert.equal(await active(page), 'working');
    assert.deepEqual(await page.evaluate(() => activations), []);
    await page.keyboard.press('Enter'); assert.deepEqual(await page.evaluate(() => activations), ['working']);
    await page.keyboard.press('Tab'); assert.equal(await active(page), 'after');
    await page.keyboard.press('Shift+Tab'); assert.equal(await active(page), 'working');
  });
  await test('local filter preserves ancestors, author-hidden state and previous expansion', async page => {
    await mount(page); await page.locator('#filter').focus();
    const result = await page.evaluate(() => tree.filter('navigation'));
    assert.deepEqual(result, { query: 'navigation', matched: 2, total: 8 });
    for (const id of ['engineering', 'handbook', 'guidelines', 'projects', 'plan']) assert.equal(await page.locator('#' + id).isVisible(), true, id);
    assert.equal(await page.locator('#working').isVisible(), false);
    assert.equal(await page.locator('#private-child').isVisible(), false);
    assert.equal(await active(page), 'filter');
    await page.evaluate(() => tree.filter(''));
    assert.equal(await expanded(page, 'projects'), 'false');
    assert.equal(await expanded(page, 'handbook'), 'true');
    assert.equal(await page.locator('#private').getAttribute('hidden'), '');
    assert.equal(await page.locator('[data-sk-tree-match]').count(), 0);
  });
  await test('empty filter keeps one entry point and reveal restores the current path', async page => {
    await mount(page); await page.locator('#working').focus();
    await page.evaluate(() => tree.filter('no such page'));
    assert.equal(await active(page), 'tree');
    assert.equal(await page.locator('#tree').getAttribute('tabindex'), '0');
    assert.equal(await page.locator('#tree [tabindex="0"]').count(), 0);
    assert.equal(await page.evaluate(() => tree.revealCurrent({ focus: true })), true);
    assert.equal(await active(page), 'working');
    assert.equal(await page.evaluate(() => tree.query), '');
    assert.equal(await expanded(page, 'handbook'), 'true');
    assert.equal(await page.locator('#tree [tabindex="0"]').count(), 1);
  });
  await test('host route changes and default reveal preserve focus outside the tree', async page => {
    await mount(page); await page.locator('#filter').focus();
    await page.evaluate(() => { tree.filter('working'); tree.setCurrent('plan'); tree.revealCurrent(); });
    assert.equal(await active(page), 'filter');
    assert.equal(await expanded(page, 'projects'), 'true');
    await page.evaluate(() => tree.setCurrent('plan'));
    assert.equal(await active(page), 'filter');
    await page.keyboard.press('Tab'); assert.equal(await active(page), 'plan');
    await page.keyboard.press('Tab'); await page.evaluate(() => tree.setCurrent(null));
    assert.equal(await page.locator('#tree [aria-current]').count(), 0);
    assert.equal(await page.evaluate(() => tree.revealCurrent()), false);
  });
  await test('initial selected focus and legacy parent click behavior remain available', async page => {
    const legacy = fixture.replace('data-sk-tree-navigation', '').replace('aria-current="page"', 'aria-selected="true"');
    await mount(page, legacy); await page.locator('#filter').focus(); await page.keyboard.press('Tab');
    assert.equal(await active(page), 'working');
    await clickToggle(page, 'projects');
    assert.equal(await expanded(page, 'projects'), 'true');
    assert.deepEqual(await page.evaluate(() => selections), ['projects']);
    assert.deepEqual(await page.evaluate(() => activations), []);
  });
  await test('tri-state selection ignores disabled descendants and chevrons do not select', async page => {
    const markup = fixture.replace('data-sk-tree-navigation', '').replace('aria-current="page"', '').replace('id="guidelines"', 'aria-disabled="true" id="guidelines"');
    await mount(page, markup, { multiSelect: true });
    await page.locator('#working').focus(); await page.keyboard.press('Space');
    assert.equal(await page.locator('#handbook').getAttribute('aria-checked'), 'true');
    assert.equal(await page.locator('#guidelines').getAttribute('aria-checked'), 'false');
    await clickToggle(page, 'projects');
    assert.equal(await page.locator('#projects').getAttribute('aria-checked'), 'false');
    await page.locator('#plan').focus(); await page.keyboard.press('Space');
    assert.equal(await page.locator('#projects').getAttribute('aria-checked'), 'mixed');
    await page.locator('#projects').focus(); await page.keyboard.press('Space');
    assert.equal(await page.locator('#overview').getAttribute('aria-checked'), 'true');
    assert.equal(await page.locator('#tree [aria-selected]').count(), 0);
  });
  await test('pending expansion can be cancelled by pointer; stale children never insert', async page => {
    await mount(page); await clickToggle(page, 'lazy');
    assert.equal(await expanded(page, 'lazy'), 'true');
    assert.equal(await page.locator('#lazy').getAttribute('aria-busy'), 'true');
    await clickToggle(page, 'lazy');
    assert.equal(await page.evaluate(() => requests[0].signal.aborted), true);
    assert.equal(await expanded(page, 'lazy'), 'false');
    await page.evaluate(() => requests[0].resolve([newTreeItem('stale')]));
    assert.equal(await page.locator('#stale').count(), 0);
    await clickToggle(page, 'lazy'); await page.evaluate(() => requests[1].resolve([newTreeItem('loaded')]));
    await page.waitForSelector('#loaded');
    assert.equal(await page.locator('#lazy').getAttribute('aria-busy'), null);
    assert.equal(await page.locator('#loaded').getAttribute('aria-selected'), null);
  });
  await test('collapsing an ancestor cancels its descendant requests', async page => {
    await mount(page);
    await page.evaluate(() => { document.querySelector('#engineering > [role=group]').appendChild(document.getElementById('lazy')); tree.refresh(); });
    await clickToggle(page, 'lazy'); await clickToggle(page, 'engineering');
    assert.equal(await page.evaluate(() => requests[0].signal.aborted), true);
    await page.evaluate(() => requests[0].resolve([newTreeItem('stale')]));
    assert.equal(await page.locator('#stale').count(), 0);
  });
  await test('loaded filter counts refresh after lazy insertion and clearing cancels temporary loads', async page => {
    await mount(page);
    await page.evaluate(() => {
      window.filterEvents = [];
      document.getElementById('tree').addEventListener('sk:tree:filter', event => filterEvents.push(event.detail));
      tree.filter('lazy');
    });
    assert.equal(await page.evaluate(() => filterEvents.length), 1);
    await clickToggle(page, 'lazy'); await page.evaluate(() => requests[0].resolve([newTreeItem('lazy-child', 'Lazy child')]));
    await page.waitForSelector('#lazy-child');
    assert.deepEqual(await page.evaluate(() => filterEvents.at(-1)), { query: 'lazy', matched: 2, total: 9 });
    await page.evaluate(() => tree.filter(''));
    assert.equal(await expanded(page, 'lazy'), 'false');
    await mount(page); await page.evaluate(() => tree.filter('lazy')); await clickToggle(page, 'lazy');
    await page.evaluate(() => tree.filter(''));
    assert.equal(await page.evaluate(() => requests[0].signal.aborted), true);
    await page.evaluate(() => requests[0].resolve([newTreeItem('stale')]));
    assert.equal(await page.locator('#stale').count(), 0);
  });
  await test('load failure retries, empty results remove expansion, and invalid IDs are retryable', async page => {
    await mount(page); await clickToggle(page, 'lazy');
    await page.evaluate(() => requests[0].reject(new Error('Offline')));
    await page.waitForSelector('#lazy[data-load-error]');
    assert.equal(await page.locator('#lazy').getAttribute('aria-busy'), null);
    await clickToggle(page, 'lazy');
    await page.evaluate(() => requests[1].resolve([newTreeItem('working', 'Duplicate')]));
    await page.waitForSelector('#lazy[data-load-error]');
    assert.equal(await page.locator('[data-value="working"]').count(), 1);
    await clickToggle(page, 'lazy'); await page.evaluate(() => requests[2].resolve([]));
    await page.waitForFunction(() => !document.getElementById('lazy').hasAttribute('aria-expanded'));
    assert.equal(await page.locator('#lazy').getAttribute('data-sk-loadable'), null);
    assert.equal(await page.locator('#lazy').getAttribute('data-load-error'), null);
  });
  await test('invalid mode or identity fails before mutation and installs no listeners', async page => {
    await page.setContent(style); await page.addScriptTag({ content: bundle });
    const errors = await page.evaluate(() => {
      return [
        { attributes: 'data-sk-tree-navigation', items: '<li role="treeitem"><span class="sk-tree__row"><span class="sk-tree__label">Missing</span></span></li>', options: {} },
        { attributes: 'data-sk-tree-navigation', items: '<li role="treeitem" data-value="same"></li><li role="treeitem" data-value="same"></li>', options: {} },
        { attributes: 'data-sk-tree-navigation', items: '<li role="treeitem" data-value="one"></li>', options: { multiSelect: true } },
      ].map(config => {
        const host = document.createElement('div'); host.innerHTML = '<ul class="sk-tree" role="tree" ' + config.attributes + '>' + config.items + '</ul>'; document.body.appendChild(host);
        const tree = host.firstElementChild, before = tree.outerHTML;
        try { Sekura.createTree(tree, config.options); return { code: 'no-error' }; }
        catch (error) { return { code: error.code, name: error.name, unchanged: before === tree.outerHTML }; }
        finally { host.remove(); }
      });
    });
    assert.deepEqual(errors.map(error => error.code), ['missing-node-id', 'duplicate-node-id', 'invalid-mode']);
    assert.ok(errors.every(error => error.name === 'TreeConfigurationError' && error.unchanged));
  });
  await test('destroy aborts work, restores filtering, and removes activation handlers', async page => {
    await mount(page); await clickToggle(page, 'lazy');
    await page.evaluate(() => { tree.filter('navigation'); tree.destroy(); requests[0].resolve([newTreeItem('dead')]); });
    assert.equal(await page.evaluate(() => requests[0].signal.aborted), true);
    assert.equal(await expanded(page, 'projects'), 'false');
    assert.equal(await page.locator('#private').getAttribute('hidden'), '');
    assert.equal(await page.locator('#working .sk-tree__label').getAttribute('title'), null);
    await page.locator('#working .sk-tree__label').click();
    assert.deepEqual(await page.evaluate(() => activations), []);
    assert.equal(await page.locator('#dead').count(), 0);
  });

  if (!process.argv.includes('--controllers-only')) {
    server = createDemoServer(); await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const base = 'http://127.0.0.1:' + server.address().port;
    await test('workspace routes, history and section links keep document and current page together', async page => {
      await page.goto(base + '/example-workspace.html');
      const pages = page.getByRole('button', { name: 'Pages', exact: true });
      const rail = page.locator('#workspace-pages');
      assert.equal(await page.locator('body.docs-workspace-app').count(), 1, 'Workspace uses its own application frame');
      assert.equal(await page.locator('#primary-nav').count(), 0, 'the document rail is the navigation for this frame');
      assert.equal(await rail.isVisible(), true, 'desktop Pages starts open');
      assert.equal(await pages.getAttribute('aria-expanded'), 'true');
      assert.notEqual(await rail.getAttribute('aria-modal'), 'true');
      assert.ok(Math.abs((await rail.boundingBox()).width - 272) < 1, 'document rail uses the fixed navigation token');
      await pages.click();
      assert.equal(await rail.isVisible(), false);
      await pages.click();
      assert.equal(await rail.isVisible(), true);
      await page.locator('[data-value="navigation-guidelines"] > .sk-tree__row > .sk-tree__label').click();
      assert.equal(await page.locator('#workspace-title').textContent(), 'Navigation guidelines');
      assert.equal(await page.locator('#workspace-tree [aria-current="page"]').getAttribute('data-value'), 'navigation-guidelines');
      assert.equal(await page.locator('.sk-content-header__context [aria-current="page"]').textContent(), 'Navigation guidelines');
      assert.equal(await active(page), 'workspace-title'); assert.match(page.url(), /#page=navigation-guidelines$/);
      await page.goBack(); await page.waitForFunction(() => document.getElementById('workspace-title').textContent === 'Working together');
      assert.equal(await page.locator('#workspace-tree [aria-current="page"]').getAttribute('data-value'), 'working-together');
      await page.goForward(); await page.waitForFunction(() => document.getElementById('workspace-title').textContent === 'Navigation guidelines');
      await page.getByRole('button', { name: 'Details', exact: true }).click();
      await page.getByRole('link', { name: 'Show the current location', exact: true }).click();
      assert.match(page.url(), /#page=navigation-guidelines&section=workspace-section-navigation-guidelines-0$/);
      await page.reload(); assert.equal(await page.locator('#workspace-title').textContent(), 'Navigation guidelines');
      assert.equal(await page.locator('#workspace-tree [aria-current="page"]').getAttribute('data-value'), 'navigation-guidelines');
      await page.goto(base + '/example-workspace.html?invalid-route#page=__proto__');
      assert.equal(await page.locator('#workspace-title').textContent(), 'Working together');
    }, { width: 1440, height: 1000 });
    await test('workspace mobile filter, clear, reveal and full title are usable at 320px', async page => {
      await page.goto(base + '/example-workspace.html'); await page.getByRole('button', { name: 'Pages', exact: true }).click();
      const drawer = page.locator('#workspace-pages');
      assert.equal(await drawer.getAttribute('aria-modal'), 'true');
      await page.locator('#workspace-page-filter').fill('navigation');
      await page.waitForFunction(() => document.getElementById('workspace-tree-status').textContent.startsWith('2 matching'));
      assert.equal(await page.locator('[data-value="projects"]').isVisible(), true);
      assert.equal(await page.locator('[data-value="navigation-plan"]').isVisible(), true);
      await page.getByRole('button', { name: 'Clear filter', exact: true }).click();
      assert.equal(await page.locator('[data-value="projects"]').getAttribute('aria-expanded'), 'false');
      await page.locator('#workspace-page-filter').fill('no matches');
      await page.waitForSelector('#workspace-tree-empty:not([hidden])');
      await page.getByRole('button', { name: 'Reveal current', exact: true }).click();
      assert.equal(await page.locator('#workspace-page-filter').inputValue(), '');
      assert.equal(await page.evaluate(() => document.activeElement.dataset.value), 'working-together');
      const longLabel = page.locator('[data-value="design-reviews"] .sk-tree__label');
      assert.equal(await longLabel.getAttribute('title'), 'Design reviews and decision records');
      assert.equal(await drawer.evaluate(el => el.scrollWidth <= el.clientWidth + 1), true);
      const target = await page.locator('[data-value="handbook"] > .sk-tree__row > .sk-tree__toggle').boundingBox();
      assert.ok(target.width >= 44 && target.height >= 44);
      await page.keyboard.press('Escape'); assert.equal(await drawer.isVisible(), false);
      assert.equal(await page.getByRole('button', { name: 'Pages', exact: true }).evaluate(el => el === document.activeElement), true);
    }, { width: 320, height: 900 });
  }
} finally { if (server) server.close(); await browser.close(); }
console.log(`Navigation tree: ${passed} passed, ${failures.length} failed`);
if (failures.length) { console.error(failures.join('\n')); process.exitCode = 1; }
