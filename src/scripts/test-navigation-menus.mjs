/** Real-browser regression coverage for menu ownership, focus and overlay stacks. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const pw = await import(process.env.SEKURA_PLAYWRIGHT
  ? pathToFileURL(resolve(process.env.SEKURA_PLAYWRIGHT)).href
  : 'playwright-core');
const bundle = readFileSync(resolve(process.env.SEKURA_BEHAVIOUR_BUNDLE || 'dist-js/sekura.iife.js'), 'utf8');
const browser = await pw.chromium.launch({
  executablePath: process.env.SK_BROWSER || process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});
const style = `<style>
body{font:16px sans-serif;margin:20px}button{min-height:36px}
[role=menu]{box-sizing:border-box;display:flex;flex-direction:column;width:190px;padding:4px;border:1px solid #444;background:white}
[hidden]{display:none!important} [role=menuitem],[role=menuitemcheckbox],[role=menuitemradio]{text-align:start}
dialog{padding:24px} #after{margin-inline-start:24px}
/* Match the system's motion reset. A positive global duration used to delay
   inherited visibility and lose focus when returning from a submenu. */
@media (prefers-reduced-motion:reduce){*,*::before,*::after{transition-duration:0ms!important}}
</style>`;
const fixture = `
<button id="before">Before</button>
<button id="trigger" data-sk-menu-trigger="menu">Actions</button>
<div id="menu" role="menu">
  <button id="edit" role="menuitem" data-value="edit"><span class="sk-menu__label">Edit</span></button>
  <button id="export" role="menuitem" data-sk-submenu aria-controls="formats">Export</button>
  <div id="formats" role="menu" hidden>
    <button id="back" role="menuitem" data-sk-menu-back>Back to actions</button>
    <button id="csv" role="menuitem" data-value="csv">CSV</button>
    <button id="json" role="menuitem" data-value="json">JSON</button>
  </div>
  <button id="disabled" role="menuitem" aria-disabled="true" aria-describedby="reason">Archive</button>
  <span id="reason">Project is still active</span>
  <button id="move" role="menuitem" data-sk-submenu aria-controls="destinations">Move</button>
  <div id="destinations" role="menu" hidden>
    <button role="menuitem" data-sk-menu-back>Back to actions</button>
    <button id="destination" role="menuitem">Folder</button>
  </div>
  <button id="remove" role="menuitem" data-value="remove">Delete</button>
</div>
<button id="after">After</button>
<h1 id="destination-heading" tabindex="-1">Destination</h1>
<dialog id="dialog"><input id="dialog-input" aria-label="Project name" autofocus><button>Close</button></dialog>
`;
const failures = [];
let passed = 0;
const active = page => page.evaluate(() => document.activeElement?.id);
const expanded = (page, id) => page.locator('#' + id).getAttribute('aria-expanded');

async function mount(page, markup = fixture) {
  await page.setContent(style + markup);
  await page.addScriptTag({ content: bundle });
}

async function init(page, options = {}) {
  await page.evaluate(options => {
    window.selections = [];
    window.menuController = Sekura.createMenu(document.getElementById('trigger'), document.getElementById('menu'), {
      ...options, onSelect: (item, value) => window.selections.push(value),
    });
  }, options);
}

async function test(label, run, viewport = { width: 1200, height: 800 }) {
  const page = await browser.newPage({ viewport, reducedMotion: 'reduce' });
  page.setDefaultTimeout(4000);
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  try {
    await run(page);
    assert.deepEqual(errors, [], 'uncaught browser errors');
    passed++;
    console.log('PASS navigation menus: ' + label);
  } catch (error) {
    failures.push(label + ': ' + error.message);
    console.error('FAIL navigation menus: ' + label + ': ' + error.message);
  } finally { await page.close(); }
}

try {
  for (const layout of ['stretched block', 'flex sibling']) {
    await test('first-open placement uses final geometry for a ' + layout, async page => {
      const popup = '<div id="menu" role="menu" hidden style="width:auto;min-inline-size:190px"><button role="menuitem">Copy link</button><button role="menuitem">Export</button></div>';
      const titleAndTrigger = '<strong style="flex:1">Project</strong><button id="trigger">Actions</button>';
      await mount(page, '<header style="display:flex;align-items:start;gap:12px;margin-top:70px">' + titleAndTrigger +
        (layout === 'flex sibling' ? popup + '</header>' : '</header>' + popup));
      await init(page);
      const before = await page.locator('#trigger').boundingBox();
      await page.locator('#trigger').click();
      const trigger = await page.locator('#trigger').boundingBox();
      const menu = await page.locator('#menu').boundingBox();
      assert.ok(Math.abs(trigger.x - before.x) <= 1, 'opening a popup must not move its trigger');
      assert.ok(Math.abs(menu.x - Math.max(8, Math.min(trigger.x, 1200 - menu.width - 8))) <= 1,
        'first-open menu must align with its final trigger geometry, allowing viewport clamping');
      assert.ok(Math.abs(menu.y - (trigger.y + trigger.height + 6)) <= 1,
        'first-open menu must sit directly below its trigger without a resize or scroll repair');
      assert.ok(menu.x >= 8 && menu.x + menu.width <= 1192);
    });
  }

  await test('first-open corner placement flips and clamps within a narrow viewport', async page => {
    await mount(page, '<button id="trigger" style="position:fixed;right:10px;bottom:10px">Actions</button>' +
      '<div id="menu" role="menu" hidden style="width:auto;min-inline-size:190px"><button role="menuitem">Copy link</button><button role="menuitem">Export</button></div>');
    await init(page);
    await page.locator('#trigger').click();
    const trigger = await page.locator('#trigger').boundingBox();
    const menu = await page.locator('#menu').boundingBox();
    assert.equal(await page.locator('#menu').getAttribute('data-sk-side'), 'top');
    assert.ok(Math.abs(menu.y + menu.height + 6 - trigger.y) <= 1, 'flipped menu stays next to the trigger');
    assert.ok(Math.abs(menu.x + menu.width - 312) <= 1, 'right-edge clamp uses the final popup width');
    assert.ok(menu.x >= 8 && menu.y >= 8 && menu.y + menu.height <= 632);
  }, { width: 320, height: 640 });

  await test('each menu owns its keyboard sequence and dispatches selection once', async page => {
    await mount(page); await init(page);
    await page.locator('#trigger').focus(); await page.keyboard.press('ArrowDown');
    assert.equal(await active(page), 'edit');
    await page.keyboard.press('End'); assert.equal(await active(page), 'remove');
    await page.keyboard.press('Home'); await page.keyboard.press('j');
    assert.equal(await active(page), 'edit', 'hidden child must not match parent typeahead');
    await page.locator('#export').focus(); await page.keyboard.press('ArrowRight');
    assert.equal(await active(page), 'csv');
    await page.keyboard.press('ArrowDown'); assert.equal(await active(page), 'json');
    await page.keyboard.press('Enter');
    assert.deepEqual(await page.evaluate(() => selections), ['json']);
    assert.equal(await expanded(page, 'trigger'), 'false');
    assert.equal(await expanded(page, 'export'), 'false');
    assert.equal(await active(page), 'trigger');
  });

  await test('disabled commands remain focusable and block keyboard, pointer and target handlers', async page => {
    await mount(page); await init(page);
    await page.evaluate(() => {
      window.disabledClicks = 0;
      document.getElementById('disabled').addEventListener('click', () => window.disabledClicks++);
    });
    await page.locator('#trigger').click();
    await page.keyboard.press('a'); assert.equal(await active(page), 'disabled');
    await page.keyboard.press('Enter'); await page.keyboard.press('Space');
    const rect = await page.locator('#disabled').boundingBox();
    await page.mouse.click(rect.x + 10, rect.y + 10);
    assert.equal(await page.evaluate(() => disabledClicks), 0);
    assert.deepEqual(await page.evaluate(() => selections), []);
    assert.equal(await expanded(page, 'trigger'), 'true');
  });

  await test('Escape closes only one menu level and restores its exact opener', async page => {
    await mount(page); await init(page);
    await page.locator('#trigger').click(); await page.locator('#export').click();
    await page.keyboard.press('Escape');
    assert.equal(await expanded(page, 'trigger'), 'true');
    assert.equal(await expanded(page, 'export'), 'false');
    assert.equal(await active(page), 'export');
    await page.keyboard.press('Escape');
    assert.equal(await expanded(page, 'trigger'), 'false');
    assert.equal(await active(page), 'trigger');
  });

  await test('Tab leaves the whole chain in both directions', async page => {
    await mount(page); await init(page);
    for (const [key, expected] of [['Tab', 'after'], ['Shift+Tab', 'before']]) {
      await page.locator('#trigger').click(); await page.locator('#export').click();
      await page.keyboard.press(key);
      assert.equal(await expanded(page, 'trigger'), 'false');
      assert.equal(await expanded(page, 'export'), 'false');
      assert.equal(await active(page), expected);
    }
  });

  await test('moving to a sibling closes its previous submenu', async page => {
    await mount(page); await init(page);
    await page.locator('#trigger').click(); await page.locator('#export').click();
    await page.locator('#move').focus();
    assert.equal(await expanded(page, 'export'), 'false');
    await page.keyboard.press('ArrowRight');
    assert.equal(await active(page), 'destination');
    assert.equal(await expanded(page, 'move'), 'true');
  });

  await test('portaled children share the parent outside-click region', async page => {
    await mount(page);
    await page.evaluate(() => document.body.appendChild(document.getElementById('formats')));
    await init(page, { closeOnSelect: false });
    await page.locator('#trigger').click(); await page.locator('#export').click();
    await page.locator('#csv').click();
    assert.equal(await expanded(page, 'trigger'), 'true');
    assert.equal(await expanded(page, 'export'), 'true');
    await page.locator('#edit').click();
    assert.equal(await expanded(page, 'export'), 'false');
    assert.equal(await expanded(page, 'trigger'), 'true');
    await page.locator('#after').click();
    assert.equal(await expanded(page, 'trigger'), 'false');
  });

  await test('RTL uses logical submenu keys and collision-safe placement', async page => {
    await mount(page);
    await page.evaluate(() => {
      document.getElementById('menu').dir = 'rtl';
      document.body.appendChild(document.getElementById('formats'));
    });
    await init(page);
    await page.locator('#trigger').click(); await page.locator('#export').focus();
    await page.keyboard.press('ArrowLeft'); assert.equal(await active(page), 'csv');
    assert.equal(await page.locator('#formats').evaluate(el => getComputedStyle(el).direction), 'rtl');
    const rect = await page.locator('#formats').boundingBox();
    assert.ok(rect.x >= 0 && rect.x + rect.width <= 1200);
    await page.keyboard.press('ArrowRight'); assert.equal(await active(page), 'export');
    assert.equal(await expanded(page, 'export'), 'false');
  });

  await test('mobile Back, one visible panel and live breakpoint changes', async page => {
    await mount(page); await init(page);
    await page.evaluate(() => {
      window.mobileMenuEvents = [];
      document.getElementById('export').addEventListener('sk:menu:open', () => mobileMenuEvents.push({
        type: 'open', parentVisibility: getComputedStyle(document.getElementById('menu')).visibility,
      }));
      document.getElementById('export').addEventListener('sk:menu:close', () => mobileMenuEvents.push({
        type: 'close', active: document.activeElement.id,
      }));
    });
    await page.locator('#trigger').click(); await page.locator('#export').click();
    assert.equal(await page.locator('#menu').evaluate(el => getComputedStyle(el).visibility), 'hidden');
    assert.equal(await page.locator('#formats').evaluate(el => getComputedStyle(el).visibility), 'visible');
    assert.equal(await page.locator('#back').isVisible(), true);
    assert.equal(await active(page), 'back');
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.waitForFunction(() => document.getElementById('back').hidden);
    assert.equal(await page.locator('#menu').evaluate(el => getComputedStyle(el).visibility), 'visible');
    assert.equal(await active(page), 'csv');
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForFunction(() => document.getElementById('menu').hasAttribute('data-sk-menu-suspended'));
    await page.locator('#back').click();
    assert.equal(await active(page), 'export');
    assert.equal(await page.locator('#menu').evaluate(el => getComputedStyle(el).visibility), 'visible');
    assert.equal(await expanded(page, 'export'), 'false');
    assert.deepEqual(await page.evaluate(() => mobileMenuEvents), [
      { type: 'open', parentVisibility: 'hidden' }, { type: 'close', active: 'export' },
    ], 'panel visibility and focus must be correct synchronously when the state event fires');
  }, { width: 390, height: 844 });

  await test('touch taps open a submenu and Back without hover', async page => {
    await mount(page); await init(page, { submenuMode: 'drilldown' });
    // Real pointer events are exercised in a touch-capable context below.
    const context = await browser.newContext({ hasTouch: true, viewport: { width: 390, height: 844 } });
    try {
      const touch = await context.newPage(); await mount(touch); await init(touch);
      await touch.locator('#trigger').tap(); await touch.locator('#export').tap();
      assert.equal(await expanded(touch, 'export'), 'true');
      await touch.locator('#back').tap();
      assert.equal(await expanded(touch, 'export'), 'false');
      assert.equal(await active(touch), 'export');
    } finally { await context.close(); }
  });

  for (const kind of ['dialog', 'drawer']) {
    await test('nested menu Escape preserves a fallback ' + kind + ' until the next key', async page => {
      await mount(page, '<button id="overlay-opener">Open</button><div id="overlay"><h2>Details</h2>' + fixture + '</div>');
      await page.evaluate(kind => {
        const overlay = document.getElementById('overlay');
        window.overlayController = kind === 'dialog'
          ? Sekura.createDialog(overlay)
          : Sekura.createDrawer(overlay, { modal: true });
        document.getElementById('overlay-opener').focus();
        window.overlayController.show();
      }, kind);
      await init(page);
      await page.locator('#trigger').click(); await page.locator('#export').click();
      await page.keyboard.press('Escape');
      assert.equal(await expanded(page, 'trigger'), 'true');
      assert.equal(await page.evaluate(() => overlayController.open), true);
      await page.keyboard.press('Escape');
      assert.equal(await expanded(page, 'trigger'), 'false');
      assert.equal(await page.evaluate(() => overlayController.open), true);
      await page.keyboard.press('Escape');
      assert.equal(await page.evaluate(() => overlayController.open), false);
      assert.equal(await active(page), 'overlay-opener');
    });
  }

  await test('a native dialog above a popover keeps Escape ownership', async page => {
    await mount(page, '<button id="popover-trigger">Help</button><div id="popover"><button id="show-dialog">Edit</button></div><dialog id="native"><input id="native-input" aria-label="Name" autofocus></dialog>');
    await page.evaluate(() => {
      window.popoverController = Sekura.createPopover(document.getElementById('popover-trigger'), document.getElementById('popover'));
      window.dialogController = Sekura.createDialog(document.getElementById('native'));
      document.getElementById('show-dialog').addEventListener('click', () => dialogController.show());
    });
    await page.locator('#popover-trigger').click(); await page.locator('#show-dialog').click();
    await page.keyboard.press('Escape');
    assert.equal(await page.evaluate(() => dialogController.open), false);
    assert.equal(await page.evaluate(() => popoverController.open), true);
    await page.keyboard.press('Escape');
    assert.equal(await page.evaluate(() => popoverController.open), false);
  });

  await test('a modeless native dialog does not block menu Escape or outside dismissal', async page => {
    await mount(page, fixture + '<dialog id="modeless" style="position:absolute;top:500px"><input id="modeless-input" aria-label="Modeless name"></dialog>');
    await init(page);
    await page.evaluate(() => document.getElementById('modeless').show());
    assert.equal(await page.locator('#modeless').evaluate(el => el.matches(':modal')), false);
    await page.locator('#trigger').click(); await page.locator('#modeless-input').focus();
    await page.keyboard.press('Escape');
    assert.equal(await page.evaluate(() => menuController.open), false);
    assert.equal(await page.locator('#modeless').evaluate(el => el.open), true);
    await page.locator('#trigger').click(); await page.locator('#modeless-input').click();
    assert.equal(await page.evaluate(() => menuController.open), false);
    assert.equal(await active(page), 'modeless-input');
  });

  await test('onSelect can focus a dialog or route without focus being stolen', async page => {
    await mount(page);
    await page.evaluate(() => {
      window.dialogController = Sekura.createDialog(document.getElementById('dialog'));
      window.menuController = Sekura.createMenu(document.getElementById('trigger'), document.getElementById('menu'), {
        onSelect(item) {
          if (item.id === 'edit') dialogController.show();
          else document.getElementById('destination-heading').focus();
        },
      });
    });
    await page.locator('#trigger').click(); await page.locator('#edit').click();
    assert.equal(await active(page), 'dialog-input');
    assert.equal(await expanded(page, 'trigger'), 'false');
    await page.keyboard.press('Escape'); assert.equal(await active(page), 'trigger');
    await page.locator('#trigger').click(); await page.locator('#remove').click();
    assert.equal(await active(page), 'destination-heading');
  });

  await test('a target click handler that already focused a dialog keeps its focus', async page => {
    await mount(page); await init(page);
    await page.evaluate(() => {
      window.dialogController = Sekura.createDialog(document.getElementById('dialog'));
      document.getElementById('edit').addEventListener('click', () => dialogController.show());
    });
    await page.locator('#trigger').click(); await page.locator('#edit').click();
    assert.equal(await active(page), 'dialog-input');
    assert.equal(await expanded(page, 'trigger'), 'false');
  });

  await test('checkable menus remain open and radio groups never cross menu ownership', async page => {
    await mount(page);
    await page.evaluate(() => {
      const rootRadio = document.getElementById('edit');
      rootRadio.setAttribute('role', 'menuitemradio'); rootRadio.setAttribute('aria-checked', 'false');
      const childRadio = document.getElementById('csv');
      childRadio.setAttribute('role', 'menuitemradio'); childRadio.setAttribute('aria-checked', 'true');
    });
    await init(page);
    await page.locator('#trigger').click(); await page.locator('#edit').click();
    assert.equal(await page.locator('#edit').getAttribute('aria-checked'), 'true');
    assert.equal(await page.locator('#csv').getAttribute('aria-checked'), 'true');
    assert.equal(await expanded(page, 'trigger'), 'true');
  });

  await test('missing/cyclic targets are inert commands; destroy removes controller listeners', async page => {
    await mount(page);
    await page.evaluate(() => {
      const missing = document.createElement('button');
      missing.id = 'missing'; missing.setAttribute('role', 'menuitem');
      missing.setAttribute('data-sk-submenu', ''); missing.setAttribute('aria-controls', 'unknown');
      missing.textContent = 'Missing'; document.getElementById('menu').appendChild(missing);
      const cycle = missing.cloneNode(true); cycle.id = 'cycle'; cycle.setAttribute('aria-controls', 'menu');
      document.getElementById('formats').appendChild(cycle);
    });
    await init(page);
    await page.locator('#trigger').click(); await page.locator('#missing').focus();
    await page.keyboard.press('Enter');
    assert.deepEqual(await page.evaluate(() => selections), []);
    assert.equal(await page.locator('#missing').getAttribute('aria-disabled'), 'true');
    await page.locator('#export').click();
    await page.evaluate(() => menuController.destroy());
    assert.equal(await expanded(page, 'trigger'), 'false');
    assert.equal(await expanded(page, 'export'), 'false');
    assert.equal(await page.locator('#missing').getAttribute('aria-disabled'), null);
    await page.locator('#trigger').click();
    assert.equal(await expanded(page, 'trigger'), 'false');
  });

  for (const owner of ['trigger', 'export']) {
    await test('destroy during ' + owner + ' beforeopen leaves no open surface or dismiss listener', async page => {
      await mount(page); await init(page);
      if (owner === 'export') await page.locator('#trigger').click();
      await page.evaluate(owner => {
        window.opensAfterDestroy = 0;
        document.addEventListener('sk:menu:open', () => opensAfterDestroy++);
        document.getElementById(owner).addEventListener('sk:menu:beforeopen', () => menuController.destroy(), { once: true });
      }, owner);
      if (owner === 'trigger') await page.evaluate(() => menuController.openMenu());
      else await page.locator('#export').click();
      assert.equal(await page.evaluate(() => menuController.open), false);
      assert.equal(await page.locator('#menu').isVisible(), false);
      assert.equal(await page.locator('#formats').isVisible(), false);
      assert.equal(await expanded(page, 'trigger'), 'false');
      assert.equal(await expanded(page, 'export'), 'false');
      assert.equal(await page.evaluate(() => opensAfterDestroy), 0);
      assert.equal(await page.evaluate(() => {
        const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
        document.dispatchEvent(event); return event.defaultPrevented;
      }), false, 'destroyed controller must not install a new global Escape handler');
      await page.locator('#trigger').click();
      assert.equal(await page.evaluate(() => menuController.open), false);
    });
  }

  await test('enhance skips root registration for explicit submenu triggers', async page => {
    await mount(page);
    await page.evaluate(() => {
      window.selections = [];
      // Legacy generic annotation must not cause duplicate child controllers.
      document.getElementById('export').setAttribute('data-sk-menu-trigger', 'formats');
      document.getElementById('menu').addEventListener('sk:menu:select', event => selections.push(event.detail.value));
      window.enhanced = Sekura.enhance(document.body);
    });
    await page.locator('#trigger').click(); await page.locator('#export').click();
    await page.locator('#csv').click();
    assert.deepEqual(await page.evaluate(() => selections), ['csv']);
    assert.equal(await expanded(page, 'trigger'), 'false');
    assert.equal(await expanded(page, 'export'), 'false');
  });
} finally { await browser.close(); }

console.log('Navigation menu acceptance: ' + passed + ' passed, ' + failures.length + ' failed');
if (failures.length) process.exitCode = 1;
