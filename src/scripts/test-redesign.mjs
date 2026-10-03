/** Migration and workspace acceptance against the generated assets. */
import assert from 'node:assert/strict';
import { chromium, firefox, webkit } from 'playwright-core';
import { createDemoServer } from './demo-server.mjs';
import { mkdirSync } from 'node:fs';
const server = createDemoServer();
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}`;
mkdirSync('.run/review', { recursive: true });
let passed = 0;
const failures = [];
try {
  for (const [name, engine] of Object.entries({ chromium, firefox, webkit })) {
    const browser = await engine.launch();
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
    page.setDefaultTimeout(5000);
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    const test = async (label, run) => { try { await page.setViewportSize({ width: 1440, height: 1000 }); await run(); passed++; console.log(`PASS ${name}: ${label}`); } catch (e) { failures.push(`${name}: ${label}: ${e.message}`); } };
    try {
      await test('project search, dates and filters share border alignment in every density', async () => {
        await page.goto(base + '/example-list.html');
        const selector = '[data-sk-project-filters] .sk-field__control, [data-sk-project-filters] button';
        for (const [density, height] of [['comfortable', 32], ['compact', 28], ['dense', 24]]) {
          await page.evaluate(mode => document.documentElement.dataset.skDensity = mode, density);
          await page.waitForFunction(({ selector, height }) => Array.from(document.querySelectorAll(selector)).every(el => Math.abs(el.getBoundingClientRect().height - height) < 1), { selector, height }, { timeout: 1500 });
          const boxes = await page.locator(selector).evaluateAll(es => es.map(el => { const r = el.getBoundingClientRect(); return { top: r.top, height: r.height }; }));
          assert.ok(boxes.every(r => Math.abs(r.height - height) < 1 && Math.abs(r.top - boxes[0].top) < 1), JSON.stringify({ density, boxes }));
        }
        await page.locator('label[for=due-from]').evaluate(el => { el.textContent = 'Earliest planned delivery date for the selected project group'; });
        const tops = await page.locator(selector).evaluateAll(es => es.map(el => el.getBoundingClientRect().top));
        assert.ok(Math.max(...tops) - Math.min(...tops) < 1, 'wrapped label shifts the control track');
        await page.locator('label[for=due-from]').evaluate(el => { el.textContent = 'Due from'; });
        await page.locator('#due-from').fill('2026-08-01');
        await page.locator('#due-to').fill('2026-12-31');
        await page.locator('#project-q').fill('Website');
        assert.equal(await page.locator('#project-table tbody tr:visible').count(), 1);
        await page.evaluate(() => { document.documentElement.dataset.skTheme = 'dark'; document.documentElement.dataset.skDensity = 'comfortable'; });
        await page.screenshot({ animations: 'disabled', path: `.run/review/${name}-project-charcoal.png` });
        const style = await page.locator('.sk-badge').first().evaluate(el => ({ radius: getComputedStyle(el).borderTopLeftRadius, text: getComputedStyle(document.documentElement).getPropertyValue('--sk-color-text-secondary').trim() }));
        assert.equal(style.radius, '4px'); assert.equal(style.text, '#f1f1f1');
        await page.setViewportSize({ width: 320, height: 800 });
        await page.addStyleTag({ content: 'html { font-size: 200%; }' });
        for (const dir of ['ltr', 'rtl']) {
          await page.evaluate(value => document.documentElement.dir = value, dir);
          assert.equal(await page.locator('main').evaluate(el => el.scrollWidth <= el.clientWidth + 1), true);
        }
        await page.setViewportSize({ width: 1440, height: 1000 });
      });
      await test('filter action groups align wrapped buttons and reset all filter constraints', async () => {
        await page.goto(base + '/example-list.html');
        const group = page.locator('[data-sk-project-filters] .sk-field-row__action-group');
        await page.locator('#project-q-hint').evaluate(el => { el.textContent = 'Long translated project guidance. '.repeat(10); });
        const boxes = await page.locator('[data-sk-project-filters] .sk-field__control, [data-sk-project-filters] button').evaluateAll(es => es.map(el => el.getBoundingClientRect().top));
        assert.ok(Math.max(...boxes) - Math.min(...boxes) < 1, 'hints moved the action row');
        await page.locator('#project-q').fill('Website');
        await page.locator('#due-from').fill('2026-08-01');
        await page.locator('#due-to').fill('2026-12-31');
        await group.getByRole('button', { name: 'Reset', exact: true }).click();
        for (const id of ['project-q', 'due-from', 'due-to']) assert.equal(await page.locator('#' + id).inputValue(), '');
        assert.equal(await page.locator('#due-from').getAttribute('max'), '');
        assert.equal(await page.locator('#due-to').getAttribute('min'), '');
        assert.equal(await page.locator('#project-table tbody tr:visible').count(), 4);
        await group.locator('button').first().evaluate(el => {
          el.style.maxInlineSize = '7rem';
          el.querySelector('.sk-button__label').textContent = 'Apply all project filters';
        });
        for (const direction of ['ltr', 'rtl']) {
          await page.evaluate(dir => document.documentElement.dir = dir, direction);
          const peers = await group.locator('button').evaluateAll(es => es.map(el => { const r = el.getBoundingClientRect(); return { top: r.top, bottom: r.bottom, left: r.left, right: r.right }; }));
          assert.ok(Math.abs(peers[0].top - peers[1].top) < 1 && Math.abs(peers[0].bottom - peers[1].bottom) < 1, JSON.stringify(peers));
          assert.ok(peers[0].right + 7 <= peers[1].left || peers[1].right + 7 <= peers[0].left, 'action buttons overlap');
        }
        await page.evaluate(() => document.documentElement.dir = 'ltr');
        await page.screenshot({ animations: 'disabled', path: `.run/review/${name}-aligned-filter-actions.png` });
        await page.setViewportSize({ width: 320, height: 800 });
        await page.addStyleTag({ content: 'html { font-size: 200%; }' });
        for (const direction of ['ltr', 'rtl']) {
          await page.evaluate(dir => document.documentElement.dir = dir, direction);
          assert.equal(await page.locator('main').evaluate(el => el.scrollWidth <= el.clientWidth + 1), true, direction);
          assert.equal(await group.evaluate(el => el.scrollWidth <= el.clientWidth + 1), true, direction + ' action overflow');
        }
      });
      await test('explanations precede controls and section headers align comparison actions', async () => {
        await page.setViewportSize({ width: 2200, height: 1100 });
        await page.goto(base + '/workbench.html');
        const filter = page.locator('[data-sk-alignment-filters]');
        const compare = page.locator('[data-sk-alignment-compare]');
        for (const density of ['comfortable', 'compact', 'dense']) {
          await page.evaluate(value => document.documentElement.dataset.skDensity = value, density);
          for (const form of [filter, compare]) {
            const boxes = await form.locator('.sk-field__control, button').evaluateAll(es => es.map(el => { const r = el.getBoundingClientRect(); return { top: r.top, bottom: r.bottom }; }));
            assert.ok(Math.max(...boxes.map(b => b.top)) - Math.min(...boxes.map(b => b.top)) < 1, JSON.stringify({ density, boxes }));
          }
        }
        const ordering = await page.locator('#bench-project-key').evaluate(input => {
          const label = input.parentElement.querySelector('label'), hint = document.getElementById('bench-project-key-hint');
          return label.getBoundingClientRect().bottom <= hint.getBoundingClientRect().top && hint.getBoundingClientRect().bottom <= input.getBoundingClientRect().top && !!(hint.compareDocumentPosition(input) & Node.DOCUMENT_POSITION_FOLLOWING);
        });
        assert.equal(ordering, true, 'explanation must be under the label and above its control');
        const headerTops = await page.locator('[data-sk-alignment-header] .sk-page-header__title, [data-sk-alignment-header] .sk-page-header__controls').evaluateAll(es => es.map(el => el.getBoundingClientRect().top));
        assert.ok(Math.abs(headerTops[0] - headerTops[1]) < 1, JSON.stringify(headerTops));
        await page.locator('#bench-project-key').fill('SekuraDesignMCP');
        await filter.getByRole('button', { name: 'Apply filters' }).click();
        assert.match(await page.locator('[data-sk-alignment-filter-state]').textContent(), /SekuraDesignMCP/);
        await filter.getByRole('button', { name: 'Reset', exact: true }).click();
        assert.equal(await page.locator('#bench-project-key').inputValue(), '');
        await compare.getByRole('button', { name: 'Compare runs' }).click();
        assert.match(await page.locator('[data-sk-alignment-compare-state]').textContent(), /run-001.*run-002/);
        await compare.getByRole('button', { name: 'Reset selection' }).click();
        await page.evaluate(() => document.documentElement.dataset.skTheme = 'dark');
        await page.locator('[data-sk-alignment-header]').screenshot({ path: `.run/review/${name}-comparison-alignment.png` });
        await page.setViewportSize({ width: 320, height: 800 });
        await page.addStyleTag({ content: 'html { font-size: 200%; }' });
        for (const dir of ['ltr', 'rtl']) {
          await page.evaluate(value => document.documentElement.dir = value, dir);
          for (const root of [filter, compare, page.locator('[data-sk-alignment-header]')]) assert.equal(await root.evaluate(el => el.scrollWidth <= el.clientWidth + 1), true, dir + ' overflow');
        }
      });
      await test('dropdown indicators stay visible without hover and focused comboboxes reopen', async () => {
        await page.goto(base + '/workbench.html');
        await page.mouse.move(0, 0);
        for (const theme of ['light', 'dark', 'hc-light', 'hc-dark']) {
          await page.evaluate(value => document.documentElement.dataset.skTheme = value, theme);
          for (const selector of ['#bench-project-key', '#bench-theme', '#bench-async']) {
            const control = page.locator(selector);
            assert.ok((await control.evaluate(el => getComputedStyle(el).backgroundImage)).includes('linear-gradient'), theme + ' ' + selector);
          }
        }
        await page.emulateMedia({ forcedColors: 'active' });
        assert.ok((await page.locator('#bench-project-key').evaluate(el => getComputedStyle(el).backgroundImage)).includes('linear-gradient'));
        assert.equal(await page.locator('#bench-theme').evaluate(el => getComputedStyle(el).backgroundImage), 'none', 'forced colors restores only the native select arrow');
        await page.emulateMedia({ forcedColors: 'none' });
        await page.goto(base + '/component-combobox.html');
        const input = page.locator('input[data-sk-combobox]').first();
        await input.focus(); assert.equal(await input.getAttribute('aria-expanded'), 'true');
        await page.keyboard.press('Escape'); assert.equal(await input.getAttribute('aria-expanded'), 'false');
        await input.click(); assert.equal(await input.getAttribute('aria-expanded'), 'true');
        await page.keyboard.press('Escape');
        await input.evaluate(el => el.readOnly = true); await input.click();
        assert.equal(await input.getAttribute('aria-expanded'), 'false');
        const touch = await browser.newContext({ hasTouch: true, viewport: { width: 390, height: 844 } });
        try { const mobile = await touch.newPage(); await mobile.goto(base + '/workbench.html'); assert.ok((await mobile.locator('#bench-project-key').evaluate(el => getComputedStyle(el).backgroundImage)).includes('linear-gradient')); } finally { await touch.close(); }
      });
      await test('sidebar separates parent navigation, expansion and the current child page', async () => {
        await page.goto(base + '/component-button.html');
        const nav = page.locator('#primary-nav');
        const toggle = nav.getByRole('button', { name: 'Components pages', exact: true });
        const children = nav.locator('#nav-components-children');
        assert.equal(await toggle.getAttribute('aria-expanded'), 'true');
        assert.equal(await nav.locator('[aria-current="page"]').count(), 1);
        assert.equal(await nav.locator('[aria-current="page"]').getAttribute('href'), 'component-button.html');
        assert.equal(await nav.locator('a[href="components.html"]').getAttribute('aria-current'), null);
        assert.equal(await nav.locator('a[href="components.html"]').getAttribute('data-active-ancestor'), '');
        for (const dir of ['ltr', 'rtl']) {
          await page.evaluate(value => document.documentElement.dir = value, dir);
          await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
          const geometry = await children.evaluate(el => {
            const parent = el.previousElementSibling.getBoundingClientRect(), child = el.querySelector('a').getBoundingClientRect();
            return { dir: getComputedStyle(el).direction, parentLeft: parent.left, parentRight: parent.right, left: child.left, right: child.right };
          });
          assert.ok(dir === 'ltr' ? geometry.left > geometry.parentLeft + 16 : geometry.right < geometry.parentRight - 16, JSON.stringify({ dir, ...geometry }));
        }
        await page.evaluate(() => document.documentElement.dir = 'ltr');
        await toggle.focus(); await page.keyboard.press('Space');
        assert.equal(await toggle.getAttribute('aria-expanded'), 'false');
        await children.waitFor({ state: 'hidden' });
        await page.keyboard.press('Tab');
        assert.equal(await page.evaluate(() => !!document.activeElement.closest('#nav-components-children')), false);
        await toggle.focus(); await page.keyboard.press('Enter');
        assert.equal(await toggle.getAttribute('aria-expanded'), 'true');
        await children.waitFor({ state: 'visible' });
        await nav.getByRole('link', { name: 'Checkbox', exact: true }).click();
        assert.ok(page.url().endsWith('/component-checkbox.html'));
        assert.equal(await nav.locator('[aria-current="page"]').getAttribute('href'), 'component-checkbox.html');
        assert.equal(await nav.getByRole('button', { name: 'Components pages', exact: true }).getAttribute('aria-expanded'), 'true');
        await page.screenshot({ animations: 'disabled', path: `.run/review/${name}-sidebar-hierarchy.png` });
      });
      await test('schedule inputs align despite long labels, hints and validation', async () => {
        await page.goto(base + '/example-form.html');
        const controls = page.locator('[data-sk-project-schedule] .sk-field__control');
        await page.locator('label[for=start-date]').evaluate(el => { el.textContent = 'Planned start date for this project and its dependent work'; });
        await page.locator('#start-date-hint').evaluate(el => { el.textContent = 'Long translated guidance. '.repeat(12); });
        await page.locator('#target-days').fill(''); await page.locator('#target-days').blur();
        assert.equal(await page.locator('#target-days-error').isVisible(), true);
        assert.equal(await page.locator('#target-days-error').evaluate(el => el.parentElement.classList.contains('sk-field__support')), true);
        const boxes = await controls.evaluateAll(es => es.map(el => { const r = el.getBoundingClientRect(); return { top: r.top, height: r.height }; }));
        assert.ok(Math.abs(boxes[0].top - boxes[1].top) < 1 && Math.abs(boxes[0].height - boxes[1].height) < 1, JSON.stringify(boxes));
        await page.locator('#target-days').fill('45'); await page.locator('#target-days').blur();
        assert.equal(await page.locator('#target-days-error').count(), 0);
      });
      await test('open documents stay separate from collapsible menu children', async () => {
        await page.goto(base + '/workbench.html');
        const nav = page.locator('[data-sk-open-items-example]');
        const openItems = nav.locator('.sk-side-nav__open-items');
        assert.equal(await openItems.getByRole('heading', { name: 'Open items', exact: true }).count(), 1);
        assert.equal(await openItems.locator('.sk-side-nav__children').count(), 0);
        assert.equal(await openItems.getByRole('link').count(), 2);
        assert.ok(await openItems.evaluate(el => parseFloat(getComputedStyle(el).borderBlockStartWidth) > 0));
        const toggle = nav.getByRole('button', { name: 'Project pages', exact: true });
        await toggle.click();
        await nav.locator('#bench-project-pages').waitFor({ state: 'hidden' });
        for (const link of await openItems.getByRole('link').all()) assert.equal(await link.isVisible(), true);
        await toggle.click();
        await nav.locator('#bench-project-pages').waitFor({ state: 'visible' });
        await nav.screenshot({ path: `.run/review/${name}-open-documents.png` });
        await openItems.getByRole('link', { name: 'Document workspace' }).click();
        assert.ok(page.url().endsWith('/example-workspace.html'));
      });
      await test('touch input expands every peer in the filter row consistently', async () => {
        const touch = await browser.newContext({ hasTouch: true, viewport: { width: 1440, height: 1000 } });
        try {
          const mobile = await touch.newPage(); await mobile.goto(base + '/example-list.html');
          const heights = await mobile.locator('[data-sk-project-filters] .sk-field__control, [data-sk-project-filters] button').evaluateAll(es => es.map(el => el.getBoundingClientRect().height));
          assert.ok(heights.every(h => h >= 44) && Math.max(...heights) - Math.min(...heights) < 1, JSON.stringify(heights));
        } finally { await touch.close(); }
      });
      await test('notes and stars persist locally; storage failure preserves the draft', async () => {
        await page.goto(base + '/example-workspace.html');
        await page.locator('#workspace-note').fill('Review the next decision with the team.');
        await page.getByRole('button', { name: 'Save note', exact: true }).click();
        assert.match(await page.locator('[data-sk-workspace-save]').textContent(), /Saved on this device/);
        await page.locator('[data-sk-workspace-star]').click();
        await page.reload();
        assert.equal(await page.locator('#workspace-note').inputValue(), 'Review the next decision with the team.');
        assert.equal(await page.locator('[data-sk-workspace-star]').getAttribute('aria-pressed'), 'true');
        await page.evaluate(() => {
          const set = Storage.prototype.setItem;
          Storage.prototype.setItem = function (key, value) { if (key === 'sk-demo-workspace-note') throw new DOMException('Full', 'QuotaExceededError'); return set.call(this, key, value); };
        });
        await page.locator('#workspace-note').fill('Keep this unsaved text.');
        await page.getByRole('button', { name: 'Save note', exact: true }).click();
        assert.equal(await page.locator('[data-sk-workspace-error]').isVisible(), true);
        assert.equal(await page.locator('#workspace-note').inputValue(), 'Keep this unsaved text.');
        assert.equal(await page.locator('[data-sk-workspace-save]').getAttribute('data-state'), 'error');
      });
      await test('desktop navigation supports persisted collapse and keyboard resizing', async () => {
        await page.goto(base + '/example-workspace.html');
        await page.locator('.docs-nav-preferences summary').click();
        await page.locator('#nav-width').focus(); await page.keyboard.press('End');
        assert.equal(Math.round((await page.locator('#primary-nav').boundingBox()).width), 400);
        await page.locator('[data-sk-nav-reset]').click();
        assert.equal(Math.round((await page.locator('#primary-nav').boundingBox()).width), 272);
        await page.locator('.sk-top-bar__nav-trigger').click();
        assert.equal(await page.locator('#primary-nav').isVisible(), false);
        await page.reload(); assert.equal(await page.locator('#primary-nav').isVisible(), false);
        await page.locator('.sk-top-bar__nav-trigger').click();
        assert.equal(await page.locator('#primary-nav').isVisible(), true);
      });
      await test('details dock on desktop and become a real modal on mobile', async () => {
        await page.goto(base + '/example-workspace.html');
        await page.getByRole('button', { name: 'Details', exact: true }).click();
        assert.equal(await page.locator('#workspace-details').getAttribute('role'), 'complementary');
        const article = await page.locator('.sk-document').boundingBox();
        const panel = await page.locator('#workspace-details').boundingBox();
        assert.ok(article.x + article.width <= panel.x + 1, 'panel covers document');
        await page.getByRole('button', { name: 'Close document details' }).click();
        await page.setViewportSize({ width: 390, height: 844 });
        await page.getByRole('button', { name: 'Details', exact: true }).click();
        assert.equal(await page.locator('#workspace-details').getAttribute('aria-modal'), 'true');
        assert.equal(await page.locator('.sk-document').evaluate(el => el.inert), true);
        assert.equal(await page.locator('.sk-drawer__backdrop').count(), 1);
        await page.screenshot({ animations: 'disabled', path: `.run/review/${name}-workspace-details.png` });
        await page.keyboard.press('Escape');
        assert.equal(await page.locator('#workspace-details').isVisible(), false);
        assert.equal(await page.locator('.sk-document').evaluate(el => el.inert), false);
        assert.equal(await page.getByRole('button', { name: 'Details', exact: true }).evaluate(el => el === document.activeElement), true);
        await page.getByRole('button', { name: 'Details', exact: true }).click();
        await page.getByRole('link', { name: 'A weekly rhythm', exact: true }).click();
        assert.equal(await page.locator('#workspace-details').isVisible(), false);
        assert.equal(await page.evaluate(() => document.activeElement.id), 'weekly-rhythm');
        await page.setViewportSize({ width: 1440, height: 1000 });
      });
      await test('existing drawer size and bottom variants retain their geometry', async () => {
        await page.goto(base + '/example-workspace.html');
        const dimensions = await page.evaluate(() => {
          return ['sm', 'lg', 'bottom'].map(variant => {
            const drawer = document.createElement('aside');
            drawer.className = 'sk-drawer ' + (variant === 'bottom' ? 'sk-drawer--bottom' : 'sk-drawer--modal sk-drawer--' + variant);
            drawer.innerHTML = '<h2>Preview</h2><button>Close</button>';
            document.body.appendChild(drawer);
            const controller = Sekura.createDrawer(drawer, { modal: true }); controller.show();
            const rect = drawer.getBoundingClientRect();
            const result = { width: rect.width, height: rect.height, bottom: rect.bottom };
            controller.destroy(); drawer.remove(); return result;
          });
        });
        assert.equal(dimensions[0].width, 320);
        assert.equal(dimensions[1].width, 640);
        assert.ok(dimensions[2].height <= 850 && Math.abs(dimensions[2].bottom - 1000) < 1);
      });
      await test('v2 geometry bridge preserves control dimensions in all density modes', async () => {
        await page.goto(base + '/workbench.html');
        await page.locator('[data-sk-bench-density]').selectOption('comfortable');
        const region = page.locator('[data-sk-size-row="md"]');
        await region.evaluate(el => { el.dataset.skGeometry = 'v2'; });
        for (const [density, height] of [['comfortable', 40], ['compact', 36], ['dense', 32]]) {
          await region.evaluate((el, mode) => { el.dataset.skDensity = mode; }, density);
          await page.waitForFunction(({ density, height }) => {
            const row = document.querySelector('[data-sk-size-row="md"]');
            return row.dataset.skDensity === density && Array.from(row.children).every(el => Math.abs(el.getBoundingClientRect().height - height) < 1);
          }, { density, height }, { timeout: 1500 });
          const heights = await region.evaluate(el => Array.from(el.children).map(child => child.getBoundingClientRect().height));
          assert.ok(heights.every(value => Math.abs(value - height) < 1), `${density}: ${heights}`);
        }
      });
      await test('workspace reflows in RTL and zoom; capture light, dark and mobile', async () => {
        await page.goto(base + '/example-workspace.html');
        for (const theme of ['light', 'dark']) {
          await page.evaluate(theme => document.documentElement.dataset.skTheme = theme, theme);
          await page.screenshot({ animations: 'disabled', path: `.run/review/${name}-workspace-${theme}.png` });
        }
        await page.setViewportSize({ width: 390, height: 844 });
        await page.screenshot({ animations: 'disabled', path: `.run/review/${name}-workspace-mobile.png` });
        await page.addStyleTag({ content: 'html { font-size: 200%; }' });
        for (const dir of ['ltr', 'rtl']) {
          await page.evaluate(dir => document.documentElement.dir = dir, dir);
          const fits = await page.locator('main').evaluate(el => el.scrollWidth <= el.clientWidth + 1);
          assert.equal(fits, true, `${dir} document overflow`);
        }
        assert.deepEqual(errors, []);
      });
    } finally { await browser.close(); }
  }
} finally { server.close(); }
console.log(`Redesign acceptance: ${passed} passed, ${failures.length} failed`);
if (failures.length) { console.error(failures.join('\n')); process.exitCode = 1; }
