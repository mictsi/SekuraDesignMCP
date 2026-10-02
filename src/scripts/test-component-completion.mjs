/** Completion contracts, exercised against the shipped CSS and browser bundle. */
import assert from 'node:assert/strict';
import { chromium, firefox, webkit } from 'playwright-core';
import { createDemoServer } from './demo-server.mjs';
import { mkdirSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const axeSource = readFileSync(createRequire(import.meta.url).resolve('axe-core/axe.min.js'), 'utf8');
const server = createDemoServer();
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}`;
const failures = []; let passed = 0;
mkdirSync('.run/review', { recursive: true });
try {
  for (const [name, engine] of Object.entries({ chromium, firefox, webkit })) {
    const browser = await engine.launch();
    const page = await browser.newPage({ viewport: { width: 1280, height: 1000 }, reducedMotion: 'reduce' });
    page.setDefaultTimeout(6000);
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    const test = async (label, run) => {
      try { await page.goto(base + '/workbench.html'); await run(); passed++; console.log(`PASS ${name}: ${label}`); }
      catch (error) { failures.push(`${name}: ${label}: ${error.stack}`); }
    };
    const waitText = (selector, text) => page.waitForFunction(({ selector, text }) => document.querySelector(selector)?.textContent.includes(text), { selector, text });
    try {
      await test('multi-select tokens, disabled options, custom values and readonly', async () => {
        const input = page.locator('#bench-tags'); await input.focus(); await input.press('ArrowDown'); await input.press('Enter');
        assert.match(await page.locator('#bench-tags-state').textContent(), /design/);
        assert.equal(await page.getByRole('button', { name: 'Remove Design', exact: true }).count(), 1);
        await input.fill('A very long custom tag for wrapping'); await input.press('Enter');
        await input.press('Backspace'); assert.equal(await page.locator('.sk-combobox__token').count(), 1);
        await input.evaluate(el => { el.readOnly = true; });
        await page.waitForFunction(() => document.querySelector('.sk-combobox__remove')?.disabled);
        assert.equal(await input.getAttribute('aria-expanded'), 'false');
        await input.evaluate(el => { el.readOnly = false; });
        await page.getByRole('button', { name: 'Remove Design', exact: true }).click();
        assert.equal(await page.locator('.sk-combobox__token').count(), 0);
        assert.equal(await input.evaluate(el => el === document.activeElement), true);
      });
      await test('async combobox errors preserve text, recover and never auto-select', async () => {
        const input = page.locator('#bench-async'); await input.fill('error'); await waitText('#bench-async-list + [data-sk-combobox-message]', 'Search failed');
        assert.equal(await input.inputValue(), 'error');
        await input.fill('Ana'); await page.waitForFunction(() => document.querySelector('#bench-async-list [data-value=ana]:not([hidden])') && !document.querySelector('#bench-async').hasAttribute('aria-busy'));
        const anchor = await input.boundingBox(), popup = await page.locator('#bench-async').locator('..').locator('.sk-combobox__popup').boundingBox();
        assert.ok(Math.abs(anchor.width - popup.width) < 1 && Math.abs(anchor.x - popup.x) < 1, 'popup follows the field width and leading edge');
        assert.equal(await input.getAttribute('aria-activedescendant'), null);
        await input.press('ArrowDown'); await input.press('Enter');
        assert.equal(await input.inputValue(), 'Ana Silva'); assert.match(await page.locator('#bench-async-state').textContent(), /ana/);
        await input.press('Escape'); assert.equal(await input.inputValue(), '');
        await input.fill('zzzz'); await waitText('#bench-async-list + [data-sk-combobox-message]', 'No results');
      });
      await test('exact range bounds cannot cross; reset and keyboard emit one change', async () => {
        const lower = page.getByRole('spinbutton', { name: 'Exact minimum hours' });
        await lower.fill('95'); await lower.press('Tab'); assert.equal(await page.locator('#bench-range-min').inputValue(), '80');
        await page.getByRole('button', { name: 'Reset hours' }).click();
        assert.equal(await page.locator('#bench-range-min').inputValue(), '20'); assert.equal(await page.locator('#bench-range-max').inputValue(), '80');
        await page.evaluate(() => { window.rangeChanges = 0; document.querySelector('#bench-range').addEventListener('sk:slider:range-change', () => window.rangeChanges++); });
        await page.locator('#bench-range-min').focus(); await page.locator('#bench-range-min').press('PageUp');
        assert.equal(await lower.inputValue(), '30'); assert.equal(await page.evaluate(() => window.rangeChanges), 1);
      });
      await test('lazy tree failure, retry, tri-state descendants and RTL arrows', async () => {
        await page.locator('#bench-tree-fail').check(); const parent = page.locator('#bench-tree > [role=treeitem]'); await parent.focus(); await parent.press('ArrowRight');
        await page.waitForFunction(() => document.querySelector('#bench-tree [data-load-error]'));
        await parent.press('ArrowRight'); await page.waitForFunction(() => document.querySelectorAll('#bench-tree [role=treeitem]').length === 4);
        await parent.press('ArrowRight'); await page.keyboard.press('Space');
        assert.equal(await parent.getAttribute('aria-checked'), 'mixed');
        await parent.focus(); await parent.press('Space');
        assert.equal(await page.locator('#bench-tree [aria-checked=true]').count(), 4);
        assert.equal(await page.locator('#bench-tree [aria-selected]').count(), 0);
        await page.evaluate(() => document.querySelector('#bench-tree').dir = 'rtl');
        await parent.press('ArrowRight'); assert.equal(await parent.getAttribute('aria-expanded'), 'false');
        await parent.press('ArrowLeft'); assert.equal(await parent.getAttribute('aria-expanded'), 'true');
        await parent.press('e'); assert.match(await page.evaluate(() => document.activeElement.textContent), /Edit documents/);
        assert.equal(await page.locator('#bench-tree [tabindex="0"]').count(), 1);
      });
      await test('command search, scope, empty, failure, session recent and focus return', async () => {
        const opener = page.locator('#bench-palette-open'); await opener.click(); const input = page.locator('#bench-palette .sk-command-palette__input');
        await input.fill('error'); await waitText('#bench-palette .sk-command-palette__empty', 'Search failed'); assert.equal(await input.inputValue(), 'error');
        await input.fill('zzzz'); await waitText('#bench-palette .sk-command-palette__empty', 'No results');
        await input.fill('>'); await page.waitForFunction(() => document.querySelector('#bench-palette [data-value=create]'));
        assert.equal(await page.locator('#bench-palette [data-value=open]').count(), 0);
        await input.press('Enter'); assert.match(await page.locator('#bench-palette-state').textContent(), /create/);
        assert.equal(await opener.evaluate(el => el === document.activeElement), true);
        await opener.click(); await page.waitForFunction(() => document.querySelector('#bench-palette [data-sk-recent] [data-value=create]'));
        assert.equal(await input.evaluate(el => document.getElementById(el.getAttribute('aria-activedescendant')).dataset.value), 'create');
        await input.press('Tab'); assert.equal(await page.locator('#bench-palette [data-sk-palette-close]').evaluate(el => el === document.activeElement), true);
        await page.keyboard.press('Tab'); assert.equal(await input.evaluate(el => el === document.activeElement), true);
        await page.locator('#bench-palette [data-sk-palette-close]').click(); assert.equal(await page.locator('#bench-palette').isVisible(), false);
        assert.equal(await page.locator('main').evaluate(el => !!el.closest('[inert]')), false);
      });
      await test('upload failure retries and cancellation removes only the cancelled file', async () => {
        const upload = page.locator('[data-sk-custom-upload]'); await page.locator('[data-sk-upload-fail]').check();
        await upload.locator('input[type=file]').setInputFiles({ name: 'data.csv', mimeType: 'text/csv', buffer: Buffer.from('name\nAna') });
        await waitText('[data-sk-custom-upload]', 'Upload failed'); await page.locator('[data-sk-upload-fail]').uncheck();
        await upload.getByRole('button', { name: 'Retry data.csv' }).click(); await waitText('[data-sk-custom-upload]', 'Uploaded');
        await upload.locator('input[type=file]').setInputFiles({ name: 'second.csv', mimeType: 'text/csv', buffer: Buffer.from('name\nSam') });
        await upload.getByRole('button', { name: 'Cancel second.csv' }).click();
        assert.equal(await upload.locator('.sk-upload__file').count(), 1); assert.match(await upload.textContent(), /data.csv/);
      });
      await test('destroy and superseded async requests reject late results', async () => {
        const result = await page.evaluate(async () => {
          const host = document.createElement('div'); host.innerHTML = '<input id="race-input" aria-label="Race" /><ul id="race-list" aria-label="Results"></ul><ul class="sk-tree" data-sk-custom-tree role="tree" aria-label="Race tree"><li role="treeitem" tabindex="0" data-sk-loadable aria-expanded="false"><span class="sk-tree__row"><span class="sk-tree__label">Team</span></span></li></ul>';
          document.querySelector('main').appendChild(host);
          const [input, list, tree] = host.children; const pending = [];
          const combo = Sekura.createCombobox(input, list, { debounce: 0, loadOptions: (q, signal) => new Promise(resolve => pending.push({ q, signal, resolve })) });
          input.focus(); input.value = 'new'; input.dispatchEvent(new Event('input'));
          await new Promise(resolve => setTimeout(resolve, 25));
          pending.at(-1).resolve([{ value: 'new', label: 'New result' }]); await Promise.resolve();
          pending[0].resolve([{ value: 'old', label: 'Old result' }]); await Promise.resolve();
          const latest = list.textContent; const staleAborted = pending[0].signal.aborted;
          input.value = 'destroy'; input.dispatchEvent(new Event('input')); await new Promise(resolve => setTimeout(resolve, 25));
          combo.destroy(); pending.at(-1).resolve([{ value: 'dead', label: 'After destroy' }]); await Promise.resolve();
          let finish, signal; const controller = Sekura.createTree(tree, { loadChildren: (item, s) => { signal = s; return new Promise(resolve => finish = resolve); } });
          tree.firstElementChild.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
          controller.destroy(); finish([document.createElement('li')]); await Promise.resolve();
          const state = { latest, staleAborted, deadAborted: pending.at(-1).signal.aborted, afterDestroy: list.textContent, treeAborted: signal.aborted, treeCount: tree.querySelectorAll('li').length };
          host.remove(); return state;
        });
        assert.equal(result.latest, 'New result'); assert.equal(result.staleAborted, true); assert.equal(result.deadAborted, true); assert.equal(result.afterDestroy, 'New result'); assert.equal(result.treeAborted, true); assert.equal(result.treeCount, 1);
      });
      await test('single upload replacement aborts old transport and ignores late callbacks', async () => {
        const result = await page.evaluate(async () => {
          const host = document.createElement('form'); host.innerHTML = '<div class="sk-upload" data-sk-custom-upload><input type="file" accept=".csv" aria-label="Single import" /><ul class="sk-upload__list"></ul></div>';
          document.querySelector('main').appendChild(host); const root = host.firstElementChild, input = root.querySelector('input'); const pending = [];
          const controller = Sekura.createUpload(root, { maxBytes: 20, upload: (file, signal, progress) => new Promise(resolve => pending.push({ file, signal, progress, resolve })) });
          const choose = (name, text = 'data') => { const transfer = new DataTransfer(); transfer.items.add(new File([text], name)); input.files = transfer.files; input.dispatchEvent(new Event('change')); };
          choose('first.csv'); choose('second.csv'); pending[0].progress(100); pending[0].resolve(); await Promise.resolve();
          const replaced = { files: controller.files.map(file => file.name), aborted: pending[0].signal.aborted, rows: root.querySelectorAll('li').length, uploaded: root.textContent.includes('Uploaded') };
          choose('bad.txt'); const rejection = root.querySelector('[role=status]').textContent;
          input.disabled = true; choose('disabled.csv'); const disabledCount = pending.length;
          pending[1].resolve(); await Promise.resolve(); const completed = root.textContent; pending[1].progress(99); const settledIgnored = root.textContent === completed;
          controller.destroy(); const before = root.textContent; pending[1].progress(99); await Promise.resolve();
          const lateIgnored = root.textContent === before, aborted = pending[1].signal.aborted; host.remove();
          return { replaced, rejection, disabledCount, lateIgnored, aborted, settledIgnored };
        });
        assert.deepEqual(result.replaced, { files: ['second.csv'], aborted: true, rows: 1, uploaded: false });
        assert.match(result.rejection, /bad.txt.*Accepted types: .csv/); assert.equal(result.disabledCount, 2); assert.equal(result.lateIgnored, true); assert.equal(result.aborted, true); assert.equal(result.settledIgnored, true);
      });
      await test('interactive advanced states pass axe in light and dark themes', async () => {
        await page.addScriptTag({ content: axeSource });
        await page.locator('#bench-tags').fill('Custom tag'); await page.locator('#bench-tags').press('Enter');
        const parent = page.locator('#bench-tree > [role=treeitem]'); await parent.focus(); await parent.press('ArrowRight');
        await page.waitForFunction(() => document.querySelectorAll('#bench-tree [role=treeitem]').length === 4);
        const scan = async () => {
          const failures = await page.evaluate(async () => (await axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] } })).violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => n.target) })));
          assert.deepEqual(failures, []);
        };
        for (const theme of ['light', 'dark']) {
          await page.evaluate(theme => document.documentElement.dataset.skTheme = theme, theme);
          await page.locator('#bench-async').fill('Ana'); await page.waitForFunction(() => document.querySelector('#bench-async-list [data-value=ana]:not([hidden])') && !document.querySelector('#bench-async').hasAttribute('aria-busy'));
          await page.locator('#bench-async').press('ArrowDown'); await scan(); await page.locator('#bench-async').fill('error'); await waitText('#bench-async-list + [data-sk-combobox-message]', 'Search failed'); await scan(); await page.locator('#bench-async').press('Escape');
          await page.locator('#bench-palette-open').click(); await page.waitForFunction(() => document.querySelector('#bench-palette [data-value=create]'));
          await scan(); await page.locator('#bench-palette [data-sk-palette-close]').click();
        }
      });
      await test('all six leading accents are 4px, mirror in RTL and survive forced colors', async () => {
        await page.evaluate(() => {
          const host = document.createElement('div'); host.id = 'markers'; host.innerHTML = '<a href="#markers" class="docs-toc__link" aria-current="true">Section</a><a href="#markers" class="sk-side-nav__item" aria-current="page">Navigation</a><ul class="sk-tree" data-sk-custom-tree><li class="sk-tree__item" aria-selected="true"><span class="sk-tree__row">Tree</span></li></ul><div class="sk-table"><table><tbody><tr aria-selected="true"><td>Table</td><td>Value</td></tr></tbody></table></div><div class="sk-combobox__option" data-active>Option</div><div class="sk-command-palette__item" data-active>Command</div>';
          document.querySelector('main').appendChild(host);
        });
        for (const forced of ['none', 'active']) {
          await page.emulateMedia({ forcedColors: forced });
          for (const dir of ['ltr', 'rtl']) {
            await page.locator('#markers').evaluate((el, dir) => el.dir = dir, dir);
            const metrics = await page.locator('#markers').evaluate(host => Array.from(host.querySelectorAll('.docs-toc__link, .sk-side-nav__item, .sk-tree__row, td:first-child, .sk-combobox__option, .sk-command-palette__item')).map(el => {
              const style = getComputedStyle(el, '::before'); return { width: style.width, leading: style.insetInlineStart, start: getComputedStyle(el).direction === 'rtl' ? style.right : style.left, end: getComputedStyle(el).direction === 'rtl' ? style.left : style.right, block: style.top, paint: style.backgroundColor, adjust: style.forcedColorAdjust };
            }));
            assert.equal(metrics.length, 6);
            for (const item of metrics) { assert.equal(item.width, '4px'); assert.equal(item.leading, '0px'); assert.equal(item.start, '0px'); assert.equal(item.block, '4px'); assert.notEqual(item.paint, 'rgba(0, 0, 0, 0)'); if (forced === 'active' && item.adjust !== undefined) assert.equal(item.adjust, 'none'); }
          }
        }
        await page.emulateMedia({ forcedColors: 'none' });
      });
      await test('advanced examples reflow at 320px and enlarged text; native timeline details work', async () => {
        await page.locator('#bench-tags').fill('A long project classification label'); await page.locator('#bench-tags').press('Enter');
        await page.getByText('Failure details', { exact: true }).click(); assert.equal(await page.locator('.sk-timeline__detail').getAttribute('open'), '');
        await page.setViewportSize({ width: 320, height: 1000 }); await page.addStyleTag({ content: 'html {font-size:200% !important}' });
        for (const dir of ['ltr', 'rtl']) {
          await page.evaluate(dir => document.documentElement.dir = dir, dir);
          for (const selector of ['#bench-advanced', '#bench-range-form', '#bench-tree', '.sk-timeline--grouped']) {
            assert.equal(await page.locator(selector).evaluate(el => el.scrollWidth <= el.clientWidth + 1), true, `${dir}: ${selector}`);
          }
        }
        await page.screenshot({ path: `.run/review/${name}-completed-components.png`, fullPage: true });
      });
      await test('generated command recipe auto-enhances without a second combobox owner', async () => {
        await page.goto(base + '/component-command-palette.html');
        await page.locator('[data-sk-palette-open="command-palette-example"]').click();
        const root = page.locator('#command-palette-example'); assert.equal(await root.isVisible(), true);
        assert.equal(await root.locator('[data-sk-combobox]').count(), 0);
        await root.locator('.sk-command-palette__input').press('Escape'); assert.equal(await root.isVisible(), false);
      });
      assert.deepEqual(errors, []);
    } finally { await browser.close(); }
  }
} finally { server.close(); }
console.log(`Component completion: ${passed} passed, ${failures.length} failed`);
if (failures.length) { console.error(failures.join('\n')); process.exitCode = 1; }
