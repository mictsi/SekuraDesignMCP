/** Test installed package routes, generated custom elements and lifecycle ownership. */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { runInNewContext } from 'node:vm';
import { build } from 'esbuild';
import { getComponent } from '../../dist/data/components/index.js';
import { generateCode } from '../../dist/lib/codegen.js';

const root = process.cwd();
mkdirSync('tmp', { recursive: true });
const fixture = mkdtempSync(resolve('tmp/consumer-regressions-'));
const run = (command, args, cwd = fixture) => execFileSync(command, args, {
  cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 90_000,
});
const pw = await import(process.env.SEKURA_PLAYWRIGHT
  ? pathToFileURL(resolve(process.env.SEKURA_PLAYWRIGHT)).href : 'playwright-core');
let browser;
try {
  writeFileSync(join(fixture, 'package.json'), JSON.stringify({ name: 'sekura-consumer-test', version: JSON.parse(readFileSync('package.json', 'utf8')).version, private: true, type: 'module' }));
  const packed = JSON.parse(run('npm', ['pack', '--json', '--pack-destination', fixture], resolve('dist-js')))[0];
  run('npm', ['install', '--offline', '--ignore-scripts', '--no-audit', '--no-fund', '--package-lock=false', join(fixture, packed.filename)]);
  const installed = join(fixture, 'node_modules/@sekura/behaviours');
  writeFileSync(join(fixture, 'routes.mjs'), `
    import assert from 'node:assert/strict';
    import { createRequire } from 'node:module';
    import * as normal from '@sekura/behaviours';
    import * as min from '@sekura/behaviours/min';
    const require = createRequire(import.meta.url);
    for (const api of [normal, min, require('@sekura/behaviours'), require('@sekura/behaviours/min')]) {
      assert.equal(typeof api.enhance, 'function');
      assert.equal(typeof api.defineAutoEnhanceElement, 'function');
      assert.equal(api.VERSION, normal.VERSION);
      assert.deepEqual(Object.keys(api).sort(), Object.keys(normal).sort());
    }
  `);
  run(process.execPath, ['routes.mjs']);
  for (const extension of ['mts', 'cts']) {
    const imports = extension === 'mts'
      ? `import * as main from '@sekura/behaviours'; import * as min from '@sekura/behaviours/min';`
      : `import main = require('@sekura/behaviours'); import min = require('@sekura/behaviours/min');`;
    writeFileSync(join(fixture, `consumer.${extension}`), `${imports}
      const controller: main.EnhanceResult = min.enhance(document.body);
      controller.destroy(); main.defineAutoEnhanceElement();
      const id: string = min.VERSION; void id;
    `);
  }
  writeFileSync(join(fixture, 'tsconfig.json'), JSON.stringify({ compilerOptions: {
    strict: true, noEmit: true, skipLibCheck: false, target: 'ES2022', module: 'NodeNext', moduleResolution: 'NodeNext',
    lib: ['ES2023', 'DOM', 'DOM.Iterable'], types: [],
  }, include: ['*.mts', '*.cts'] }));
  run(process.execPath, [resolve('node_modules/typescript/bin/tsc'), '-p', join(fixture, 'tsconfig.json')]);
  console.log('PASS consumer packages: packed ESM/CommonJS normal and min routes, API parity and strict declarations');

  browser = await pw.chromium.launch({
    executablePath: process.env.SK_BROWSER || process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });
  const page = await browser.newPage({ reducedMotion: 'reduce' });
  page.setDefaultTimeout(5000);
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const style = '<style>[hidden]{display:none!important}.sk-drawer[data-sk-modal="true"]{position:fixed;inset:0;background:white;z-index:10}.sk-drawer__backdrop{position:fixed;inset:0}button,input{min-height:30px}</style>';
  await page.setContent(style + '<sk-command-palette-example id="palette-one"></sk-command-palette-example><sk-command-palette-example id="palette-two"></sk-command-palette-example><sk-slider-example id="slider-one"></sk-slider-example><sk-slider-example id="slider-two"></sk-slider-example>');
  for (const id of ['command-palette', 'slider']) {
    const compiled = await build({
      stdin: { contents: generateCode(getComponent(id), 'web-component'), resolveDir: fixture, loader: 'ts' },
      bundle: true, write: false, format: 'iife',
    });
    await page.addScriptTag({ content: compiled.outputFiles[0].text });
  }
  await page.locator('#palette-one [data-sk-palette-open]').click();
  assert.equal(await page.locator('#palette-one [data-sk-command-palette]').evaluate(el => el.hidden), false);
  assert.equal(await page.locator('#palette-two [data-sk-command-palette]').evaluate(el => el.hidden), true);
  await page.keyboard.press('Escape');
  await page.locator('#slider-one [data-sk-slider-value]').fill('7200');
  await page.locator('#slider-one [data-sk-slider-value]').dispatchEvent('change');
  assert.equal(await page.locator('#slider-one .sk-slider__input').inputValue(), '7200');
  assert.equal(await page.locator('#slider-two .sk-slider__input').inputValue(), '3600');
  await page.evaluate(() => { const el = document.getElementById('slider-one'); el.remove(); document.body.append(el); });
  assert.equal(await page.locator('#slider-one [data-sk-slider-value]').getAttribute('data-sk-slider-value'), 'slider-one-reminder-slider');
  console.log('PASS generated Web Components: two independent palette/slider instances and reconnect');

  const bundle = readFileSync(join(installed, 'sekura.iife.js'), 'utf8');
  for (const removal of ['child', 'host', 'ancestor', 'child and host in one turn']) {
    await page.setContent(style + `<main id="outside"><button>Application</button></main><section id="ancestor"><sekura-behaviour-root><div>${getComponent('drawer').html}</div></sekura-behaviour-root></section>`);
    await page.addScriptTag({ content: bundle });
    await page.evaluate(() => { Sekura.defineAutoEnhanceElement(); Sekura.defineAutoEnhanceElement(); });
    await page.locator('[data-sk-drawer-open]').last().click();
    assert.equal(await page.locator('#outside').evaluate(el => el.inert), true, `${removal}: modal opens`);
    await page.evaluate(removal => {
      const host = document.querySelector('sekura-behaviour-root');
      if (removal.startsWith('child')) host.querySelector('[data-sk-modal="true"]').remove();
      if (removal.includes('host')) host.remove();
      if (removal === 'ancestor') document.getElementById('ancestor').remove();
    }, removal);
    await page.waitForFunction(() => !document.getElementById('outside').inert);
    assert.notEqual(await page.evaluate(() => document.body.style.overflow), 'hidden', `${removal}: scroll lock restored`);
    assert.equal(await page.locator('.sk-drawer__backdrop').count(), 0, `${removal}: backdrop removed`);
  }
  assert.deepEqual(errors, []);
  await page.close();
  console.log('PASS lifecycle host: child, host, ancestor and simultaneous removal release modal effects');

  // Execute the plugin generator against an API-shaped fixture. Actual Figma
  // import remains a separate manual gate, not implied by this test.
  const sets = [];
  const node = type => ({
    type, id: `${type}-${Math.random()}`, children: [], height: 100,
    appendChild(child) { this.children.push(child); }, resize() {}, setPluginData() {},
  });
  let close;
  const done = new Promise((resolve, reject) => { close = message => message.startsWith('Created ') ? resolve() : reject(new Error(message)); });
  const figma = {
    loadFontAsync: async () => {}, setCurrentPageAsync: async () => {},
    createPage: () => node('PAGE'), createText: () => node('TEXT'), createFrame: () => node('FRAME'),
    createComponent: () => node('COMPONENT'), viewport: { scrollAndZoomIntoView() {} }, closePlugin: close,
    combineAsVariants(variants) { sets.push(variants); return node('COMPONENT_SET'); },
  };
  const variants = ['text-field', 'textarea', 'select'].flatMap(id => ['rest', 'invalid'].map(state => ({
    id, theme: 'light', density: 'comfortable', state, height: 40, width: 320,
    background: '#ffffff', color: '#111111', border: '#555555', borderWidth: 1, radius: 4,
    fontSize: 14, lineHeight: 20, paddingX: 12, paddingY: 8, surface: '#ffffff', text: '#111111',
    secondary: '#555555', error: '#aa0000', thumb: null, implementation: {},
  })));
  const plugin = await build({ entryPoints: [resolve('design-tools/figma/code.ts')], bundle: true, write: false, format: 'iife',
    define: { __KIT__: JSON.stringify({ version: JSON.parse(readFileSync('package.json', 'utf8')).version, coverage: ['text-field', 'textarea', 'select'], items: variants }) } });
  runInNewContext(plugin.outputFiles[0].text, { figma });
  await done;
  for (const variants of sets) {
    assert.deepEqual(variants[0].children.map(child => child.name), ['Label', 'Hint', 'Control']);
    assert.deepEqual(variants[1].children.map(child => child.name), ['Label', 'Hint', 'Control', 'Error']);
  }
  console.log('PASS Figma generator: label, hint, control and separate error ordering in six field variants');
} catch (error) {
  if (error.stdout) console.error(error.stdout.toString());
  if (error.stderr) console.error(error.stderr.toString());
  throw error;
} finally {
  await browser?.close();
  rmSync(fixture, { recursive: true, force: true });
}
