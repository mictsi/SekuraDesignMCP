/** Render and hydrate generated Angular recipes, then remove an open modal. */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createServer } from 'node:http';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import { getComponent } from '../../dist/data/components/index.js';
import { generateCode } from '../../dist/lib/codegen.js';

mkdirSync('tmp', { recursive: true });
const fixture = mkdtempSync(resolve('tmp/angular-consumer-'));
let browser;
let server;
try {
  const run = (command, args, cwd = fixture) => execFileSync(command, args, { cwd, encoding: 'utf8', timeout: 90_000, stdio: ['ignore', 'pipe', 'pipe'] });
  writeFileSync(join(fixture, 'package.json'), JSON.stringify({ private: true, type: 'module' }));
  const packed = JSON.parse(run('npm', ['pack', '--json', '--pack-destination', fixture], resolve('dist-js')))[0];
  run('npm', ['install', '--offline', '--ignore-scripts', '--no-audit', '--no-fund', '--package-lock=false', join(fixture, packed.filename)]);
  for (const id of ['text-field', 'drawer']) writeFileSync(join(fixture, `${id}.ts`), generateCode(getComponent(id), 'angular'));
  writeFileSync(join(fixture, 'app.ts'), `
    import '@angular/compiler';
    import { Component, signal } from '@angular/core';
    import { TextFieldExample } from './text-field';
    import { DrawerExample } from './drawer';
    @Component({ selector: 'consumer-root', standalone: true, imports: [TextFieldExample, DrawerExample],
      template: '<main id="outside">Application content</main><sk-text-field-example instanceId="first" /><sk-text-field-example instanceId="second" />@if (show()) { <sk-drawer-example instanceId="modal" /> }' })
    export class ConsumerApp { show = signal(true); }
  `);
  writeFileSync(join(fixture, 'server.ts'), `
    import '@angular/compiler';
    import { writeFileSync } from 'node:fs';
    import { provideZonelessChangeDetection } from '@angular/core';
    import { bootstrapApplication, provideClientHydration } from '@angular/platform-browser';
    import { renderApplication, provideServerRendering } from '@angular/platform-server';
    import { ConsumerApp } from './app';
    const html = await renderApplication(context => bootstrapApplication(ConsumerApp, {
      providers: [provideZonelessChangeDetection(), provideClientHydration(), provideServerRendering()]
    }, context), { document: '<!doctype html><html><head><title>Sekura Angular consumer</title></head><body><consumer-root></consumer-root></body></html>', url: 'http://localhost/', allowedHosts: ['localhost'] });
    writeFileSync(${JSON.stringify(join(fixture, 'server.html'))}, html);
    if (html.includes('data-sk-enhanced')) throw new Error('SSR must not initialize browser controllers');
    console.log('Angular renderApplication completed without browser enhancement');
  `);
  writeFileSync(join(fixture, 'client.ts'), `
    import '@angular/compiler';
    import { provideZonelessChangeDetection } from '@angular/core';
    import { bootstrapApplication, provideClientHydration } from '@angular/platform-browser';
    import { ConsumerApp } from './app';
    const app = await bootstrapApplication(ConsumerApp, { providers: [provideZonelessChangeDetection(), provideClientHydration()] });
    await app.whenStable();
    (window as any).consumerApp = app;
    (window as any).consumerReady = true;
  `);
  const config = { compilerOptions: { experimentalDecorators: true, useDefineForClassFields: false } };
  await build({ entryPoints: [join(fixture, 'server.ts')], outfile: join(fixture, 'server.mjs'), bundle: true, packages: 'external', platform: 'node', format: 'esm', target: 'es2022', tsconfigRaw: config });
  run(process.execPath, [join(fixture, 'server.mjs')]);
  const html = readFileSync(join(fixture, 'server.html'), 'utf8');
  assert.match(html, /ngh=/, 'Server output contains Angular hydration metadata');
  assert.match(html, /first-/); assert.match(html, /second-/);
  const client = await build({ entryPoints: [join(fixture, 'client.ts')], bundle: true, write: false, platform: 'browser', format: 'esm', target: 'es2022', tsconfigRaw: config });
  const style = '<style>[hidden]{display:none!important}.sk-drawer[data-sk-modal="true"]{position:fixed;inset:0;background:white;z-index:10}button,input{min-height:30px}</style>';
  const document = html.replace('</head>', style + '</head>').replace('</body>', '<script>window.serverInput=document.querySelector("input")</script><script type="module" src="/client.js"></script></body>');
  server = createServer((req, res) => {
    res.setHeader('Content-Type', req.url === '/client.js' ? 'text/javascript' : 'text/html');
    res.end(req.url === '/client.js' ? client.outputFiles[0].text : document);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const pw = await import(process.env.SEKURA_PLAYWRIGHT ? pathToFileURL(resolve(process.env.SEKURA_PLAYWRIGHT)).href : 'playwright-core');
  browser = await pw.chromium.launch({ executablePath: process.env.SK_BROWSER || process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  const page = await browser.newPage({ reducedMotion: 'reduce' });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  await page.waitForFunction(() => window.consumerReady === true);
  assert.equal(await page.evaluate(() => document.querySelector('input') === window.serverInput), true, 'Hydration reuses server-rendered input');
  const ids = await page.locator('sk-text-field-example input').evaluateAll(inputs => inputs.map(input => input.id));
  assert.equal(await page.locator('sk-text-field-example').count(), 2);
  assert.equal(new Set(ids).size, ids.length, 'Two instances have distinct field IDs');
  await page.locator('sk-text-field-example input').first().fill('Hydrated project');
  assert.equal(await page.locator('sk-text-field-example input').first().inputValue(), 'Hydrated project');
  await page.locator('[data-sk-drawer-open]').last().click();
  assert.equal(await page.locator('#outside').evaluate(el => el.inert), true);
  await page.evaluate(async () => { consumerApp.components[0].instance.show.set(false); await consumerApp.whenStable(); });
  await page.waitForFunction(() => !document.getElementById('outside').inert);
  assert.equal(await page.locator('.sk-drawer__backdrop').count(), 0);
  assert.deepEqual(errors, []);
  console.log('PASS Angular consumer: actual SSR, hydration DOM reuse, two instances, editing and open-modal removal');
} catch (error) {
  if (error.stdout) console.error(error.stdout.toString());
  if (error.stderr) console.error(error.stderr.toString());
  throw error;
} finally {
  await browser?.close();
  if (server) await new Promise(resolve => server.close(resolve));
  rmSync(fixture, { recursive: true, force: true });
}
