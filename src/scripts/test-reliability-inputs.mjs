/** Outcome regressions for the 3.2 input, overlay composition and toast fixes. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const pw = await import(process.env.SEKURA_PLAYWRIGHT
  ? pathToFileURL(resolve(process.env.SEKURA_PLAYWRIGHT)).href : 'playwright-core');
const bundle = readFileSync(resolve(process.env.SEKURA_BEHAVIOUR_BUNDLE || 'dist-js/sekura.iife.js'), 'utf8');
const browser = await pw.chromium.launch({
  executablePath: process.env.SK_BROWSER || process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});
const failures = [];
let passed = 0;
const styles = '<style>[hidden]{display:none!important}body{font:16px sans-serif;margin:20px}button,input{min-height:32px}.sk-calendar__day{min-width:32px}.sk-toast{padding:8px;border:1px solid #888}#region{min-height:24px}</style>';
const dateFixture = '<form id="form"><input id="date" value="2026-08-21"><button id="trigger" type="button">Choose date</button><div id="panel"></div></form><button id="after">After</button>';
const rangeFixture = '<form id="form"><input id="start" value="2026-08-21"><input id="end" value="2026-08-25"><div id="calendar"></div></form><button id="after">After</button>';
const active = page => page.evaluate(() => document.activeElement?.id);

async function mount(page, markup) {
  await page.setContent(styles + markup);
  await page.addScriptTag({ content: bundle });
}
async function picker(page, restricted = true) {
  await page.evaluate(restricted => {
    window.changes = [];
    window.events = { input: 0, change: 0, custom: 0 };
    const input = document.getElementById('date');
    window.controller = Sekura.createDatePicker(input, document.getElementById('trigger'), document.getElementById('panel'), {
      ...(restricted ? {
        min: { y: 2026, m: 8, d: 10 }, max: { y: 2026, m: 8, d: 31 },
        isDisabled: date => date.d === 15 ? 'Closed for a holiday' : null,
      } : {}),
      onChange: date => changes.push(date),
    });
    input.addEventListener('input', () => events.input++);
    input.addEventListener('change', () => events.change++);
    input.addEventListener('sk:datepicker:change', () => events.custom++);
  }, restricted);
}
async function test(label, run) {
  const page = await browser.newPage({ reducedMotion: 'reduce' });
  page.setDefaultTimeout(3000);
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  try {
    await run(page);
    assert.deepEqual(errors, [], 'uncaught browser errors');
    passed++;
    console.log('PASS input reliability: ' + label);
  } catch (error) {
    failures.push(label + ': ' + error.message);
    console.error('FAIL input reliability: ' + label + ': ' + error.message);
  } finally { await page.close(); }
}

try {
  for (const [locale, number, precision, format] of [
    ['sv-SE', 1.234, 3, false], ['de-DE', 1234.5, 2, true],
    ['ar-EG', -1234.5, 2, true], ['hi-IN', 1234567.89, 2, true],
    ['en-US', -0.125, 3, false],
  ]) {
    await test(`BEH-01 ${locale} keeps its canonical value through focus, blur and programmatic writes`, async page => {
      await mount(page, `<input id="number" value="${number}"><button id="after">After</button>`);
      const initial = await page.evaluate(({ locale, precision, format }) => {
        window.changes = [];
        window.events = { input: 0, change: 0 };
        const input = document.getElementById('number');
        window.controller = Sekura.createNumberInput(input, { locale, precision, format, step: 10 ** -precision, onChange: value => changes.push(value) });
        input.addEventListener('input', () => events.input++);
        input.addEventListener('change', () => events.change++);
        return { value: controller.value, display: input.value };
      }, { locale, precision, format });
      assert.equal(initial.value, number);
      for (let i = 0; i < 2; i++) { await page.locator('#number').focus(); await page.locator('#after').focus(); }
      assert.deepEqual(await page.evaluate(() => ({ value: controller.value, display: document.getElementById('number').value })), initial);
      assert.deepEqual(await page.evaluate(() => changes), []);
      await page.evaluate(() => controller.setValue(2.125));
      const written = await page.evaluate(() => controller.value);
      await page.locator('#number').focus(); await page.locator('#after').focus();
      assert.equal(await page.evaluate(() => controller.value), written);
      assert.deepEqual(await page.evaluate(() => events), { input: 1, change: 1 });
      assert.equal(await page.evaluate(() => changes.length), 1);
      await page.evaluate(() => controller.destroy());
    });
  }

  for (const locale of ['de-DE', 'da-DK']) {
    await test(`BEH-01 ${locale} default-precision formatting survives destroy and remount`, async page => {
      await mount(page, '<form id="form"><input id="number" value="1234"></form><button id="after">After</button>');
      const result = await page.evaluate(locale => {
        const input = document.getElementById('number');
        const changes = [];
        const options = { locale, format: true, onChange: value => changes.push(value) };
        let controller = Sekura.createNumberInput(input, options);
        const first = { value: controller.value, text: input.value };
        controller.destroy();
        const canonical = input.value;
        controller = Sekura.createNumberInput(input, options);
        const remounted = { value: controller.value, text: input.value };
        controller.destroy();
        input.value = '1.234';
        controller = Sekura.createNumberInput(input, { ...options, step: 0.001 });
        const authored = controller.value;
        controller.destroy();
        return { first, canonical, remounted, authored, changes };
      }, locale);
      assert.deepEqual(result, {
        first: { value: 1234, text: '1.234' }, canonical: '1234',
        remounted: { value: 1234, text: '1.234' }, authored: 1.234, changes: [],
      });
      assert.equal(await page.locator('.sk-field__error').count(), 0);
    });
  }

  await test('BEH-01 teardown preserves editable drafts and an immediately reset authored value', async page => {
    await mount(page, '<form id="form"><input id="number" value="1.234"></form><button id="after">After</button>');
    const result = await page.evaluate(() => {
      const input = document.getElementById('number');
      const form = document.getElementById('form');
      const options = { locale: 'de-DE', format: true };
      let controller = Sekura.createNumberInput(input, options);
      controller.setValue(1234);
      form.reset(); controller.destroy();
      const resetText = input.value;
      controller = Sekura.createNumberInput(input, options);
      const resetValue = controller.value;
      controller.setValue(1234);
      form.addEventListener('reset', event => event.preventDefault(), { once: true });
      form.reset(); controller.destroy();
      controller = Sekura.createNumberInput(input, options);
      const cancelledResetValue = controller.value;
      input.value = 'still editing'; input.dispatchEvent(new Event('input', { bubbles: true }));
      controller.destroy();
      return { resetText, resetValue, cancelledResetValue, draft: input.value };
    });
    assert.deepEqual(result, { resetText: '1.234', resetValue: 1, cancelledResetValue: 1234, draft: 'still editing' });
  });

  await test('BEH-01 nudging an out-of-range draft to the existing bound normalizes without a duplicate commit', async page => {
    await mount(page, '<input id="number" value="100"><button id="after">After</button>');
    await page.evaluate(() => {
      window.changes = [];
      window.controller = Sekura.createNumberInput(document.getElementById('number'), { min: 0, max: 100, onChange: value => changes.push(value) });
    });
    await page.locator('#number').fill('invalid');
    await page.locator('#number').dispatchEvent('change');
    assert.equal(await page.locator('#number').evaluate(input => input.checkValidity()), false);
    await page.locator('#number').fill('999');
    await page.locator('#number').press('ArrowUp');
    assert.equal(await page.locator('#number').inputValue(), '100');
    assert.equal(await page.locator('#number').getAttribute('aria-valuenow'), '100');
    assert.equal(await page.locator('#number').evaluate(input => input.checkValidity()), true);
    assert.deepEqual(await page.evaluate(() => changes), []);
    await page.evaluate(() => { controller.setValue(0); changes.length = 0; });
    await page.locator('#number').fill('-999'); await page.locator('#number').press('ArrowDown');
    assert.equal(await page.locator('#number').inputValue(), '0');
    assert.equal(await page.locator('#number').getAttribute('aria-valuenow'), '0');
    assert.deepEqual(await page.evaluate(() => changes), []);
    await page.evaluate(() => controller.destroy());
  });

  for (const kind of ['number', 'date']) {
    await test(`BEH-01/03 ${kind} preserves later host validity and ARIA ownership through correction and destroy`, async page => {
      await mount(page, '<p id="help">Host instructions</p><input id="field" aria-describedby="help"><button id="trigger" type="button">Choose date</button><div id="panel"></div><button id="after">After</button>');
      await page.evaluate(kind => {
        const input = document.getElementById('field');
        input.value = kind === 'number' ? '12' : '2026-08-21';
        window.controller = kind === 'number'
          ? Sekura.createNumberInput(input)
          : Sekura.createDatePicker(input, document.getElementById('trigger'), document.getElementById('panel'));
        window.repair = () => controller.setValue(kind === 'number' ? 13 : { y: 2026, m: 8, d: 22 });
        input.setCustomValidity('Server rejected this value');
        input.setAttribute('aria-invalid', 'true');
      }, kind);
      const correct = kind === 'number' ? '13' : '2026-08-22';
      await page.locator('#field').fill('invalid'); await page.locator('#after').focus();
      assert.notEqual(await page.locator('#field').evaluate(input => input.validationMessage), 'Server rejected this value');
      await page.locator('#field').fill(correct); await page.locator('#after').focus();
      assert.equal(await page.locator('#field').evaluate(input => input.validationMessage), 'Server rejected this value');
      assert.equal(await page.locator('#field').getAttribute('aria-invalid'), 'true');
      assert.equal(await page.locator('#field').getAttribute('aria-describedby'), 'help');

      await page.locator('#field').fill('invalid'); await page.locator('#after').focus();
      await page.evaluate(() => {
        const input = document.getElementById('field');
        input.setCustomValidity('A newer server error');
        input.setAttribute('aria-invalid', 'grammar');
      });
      await page.locator('#field').fill(correct); await page.locator('#after').focus();
      assert.equal(await page.locator('#field').evaluate(input => input.validationMessage), 'A newer server error');
      assert.equal(await page.locator('#field').getAttribute('aria-invalid'), 'grammar');

      await page.locator('#field').fill('invalid'); await page.locator('#after').focus();
      await page.evaluate(() => {
        const input = document.getElementById('field');
        input.setCustomValidity('Replacement captured by another invalid draft');
        input.setAttribute('aria-invalid', 'false');
        input.dispatchEvent(new Event('change', { bubbles: true }));
      });
      await page.locator('#field').fill(correct); await page.locator('#after').focus();
      assert.equal(await page.locator('#field').evaluate(input => input.validationMessage), 'Replacement captured by another invalid draft');
      assert.equal(await page.locator('#field').getAttribute('aria-invalid'), 'false');

      await page.locator('#field').fill('invalid'); await page.locator('#after').focus();
      await page.evaluate(() => {
        const input = document.getElementById('field');
        input.setCustomValidity(''); input.removeAttribute('aria-invalid');
        repair();
      });
      assert.equal(await page.locator('#field').evaluate(input => input.checkValidity()), true);
      assert.equal(await page.locator('#field').getAttribute('aria-invalid'), null);

      // A same-value host attribute write in the same task is still host-owned.
      await page.evaluate(() => {
        const input = document.getElementById('field');
        input.value = 'invalid'; input.dispatchEvent(new Event('change', { bubbles: true }));
        input.setAttribute('aria-invalid', 'true');
        repair();
      });
      assert.equal(await page.locator('#field').evaluate(input => input.checkValidity()), true);
      assert.equal(await page.locator('#field').getAttribute('aria-invalid'), 'true');
      await page.evaluate(() => {
        const input = document.getElementById('field');
        input.setCustomValidity('Late teardown business error');
        input.value = 'invalid'; input.dispatchEvent(new Event('change', { bubbles: true }));
        input.setAttribute('aria-invalid', 'spelling');
        controller.destroy();
      });
      assert.equal(await page.locator('#field').evaluate(input => input.validationMessage), 'Late teardown business error');
      assert.equal(await page.locator('#field').getAttribute('aria-invalid'), 'spelling');
      assert.equal(await page.locator('#field').getAttribute('aria-describedby'), 'help');
      assert.equal(await page.locator('.sk-field__error').count(), 0);
    });
  }

  await test('BEH-01 malformed drafts stay editable; valid input commits once and reset is silent', async page => {
    await mount(page, '<form id="form"><input id="number" value="12.5"></form><button id="after">After</button>');
    await page.evaluate(() => {
      window.changes = [];
      window.controller = Sekura.createNumberInput(document.getElementById('number'), { locale: 'en-US', min: 0, max: 100, step: 0.01, onChange: value => changes.push(value) });
    });
    for (const draft of ['12wrong', '1,2,3']) {
      await page.locator('#number').fill(draft); await page.locator('#after').focus();
      assert.equal(await page.locator('#number').inputValue(), draft);
      assert.equal(await page.evaluate(() => controller.value), 12.5);
      assert.equal(await page.locator('#number').evaluate(input => input.checkValidity()), false);
      const description = await page.locator('#number').getAttribute('aria-describedby');
      assert.match(await page.locator('#' + description).textContent(), /valid number/);
      await page.locator('#number').press('ArrowUp');
      assert.equal(await page.evaluate(() => controller.value), 12.5);
    }
    assert.deepEqual(await page.evaluate(() => changes), []);
    await page.locator('#number').fill('99.5'); await page.locator('#after').focus();
    assert.deepEqual(await page.evaluate(() => changes), [99.5]);
    assert.equal(await page.locator('#number').evaluate(input => input.checkValidity()), true);
    await page.evaluate(() => document.getElementById('form').reset());
    assert.equal(await page.evaluate(() => controller.value), 12.5);
    assert.deepEqual(await page.evaluate(() => changes), [99.5]);
    await page.evaluate(() => controller.destroy());
    assert.equal(await page.locator('.sk-field__error').count(), 0);
  });

  await test('BEH-01 IME text does not step or commit before composition finishes', async page => {
    await mount(page, '<input id="number" value="5"><button id="after">After</button>');
    await page.evaluate(() => {
      window.changes = [];
      const input = document.getElementById('number');
      window.controller = Sekura.createNumberInput(input, { onChange: value => changes.push(value) });
      input.focus(); input.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }));
      input.value = '7'; input.dispatchEvent(new InputEvent('input', { bubbles: true, isComposing: true }));
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true, isComposing: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });
    assert.equal(await page.evaluate(() => controller.value), 5);
    assert.equal(await page.locator('#number').inputValue(), '7');
    await page.evaluate(() => document.getElementById('number').dispatchEvent(new CompositionEvent('compositionend', { bubbles: true })));
    await page.locator('#after').focus();
    assert.deepEqual(await page.evaluate(() => changes), [7]);
  });

  await test('BEH-01 displayed precision represents the configured step and bounds', async page => {
    await mount(page, '<input id="number" value="1.234"><input id="bounded" value="1"><button id="after">After</button>');
    const result = await page.evaluate(() => {
      const first = Sekura.createNumberInput(document.getElementById('number'), { precision: 2, step: 0.01 });
      const second = Sekura.createNumberInput(document.getElementById('bounded'), { max: 1.25 });
      second.setValue(2);
      let rejected = false;
      try { Sekura.createNumberInput(document.createElement('input'), { step: 0.125, precision: 2 }); }
      catch (error) { rejected = error instanceof RangeError; }
      return { initial: first.value, initialText: document.getElementById('number').value,
        bound: second.value, boundText: document.getElementById('bounded').value, rejected };
    });
    assert.deepEqual(result, { initial: 1.23, initialText: '1.23', bound: 1.25, boundText: '1.25', rejected: true });
  });

  await test('BEH-02 disabled reasons remain literal attribute text', async page => {
    await mount(page, '<div id="calendar"></div>');
    const result = await page.evaluate(() => {
      const reason = 'Closed " onclick="window.injected = true" data-extra="<img src=x onerror=window.injected=true> & reserved';
      window.controller = Sekura.createCalendar(document.getElementById('calendar'), {
        value: { y: 2026, m: 8, d: 21 }, min: { y: 2026, m: 8, d: 1 },
        isDisabled: () => reason,
      });
      const day = document.querySelector('[data-date="2026-08-21"]');
      day.click();
      return { reason: day.getAttribute('data-why'), expected: reason, onclick: day.getAttribute('onclick'), extra: day.getAttribute('data-extra'), images: document.querySelectorAll('img').length, injected: window.injected === true };
    });
    assert.equal(result.reason, result.expected);
    assert.equal(result.onclick, null); assert.equal(result.extra, null);
    assert.equal(result.images, 0); assert.equal(result.injected, false);
  });

  await test('BEH-03 typed, programmatic and keyboard dates share restrictions', async page => {
    await mount(page, dateFixture); await picker(page);
    for (const draft of ['2026-08-09', '2026-08-15', '2026-09-01', '2026-02-30']) {
      await page.locator('#date').fill(draft); await page.locator('#after').focus();
      assert.equal(await page.locator('#date').inputValue(), draft);
      assert.deepEqual(await page.evaluate(() => controller.value), { y: 2026, m: 8, d: 21 });
      assert.equal(await page.locator('#date').evaluate(input => input.checkValidity()), false);
      assert.equal(await page.locator('#date').getAttribute('aria-invalid'), 'true');
    }
    assert.deepEqual(await page.evaluate(() => changes), []);
    await page.evaluate(() => controller.setValue({ y: 2026, m: 8, d: 9 }));
    assert.deepEqual(await page.evaluate(() => controller.value), { y: 2026, m: 8, d: 21 });
    await page.evaluate(() => controller.setValue({ y: 2026, m: 8, d: 21 }));
    await page.locator('#trigger').click();
    for (let i = 0; i < 6; i++) await page.keyboard.press('ArrowLeft');
    assert.equal(await page.evaluate(() => document.activeElement.dataset.date), '2026-08-15');
    await page.keyboard.press('Enter');
    assert.equal(await page.evaluate(() => controller.open), true);
    assert.deepEqual(await page.evaluate(() => changes), []);
    await page.locator('[data-date="2026-08-09"]').evaluate(button => button.click());
    assert.deepEqual(await page.evaluate(() => changes), []);
    await page.keyboard.press('Escape');
    await page.locator('#date').fill('2026-08-22'); await page.locator('#after').focus();
    assert.deepEqual(await page.evaluate(() => changes), [{ y: 2026, m: 8, d: 22 }]);
    assert.equal(await page.locator('#date').evaluate(input => input.checkValidity()), true);
    await page.evaluate(() => document.getElementById('form').reset());
    assert.deepEqual(await page.evaluate(() => controller.value), { y: 2026, m: 8, d: 21 });
    assert.equal(await page.evaluate(() => changes.length), 1);
  });

  await test('BEH-04 and BEH-08 focus identifies the selected date and one selection publishes once', async page => {
    await mount(page, dateFixture); await picker(page);
    await page.locator('#trigger').click();
    assert.equal(await page.evaluate(() => document.activeElement.dataset.date), '2026-08-21');
    assert.equal(await page.locator('.sk-calendar__day[tabindex="0"]').getAttribute('data-date'), '2026-08-21');
    await page.keyboard.press('ArrowRight'); await page.keyboard.press('Enter');
    assert.equal(await page.locator('#date').inputValue(), '2026-08-22');
    assert.equal(await active(page), 'trigger');
    assert.deepEqual(await page.evaluate(() => changes), [{ y: 2026, m: 8, d: 22 }]);
    assert.deepEqual(await page.evaluate(() => events), { input: 1, change: 1, custom: 1 });
    await page.evaluate(() => controller.setValue({ y: 2026, m: 8, d: 23 }));
    assert.equal(await page.evaluate(() => changes.length), 1, 'programmatic setter remains silent');
    await page.locator('#trigger').click();
    await page.locator('[data-date="2026-08-24"]').click();
    assert.equal(await page.evaluate(() => changes.length), 2);
    assert.deepEqual(await page.evaluate(() => events), { input: 2, change: 2, custom: 2 });
  });

  await test('BEH-04 direct month changes keep focus and Enter on the same date', async page => {
    await mount(page, '<div id="calendar"></div>');
    await page.evaluate(() => {
      window.changes = [];
      window.controller = Sekura.createCalendar(document.getElementById('calendar'), { value: { y: 2026, m: 8, d: 21 }, onSelect: date => changes.push(date) });
      controller.goToMonth(2026, 9); controller.focus();
    });
    assert.equal(await page.evaluate(() => document.activeElement.dataset.date), '2026-09-21');
    await page.keyboard.press('Enter');
    assert.deepEqual(await page.evaluate(() => changes), [{ y: 2026, m: 9, d: 21 }]);
  });

  await test('BEH-03/04 a saved range starts in its own month and later edits preserve calendar paging', async page => {
    await page.clock.setFixedTime('2026-10-17T12:00:00Z');
    await mount(page, rangeFixture);
    await page.evaluate(() => {
      window.changes = []; window.months = [];
      window.controller = Sekura.createDateRange(document.getElementById('start'), document.getElementById('end'), document.getElementById('calendar'), {
        locale: 'en-US', onChange: (start, end) => changes.push({ start, end }),
        onMonthChange: (year, month) => months.push({ year, month }),
      });
    });
    assert.equal(await page.locator('.sk-calendar__month').textContent(), 'August 2026');
    assert.equal(await page.locator('.sk-calendar__day[tabindex="0"]').getAttribute('data-date'), '2026-08-21');
    assert.deepEqual(await page.evaluate(() => ({ changes, months })), { changes: [], months: [] });
    assert.equal(await page.locator('[role="gridcell"][aria-selected="true"]').count(), 2);
    await page.locator('[aria-label="Next month"]').click(); await page.locator('[aria-label="Next month"]').click();
    await page.locator('#end').fill('2026-08-28'); await page.locator('#after').focus();
    assert.equal(await page.locator('.sk-calendar__month').textContent(), 'October 2026');
    assert.equal(await page.locator('.sk-calendar__day[tabindex="0"]').getAttribute('data-date'), '2026-10-21');
    assert.deepEqual(await page.evaluate(() => changes), [{ start: { y: 2026, m: 8, d: 21 }, end: { y: 2026, m: 8, d: 28 } }]);
    await page.evaluate(() => controller.destroy());
  });

  for (const action of ['destroy on commit', 'remove on commit', 'destroy on initial focus']) {
    await test(`BEH-07 picker ${action} cannot leave a popup or focus trap behind`, async page => {
      await mount(page, dateFixture);
      const result = await page.evaluate(action => {
        const input = document.getElementById('date');
        const trigger = document.getElementById('trigger');
        const panel = document.getElementById('panel');
        let opened = 0;
        window.controller = Sekura.createDatePicker(input, trigger, panel, {
          onChange() {
            if (action === 'destroy on commit') controller.destroy();
            else if (action === 'remove on commit') document.getElementById('form').remove();
          },
        });
        trigger.addEventListener('sk:datepicker:open', () => opened++);
        if (action === 'destroy on initial focus') panel.addEventListener('focusin', () => controller.destroy(), { once: true });
        else input.value = '2026-08-22';
        controller.openPanel();
        const after = document.getElementById('after');
        after.focus();
        const escape = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
        after.dispatchEvent(escape);
        const result = { open: controller.open, hidden: panel.hidden, expanded: trigger.getAttribute('aria-expanded'), opened,
          focus: document.activeElement.id, intercepted: escape.defaultPrevented };
        controller.destroy();
        return result;
      }, action);
      assert.deepEqual(result, { open: false, hidden: true, expanded: 'false', opened: 0, focus: 'after', intercepted: false });
      assert.equal(await page.locator('.sk-field__error').count(), 0);
    });
  }

  await test('BEH-03 and BEH-08 range edits are atomic and each calendar action notifies once', async page => {
    await mount(page, rangeFixture);
    await page.evaluate(() => {
      window.changes = []; window.events = { start: 0, end: 0 };
      window.controller = Sekura.createDateRange(document.getElementById('start'), document.getElementById('end'), document.getElementById('calendar'), {
        min: { y: 2026, m: 8, d: 10 }, max: { y: 2026, m: 8, d: 31 },
        isDisabled: date => date.d === 15 ? 'Closed for a holiday' : null,
        onChange: (start, end) => changes.push({ start, end }),
      });
      for (const id of ['start', 'end']) document.getElementById(id).addEventListener('change', () => events[id]++);
    });
    await page.locator('#end').fill('2026-08-10'); await page.locator('#after').focus();
    assert.deepEqual(await page.evaluate(() => ({ start: controller.start, end: controller.end })), { start: { y: 2026, m: 8, d: 21 }, end: { y: 2026, m: 8, d: 25 } });
    assert.equal(await page.locator('#end').evaluate(input => input.checkValidity()), false);
    assert.deepEqual(await page.evaluate(() => changes), []);
    await page.locator('#end').fill('2026-08-28'); await page.locator('#after').focus();
    assert.equal(await page.evaluate(() => changes.length), 1);
    await page.locator('#start').fill('2026-08-15'); await page.locator('#after').focus();
    assert.equal(await page.locator('#start').evaluate(input => input.checkValidity()), false);
    assert.equal(await page.evaluate(() => changes.length), 1);
    await page.evaluate(() => document.getElementById('form').reset());
    assert.equal(await page.locator('#start').evaluate(input => input.checkValidity()), true);
    assert.equal(await page.evaluate(() => changes.length), 1);
    await page.evaluate(() => { changes.length = 0; events = { start: 0, end: 0 }; });
    await page.locator('[data-date="2026-08-22"]').click();
    assert.equal(await page.evaluate(() => changes.length), 1);
    assert.deepEqual(await page.evaluate(() => events), { start: 1, end: 1 });
    await page.locator('[data-date="2026-08-23"]').click();
    assert.equal(await page.evaluate(() => changes.length), 2);
    assert.deepEqual(await page.evaluate(() => events), { start: 1, end: 2 });
    assert.deepEqual(await page.evaluate(() => ({ start: controller.start, end: controller.end })), { start: { y: 2026, m: 8, d: 22 }, end: { y: 2026, m: 8, d: 23 } });
  });

  await test('BEH-05 strict suggestions support partial query, arrows, Enter, Escape and IME', async page => {
    await mount(page, '<div><input id="tags"></div><ul id="suggestions"></ul><button id="after">After</button>');
    await page.evaluate(() => {
      window.changes = [];
      window.controller = Sekura.createTagInput(document.getElementById('tags'), document.getElementById('suggestions'), { options: ['Alpha', 'Alpine', 'Beta'], strict: true, onChange: tags => changes.push([...tags]) });
    });
    assert.equal(await page.locator('#tags').getAttribute('aria-controls'), 'suggestions');
    await page.locator('#tags').fill('Al'); await page.keyboard.press('ArrowDown');
    let optionId = await page.locator('#tags').getAttribute('aria-activedescendant');
    assert.equal(await page.locator('#' + optionId).textContent(), 'Alpha');
    await page.keyboard.press('ArrowDown'); await page.keyboard.press('ArrowUp'); await page.keyboard.press('Enter');
    assert.deepEqual(await page.evaluate(() => controller.tags), ['Alpha']);
    await page.locator('#tags').fill('Be'); await page.keyboard.press('ArrowUp'); await page.keyboard.press('Escape');
    assert.equal(await page.locator('#tags').getAttribute('aria-expanded'), 'false');
    assert.equal(await page.locator('#tags').inputValue(), 'Be');
    await page.evaluate(() => {
      const input = document.getElementById('tags');
      input.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }));
      input.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Enter', isComposing: true }));
    });
    assert.deepEqual(await page.evaluate(() => controller.tags), ['Alpha']);
    await page.evaluate(() => document.getElementById('tags').dispatchEvent(new CompositionEvent('compositionend', { bubbles: true })));
    await page.keyboard.press('ArrowDown'); await page.keyboard.press('Enter');
    assert.deepEqual(await page.evaluate(() => controller.tags), ['Alpha', 'Beta']);
    await page.locator('#tags').fill('nothing');
    assert.equal(await page.locator('#tags').getAttribute('aria-expanded'), 'false');
    await page.locator('#tags').fill('Al'); await page.locator('#after').focus();
    assert.equal(await page.locator('#tags').getAttribute('aria-expanded'), 'false');
    await page.evaluate(() => controller.destroy());
    assert.equal(await page.locator('.sk-tag-input__tokens').count(), 0);
  });

  for (const activation of ['automatic', 'manual']) {
    await test(`BEH-06 ${activation} tabs skip disabled and hidden items across activation routes`, async page => {
      await mount(page, '<div id="tabs"><button id="a" role="tab" aria-selected="true" aria-controls="pa">A</button><button id="b" role="tab" aria-disabled="true" aria-controls="pb">B</button><button id="c" role="tab" aria-controls="pc">C</button><button id="d" role="tab" disabled aria-controls="pd">D</button><button id="e" role="tab" hidden>E</button></div><div id="pa">A</div><div id="pb">B</div><div id="pc">C</div><div id="pd">D</div>');
      await page.evaluate(activation => {
        window.changes = [];
        window.controller = Sekura.createTabs(document.getElementById('tabs'), { activation, onSelect: id => changes.push(id) });
      }, activation);
      await page.locator('#a').focus(); await page.keyboard.press('ArrowRight');
      assert.equal(await active(page), 'c');
      if (activation === 'manual') {
        await page.locator('#b').focus(); await page.keyboard.press('Enter');
        assert.equal(await page.evaluate(() => controller.selected), 'a', 'a disabled focused tab must not activate a different candidate');
        assert.deepEqual(await page.evaluate(() => changes), []);
        await page.locator('#c').focus();
        await page.locator('#c').evaluate(tab => tab.setAttribute('aria-disabled', 'true'));
        await page.waitForFunction(() => document.activeElement.id === 'a');
        assert.equal(await page.locator('#a').getAttribute('tabindex'), '0');
        await page.locator('#c').evaluate(tab => tab.removeAttribute('aria-disabled'));
        await page.keyboard.press('ArrowRight'); await page.keyboard.press('Enter');
      }
      assert.equal(await page.evaluate(() => controller.selected), 'c');
      await page.evaluate(() => { controller.select('b'); controller.select('d'); document.getElementById('b').click(); });
      assert.equal(await page.evaluate(() => controller.selected), 'c');
      assert.deepEqual(await page.evaluate(() => changes), ['c']);
      assert.equal(await page.locator('#pb').isHidden(), true);
      await page.locator('#c').evaluate(tab => tab.hidden = true);
      await page.waitForFunction(() => controller.selected === 'a');
      assert.equal(await page.locator('#b').getAttribute('tabindex'), '-1');
      assert.equal(await page.locator('#c').getAttribute('tabindex'), '-1');
      await page.evaluate(() => controller.destroy());
    });
  }

  await test('BEH-06 segmented controls use the same disabled activation rule', async page => {
    await mount(page, '<div id="segments"><button role="radio" id="a" data-value="a" aria-checked="true">A</button><button role="radio" id="b" data-value="b" aria-disabled="true">B</button><button role="radio" id="c" data-value="c">C</button></div>');
    await page.evaluate(() => { window.changes = []; window.controller = Sekura.createSegmented(document.getElementById('segments'), { onChange: value => changes.push(value) }); });
    await page.locator('#a').focus(); await page.keyboard.press('ArrowRight');
    assert.equal(await page.evaluate(() => controller.value), 'c');
    await page.evaluate(() => { controller.setValue('b'); document.getElementById('b').click(); });
    assert.deepEqual(await page.evaluate(() => changes), ['c']);
  });

  for (const kind of ['popover', 'drawer', 'dialog']) {
    await test(`BEH-07 calendar in ${kind} owns Escape and releases on parent close/destroy`, async page => {
      const tag = kind === 'dialog' ? 'dialog' : 'div';
      await mount(page, `<button id="owner-trigger">Open parent</button><${tag} id="owner"><h2>Parent form</h2><input id="date" value="2026-08-21"><button id="trigger">Date</button><div id="panel"></div></${tag}><button id="after">After</button>`);
      await page.evaluate(kind => {
        window.owner = kind === 'popover' ? Sekura.createPopover(document.getElementById('owner-trigger'), document.getElementById('owner'), { trap: true })
          : kind === 'drawer' ? Sekura.createDrawer(document.getElementById('owner'), { modal: true })
          : Sekura.createDialog(document.getElementById('owner'));
      }, kind);
      await picker(page);
      await page.locator('#owner-trigger').focus(); await page.evaluate(() => owner.show());
      await page.locator('#trigger').click(); await page.keyboard.press('Escape');
      assert.equal(await page.evaluate(() => controller.open), false);
      assert.equal(await page.evaluate(() => owner.open), true);
      assert.equal(await active(page), 'trigger');
      await page.locator('#trigger').click();
      await page.evaluate(() => owner.close());
      await page.waitForFunction(() => !controller.open);
      await page.locator('#after').focus();
      assert.equal(await active(page), 'after', 'closed calendar leaves no document focus trap');
      await page.evaluate(() => owner.show()); await page.locator('#trigger').click();
      await page.evaluate(() => owner.destroy());
      await page.waitForFunction(() => !controller.open);
      await page.locator('#after').focus(); assert.equal(await active(page), 'after');
      await page.evaluate(() => controller.destroy());
    });
  }

  await test('BEH-07 host removal releases a calendar even without an explicit destroy first', async page => {
    await mount(page, '<div id="host">' + dateFixture.replace('<button id="after">After</button>', '') + '</div><button id="after">After</button>');
    await picker(page); await page.locator('#trigger').click();
    await page.locator('#host').evaluate(host => host.remove());
    await page.waitForFunction(() => !controller.open);
    await page.locator('#after').focus(); assert.equal(await active(page), 'after');
    await page.evaluate(() => controller.destroy());
  });

  await test('SYS-01 hover and focus jointly pause one toast timer', async page => {
    await mount(page, '<button id="before">Before</button><div id="region"></div><button id="after">After</button>');
    await page.clock.install();
    await page.locator('#before').focus();
    await page.evaluate(() => { window.controller = Sekura.createToaster(document.getElementById('region')); controller.show('Saved', { duration: 1000, action: { label: 'Undo', onAction() {} } }); });
    const toast = page.locator('.sk-toast');
    await toast.locator('[data-sk-toast-action]').focus();
    await toast.dispatchEvent('pointerenter'); await toast.dispatchEvent('pointerleave');
    await page.clock.fastForward(5000);
    assert.equal(await toast.count(), 1);
    assert.equal(await page.evaluate(() => document.activeElement.hasAttribute('data-sk-toast-action')), true);
    await toast.dispatchEvent('pointerenter'); await page.locator('#after').focus();
    await page.clock.fastForward(5000); assert.equal(await toast.count(), 1);
    await toast.dispatchEvent('pointerleave'); await page.clock.fastForward(1100);
    assert.equal(await toast.count(), 0);
    assert.equal(await active(page), 'after');
  });

  await test('SYS-01 overflow queues without evicting focus and teardown cancels timers and queued actions', async page => {
    await mount(page, '<button id="before">Before</button><div id="region"></div><button id="after">After</button>');
    await page.clock.install(); await page.locator('#before').focus();
    await page.evaluate(() => {
      window.actions = 0; window.controller = Sekura.createToaster(document.getElementById('region'));
      window.dismissFirst = controller.show('First', { duration: 0, action: { label: 'Undo', onAction: () => actions++ } });
      controller.show('Second', { duration: 0 }); controller.show('Third', { duration: 0 });
    });
    await page.locator('.sk-toast').first().locator('[data-sk-toast-action]').focus();
    await page.evaluate(() => {
      controller.show('Fourth', { duration: 1000 });
      window.dismissFifth = controller.show('Fifth', { duration: 1000, action: { label: 'Apply', onAction: () => actions++ } });
    });
    assert.equal(await page.locator('.sk-toast').count(), 3);
    assert.equal(await page.locator('.sk-toast').first().locator('p').textContent(), 'First');
    assert.equal(await page.evaluate(() => document.activeElement.hasAttribute('data-sk-toast-action')), true);
    await page.clock.fastForward(5000);
    await page.evaluate(() => dismissFifth());
    await page.locator('.sk-toast').first().locator('[data-sk-toast-dismiss]').click();
    assert.deepEqual(await page.locator('.sk-toast p').allTextContents(), ['Second', 'Third', 'Fourth']);
    assert.equal(await active(page), 'before');
    await page.clock.fastForward(1100);
    assert.deepEqual(await page.locator('.sk-toast p').allTextContents(), ['Second', 'Third']);
    await page.evaluate(() => controller.destroy());
    await page.clock.fastForward(10000);
    assert.equal(await page.locator('.sk-toast').count(), 0);
    assert.equal(await page.evaluate(() => actions), 0);
  });

  await test('SYS-02 theme choice survives blocked storage and reports page-only persistence', async page => {
    await page.route('http://sekura.test/**', route => route.fulfill({ status: 200, contentType: 'text/html', body: styles + '<button id="after">After</button>' }));
    await page.goto('http://sekura.test/'); await page.addScriptTag({ content: bundle });
    await page.evaluate(() => {
      Storage.prototype.setItem = () => { throw new DOMException('Blocked', 'SecurityError'); };
      window.changes = [];
      document.documentElement.addEventListener('sk:theme:change', event => changes.push(event.detail));
      window.controller = Sekura.createThemeManager(); controller.set('dark');
    });
    assert.equal(await page.evaluate(() => controller.get()), 'dark');
    assert.equal(await page.evaluate(() => controller.resolved()), 'dark');
    assert.equal(await page.locator('html').getAttribute('data-sk-theme'), 'dark');
    assert.deepEqual(await page.evaluate(() => changes), [{ preference: 'dark', resolved: 'dark', persisted: false }]);
    await page.evaluate(() => controller.destroy());
  });
} finally { await browser.close(); }
console.log(`Input reliability: ${passed} passed, ${failures.length} failed`);
if (failures.length) { console.error(failures.join('\n')); process.exitCode = 1; }
