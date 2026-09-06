/** User-facing regressions: run against the same generated site and bundle we ship. */
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFileSync, readdirSync, mkdirSync, writeFileSync } from 'node:fs';
import { extname, resolve, join } from 'node:path';
import { chromium } from 'playwright-core';
import { build } from 'esbuild';
import { components } from '../../dist/data/components/index.js';
import { generateCode } from '../../dist/lib/codegen.js';

const root = resolve('sample');
const server = createServer((req, res) => {
  const file = resolve(root, '.' + decodeURIComponent(req.url.split('?')[0]));
  if (!file.startsWith(root + '/')) { res.writeHead(404).end(); return; }
  try { res.setHeader('content-type', ({ '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' })[extname(file)] || 'text/plain'); res.end(readFileSync(file)); }
  catch { res.writeHead(404).end(); }
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}/`;
const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' });
page.setDefaultTimeout(5000);
const errors = [];
page.on('pageerror', error => errors.push(error.message));
let passed = 0;
const failures = [];
const test = async (name, run) => { try { await run(); passed++; } catch (error) { failures.push(`${name}: ${error.message}`); } };
const go = file => page.goto(base + file + '.html', { waitUntil: 'load' });
const settle = () => page.waitForTimeout(100);

await test('filter, selection, pagination, delete and undo share state', async () => {
  await go('example-list');
  await page.locator('#project-q').fill('Website redesign');
  await settle(); await page.locator('[data-sk-select-all]').check();
  assert.equal(await page.locator('[data-sk-select-row]:checked').count(), 1);
  assert.equal((await page.locator('[data-sk-selection-count]').textContent()).trim(), '1 project selected');
  await page.locator('[data-sk-dialog-open="bulk-delete-dialog"]').click();
  await page.locator('#bulk-delete-dialog button[value="confirm"]').click();
  await settle(); assert.equal(await page.locator('#project-table tbody tr').count(), 7);
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  assert.equal(await page.locator('#project-table tbody tr').count(), 8);
  await page.locator('#project-q').fill(''); await settle();
  assert.equal(await page.locator('#project-table tbody tr:visible').count(), 4);
  await page.locator('[data-sk-page-next]').click();
  assert.match(await page.locator('[data-sk-page-label]').textContent(), /2 of 2/);
  await page.locator('[data-sk-popover-target]').click();
  await page.locator('#project-filters input').nth(1).check();
  await page.locator('[data-sk-filter-apply]').click(); await settle();
  assert.match(await page.locator('[data-sk-filter-status]').textContent(), /of 1 projects/);
  await page.getByRole('button', { name: 'Remove team filter Marketing' }).click();
  assert.match(await page.locator('[data-sk-filter-status]').textContent(), /of 8 projects/);
});
await test('number, accordion and slider reference demos work', async () => {
  await go('component-number-input'); const input = page.locator('[data-sk-number]');
  await page.locator('[data-sk-step="1"]').click(); assert.equal(await input.inputValue(), '46');
  await go('component-accordion'); const headers = page.locator('[data-sk-accordion-trigger]');
  await headers.last().click(); assert.equal(await headers.last().getAttribute('aria-expanded'), 'true');
  assert.equal(await headers.evaluateAll(xs => xs.every(x => x.tabIndex === 0)), true);
  await go('component-slider'); const range = page.locator('input[type=range]'); await range.focus(); await range.press('End');
  assert.equal(await range.inputValue(), '86400'); assert.match(await range.getAttribute('aria-valuetext'), /24 hours/);
  assert.equal(await range.evaluate(el => el.style.getPropertyValue('--sk-slider-progress')), '100%');
});
await test('busy buttons suppress pointer and keyboard activation', async () => {
  await go('component-button'); const button = page.locator('button[aria-busy=true]').first();
  await button.evaluate(el => { window.activations = 0; el.addEventListener('click', () => window.activations++); el.focus(); });
  await page.keyboard.press('Enter'); await page.keyboard.press('Space');
  assert.equal(await page.evaluate(() => window.activations), 0);
});
await test('tooltip appears, describes its trigger and dismisses', async () => {
  await go('index'); const trigger = page.locator('[data-sk-tooltip]').first(); await trigger.focus();
  const id = await trigger.getAttribute('aria-describedby'); assert.ok(id);
  assert.equal(await page.locator('[role=tooltip]:visible').count(), 1);
  await trigger.press('Escape'); assert.equal(await page.locator('[role=tooltip]:visible').count(), 0);
});
await test('findable disclosure retains browser-search state', async () => {
  await go('component-disclosure'); const panel = page.locator('[hidden="until-found"]');
  assert.notEqual(await panel.evaluate(el => getComputedStyle(el).display), 'none');
  const id = await panel.getAttribute('id'); await panel.dispatchEvent('beforematch');
  assert.equal(await page.locator(`[aria-controls="${id}"]`).getAttribute('aria-expanded'), 'true');
  assert.equal(await page.locator(`[id="${id}"]`).isVisible(), true);
});
await test('lifecycle retries missing targets and cleans removed subtrees', async () => {
  await go('index');
  const result = await page.evaluate(async () => {
    const root = document.createElement('div'); document.body.appendChild(root);
    root.innerHTML = '<button data-sk-disclosure="late">Toggle</button>';
    const first = Sekura.enhance(root); root.insertAdjacentHTML('beforeend', '<div id="late" hidden>Panel</div>');
    const wired = Sekura.enhance(root); const button = root.querySelector('button'); button.click(); const opened = !root.querySelector('#late').hidden;
    wired.destroy(); const again = Sekura.enhance(root); button.click();
    const reinitialized = again.count === 1;
    Sekura.dispose(root); const stop = Sekura.autoEnhance(root); root.removeChild(button); await new Promise(r => setTimeout(r, 0));
    const cleaned = !button.hasAttribute('data-sk-enhanced'); stop(); root.remove();
    return { first: first.count, opened, reinitialized, cleaned };
  });
  assert.deepEqual(result, { first: 0, opened: true, reinitialized: true, cleaned: true });
});
await test('clipboard rejection does not announce success', async () => {
  await go('component-button');
  await page.evaluate(() => Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: () => Promise.reject(new Error('Denied')) } }));
  await page.locator('[data-sk-toggle-target]').first().click();
  const copy = page.locator('[data-sk-copy-block]:visible').first(); await copy.click(); await page.waitForTimeout(150);
  assert.doesNotMatch(await copy.textContent(), /Copied/);
  assert.match(await page.locator('[role=status]').allTextContents().then(xs => xs.join(' ')), /Could not copy/);
});
await test('sign-in failure focuses the summary and recovery works', async () => {
  await go('example-signin'); await page.locator('#email').fill('demo@example.com'); await page.locator('#password').fill('demonstration');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  assert.equal(await page.evaluate(() => document.activeElement.id), 'signin-error');
  await page.locator('[data-sk-reset-open]').click(); await page.locator('#reset-email').fill('demo@example.com');
  await page.getByRole('button', { name: 'Send reset instructions' }).click();
  assert.match(await page.locator('[data-sk-reset-status]').textContent(), /demo sends no email/);
});
await test('workbench aligns all densities and handles failure, cancellation and undo', async () => {
  await go('workbench');
  for (const density of ['comfortable', 'compact', 'dense']) {
    await page.locator('[data-sk-bench-density]').selectOption(density);
    await settle();
    const rows = await page.locator('[data-sk-size-row]').evaluateAll(rows => rows.map(row => Array.from(row.children).map(el => el.getBoundingClientRect().height)));
    for (const heights of rows) assert.ok(Math.max(...heights) - Math.min(...heights) < 1, `${density}: ${heights}`);
  }
  await page.locator('[data-sk-fail-next]').check(); await page.locator('[data-sk-action-save]').click(); await page.waitForTimeout(1000);
  assert.match(await page.locator('[data-sk-action-status]').textContent(), /Save failed/);
  await page.locator('[data-sk-action-retry]').click(); await page.locator('[data-sk-action-cancel]').click();
  assert.match(await page.locator('[data-sk-action-status]').textContent(), /cancelled/);
  await page.locator('[data-sk-action-save]').click(); await page.waitForTimeout(1000);
  assert.match(await page.locator('[data-sk-action-status]').textContent(), /version 1/);
  await page.getByRole('button', { name: 'Undo', exact: true }).click(); assert.match(await page.locator('[data-sk-action-status]').textContent(), /version 0/);
});
await test('upload simulator supports failure and retry', async () => {
  await go('workbench'); await page.locator('[data-sk-upload-fail]').check();
  await page.locator('[data-sk-custom-upload] input[type=file]').setInputFiles({ name: 'demo.csv', mimeType: 'text/csv', buffer: Buffer.from('name\nDemo') });
  await page.waitForTimeout(1050); assert.equal(await page.getByRole('button', { name: 'Retry demo.csv' }).isVisible(), true);
  await page.locator('[data-sk-upload-fail]').uncheck(); await page.getByRole('button', { name: 'Retry demo.csv' }).click(); await page.waitForTimeout(1050);
  assert.match(await page.locator('[data-sk-custom-upload] .sk-upload__file-meta').textContent(), /Uploaded/);
  await page.getByRole('button', { name: 'Remove demo.csv' }).click(); assert.equal(await page.locator('[data-sk-custom-upload] .sk-upload__file').count(), 0);
});
await test('settings persist and photo has a real preview', async () => {
  await go('example-settings'); const input = page.locator('#reduce-motion'); await input.click(); await page.waitForTimeout(650);
  await page.reload(); assert.equal(await input.isChecked(), true);
  assert.equal(await page.locator('html').getAttribute('data-sk-reduce-motion'), '');
  await page.locator('#profile-photo').setInputFiles({ name: 'photo.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j3ZkAAAAASUVORK5CYII=', 'base64') });
  assert.equal(await page.locator('#profile .sk-avatar img').count(), 1);
});
await test('keyboard choices apply theme and density', async () => {
  await go('example-settings');
  const themes = page.locator('[data-sk-theme-option]');
  await themes.last().focus(); await themes.last().press('Home'); await themes.last().press('End');
  assert.equal(await page.locator('html').getAttribute('data-sk-theme'), 'dark');
  const densities = page.locator('[data-sk-density-option]'); await densities.first().focus(); await densities.first().press('End');
  assert.equal(await page.locator('html').getAttribute('data-sk-density'), 'dense');
  await densities.last().press('Home');
});
await test('onboarding advances, preserves choices and saves only on confirmation', async () => {
  await go('example-onboarding'); await page.locator('#setup-name').fill('Design team');
  await page.getByRole('button', { name: 'Continue to invitations' }).click();
  await page.locator('#invite-emails').fill('designer@example.com');
  await page.getByRole('button', { name: 'Continue to review' }).click();
  await page.locator('#step-review').waitFor({ state: 'visible' });
  assert.match(await page.locator('[data-sk-setup-summary]').textContent(), /Design team.*designer@example.com/);
  assert.equal(await page.evaluate(() => localStorage.getItem('sk-demo-workspace')), null);
  await page.getByRole('link', { name: 'Back to invitations' }).click();
  assert.equal(await page.locator('#invite-emails').inputValue(), 'designer@example.com');
  await page.getByRole('button', { name: 'Skip for now' }).click();
  await page.getByRole('button', { name: 'Create workspace', exact: true }).click();
  assert.match(await page.locator('[data-sk-setup-result]').textContent(), /saved on this device/);
  assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('sk-demo-workspace')).invitations), '');
});
await test('task details support create, edit, delete and undo', async () => {
  await go('example-detail'); const rows = page.locator('[data-sk-table] tbody tr'); const count = await rows.count();
  await page.locator('[data-sk-task-add]').click(); await page.locator('#task-editor-name').fill('Review keyboard flow');
  await page.getByRole('button', { name: 'Save task', exact: true }).click(); assert.equal(await rows.count(), count + 1);
  await page.getByRole('button', { name: 'Inspect Review keyboard flow', exact: true }).click();
  assert.equal(await page.locator('#task-drawer-title').textContent(), 'Review keyboard flow');
  await page.locator('[data-sk-task-edit]').click(); await page.locator('#task-editor-name').fill('Review focus flow');
  await page.getByRole('button', { name: 'Save task', exact: true }).click();
  await page.locator('[data-sk-task-delete]').click(); assert.equal(await rows.count(), count);
  await page.getByRole('button', { name: 'Undo', exact: true }).click(); assert.equal(await rows.count(), count + 1);
});
await test('created projects appear in the matching team filter', async () => {
  await go('example-form'); await page.locator('#project-name').fill('Design integration test');
  await page.locator('#team').selectOption('marketing');
  await page.getByRole('button', { name: 'Create project', exact: true }).click();
  await page.waitForURL('**/example-list.html');
  await page.locator('#project-q').fill('Design integration test'); await settle();
  await page.locator('[data-sk-popover-target]').click(); await page.locator('#project-filters input').nth(1).check();
  await page.locator('[data-sk-filter-apply]').click(); await settle();
  assert.equal(await page.locator('#project-table tbody tr:visible').count(), 1);
  assert.match(await page.locator('#project-table tbody tr:visible th').textContent(), /Design integration test/);
});
await test('row menu keyboard deletion waits for the correct confirmation', async () => {
  await go('example-list');
  const name = (await page.locator('#project-table tbody tr').filter({ has: page.locator('[aria-controls="row-menu-1"]') }).locator('th').textContent()).trim();
  await page.locator('#project-q').fill(name); await settle();
  const row = page.locator('#project-table tbody tr:visible');
  const trigger = row.locator('[aria-haspopup=menu]'); await trigger.focus(); await trigger.press('ArrowDown');
  await page.locator('[role=menu]:visible').press('End'); await page.keyboard.press('Enter');
  assert.equal(await page.locator('#delete-project-dialog[open]').count(), 1);
  assert.equal(await row.count(), 1);
  assert.match(await page.locator('#dp-title').textContent(), new RegExp(name));
  await page.locator('#dp-confirm').fill(name);
  await page.locator('#delete-project-dialog [value=confirm]').click(); await settle();
  assert.equal(await row.count(), 0);
});
await test('tree keyboard navigation expands and selects visible items', async () => {
  await go('component-tree-view'); const first = page.locator('[role=treeitem]').first(); await first.focus();
  await first.press('ArrowLeft'); assert.equal(await first.getAttribute('aria-expanded'), 'false');
  await first.press('ArrowRight'); assert.equal(await first.getAttribute('aria-expanded'), 'true');
  await first.press('ArrowRight'); await page.keyboard.press('Space');
  assert.equal(await page.evaluate(() => document.activeElement.getAttribute('aria-selected')), 'true');
  assert.equal(await page.locator('[role=treeitem][aria-selected=true]').count(), 1);
});
await test('RTL popover tracks its anchor and stays inside the viewport', async () => {
  await go('example-list'); await page.evaluate(() => document.documentElement.dir = 'rtl');
  const trigger = page.locator('[data-sk-popover-target]'); await trigger.click();
  const a = await trigger.boundingBox(), box = await page.locator('#project-filters').boundingBox();
  assert.ok(Math.abs(a.x + a.width - box.x - box.width) < 2);
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 600 }); await settle();
    const r = await page.locator('#project-filters').boundingBox(); assert.ok(r.x >= 0 && r.x + r.width <= width && r.y + r.height <= 600);
  }
  await page.setViewportSize({ width: 1280, height: 900 });
});

// Compile actual React recipes into a consumer bundle and mount two instances.
await test('generated React controls mount with unique IDs and working behavior', async () => {
  const dir = resolve('tmp/design-consumer'); mkdirSync(dir, { recursive: true });
  const selected = ['number-input', 'accordion', 'combobox', 'date-picker', 'slider', 'dialog'];
  selected.forEach(id => writeFileSync(join(dir, id + '.tsx'), generateCode(components.find(c => c.id === id), 'react')));
  const imports = selected.map((id, i) => `import * as C${i} from './${id}';`).join('\n');
  writeFileSync(join(dir, 'entry.tsx'), `import React from 'react'; import {createRoot} from 'react-dom/client'; ${imports}\nconst registry = [${selected.map((_,i)=>`Object.values(C${i})[0]`).join(',')}]; let root; window.renderRecipe = (index) => { root?.unmount(); root = createRoot(document.getElementById('mount')); const Component=registry[index]; root.render(<><Component/><Component/></>); };`);
  const result = await build({ entryPoints: [join(dir, 'entry.tsx')], bundle: true, write: false, format: 'iife', jsx: 'automatic', alias: { '@sekura/behaviours': resolve('dist-js/sekura.esm.js') }, logLevel: 'silent' });
  await page.goto(base + 'index.html'); await page.setContent('<div id="mount"></div>'); await page.addScriptTag({ content: result.outputFiles[0].text });
  for (let i = 0; i < selected.length; i++) {
    await page.evaluate(index => window.renderRecipe(index), i); await settle();
    assert.equal(await page.evaluate(() => { const ids = Array.from(document.querySelectorAll('#mount [id]')).map(el => el.id); return ids.length === new Set(ids).size; }), true);
    if (selected[i] === 'number-input') { await page.locator('[data-sk-step="1"]').first().click(); assert.equal(await page.locator('[data-sk-number]').first().inputValue(), '46'); }
    if (selected[i] === 'accordion') { const trigger = page.locator('[data-sk-accordion-trigger]').nth(1); await trigger.click(); assert.equal(await trigger.getAttribute('aria-expanded'), 'true'); }
    if (selected[i] === 'date-picker') { await page.locator('[data-sk-datepicker-trigger]').first().click(); assert.equal(await page.locator('[data-sk-datepicker-trigger]').first().getAttribute('aria-expanded'), 'true'); await page.keyboard.press('Escape'); }
    if (selected[i] === 'dialog') { await page.locator('[data-sk-dialog-open]').first().click(); const dialog = page.locator('dialog[open]'); assert.equal(await dialog.count(), 1); await dialog.locator('[data-sk-confirm-phrase]').fill('Website redesign'); assert.equal(await dialog.locator('[data-sk-confirm-button]').isEnabled(), true); await page.keyboard.press('Escape'); }
  }
});

await test('all generated pages have no page errors or unexpected mobile overflow', async () => {
  const escapees = [];
  for (const file of readdirSync(root).filter(f => f.endsWith('.html'))) {
    await page.setViewportSize({ width: 320, height: 900 });
    await page.goto(base + file, { waitUntil: 'load' });
    const bad = await page.evaluate(() => {
      const main = document.querySelector('.sk-app-shell__main') || document.documentElement; const box = main.getBoundingClientRect();
      return Array.from(main.querySelectorAll('*')).filter(el => {
        const r = el.getBoundingClientRect(); if (!r.width || !r.height) return false;
        let p = el;
        while (p && p !== main) { const s = getComputedStyle(p); if (s.position === 'fixed' || ['auto','scroll'].includes(s.overflowX) || p.hasAttribute('data-sk-overflow-demo')) return false; p = p.parentElement; }
        return r.left < box.left - 2 || r.right > box.right + 2;
      }).slice(0, 2).map(el => el.className || el.tagName);
    });
    if (bad.length) escapees.push(`${file}: ${bad.join(', ')}`);
  }
  assert.deepEqual(escapees, []); assert.deepEqual([...new Set(errors)], []);
});
await browser.close(); server.close();
console.log(`Design regressions: ${passed} passed, ${failures.length} failed`);
if (failures.length) { console.error(failures.join('\n')); process.exitCode = 1; }
