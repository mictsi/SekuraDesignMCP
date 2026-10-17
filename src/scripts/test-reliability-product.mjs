/** Product acceptance against the actual generated documentation and samples. */
import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { chromium, firefox, webkit } from 'playwright-core';
import { createDemoServer } from './demo-server.mjs';

const server = createDemoServer();
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}`;
mkdirSync('.run/review', { recursive: true });
const failures = [];
let passed = 0;

try {
  for (const [engineName, engine] of Object.entries({ chromium, firefox, webkit })) {
    const browser = await engine.launch();
    async function test(label, run) {
      const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce', colorScheme: 'light' });
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      page.setDefaultTimeout(6000);
      try {
        await run(page);
        assert.deepEqual(errors, [], 'uncaught page errors');
        passed++;
        console.log(`PASS product ${engineName}: ${label}`);
      } catch (error) {
        failures.push(`${engineName} ${label}: ${error.stack ?? error}`);
        console.error(`FAIL product ${engineName}: ${label}: ${error.message}`);
      } finally { await page.close(); }
    }

    try {
      await test('blocked storage preserves theme choice and explains its lifetime', async page => {
        await page.addInitScript(() => {
          Storage.prototype.getItem = function () { throw new DOMException('Blocked', 'SecurityError'); };
          Storage.prototype.setItem = function () { throw new DOMException('Blocked', 'SecurityError'); };
        });
        await page.goto(base + '/example-settings.html');
        await page.locator('main [data-sk-theme-option="dark"]').click();
        assert.equal(await page.locator('html').getAttribute('data-sk-theme'), 'dark');
        assert.equal(await page.evaluate(() => window.sekuraTheme.get()), 'dark');
        assert.equal(await page.locator('main [data-sk-theme-option="dark"]').getAttribute('aria-checked'), 'true');
        assert.match(await page.locator('[data-sk-theme-persistence]').textContent(), /Applied for this page.*unavailable/);
        await page.locator('main [data-sk-theme-option="light"]').click();
        assert.equal(await page.locator('html').getAttribute('data-sk-theme'), 'light');
        await page.evaluate(() => window.dispatchEvent(new StorageEvent('storage', { key: 'sk-theme', newValue: 'dark' })));
        assert.equal(await page.locator('html').getAttribute('data-sk-theme'), 'dark');
        assert.equal(await page.locator('main [data-sk-theme-option="dark"]').getAttribute('aria-checked'), 'true');
      });

      await test('token filtering keeps contents and current location usable', async page => {
        await page.goto(base + '/tokens.html');
        const count = await page.locator('.docs-toc__link:visible').count();
        await page.locator('[data-sk-token-filter]').fill('color-text-primary');
        await page.waitForFunction(() => document.querySelectorAll('.token-table tbody tr:not([hidden])').length === 1);
        const matchingSection = await page.locator('.token-table tbody tr:not([hidden])').evaluate(row => row.closest('.docs-section').id);
        assert.equal(await page.locator(`.docs-toc__link[href="#${matchingSection}"]`).isVisible(), true);
        assert.equal(await page.locator('.docs-toc__link:visible').evaluateAll(links => links.every(link => {
          const target = document.getElementById(link.hash.slice(1));
          return target && !target.closest('[hidden]') && target.getClientRects().length > 0;
        })), true);
        await page.locator('[data-sk-token-filter]').fill('control-height-sm');
        await page.waitForFunction(() => document.querySelectorAll('.token-table tbody tr:not([hidden])').length === 1 && document.querySelector('.token-table tbody tr:not([hidden])').textContent.includes('control-height-sm'));
        assert.equal(await page.locator('.docs-toc__link[href="#scales"]').isVisible(), true);
        assert.match(await page.locator('[data-sk-token-count]').textContent(), /^1 token matches/);
        await page.locator('[data-sk-token-filter]').fill('no-token-matches-this-query');
        await page.waitForFunction(() => document.querySelectorAll('.token-table tbody tr:not([hidden])').length === 0);
        assert.equal(await page.locator('.docs-toc__link:visible').count(), 0);
        assert.equal(await page.locator('.docs-toc__link[aria-current]').evaluateAll(links => links.every(link => !document.getElementById(link.hash.slice(1)).hidden)), true);
        await page.locator('[data-sk-token-filter]').press('Escape');
        await page.waitForFunction(expected => Array.from(document.querySelectorAll('.docs-toc__link')).filter(link => !link.closest('[hidden]')).length === expected, count);
      });

      await test('sample toast queue retains focus after pointer leave and overflow', async page => {
        await page.goto(base + '/index.html');
        await page.evaluate(() => window.sekuraToast({ message: 'First message', duration: 400, action: { label: 'Keep first', onClick() {} } }));
        const first = page.locator('.sk-toast').filter({ hasText: 'First message' });
        await first.hover();
        await page.getByRole('button', { name: 'Keep first', exact: true }).focus();
        await page.mouse.move(4, 4);
        await page.evaluate(() => {
          for (const message of ['Second message', 'Third message', 'Fourth message', 'Fifth message']) window.sekuraToast({ message, duration: 0 });
        });
        await page.waitForTimeout(550);
        assert.equal(await page.locator('.sk-toast').count(), 3);
        assert.equal(await first.isVisible(), true);
        assert.equal(await page.getByRole('button', { name: 'Keep first', exact: true }).evaluate(el => el === document.activeElement), true);
        assert.equal(await page.locator('.sk-toast').filter({ hasText: 'Fourth message' }).count(), 0);
        await first.locator('[data-sk-toast-dismiss]').click();
        assert.equal(await page.locator('.sk-toast').filter({ hasText: 'Fourth message' }).isVisible(), true);
        assert.equal(await page.locator('.sk-toast').filter({ hasText: 'Fifth message' }).count(), 0);
      });

      await test('Workspace has one app frame and fixed navigation without sizing controls', async page => {
        await page.addInitScript(() => {
          localStorage.setItem('sk-nav-width', '400');
          Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async value => { window.copiedLink = value; } } });
        });
        await page.goto(base + '/example-workspace.html');
        assert.equal(await page.locator('main').count(), 1);
        assert.equal(await page.locator('#primary-nav, #command-palette, .sk-top-bar').count(), 0);
        assert.equal(await page.getByRole('link', { name: 'Back to documentation', exact: true }).isVisible(), true);
        assert.equal(await page.locator('#workspace-pages').isVisible(), true);
        assert.equal(Math.round((await page.locator('#workspace-pages').boundingBox()).width), 272);
        assert.equal(await page.locator('#nav-width, [data-sk-nav-width], [data-sk-nav-reset]').count(), 0);
        assert.equal(await page.getByRole('searchbox', { name: 'Search workspace pages', exact: true }).isVisible(), true);
        await page.screenshot({ path: `.run/review/${engineName}-v320-workspace-desktop.png`, animations: 'disabled' });
        await page.locator('[data-sk-workspace-pages-toggle]').click();
        assert.equal(await page.locator('#workspace-pages').isVisible(), false);
        await page.locator('[data-sk-workspace-pages-toggle]').click();
        assert.equal(await page.locator('#workspace-pages').isVisible(), true);
        await page.locator('[data-value="navigation-guidelines"] > .sk-tree__row .sk-tree__label').click();
        assert.match(page.url(), /page=navigation-guidelines/);
        await page.getByRole('button', { name: 'Copy link', exact: true }).click();
        assert.equal(await page.evaluate(() => window.copiedLink), page.url());
      });

      await test('responsive Pages and Document actions preserve a visible focus target', async page => {
        await page.goto(base + '/example-workspace.html');
        await page.locator('#workspace-page-filter').focus();
        await page.setViewportSize({ width: 390, height: 844 });
        await page.waitForFunction(() => document.activeElement?.hasAttribute('data-sk-workspace-pages-toggle'));
        assert.equal(await page.locator('#workspace-pages').isVisible(), false);
        await page.locator('[data-sk-workspace-pages-toggle]').click();
        assert.equal(await page.locator('#workspace-pages').getAttribute('aria-modal'), 'true');
        assert.equal(await page.locator('.sk-document').evaluate(el => el.inert), true);
        await page.keyboard.press('Escape');
        assert.equal(await page.locator('.sk-document').evaluate(el => el.inert), false);
        assert.equal(await page.locator('[data-sk-workspace-pages-toggle]').evaluate(el => el === document.activeElement), true);
        const summary = page.locator('.docs-workspace-more > summary');
        await summary.click();
        await page.getByRole('button', { name: 'Details', exact: true }).click();
        assert.equal(await page.locator('#workspace-details').getAttribute('aria-modal'), 'true');
        assert.equal(await page.locator('[data-sk-drawer-open="workspace-details"]').getAttribute('aria-expanded'), 'true');
        await page.keyboard.press('Escape');
        assert.equal(await page.locator('[data-sk-drawer-open="workspace-details"]').getAttribute('aria-expanded'), 'false');
        assert.equal(await page.getByRole('button', { name: 'Details', exact: true }).evaluate(el => el === document.activeElement), true);
        await page.setViewportSize({ width: 1440, height: 1000 });
        await page.waitForFunction(() => {
          const actions = document.querySelector('.docs-workspace-more');
          return actions.open && actions.querySelector('summary').hidden;
        });
        await page.locator('[data-sk-workspace-star]').focus();
        assert.equal(await page.locator('[data-sk-workspace-star]').evaluate(el => el === document.activeElement), true);
        await page.setViewportSize({ width: 390, height: 844 });
        await page.waitForFunction(() => document.activeElement?.matches('.docs-workspace-more > summary'));
        assert.equal(await page.locator('.docs-workspace-more').evaluate(el => el.open), false);
        await page.screenshot({ path: `.run/review/${engineName}-v320-workspace-mobile.png`, animations: 'disabled' });
        await page.setViewportSize({ width: 1440, height: 1000 });
        await page.waitForFunction(() => document.activeElement?.hasAttribute('data-sk-workspace-star'));
      });

      await test('narrow RTL and enlarged text retain Workspace controls and content', async page => {
        await page.goto(base + '/example-workspace.html');
        await page.setViewportSize({ width: 320, height: 800 });
        await page.addStyleTag({ content: 'html { font-size: 200%; }' });
        for (const direction of ['ltr', 'rtl']) {
          await page.evaluate(dir => document.documentElement.dir = dir, direction);
          assert.equal(await page.locator('main').evaluate(el => el.scrollWidth <= el.clientWidth + 1), true, `${direction}: whole-page overflow`);
          assert.equal(await page.locator('[data-sk-workspace-pages-toggle]').isVisible(), true);
          assert.equal(await page.locator('.docs-workspace-more > summary').isVisible(), true);
        }
      });

      await test('component examples lead the page and copied state matches the preview', async page => {
        await page.addInitScript(() => Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async value => { window.copiedMarkup = value; } } }));
        await page.goto(base + '/component-button.html');
        assert.equal(await page.locator('main .docs-section').first().getAttribute('id'), 'example');
        assert.match(await page.locator('.docs-capabilities').textContent(), /Native React Button/);
        assert.match(await page.locator('.docs-capabilities').textContent(), /Included in the Figma starter/);
        await page.locator('[data-docs-preview-theme]').selectOption('dark');
        await page.locator('[data-docs-preview-density]').selectOption('dense');
        await page.locator('[data-docs-preview-state]').selectOption('disabled');
        assert.equal(await page.locator('[data-docs-component-preview]').getAttribute('data-sk-theme'), 'dark');
        assert.equal(await page.locator('[data-docs-component-preview] button').evaluateAll(buttons => buttons.every(button => button.disabled)), true);
        await page.locator('#example [data-sk-toggle-target]').click();
        await page.locator('#example [data-sk-copy-block]').click();
        const copied = await page.evaluate(() => window.copiedMarkup);
        assert.match(copied, /data-sk-theme="dark"/);
        assert.match(copied, /data-sk-density="dense"/);
        assert.match(copied, /disabled/);
        await page.locator('[data-docs-preview-state]').selectOption('rest');
        assert.equal(await page.locator('[data-docs-component-preview] button').first().isEnabled(), true);
        await page.screenshot({ path: `.run/review/${engineName}-v320-component-preview.png`, animations: 'disabled' });
        await page.goto(base + '/component-tree-view.html');
        assert.match(await page.locator('.docs-capabilities').textContent(), /no native React component/);
        assert.match(await page.locator('.docs-capabilities').textContent(), /Not included in the Figma starter/);
        await page.goto(base + '/component-app-shell.html');
        assert.equal(await page.locator('#component-app-shell-example-code').getAttribute('hidden'), null, 'code-only scaffold starts expanded');
      });

      await test('native select surfaces and split dividers follow the nearest theme', async page => {
        await page.goto(base + '/component-select.html');
        for (const theme of ['light', 'hc-light', 'dark', 'hc-dark']) {
          const scheme = theme.endsWith('dark') ? 'dark' : 'light';
          await page.evaluate(outer => document.documentElement.dataset.skTheme = outer, scheme === 'dark' ? 'light' : 'dark');
          await page.locator('[data-docs-preview-theme]').selectOption(theme);
          assert.equal(await page.locator('[data-docs-component-preview] select').first().evaluate(el => getComputedStyle(el).colorScheme), scheme, theme);
          const divider = await page.evaluate(theme => {
            const wrapper = document.createElement('div'); wrapper.dataset.skTheme = theme;
            wrapper.innerHTML = '<div class="sk-split-button sk-split-button--primary"><button class="sk-split-button__action">Save</button><button class="sk-split-button__trigger">Options</button></div>';
            document.body.appendChild(wrapper);
            const button = wrapper.querySelector('.sk-split-button__trigger');
            const nested = getComputedStyle(button).borderInlineStartColor;
            document.documentElement.dataset.skTheme = theme;
            const standalone = getComputedStyle(button).borderInlineStartColor;
            wrapper.remove(); return { nested, standalone };
          }, theme);
          assert.equal(divider.nested, divider.standalone, theme + ' divider depends on its own scope');
        }
        await page.emulateMedia({ colorScheme: 'dark' });
        const automatic = await page.evaluate(() => {
          document.documentElement.removeAttribute('data-sk-theme');
          const select = document.createElement('select'); select.className = 'sk-select';
          document.body.appendChild(select); const scheme = getComputedStyle(select).colorScheme; select.remove(); return scheme;
        });
        assert.equal(automatic, 'dark');
      });

      await test('markup supports stable fragments, find revelation and print', async page => {
        await page.goto(base + '/component-button.html#component-button-example-code');
        const code = page.locator('#component-button-example-code');
        const toggle = page.locator('[aria-controls="component-button-example-code"]');
        assert.equal(await code.getAttribute('hidden'), null);
        assert.equal(await toggle.getAttribute('aria-expanded'), 'true');
        await toggle.click();
        assert.equal(await code.getAttribute('hidden'), 'until-found');
        await code.dispatchEvent('beforematch');
        assert.equal(await code.getAttribute('hidden'), null);
        assert.equal(await toggle.getAttribute('aria-expanded'), 'true');
        await toggle.click();
        await page.emulateMedia({ media: 'print' });
        assert.equal(await code.evaluate(el => getComputedStyle(el).display), 'block');
        assert.equal(await code.evaluate(el => getComputedStyle(el).contentVisibility), 'visible');
        assert.equal(await code.locator('pre').evaluate(el => getComputedStyle(el).maxBlockSize), 'none');
        assert.equal(await code.locator('pre').evaluate(el => getComputedStyle(el).whiteSpace), 'pre-wrap');
        assert.equal(await code.locator('.sk-code-block__scroll').evaluate(el => getComputedStyle(el).overflowX), 'visible');
        assert.equal(await page.locator('body').evaluate(el => getComputedStyle(el).overflowY), 'visible');
        assert.equal(await page.locator('main').evaluate(el => getComputedStyle(el).overflowY), 'visible');
      });
    } finally { await browser.close(); }
  }
} finally { await new Promise(resolve => server.close(resolve)); }

console.log(`Product reliability: ${passed} passed, ${failures.length} failed.`);
if (failures.length) { console.error(failures.join('\n\n')); process.exitCode = 1; }
