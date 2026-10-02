/** Embed generated declarations and migration guidance; production needs no checkout. */
import { readFileSync, mkdirSync, writeFileSync, readdirSync } from 'node:fs';
import { resolve, relative, dirname } from 'node:path';
import { VERSION } from '../lib/version.js';

const root = resolve('dist-js/types');
const barrel = readFileSync(resolve(root, 'index.d.ts'), 'utf8');
const exports = new Map<string, string>([['VERSION', 'index.d.ts']]);
for (const match of barrel.matchAll(/export\s*\{([^}]+)\}\s*from\s*['"]([^'"]+)['"]/g)) {
  for (const part of match[1]!.split(',').map(s => s.trim()).filter(Boolean)) {
    const name = part.replace(/^type\s+/, '');
    if (!/^\w+$/.test(name)) throw new Error(`Unsupported export syntax: ${part}`);
    exports.set(name, match[2]!.replace(/^\.\//, '').replace(/\.js$/, '.d.ts'));
  }
}
const api: { name: string; exported: boolean; runtime: boolean; signature: string; description: string; source: string }[] = [];
for (const file of readdirSync(root, { recursive: true }).map(String).filter(file => file.endsWith('.d.ts'))) {
  const source = relative(root, resolve(root, file)).replaceAll('\\', '/');
  const body = readFileSync(resolve(root, file), 'utf8');
  const declarations = [...body.matchAll(/^(?:export\s+)?(?:declare\s+)?(function|const|interface|type|class)\s+(\w+)/gm)];
  declarations.forEach((match, index) => {
    const name = match[2]!;
    const exported = exports.get(name) === source;
    if (!exported && !['interface', 'type'].includes(match[1]!)) return;
    const signature = body.slice(match.index, declarations[index + 1]?.index ?? body.length).split(/^export\s*\{/m)[0]!.replace(/\s*\/\*\*(?:(?!\/\*\*)[\s\S])*?\*\/\s*$/, '').trim();
    const preceding = body.slice(0, match.index);
    const description = preceding.match(/\/\*\*((?:(?!\/\*\*)[\s\S])*?)\*\/\s*$/)?.[1]?.replace(/^\s*\* ?/gm, '').trim() ?? '';
    api.push({ name, exported, runtime: !['interface', 'type'].includes(match[1]!), signature, description, source });
  });
}
for (const name of exports.keys()) if (!api.some(item => item.name === name && item.exported)) throw new Error(`Missing declaration for ${name}`);
api.sort((a, b) => a.name.localeCompare(b.name));
const destination = resolve('dist/data/mcp-reference.json');
mkdirSync(dirname(destination), { recursive: true });
writeFileSync(destination, JSON.stringify({ schemaVersion: 1, version: VERSION, api,
  migration: { markdown: readFileSync('MIGRATION.md', 'utf8'), baseline: JSON.parse(readFileSync('compatibility/v2-contract.json', 'utf8')) },
}, null, 2) + '\n');
console.log(`MCP reference: ${exports.size} public behavior exports, supporting types and complete migration guide embedded.`);
