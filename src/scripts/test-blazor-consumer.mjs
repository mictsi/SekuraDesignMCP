/** Exercise generated recipes in an actual interactive Blazor Server consumer. */
import assert from 'node:assert/strict';
import { execFileSync, spawn } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { getComponent } from '../../dist/data/components/index.js';
import { generateCode } from '../../dist/lib/codegen.js';

mkdirSync('tmp', { recursive: true });
const fixture = mkdtempSync(resolve('tmp/blazor-consumer-'));
const dotnet = process.env.SK_DOTNET || (process.env.DOTNET_ROOT
  ? join(process.env.DOTNET_ROOT, process.platform === 'win32' ? 'dotnet.exe' : 'dotnet') : 'dotnet');
const env = { ...process.env, DOTNET_CLI_HOME: join(fixture, 'sdk-home'), NUGET_PACKAGES: resolve('tmp/consumer-nuget'), DOTNET_NOLOGO: '1', DOTNET_CLI_TELEMETRY_OPTOUT: '1', ASPNETCORE_ENVIRONMENT: 'Development' };
let child;
let browser;
let logs = '';
try {
  mkdirSync(join(fixture, 'wwwroot'), { recursive: true });
  writeFileSync(join(fixture, 'Consumer.csproj'), '<Project Sdk="Microsoft.NET.Sdk.Web"><PropertyGroup><TargetFramework>net10.0</TargetFramework><Nullable>enable</Nullable><ImplicitUsings>enable</ImplicitUsings><TreatWarningsAsErrors>true</TreatWarningsAsErrors></PropertyGroup></Project>');
  writeFileSync(join(fixture, '_Imports.razor'), '@using Microsoft.AspNetCore.Components\n@using Microsoft.AspNetCore.Components.Web\n@using Microsoft.AspNetCore.Components.Routing\n@using Microsoft.JSInterop\n@using static Microsoft.AspNetCore.Components.Web.RenderMode\n');
  writeFileSync(join(fixture, 'Program.cs'), `
    using Microsoft.AspNetCore.DataProtection;
    var builder = WebApplication.CreateBuilder(args);
    builder.Services.AddDataProtection().UseEphemeralDataProtectionProvider();
    builder.Services.AddRazorComponents().AddInteractiveServerComponents();
    var app = builder.Build();
    app.UseStaticFiles(); app.UseAntiforgery();
    app.MapRazorComponents<Consumer.App>().AddInteractiveServerRenderMode();
    app.Run();
  `);
  writeFileSync(join(fixture, 'App.razor'), '<!doctype html><html><head><title>Sekura Blazor consumer</title><style>[hidden]{display:none!important}.sk-drawer[data-sk-modal="true"]{position:fixed;inset:0;background:white;z-index:10}button{min-height:30px}</style></head><body><Routes /><script src="sekura.iife.js"></script><script src="_framework/blazor.web.js"></script></body></html>');
  writeFileSync(join(fixture, 'Routes.razor'), '<Router AppAssembly="typeof(Program).Assembly"><Found Context="routeData"><RouteView RouteData="routeData" /></Found></Router>');
  writeFileSync(join(fixture, 'Harness.razor'), `@page "/"
@rendermode InteractiveServer
<main id="outside"><button>Application content</button></main>
@if (Visible) { <Drawer /> }
@code {
  private static Harness? Active;
  private bool Visible = true;
  protected override void OnInitialized() { Active = this; }
  [JSInvokable] public static Task RemoveHost() => Active!.InvokeAsync(() => { Active.Visible = false; Active.StateHasChanged(); });
}
`);
  let recipe = generateCode(getComponent('drawer'), 'blazor');
  recipe = recipe.replace('<div>', '<div>@if (ShowChild) {', 1).replace('</div></sekura-behaviour-root>', '}</div></sekura-behaviour-root>');
  recipe = recipe.replace('@code {', `@code {
  private static Drawer? Active;
  private bool ShowChild = true;
  protected override void OnInitialized() { Active = this; }
  [JSInvokable] public static Task RemoveChild() => Active!.InvokeAsync(() => { Active.ShowChild = false; Active.StateHasChanged(); });
`);
  writeFileSync(join(fixture, 'Drawer.razor'), recipe);
  cpSync(resolve('dist-js/sekura.iife.js'), join(fixture, 'wwwroot/sekura.iife.js'));
  execFileSync(dotnet, ['build', 'Consumer.csproj', '--nologo', '--verbosity', 'quiet'], { cwd: fixture, env, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 120_000 });
  child = spawn(dotnet, [join(fixture, 'bin/Debug/net10.0/Consumer.dll'), '--urls', 'http://127.0.0.1:0'], { cwd: fixture, env, stdio: ['ignore', 'pipe', 'pipe'] });
  const base = await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Blazor startup timed out\n' + logs)), 30_000);
    const output = chunk => {
      logs += chunk.toString();
      const match = /Now listening on: (http:\/\/127\.0\.0\.1:\d+)/.exec(logs);
      if (match) { clearTimeout(timeout); resolve(match[1]); }
    };
    child.stdout.on('data', output); child.stderr.on('data', output);
    child.once('error', error => { clearTimeout(timeout); reject(error); });
    child.once('exit', code => { clearTimeout(timeout); reject(new Error(`Blazor exited ${code}\n${logs}`)); });
  });
  const pw = await import(process.env.SEKURA_PLAYWRIGHT ? pathToFileURL(resolve(process.env.SEKURA_PLAYWRIGHT)).href : 'playwright-core');
  browser = await pw.chromium.launch({ executablePath: process.env.SK_BROWSER || process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  for (const action of ['RemoveChild', 'RemoveHost']) {
    const page = await browser.newPage({ reducedMotion: 'reduce' });
    page.setDefaultTimeout(10_000);
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(base);
    await page.waitForSelector('[data-sk-modal="true"][data-sk-enhanced]', { state: 'attached' });
    await page.locator('[data-sk-drawer-open]').last().click();
    assert.equal(await page.locator('#outside').evaluate(el => el.inert), true, `${action}: modal opens`);
    await page.evaluate(action => DotNet.invokeMethodAsync('Consumer', action), action);
    await page.waitForFunction(() => !document.getElementById('outside').inert);
    assert.notEqual(await page.evaluate(() => document.body.style.overflow), 'hidden');
    assert.equal(await page.locator('.sk-drawer__backdrop').count(), 0);
    assert.deepEqual(errors, []);
    await page.close();
  }
  console.log('PASS Blazor Server consumer: generated host, conditional child removal and component removal release modal effects');
} catch (error) {
  if (error.stdout) console.error(error.stdout.toString());
  if (error.stderr) console.error(error.stderr.toString());
  if (logs) console.error(logs);
  throw error;
} finally {
  await browser?.close();
  if (child && child.exitCode === null) {
    const exit = new Promise(resolve => child.once('exit', resolve));
    child.kill('SIGTERM');
    const force = setTimeout(() => child.kill('SIGKILL'), 5000);
    await exit; clearTimeout(force);
  }
  rmSync(fixture, { recursive: true, force: true });
}
