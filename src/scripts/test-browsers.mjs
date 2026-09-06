import assert from 'node:assert/strict';
import { chromium, firefox, webkit } from 'playwright-core';
import { build } from 'esbuild';
import { createDemoServer } from './demo-server.mjs';
import { resolve } from 'node:path';
import { mkdirSync } from 'node:fs';
const react = await build({ stdin: { contents: `import React, {useState, useRef} from 'react'; import {createRoot} from 'react-dom/client'; import {Button, TextField, Textarea, Select, Checkbox, Switch} from './dist-react/index.js';
function App(){const [value,setValue]=useState('');const [checked,setChecked]=useState(false);const [count,setCount]=useState(0);const ref=useRef(null);return <><TextField label="Native project" ref={ref} value={value} onChange={e=>setValue(e.target.value)} hint="Visible to the team" error={value==='bad'?'Choose another name':undefined}/><TextField label="Second project"/><Textarea label="Native notes"/><Select label="Native team"><option>Design</option></Select><Checkbox label="Native approval" checked={checked} onChange={e=>setChecked(e.target.checked)}/><Switch label="Native permission" defaultChecked/><Button onClick={()=>ref.current.focus()}>Focus project</Button><Button busy onClick={()=>setCount(count+1)}>Pending save</Button><output id="native-result">{value}:{String(checked)}:{count}</output></>}; createRoot(document.getElementById('native-root')).render(<App/>);`, resolveDir: process.cwd(), loader: 'tsx' }, bundle: true, write: false, format: 'iife' });
const server = createDemoServer(); await new Promise(r => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}`;
const failures = []; let passed = 0;
mkdirSync('.run/review', { recursive: true });
try {
for (const [name, engine] of Object.entries({ chromium, firefox, webkit })) {
  const browser = await engine.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' });
  page.setDefaultTimeout(7000); const errors = []; page.on('pageerror', e => errors.push(e.message));
  const test = async (label, fn) => { try { await fn(); passed++; console.log(`PASS ${name}: ${label}`); } catch(e) { failures.push(`${name}: ${label}: ${e.message}`); } };
  const text = (id, value) => page.waitForFunction(({id,value}) => document.getElementById(id).textContent.includes(value), {id,value});
  try {
    await test('native React state, labels, descriptions, refs and busy actions', async () => {
      await page.goto(base + '/form-lab.html');
      await page.locator('main').evaluate(el => { el.innerHTML = '<div id="native-root" class="sk-stack sk-stack--gap-16"></div>'; });
      await page.addScriptTag({ content: react.outputFiles[0].text });
      await page.getByLabel('Native project', { exact: true }).fill('bad');
      assert.equal(await page.getByLabel('Native project', { exact: true }).getAttribute('aria-invalid'), 'true');
      const ids = await page.locator('#native-root input').evaluateAll(xs => xs.map(x=>x.id)); assert.equal(new Set(ids).size, ids.length);
      assert.match(await page.getByLabel('Native project', { exact: true }).getAttribute('aria-describedby'), /hint.*error/);
      await page.getByLabel('Native approval').check(); await text('native-result','bad:true:0');
      await page.getByRole('button', {name:'Focus project'}).click(); assert.equal(await page.getByLabel('Native project', { exact: true }).evaluate(el=>el===document.activeElement),true);
      assert.equal(await page.getByRole('button', {name:'Pending save'}).isDisabled(),true);
      await page.getByLabel('Native project', { exact: true }).fill('good'); assert.equal(await page.getByLabel('Native project', { exact: true }).getAttribute('aria-invalid'),null);
    });
    await test('HTTP validation, dependent choices, failure, conflict and explicit retry', async () => {
      await page.goto(base + '/form-lab.html'); await page.locator('#lab-transport').selectOption('http'); await page.locator('#lab-reload').click(); await text('lab-result','loaded');
      await page.locator('#lab-name').fill('Taken'); await text('lab-name-status','already in use');
      await page.locator('#lab-name').fill('New project'); await text('lab-name-status','available');
      await page.locator('#lab-team').selectOption('engineering'); assert.equal(await page.locator('#lab-owner').inputValue(),'Jordan');
      await page.locator('#lab-outcome').selectOption('failure'); await page.locator('#lab-save').click();
      await text('lab-errors','unavailable'); assert.equal(await page.locator('#lab-summary').evaluate(el=>el===document.activeElement),true); assert.equal(await page.locator('#lab-name').inputValue(),'New project');
      await page.locator('#lab-outcome').selectOption('conflict'); await page.locator('#lab-save').click(); await text('lab-errors','Another editor'); assert.equal(await page.locator('#lab-save').isDisabled(),true);
      await page.locator('#lab-reload').click(); await text('lab-result','loaded'); await page.locator('#lab-save').click(); await text('lab-result','Project saved.');
      const state = await (await fetch(base+'/demo-api/version')).json(); assert.equal(state.project.owner,'Jordan'); assert.equal(state.project.name,'New project');
    });
    await test('cancellation and revoked permission preserve the draft', async () => {
      await page.goto(base+'/form-lab.html'); await page.locator('#lab-name').fill('Preserved'); await page.locator('#lab-save').click(); await page.locator('#lab-cancel').click(); await text('lab-result','canceled'); assert.equal(await page.locator('#lab-name').inputValue(),'Preserved');
      await page.locator('#lab-reload').click(); await text('lab-result','loaded'); await page.locator('#lab-save').click(); await page.locator('#lab-permission').uncheck();
      await text('lab-permission-status','removed'); assert.equal(await page.locator('#lab-name').isDisabled(),true); assert.equal(await page.locator('#lab-name').inputValue(),'Preserved');
      await page.locator('#lab-permission').check(); assert.equal(await page.locator('#lab-name').isEnabled(),true);
    });
    await test('menu and dialog keyboard contracts', async () => {
      await page.goto(base+'/component-menu.html'); const trigger = page.locator('[data-sk-menu-trigger]').first(); await trigger.focus(); await trigger.press('ArrowDown');
      await page.waitForFunction(()=>document.activeElement?.getAttribute('role')==='menuitem'); await page.keyboard.press('Escape'); assert.equal(await trigger.evaluate(el=>el===document.activeElement),true);
      await page.goto(base+'/component-dialog.html'); const opener=page.locator('[data-sk-dialog-open]').first(); await opener.click(); assert.equal(await page.locator('dialog[open]').count(),1); await page.keyboard.press('Escape'); assert.equal(await page.locator('dialog[open]').count(),0); assert.equal(await opener.evaluate(el=>el===document.activeElement),true);
    });
    await test('320px, long labels, 200% text, RTL and forced colors', async () => {
      await page.goto(base+'/form-lab.html'); await page.setViewportSize({width:320,height:900}); await page.locator('#lab-language').selectOption('de');
      await page.addStyleTag({content:'html {font-size:200% !important}'});
      for (const dir of ['ltr','rtl']) {
        await page.evaluate(dir=>document.documentElement.dir=dir,dir);
        assert.equal(await page.locator('#form-lab').evaluate(el=>el.scrollWidth<=el.clientWidth+1),true,dir+' form overflow');
        const field=page.locator('#lab-name'); assert.ok((await field.boundingBox()).height>=24);
      }
      await page.emulateMedia({forcedColors:'active'}); await page.locator('#lab-name').focus();
      assert.notEqual(await page.locator('#lab-name').evaluate(el=>getComputedStyle(el).outlineStyle),'none');
      await page.screenshot({path:resolve(`.run/review/${name}-form.png`),fullPage:true});
    });
    await test('touch activation keeps labels and targets aligned', async () => {
      const context = await browser.newContext({hasTouch:true, viewport:{width:390,height:844}}); const touch = await context.newPage();
      try {
        await touch.goto(base+'/form-lab.html'); await touch.locator('#lab-permission').tap(); assert.equal(await touch.locator('#lab-name').isDisabled(),true);
        await touch.locator('label').filter({hasText:'Allow editing'}).tap(); assert.equal(await touch.locator('#lab-name').isEnabled(),true);
        await touch.locator('#lab-name').fill('Touch project'); await touch.locator('#lab-save').tap(); await touch.waitForFunction(()=>document.getElementById('lab-result').textContent.includes('Project saved.'));
      } finally { await context.close(); }
    });
    assert.deepEqual(errors,[]);
  } finally { await browser.close(); }
}
} finally { server.close(); }
console.log(`Cross-browser workflows: ${passed} passed, ${failures.length} failed`);
if(failures.length){console.error(failures.join('\n'));process.exitCode=1;}
