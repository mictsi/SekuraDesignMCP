/** Validate generated consumer code, not merely its length. */
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { transform } from 'esbuild';
import { parse, compileScript, compileTemplate } from '@vue/compiler-sfc';
import { compile } from 'svelte/compiler';
import { parseTemplate } from '@angular/compiler';
import { components } from '../data/components/index.js';
import { generateCode } from '../lib/codegen.js';

const dir = resolve('tmp/codegen-fixtures');
mkdirSync(dir, { recursive: true });
const failures: string[] = [];
for (const spec of components) {
  try {
    const react = generateCode(spec, 'react');
    await transform(react, { loader: 'tsx', logLevel: 'silent' });
    writeFileSync(`${dir}/${spec.id}.tsx`, react);
    const vue = generateCode(spec, 'vue');
    const { descriptor, errors } = parse(vue, { filename: spec.id + '.vue' });
    if (errors.length) throw new Error(String(errors));
    compileScript(descriptor, { id: spec.id });
    const template = compileTemplate({ source: descriptor.template!.content, filename: spec.id + '.vue', id: spec.id });
    if (template.errors.length) throw new Error(String(template.errors));
    compile(generateCode(spec, 'svelte'), { filename: spec.id + '.svelte', generate: 'client' });
    const web = generateCode(spec, 'web-component');
    await transform(web, { loader: 'ts', logLevel: 'silent' });
    writeFileSync(`${dir}/${spec.id}.web.ts`, web);
    const angular = generateCode(spec, 'angular');
    writeFileSync(`${dir}/${spec.id}.angular.ts`, angular);
    const templateSource = JSON.parse(angular.match(/template: ("(?:\\.|[^"\\])*")/)![1]!);
    const angularTemplate = parseTemplate(templateSource, spec.id + '.html');
    if (angularTemplate.errors?.length) throw new Error(String(angularTemplate.errors));
    await transform(angular, { loader: 'ts', logLevel: 'silent', tsconfigRaw: { compilerOptions: { experimentalDecorators: true } } });
  } catch (error) { failures.push(`${spec.id}: ${String(error)}`); }
}
writeFileSync(`${dir}/tsconfig.json`, JSON.stringify({ compilerOptions: {
  strict: true, noEmit: true, skipLibCheck: true, experimentalDecorators: true, jsx: 'react-jsx', target: 'ES2022', module: 'ESNext', moduleResolution: 'bundler',
  paths: { '@sekura/behaviours': [resolve('dist-js/types/index.d.ts')] },
}, include: ['*.tsx', '*.ts'] }));
const tsc = spawnSync(process.execPath, [resolve('node_modules/typescript/bin/tsc'), '-p', `${dir}/tsconfig.json`], { encoding: 'utf8' });
if (tsc.status !== 0) failures.push(tsc.stdout + tsc.stderr);
if (failures.length) { console.error(failures.join('\n')); process.exitCode = 1; }
else { console.log(`${components.length} reference recipes: React/Angular/Web Component typecheck, Vue/Svelte compile and Angular templates passed.`); rmSync(dir, { recursive: true }); }
