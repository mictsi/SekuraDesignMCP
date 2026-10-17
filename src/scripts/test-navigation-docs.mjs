/** Navigation acceptance against the generated documentation and worked examples. */
import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createDemoServer } from './demo-server.mjs';
import { components } from '../../dist/data/components/index.js';

const pw = await import(process.env.SEKURA_PLAYWRIGHT
  ? pathToFileURL(resolve(process.env.SEKURA_PLAYWRIGHT)).href : 'playwright-core');
const browser = await pw.chromium.launch({
  executablePath: process.env.SK_BROWSER || process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});
const server = createDemoServer();
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}`;
const failures = [];
let passed = 0;
mkdirSync('.run/review', { recursive: true });

async function test(label, run, viewport = { width: 1440, height: 1000 }) {
  const page = await browser.newPage({ viewport, reducedMotion: 'reduce', acceptDownloads: true });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.setDefaultTimeout(5000);
  try {
    await run(page);
    assert.deepEqual(errors, [], 'uncaught page errors');
    passed++;
    console.log('PASS navigation docs: ' + label);
  } catch (error) {
    failures.push(label + ': ' + error.message);
    console.error('FAIL navigation docs: ' + label + ': ' + error.message);
  } finally { await page.close(); }
}

async function assertWithinViewport(locator) {
  assert.equal(await locator.evaluate(element => {
    const box = element.getBoundingClientRect();
    return box.left >= -1 && box.right <= innerWidth + 1;
  }), true, 'control or panel extends beyond the viewport');
}

async function downloadText(download) {
  assert.equal(await download.failure(), null);
  const chunks = [];
  for await (const chunk of await download.createReadStream()) chunks.push(chunk);
  return Buffer.concat(chunks).toString('utf8');
}

try {
  await test('recursive categories retain all links, exact current state and independent disclosures', async page => {
    await page.goto(base + '/component-menu.html');
    const nav = page.locator('#primary-nav');
    const current = nav.locator('[aria-current="page"]');
    assert.equal(await current.count(), 1);
    assert.equal(await current.getAttribute('href'), 'component-menu.html');
    const componentLinks = await nav.locator('a[href^="component-"]').evaluateAll(links => links.map(link => link.getAttribute('href')));
    assert.equal(componentLinks.length, components.length);
    assert.equal(new Set(componentLinks).size, components.length);
    const currentAncestors = await current.evaluate(link => {
      const result = [];
      let parent = link.parentElement;
      while (parent && parent.id !== 'primary-nav') {
        if (parent.classList.contains('sk-side-nav__children')) {
          const row = parent.previousElementSibling;
          result.push({ open: !parent.hidden, toggle: row.querySelector('button').getAttribute('aria-expanded'), current: row.querySelector('a').getAttribute('aria-current'), ancestor: row.querySelector('a').hasAttribute('data-active-ancestor') });
        }
        parent = parent.parentElement;
      }
      return result;
    });
    assert.equal(currentAncestors.length, 2, 'component should be in Components > category');
    assert.ok(currentAncestors.every(item => item.open && item.toggle === 'true' && item.current === null && item.ancestor));
    const category = nav.locator('a[href="components.html#navigation"]');
    const disclosure = category.locator('..').locator('button');
    await disclosure.click();
    assert.equal(await disclosure.getAttribute('aria-expanded'), 'false');
    assert.equal(await current.getAttribute('aria-current'), 'page');
    assert.equal(new URL(page.url()).pathname, '/component-menu.html');
    await disclosure.click();
    assert.equal(await current.isVisible(), true);
    assert.equal(await nav.locator('[role="tree"],[role="menu"]').count(), 0, 'destination navigation must retain normal link semantics');
    await page.waitForFunction(() => document.querySelectorAll('.docs-toc__link[aria-current="location"]').length === 1);
    assert.equal(await page.locator('.docs-toc__link[aria-current="page"],.docs-toc__link[aria-current="true"]').count(), 0, 'on-page contents use location, separate from the current route');
    await page.locator('#css [data-sk-toggle-target]').click();
    await page.locator('.docs-toc__link[href="#css"]').click();
    await page.waitForFunction(() => document.querySelector('.docs-toc__link[aria-current="location"]')?.getAttribute('href') === '#css');
    await page.locator('main').evaluate(element => { element.scrollTop += 200; });
    await page.waitForFunction(() => document.querySelector('.docs-toc__link[aria-current="location"]')?.getAttribute('href') === '#css');
    await page.locator('main').evaluate(element => { element.scrollTop = 0; });
    await page.waitForFunction(() => document.querySelector('.docs-toc__link[aria-current="location"]')?.getAttribute('href') === '#usage');
  });

  await test('fixed width ignores legacy values and preferences contain no sizing UI', async page => {
    await page.addInitScript(() => localStorage.setItem('sk-nav-width', '400'));
    await page.goto(base + '/component-menu.html');
    const nav = page.locator('#primary-nav');
    assert.equal(await page.locator('#nav-width,[data-sk-nav-width],[data-sk-nav-reset]').count(), 0);
    assert.equal(await nav.evaluate(element => element.style.getPropertyValue('--sk-layout-nav-width')), '');
    assert.ok(Math.abs((await nav.boundingBox()).width - 272) < 1, 'sidebar must use the layout token');
    const preferences = nav.locator('.docs-nav-preferences');
    assert.equal(await preferences.evaluate(element => element.previousElementSibling.hasAttribute('data-docs-nav-scroll')), true);
    await preferences.locator('summary').click();
    await preferences.getByRole('radio', { name: 'Dark', exact: true }).click();
    assert.equal(await page.locator('html').getAttribute('data-sk-theme'), 'dark');
    assert.equal(await preferences.getByRole('radio', { name: 'Dark', exact: true }).getAttribute('aria-checked'), 'true');
  });

  for (const width of [736, 390, 320]) {
    await test('mobile search, contextual results and explicit drawer at ' + width + 'px', async page => {
      await page.goto(base + '/component-menu.html');
      const search = page.getByRole('button', { name: 'Search the design system Ctrl K', exact: true });
      assert.equal(await search.isVisible(), true);
      await assertWithinViewport(search);
      await search.click();
      await page.locator('#cp-input').fill('Menu');
      const result = page.locator('#command-palette [data-href="component-menu.html"]');
      assert.equal(await result.isVisible(), true);
      assert.match(await result.locator('.sk-command-palette__context').textContent(), /Reference.*Components.*Navigation/);
      await assertWithinViewport(result);
      assert.equal(await result.locator('.sk-command-palette__label').evaluate(element => element.scrollWidth <= element.clientWidth + 1), true, 'result label must remain readable beside its context');
      assert.equal(await result.locator('.sk-command-palette__context').evaluate(element => element.scrollWidth <= element.clientWidth + 1), true, 'result hierarchy must wrap within the panel');
      assert.equal(await page.locator('#command-palette [data-sk-palette-close]').evaluate(element => {
        const range = document.createRange(); range.selectNodeContents(element);
        return Array.from(range.getClientRects()).filter(box => box.width && box.height).length;
      }), 1, 'Close must fit on one line');
      await page.keyboard.press('Escape');
      assert.equal(await search.evaluate(element => element === document.activeElement), true);
      const trigger = page.locator('.sk-top-bar__nav-trigger');
      await trigger.click();
      const nav = page.locator('#primary-nav');
      assert.equal(await nav.getAttribute('role'), 'dialog');
      assert.equal(await nav.getAttribute('aria-modal'), 'true');
      assert.equal(await nav.locator('[aria-current="page"]').isVisible(), true);
      await nav.locator('[data-docs-nav-close]').click();
      assert.equal(await nav.isVisible(), false);
      assert.equal(await trigger.evaluate(element => element === document.activeElement), true);
      assert.equal(await page.locator('html').evaluate(element => element.scrollWidth <= innerWidth + 1), true);
    }, { width, height: 900 });
  }

  await test('local settings navigation stays in flow and collapsed rail exposes child access', async page => {
    await page.goto(base + '/example-settings.html');
    const nav = page.locator('[data-sk-settings-nav]');
    assert.equal(await nav.isVisible(), true);
    assert.notEqual(await nav.evaluate(element => getComputedStyle(element).position), 'fixed');
    assert.equal(await nav.locator('ul').evaluate(element => getComputedStyle(element).flexDirection), 'row');
    await assertWithinViewport(nav);
    await nav.locator('a[href="#notifications"]').click();
    await page.waitForFunction(() => document.querySelector('[data-sk-settings-nav] a[href="#notifications"]').getAttribute('aria-current') === 'location');
    assert.equal(new URL(page.url()).hash, '#notifications');
    const rail = page.locator('#settings-nav-preview');
    await rail.locator('[data-sk-nav-expand]').click();
    assert.equal(await rail.evaluate(element => element.classList.contains('sk-side-nav--collapsed')), false);
    assert.equal(await rail.locator('.sk-side-nav__children').isVisible(), true);
    assert.equal(await rail.locator('.sk-side-nav__children [aria-current]').evaluate(element => element === document.activeElement), true);
    assert.equal(await rail.locator('.sk-side-nav__children [aria-current]').evaluate(element => getComputedStyle(element, '::before').width), '4px', 'current local destination retains the leading marker');
    await page.locator('[data-sk-nav-collapse="settings-nav-preview"]').click();
    assert.equal(await rail.locator('.sk-side-nav__children').isVisible(), false);
    assert.equal(await rail.locator('[data-sk-nav-expand]').evaluate(element => element === document.activeElement), true);
    assert.equal(await page.locator('main').evaluate(element => element.scrollWidth <= element.clientWidth + 1), true);
    await page.screenshot({ path: '.run/review/navigation-settings-390.png', fullPage: true });
  }, { width: 390, height: 900 });

  await test('breadcrumb overflow contains normal links and supports native tab navigation', async page => {
    await page.goto(base + '/component-breadcrumbs.html');
    const overflow = page.locator('.sk-breadcrumbs__overflow');
    await overflow.locator('summary').click();
    assert.equal(await overflow.locator('a').count(), 2);
    assert.equal(await overflow.locator('[role="menu"],[role="menuitem"]').count(), 0);
    await assertWithinViewport(overflow.locator('.sk-breadcrumbs__ancestors'));
    assert.equal(await overflow.locator('a').last().evaluate(element => {
      const box = element.getBoundingClientRect();
      return element.contains(document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2));
    }), true, 'ancestor links must not be clipped by the preview wrapper');
    await page.keyboard.press('Tab');
    assert.equal(await overflow.locator('a').first().evaluate(element => element === document.activeElement), true);
    await page.keyboard.press('Escape');
    assert.equal(await overflow.evaluate(element => element.open), false);
    assert.equal(await overflow.locator('summary').evaluate(element => element === document.activeElement), true);
  }, { width: 320, height: 900 });

  await test('worked detail submenu exports current local tasks once as CSV and JSON', async page => {
    await page.goto(base + '/example-detail.html');
    assert.equal(await page.locator('[data-sk-submenu][data-sk-menu-trigger]').count(), 0, 'submenu owner must not get a second root controller');
    await page.evaluate(() => {
      window.navigationExports = [];
      document.querySelector('#share-menu').addEventListener('sk:menu:select', event => window.navigationExports.push(event.detail.value));
    });
    for (const format of ['csv', 'json']) {
      await page.locator('#project-share-trigger').click();
      await page.locator('#project-export-trigger').click();
      await assertWithinViewport(page.locator('#project-export-menu'));
      const waiting = page.waitForEvent('download');
      await page.locator('#project-export-menu [data-value="export-' + format + '"]').click();
      const download = await waiting;
      assert.equal(download.suggestedFilename(), 'tasks.' + format);
      const content = await downloadText(download);
      if (format === 'json') assert.ok(JSON.parse(content).length > 0);
      else assert.match(content, /Pricing table variants/);
      assert.equal(await page.locator('#share-menu').isVisible(), false);
      assert.equal(await page.locator('#project-share-trigger').evaluate(element => element === document.activeElement), true);
    }
    assert.deepEqual(await page.evaluate(() => navigationExports), ['export-csv', 'export-json']);
  });

  await test('worked mobile submenu uses one active panel, Back and innermost Escape', async page => {
    await page.goto(base + '/example-detail.html');
    await page.locator('#project-share-trigger').click();
    await page.locator('#project-export-trigger').click();
    assert.equal(await page.locator('#project-export-menu').getAttribute('data-sk-menu-mode'), 'drilldown');
    assert.equal(await page.locator('#share-menu').evaluate(element => getComputedStyle(element).visibility), 'hidden', 'drilldown must suspend the parent panel');
    assert.equal(await page.locator('#project-export-menu').isVisible(), true, 'Export child must be visible');
    await assertWithinViewport(page.locator('#project-export-menu'));
    await page.locator('#project-export-menu [data-sk-menu-back]').click();
    assert.equal(await page.locator('#share-menu').isVisible(), true, 'Back must reveal the parent panel');
    assert.equal(await page.locator('#project-export-trigger').evaluate(element => element === document.activeElement), true, 'Back must return focus to its submenu owner');
    await page.locator('#project-export-trigger').click();
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('#project-export-menu').isVisible(), false, 'first Escape must close the child');
    assert.equal(await page.locator('#share-menu').isVisible(), true, 'first Escape must preserve the root menu');
    assert.equal(await page.locator('#project-export-trigger').evaluate(element => element === document.activeElement), true, 'first Escape must focus the submenu owner');
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('#share-menu').isVisible(), false, 'second Escape must close the root menu');
    assert.equal(await page.locator('#project-share-trigger').evaluate(element => element === document.activeElement), true, 'second Escape must focus the root trigger');
  }, { width: 320, height: 900 });

  for (const width of [1440, 320]) {
    await test('rapid keyboard submenu stays in the viewport during entrance at ' + width + 'px', async page => {
      await page.emulateMedia({ reducedMotion: 'no-preference' });
      await page.goto(base + '/example-detail.html');
      await page.locator('#project-share-trigger').focus();
      await page.keyboard.press('Enter');
      await page.keyboard.press('ArrowDown');
      await page.keyboard.press('ArrowDown');
      await page.keyboard.press('ArrowRight');
      assert.equal(await page.locator('#project-export-trigger').getAttribute('aria-expanded'), 'true');
      const frames = await page.locator('#project-export-menu').evaluate(element => new Promise(resolve => {
        const boxes = [];
        function sample() {
          const box = element.getBoundingClientRect();
          boxes.push({ left: box.left, right: box.right, top: box.top, bottom: box.bottom,
            within: !element.hidden && box.left >= -1 && box.right <= innerWidth + 1 && box.top >= -1 && box.bottom <= innerHeight + 1 });
          if (boxes.length < 14) requestAnimationFrame(sample);
          else resolve(boxes);
        }
        sample();
      }));
      assert.ok(frames.every(box => box.within), 'submenu must remain visible throughout entrance: ' + JSON.stringify(frames.filter(box => !box.within)));
    }, { width, height: 900 });
  }
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
console.log(`Navigation documentation: ${passed} passed, ${failures.length} failed`);
if (failures.length) { console.error(failures.join('\n')); process.exitCode = 1; }
