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
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    const test = async (label, run) => { try { await run(); passed++; console.log(`PASS ${name}: ${label}`); } catch (e) { failures.push(`${name}: ${label}: ${e.message}`); } };
    try {
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
        await page.screenshot({ path: `.run/review/${name}-workspace-details.png` });
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
          await page.screenshot({ path: `.run/review/${name}-workspace-${theme}.png` });
        }
        await page.setViewportSize({ width: 390, height: 844 });
        await page.screenshot({ path: `.run/review/${name}-workspace-mobile.png` });
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
