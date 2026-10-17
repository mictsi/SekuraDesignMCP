/** Save uncertainty, field comparison and explicit conflict recovery in a real browser. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createDemoServer } from './demo-server.mjs';

const pw = await import(process.env.SEKURA_PLAYWRIGHT
  ? pathToFileURL(resolve(process.env.SEKURA_PLAYWRIGHT)).href : 'playwright-core');
const browser = await pw.chromium.launch({
  executablePath: process.env.SK_BROWSER || process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});
const failures = [];
let passed = 0;
const text = (page, id, value) => page.waitForFunction(({ id, value }) => {
  const element = document.getElementById(id);
  return element.getClientRects().length > 0 && element.textContent.includes(value);
}, { id, value });
const project = { name: 'Reliability project', team: 'engineering', owner: 'Jordan', notes: 'Keep this draft.' };

async function test(label, run, serverOptions) {
  if (process.env.SEKURA_FORM_TEST_FILTER && !label.includes(process.env.SEKURA_FORM_TEST_FILTER)) return;
  const server = createDemoServer(serverOptions);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = 'http://127.0.0.1:' + server.address().port;
  const page = await browser.newPage();
  page.setDefaultTimeout(5000);
  const errors = [], writes = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => { if (request.method() === 'POST' && request.url().endsWith('/demo-api/projects')) writes.push(request.postDataJSON()); });
  try {
    if (process.env.SEKURA_FORM_LAB_HTML) await page.route('**/form-lab.html', route => route.fulfill({
      contentType: 'text/html', body: readFileSync(resolve(process.env.SEKURA_FORM_LAB_HTML), 'utf8'),
    }));
    await page.goto(base + '/form-lab.html');
    await run(page, base, writes);
    assert.deepEqual(errors, [], 'uncaught browser errors');
    passed++; console.log('PASS form reliability: ' + label);
  } catch (error) {
    failures.push(label + ': ' + error.message);
    console.error('FAIL form reliability: ' + label + ': ' + error.message);
    console.error(error.stack);
    console.error(JSON.stringify(await page.evaluate(() => Object.fromEntries(['result', 'summary-title', 'errors'].map(id => [id, document.getElementById('lab-' + id)?.textContent])))));
    console.error(JSON.stringify(await (await fetch(base + '/demo-api/version')).json()));
  } finally {
    await page.close();
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
  }
}
async function useTransport(page, transport) {
  if (transport === 'http') {
    await page.locator('#lab-transport').selectOption('http');
    await page.locator('#lab-reload').click();
    await text(page, 'lab-result', 'loaded');
  }
}
async function edit(page) {
  await page.locator('#lab-name').fill(project.name);
  await page.locator('#lab-team').selectOption(project.team);
  await page.locator('#lab-notes').fill(project.notes);
}

try {
  for (const transport of ['local', 'http']) {
    await test(`${transport}: lost acknowledgment is checked, confirmed and never automatically retried`, async (page, base, writes) => {
      await useTransport(page, transport); await edit(page);
      await page.locator('#lab-outcome').selectOption('uncertain');
      await page.locator('#lab-save').click();
      await text(page, 'lab-summary-title', 'Save outcome unknown');
      assert.equal(await page.locator('#lab-save').isDisabled(), true);
      assert.equal(await page.locator('#lab-notes').inputValue(), project.notes);
      if (transport === 'http') {
        assert.equal(writes.length, 1);
        const state = await (await fetch(base + '/demo-api/version')).json();
        assert.deepEqual(state.project, project); assert.equal(state.version, 2);
      }
      await page.locator('#lab-reload').click();
      await text(page, 'lab-result', 'Saved values confirmed.');
      assert.match(await page.locator('#lab-result').textContent(), /Version 2 loaded.*No retry was sent/);
      assert.equal(await page.locator('#lab-comparison').isHidden(), true);
      assert.equal(await page.locator('#lab-save').isEnabled(), true);
      assert.equal(await page.locator('#lab-notes').inputValue(), project.notes);
      if (transport === 'http') {
        assert.equal(writes.length, 1);
        assert.equal((await (await fetch(base + '/demo-api/version')).json()).version, 2);
      }
    });

    await test(`${transport}: conflict requires a field comparison and explicit choice before saving`, async (page, base, writes) => {
      await useTransport(page, transport); await edit(page);
      await page.locator('#lab-outcome').selectOption('conflict');
      await page.locator('#lab-save').click(); await text(page, 'lab-errors', 'Another editor');
      await page.locator('#lab-reload').click(); await text(page, 'lab-result', 'loaded');
      assert.equal(await page.locator('#lab-comparison').isVisible(), true);
      assert.equal(await page.locator('#lab-save').isDisabled(), true);
      const notes = page.locator('#lab-comparison-rows tr').filter({ hasText: 'Notes (different)' });
      assert.deepEqual(await notes.locator('td').allTextContents(), [project.notes, 'Updated by another editor.']);
      assert.equal(await page.locator('#lab-notes').inputValue(), project.notes);
      assert.equal(await page.locator('#lab-comparison').evaluate(element => element === document.activeElement), true);
      await page.locator('#lab-notes').fill('Reviewed draft with another edit.');
      assert.match(await notes.locator('td').first().textContent(), /another edit/);
      await page.locator('#lab-keep-draft').click();
      assert.equal(await page.locator('#lab-save').isEnabled(), true);
      assert.equal(await page.locator('#lab-notes').inputValue(), 'Reviewed draft with another edit.');
      if (transport === 'http') assert.equal(writes.length, 1, 'choosing a draft never saves it');
      await page.locator('#lab-save').click(); await text(page, 'lab-result', 'Project saved.');
      if (transport === 'http') {
        assert.equal(writes.length, 2); assert.equal(writes[1].version, 2);
        const state = await (await fetch(base + '/demo-api/version')).json();
        assert.equal(state.version, 3); assert.equal(state.project.notes, 'Reviewed draft with another edit.');
      }
    });
  }

  await test('HTTP: using the latest values updates the form without issuing a write', async (page, base, writes) => {
    await useTransport(page, 'http'); await edit(page);
    await page.locator('#lab-outcome').selectOption('conflict'); await page.locator('#lab-save').click();
    await text(page, 'lab-errors', 'Another editor');
    await page.locator('#lab-reload').click(); await text(page, 'lab-result', 'loaded');
    await page.locator('#lab-use-latest').click();
    assert.equal(await page.locator('#lab-notes').inputValue(), 'Updated by another editor.');
    assert.equal(await page.locator('#lab-comparison').isHidden(), true);
    assert.equal(writes.length, 1);
    assert.equal((await (await fetch(base + '/demo-api/version')).json()).version, 2);
  });

  await test('HTTP: a change after comparison is rejected instead of silently overwritten', async (page, base, writes) => {
    await useTransport(page, 'http'); await edit(page);
    await page.locator('#lab-outcome').selectOption('conflict'); await page.locator('#lab-save').click();
    await text(page, 'lab-errors', 'Another editor');
    await page.locator('#lab-reload').click(); await text(page, 'lab-result', 'loaded');
    await page.locator('#lab-keep-draft').click();
    const other = await fetch(base + '/demo-api/projects', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...project, notes: 'A newer server edit.', version: 2, outcome: 'success' }) });
    assert.equal(other.status, 200);
    await page.locator('#lab-save').click(); await text(page, 'lab-errors', 'Another editor');
    assert.equal(await page.locator('#lab-save').isDisabled(), true);
    assert.equal(await page.locator('#lab-notes').inputValue(), project.notes);
    assert.equal(writes.length, 2);
    const state = await (await fetch(base + '/demo-api/version')).json();
    assert.equal(state.version, 3); assert.equal(state.project.notes, 'A newer server edit.');
  });

  await test('HTTP: canceling a dispatched write keeps retry blocked while the server is processing', async (page, base, writes) => {
    await useTransport(page, 'http'); await edit(page);
    const dispatched = page.waitForRequest(request => request.method() === 'POST' && request.url().endsWith('/demo-api/projects'));
    await page.locator('#lab-save').click(); await dispatched;
    await page.locator('#lab-cancel').click();
    assert.equal(await page.locator('#lab-save').isDisabled(), true);
    await page.locator('#lab-reload').click(); await text(page, 'lab-result', 'still processing');
    assert.equal(await page.locator('#lab-save').isDisabled(), true);
    assert.equal(await page.locator('#lab-notes').inputValue(), project.notes);
    const deadline = Date.now() + 4000;
    while ((await (await fetch(base + '/demo-api/version')).json()).pending !== 0) {
      assert.ok(Date.now() < deadline, 'the dispatched write must settle');
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    await page.locator('#lab-reload').click(); await text(page, 'lab-result', 'Saved values confirmed.');
    assert.equal(writes.length, 1);
    const state = await (await fetch(base + '/demo-api/version')).json();
    assert.equal(state.version, 2); assert.deepEqual(state.project, project);
  }, { saveDelayMs: 1500 });

  await test('HTTP: failed latest check preserves the draft and the retry gate', async (page, base, writes) => {
    await useTransport(page, 'http'); await edit(page);
    await page.locator('#lab-outcome').selectOption('uncertain'); await page.locator('#lab-save').click();
    await text(page, 'lab-summary-title', 'Save outcome unknown');
    await page.route('**/demo-api/version', route => route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ message: 'Temporarily unavailable' }) }));
    await page.locator('#lab-reload').click(); await text(page, 'lab-summary-title', 'Latest version could not be checked');
    assert.equal(await page.locator('#lab-save').isDisabled(), true);
    assert.equal(await page.locator('#lab-notes').inputValue(), project.notes);
    assert.equal(writes.length, 1);
    assert.equal((await (await fetch(base + '/demo-api/version')).json()).version, 2);
  });

  await test('HTTP: a known rejected save leaves an explicit retry available', async (page, base, writes) => {
    await useTransport(page, 'http'); await edit(page);
    await page.locator('#lab-outcome').selectOption('failure'); await page.locator('#lab-save').click();
    await text(page, 'lab-errors', 'unavailable');
    assert.equal(await page.locator('#lab-save').isEnabled(), true);
    assert.equal(await page.locator('#lab-notes').inputValue(), project.notes);
    assert.equal((await (await fetch(base + '/demo-api/version')).json()).version, 1);
    await page.locator('#lab-outcome').selectOption('success'); await page.locator('#lab-save').click();
    await text(page, 'lab-result', 'Project saved.'); assert.equal(writes.length, 2);
  });
} finally { await browser.close(); }
console.log(`Form reliability: ${passed} passed, ${failures.length} failed`);
if (failures.length) { console.error(failures.join('\n')); process.exitCode = 1; }
