/** Compile every generated Razor recipe against the shared ASP.NET framework. */
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { components } from '../data/components/index.js';
import { generateCode } from '../lib/codegen.js';

const dir = mkdtempSync(join(tmpdir(), 'sekura-razor-'));
try {
  writeFileSync(join(dir, 'Recipes.csproj'), '<Project Sdk="Microsoft.NET.Sdk.Razor"><PropertyGroup><TargetFramework>net10.0</TargetFramework><Nullable>enable</Nullable><ImplicitUsings>enable</ImplicitUsings><TreatWarningsAsErrors>true</TreatWarningsAsErrors></PropertyGroup><ItemGroup><FrameworkReference Include="Microsoft.AspNetCore.App" /></ItemGroup></Project>');
  writeFileSync(join(dir, '_Imports.razor'), '@using Microsoft.AspNetCore.Components\n');
  for (const spec of components) {
    const name = spec.id.split('-').map(s => s[0]!.toUpperCase() + s.slice(1)).join('');
    writeFileSync(join(dir, name + '.razor'), generateCode(spec, 'blazor'));
  }
  const result = spawnSync('dotnet', ['build', join(dir, 'Recipes.csproj'), '--nologo', '--verbosity', 'quiet'], {
    encoding: 'utf8', env: { ...process.env, DOTNET_CLI_HOME: dir, DOTNET_NOLOGO: '1', DOTNET_CLI_TELEMETRY_OPTOUT: '1' },
  });
  if (result.error || result.status !== 0) {
    console.error(result.error?.message ?? result.stdout + result.stderr);
    console.error('Install the .NET 10 SDK to validate the Blazor recipes.');
    process.exitCode = 1;
  } else console.log(`${components.length} Blazor recipes compiled with no warnings.`);
} finally { rmSync(dir, { recursive: true, force: true }); }
