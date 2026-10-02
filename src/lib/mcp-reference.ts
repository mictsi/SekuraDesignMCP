import { readFileSync } from 'node:fs';
import { z } from 'zod';
import { components } from '../data/components/index.js';
import { legacyGeometryCss } from '../data/compatibility.js';
import { migrationChanges } from '../data/migration.js';
import { runtimeContract } from '../data/behavior-contracts.js';
import { VERSION } from './version.js';

export const apiEntrySchema = z.object({ name: z.string(), exported: z.boolean(), runtime: z.boolean(), signature: z.string(), description: z.string(), source: z.string() });
const referenceSchema = z.object({ schemaVersion: z.literal(1), version: z.string(), api: z.array(apiEntrySchema), migration: z.object({ markdown: z.string(), baseline: z.record(z.string(), z.unknown()) }) });
let cache: z.infer<typeof referenceSchema> | undefined;
export function mcpReference() {
  cache ??= referenceSchema.parse(JSON.parse(readFileSync(new URL('../data/mcp-reference.json', import.meta.url), 'utf8')));
  if (cache.version !== VERSION) throw new Error('MCP reference version mismatch. Rebuild the package.');
  return cache;
}

export const behaviorSchema = z.object({
  schemaVersion: z.literal(1), version: z.string(), id: z.string().nullable(),
  components: z.array(z.object({ id: z.string(), status: z.string(), controllers: z.array(z.string()), retrieveWith: z.string() })),
  api: z.array(apiEntrySchema), initialization: z.object({ automatic: z.array(z.string()), manualOnly: z.array(z.string()), example: z.string(), cleanup: z.string(), notes: z.array(z.string()) }),
  events: z.array(z.object({ name: z.string(), detail: z.record(z.string(), z.string()), source: z.enum(['native', 'controller']), applicationRequired: z.boolean() })),
  migrationTool: z.string(),
});

/** Include named supporting types recursively, so an agent can implement the API offline. */
function apiFor(names: string[]) {
  const api = mcpReference().api;
  const wanted = new Set(names);
  let changed = true;
  while (changed) {
    changed = false;
    const signatures = api.filter(item => wanted.has(item.name)).map(item => item.signature).join('\n');
    for (const item of api) if (!item.runtime && !wanted.has(item.name) && new RegExp(`\\b${item.name}\\b`).test(signatures)) { wanted.add(item.name); changed = true; }
  }
  return api.filter(item => wanted.has(item.name));
}

export function behaviorReference(id?: string) {
  const component = components.find(component => component.id === id);
  const api = mcpReference().api;
  if (id && !component && !api.some(item => item.name === id && item.exported)) return null;
  const contract = component ? runtimeContract(component.id) : null;
  const manual = contract?.manualOnly ?? [];
  const automatic = contract?.autoSelectors ?? [];
  const catalog = (id ? component ? [component] : components.filter(component => runtimeContract(component.id).controllers.includes(id)) : components).map(component => ({ id: component.id, status: component.status, controllers: runtimeContract(component.id).controllers, retrieveWith: `get_behavior({ id: "${component.id}" })` }));
  const example = automatic.length || !id
    ? `import { enhance } from '@sekura/behaviours';\n// root is the application's rendered component/container.\nconst owned = enhance(root);\n// Attach application outcomes to the documented events.\n// Before replacing/unmounting this root:\nowned.destroy();`
    : component && !contract?.controllers.length
      ? '// Native markup and CSS; no controller required.\n// Render application state and use native event listeners for actions.'
      : !component ? `import ${api.find(item => item.name === id)?.runtime ? '' : 'type '}{ ${id} } from '@sekura/behaviours';\n// Use the exact signature below. Cleanup applies only when this API returns an owned resource.`
      : '// Manual API: import the named factory from @sekura/behaviours.\n// Pass the native host elements and application callbacks defined below.\n// Keep the returned handle and call destroy() before unmounting.';
  return behaviorSchema.parse({ schemaVersion: 1, version: VERSION, id: id ?? null, components: catalog,
    api: id ? apiFor(component ? contract!.controllers : [id]) : api,
    initialization: { automatic, manualOnly: manual, example,
      cleanup: 'Use one controller owner. enhance(root).destroy() releases its controllers; dispose(root) releases auto-owned handlers. Manual controllers require their own destroy() (guardAction returns a cleanup function). Framework recipes own enhancement; do not initialize them twice.',
      notes: [...(contract?.notes ?? catalog.flatMap(c => runtimeContract(c.id).notes)), 'Load matching-version CSS and behaviors. The host owns data, permissions, transport, navigation and persistence.', 'For a manual API, read its exact declaration and supporting types. Specification props are not universal framework props.'],
    }, events: component?.implementation?.events ?? [], migrationTool: component ? `get_migration_guide({ componentId: "${component.id}" })` : 'get_migration_guide({})',
  });
}

export const migrationSchema = z.object({
  schemaVersion: z.literal(1), version: z.string(), fromVersion: z.string(), componentId: z.string().nullable(), markdown: z.string(),
  changes: z.array(z.object({ id: z.string(), components: z.array(z.string()), behavior: z.string(), action: z.string(), verify: z.array(z.string()) })),
  compatibility: z.object({ sourceCommit: z.string(), baseline: z.record(z.string(), z.unknown()), geometryCss: z.string(), limit: z.string() }),
});
export function migrationReference(componentId?: string) {
  if (componentId && !components.some(component => component.id === componentId)) return null;
  const reference = mcpReference().migration;
  return migrationSchema.parse({ schemaVersion: 1, version: VERSION, fromVersion: String(reference.baseline.sourceVersion), componentId: componentId ?? null,
    markdown: reference.markdown,
    changes: migrationChanges.filter(change => !componentId || !change.components.length || change.components.includes(componentId)),
    compatibility: { sourceCommit: String(reference.baseline.sourceCommit), baseline: reference.baseline, geometryCss: legacyGeometryCss(), limit: 'The baseline protects public names, not arbitrary consumer overrides. The optional v2 geometry bridge preserves a documented subset; it does not recreate the old palette, markup or behavior. Roll back matching CSS and behavior artifacts together.' },
  });
}
