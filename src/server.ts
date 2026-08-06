/**
 * The Sekura Design System MCP server.
 *
 * Every tool returns text a coding agent can act on directly: paste-ready code,
 * resolved token values, or a concrete accessibility verdict. Nothing returns a
 * pointer to documentation the agent then has to go and read.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import { proseCss, resetCss, themeScript, themeToggleHtml, utilitiesCss } from './data/base-css.js';
import {
  categoryDescriptions,
  componentCategories,
  components,
  getComponent,
} from './data/components/index.js';
import { foundations, getFoundation } from './data/foundations.js';
import { getLayout, layouts } from './data/layouts.js';
import { getPattern, patterns } from './data/patterns.js';
import { rampDescriptions } from './data/primitives.js';
import {
  auditThemes,
  breakpoints,
  densities,
  elevation,
  getToken,
  opaqueValue,
  ramps,
  resolvePrimitive,
  scales,
  semanticTokens,
  THEMES,
  themeInfo,
  tokenGroups,
  typeScale,
  type ThemeName,
} from './data/tokens.js';
import { evaluateContrast } from './lib/color.js';
import { FRAMEWORKS, frameworkDescriptions, generateCode, type Framework } from './lib/codegen.js';
import { EXPORT_FORMATS, exportTokens, formatDescriptions, type ExportFormat } from './lib/exporters.js';
import { search, type ResultKind } from './lib/search.js';
import { safeForegroundsOn, suggestTokens } from './lib/suggest.js';
import { summariseFindings, validateMarkup } from './lib/validate.js';

import { VERSION } from './lib/version.js';

export const SERVER_NAME = 'sekura-design';
export const SERVER_VERSION = VERSION;

const themeEnum = z.enum(THEMES as unknown as [ThemeName, ...ThemeName[]]);

function text(body: string) {
  return { content: [{ type: 'text' as const, text: body }] };
}

function bullets(items: string[]): string {
  return items.map((i) => `- ${i}`).join('\n');
}

/* ------------------------------------------------------------------ *
 * Formatters
 * ------------------------------------------------------------------ */

function formatComponent(id: string): string {
  const c = getComponent(id);
  if (!c) {
    return `Unknown component "${id}".\n\nAvailable: ${components.map((x) => x.id).join(', ')}`;
  }

  const anatomy = c.anatomy
    .map((a) => `| ${a.part} | ${a.required ? 'Required' : 'Optional'} | ${a.description} |`)
    .join('\n');
  const variants = c.variants
    .map((v) => `| ${v.name} | \`${v.className || '(base)'}\` | ${v.use} |`)
    .join('\n');
  const sizes = c.sizes
    .map((s) => `| ${s.name} | \`${s.className || '(default)'}\` | ${s.height} | ${s.description} |`)
    .join('\n');
  const states = c.states.map((s) => `| ${s.name} | \`${s.trigger}\` | ${s.description} |`).join('\n');
  const props = c.props
    .map((p) => `| \`${p.name}\` | \`${p.type}\` | ${p.default ?? (p.required ? '**required**' : '—')} | ${p.description} |`)
    .join('\n');
  const keys = c.accessibility.keyboard.map((k) => `| \`${k.keys}\` | ${k.action} |`).join('\n');

  return `# ${c.name}  \`${c.id}\`

**Category:** ${c.category} · **Status:** ${c.status}

${c.summary}

## When to use
${bullets(c.whenToUse)}

## When not to use
${bullets(c.whenNotToUse)}

## Anatomy
| Part | | Description |
|---|---|---|
${anatomy}

## Variants
| Variant | Class | Use when |
|---|---|---|
${variants}

## Sizes
| Size | Class | Height | Notes |
|---|---|---|---|
${sizes}

## States
| State | Trigger | Behaviour |
|---|---|---|
${states}

## Props
| Prop | Type | Default | Description |
|---|---|---|---|
${props}

## Dark mode
${c.darkMode}

## Accessibility

**Role:** ${c.accessibility.role}

**Keyboard**
| Keys | Action |
|---|---|
${keys}

**ARIA obligations**
${bullets(c.accessibility.aria)}

**WCAG criteria this component is accountable for**
${bullets(c.accessibility.wcag)}

**Screen reader:** ${c.accessibility.screenReader}

**Target size:** ${c.accessibility.targetSize}

## Content
${bullets(c.content)}

## Do
${bullets(c.dos)}

## Don't
${bullets(c.donts)}

## Tokens used
${c.tokensUsed.map((t) => `\`--sk-${t}\``).join(', ')}

## Related
${c.related.map((r) => `\`${r}\``).join(', ')}

---
Get code with \`get_component_code({ id: "${c.id}", framework: "react" })\`.`;
}

function formatFoundation(id: string): string {
  const f = getFoundation(id);
  if (!f) {
    return `Unknown foundation "${id}".\n\nAvailable: ${foundations.map((x) => x.id).join(', ')}`;
  }
  return `# ${f.title}

${f.summary}

## Rules
${bullets(f.rules)}

${f.body}

## Related foundations
${f.related.map((r) => `\`${r}\``).join(', ')}`;
}

function formatPattern(id: string): string {
  const p = getPattern(id);
  if (!p) {
    return `Unknown pattern "${id}".\n\nAvailable: ${patterns.map((x) => x.id).join(', ')}`;
  }
  return `# ${p.name}  \`${p.id}\`

${p.summary}

## The problem
${p.problem}

## The solution
${p.solution}

## Rules
${bullets(p.rules)}

## Accessibility
${bullets(p.accessibility)}

## Anti-patterns
${bullets(p.antiPatterns)}

## Components involved
${p.components.map((c) => `\`${c}\``).join(', ')}
${p.html ? `\n## Example\n\n\`\`\`html\n${p.html}\n\`\`\`` : ''}`;
}

function formatLayout(id: string): string {
  const l = getLayout(id);
  if (!l) {
    return `Unknown layout "${id}".\n\nAvailable: ${layouts.map((x) => x.id).join(', ')}`;
  }
  const regions = l.regions
    .map((r) => `| ${r.name} | ${r.description} | ${r.responsive} |`)
    .join('\n');
  return `# ${l.name}  \`${l.id}\`

${l.summary}

## When to use
${bullets(l.whenToUse)}

## Regions
| Region | Contains | Responsive behaviour |
|---|---|---|
${regions}

## Responsive strategy
${l.responsive}

## Accessibility
${bullets(l.accessibility)}

## Dark mode
${l.darkMode}

## Components used
${l.components.map((c) => `\`${c}\``).join(', ')}

## Markup

\`\`\`html
${l.html}
\`\`\`

## Layout CSS

\`\`\`css
${l.css}
\`\`\``;
}

/* ------------------------------------------------------------------ *
 * Server
 * ------------------------------------------------------------------ */

export function createServer(): McpServer {
  const server = new McpServer(
    { name: SERVER_NAME, version: SERVER_VERSION },
    {
      instructions: `The Sekura Design System: a complete, dark-mode-first design and UX specification exposed as tools.

Start with \`get_overview\` for the map. Then:
- \`get_foundation\` — the reasoning (colour, dark mode, responsive layout, accessibility, …)
- \`get_component\` / \`get_component_code\` — 45 components with paste-ready code in 8 frameworks
- \`get_layout\` — full page blueprints
- \`get_pattern\` — recurring UX problems and their answers
- \`export_tokens\` — CSS, Tailwind, W3C DTCG, Swift, Android
- \`check_contrast\` / \`audit_theme\` / \`validate_markup\` — verify, do not guess

Two rules that govern everything else: product code references semantic tokens only (never a hex value, never a primitive), and dark mode is a peer of light mode rather than an inversion of it. Layouts are flex-first and respond to their container, so most need no media query.`,
    }
  );

  /* ---------------- Discovery ---------------- */

  server.registerTool(
    'get_overview',
    {
      title: 'Overview of the design system',
      description:
        'Start here. Returns the map of everything available: foundations, component catalogue, layout recipes, UX patterns, token groups and export formats, with the tool call needed to retrieve each.',
      inputSchema: {},
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async () => {
      const componentList = componentCategories
        .map((cat) => {
          const inCat = components.filter((c) => c.category === cat);
          return `### ${cat} (${inCat.length})\n${categoryDescriptions[cat]}\n\n${inCat.map((c) => `- \`${c.id}\` — ${c.name}: ${c.summary.split('.')[0]}.`).join('\n')}`;
        })
        .join('\n\n');

      return text(`# Sekura Design System

A design and UX specification for building accessible, dark-mode-first product
interfaces. Everything here is machine-readable and verified: the ${semanticTokens.length}
semantic tokens are audited for WCAG contrast across all four themes on every build.

## The two rules everything follows from

1. **Semantic before literal.** Product code references \`--sk-color-text-primary\`,
   never a hex value and never a primitive. This is what makes four themes cost the
   same as one.
2. **Dark mode is a peer, not a filter.** Floating surfaces get *lighter* as they
   rise, saturated fills step *up* the ramp (so their labels flip to dark), and
   borders carry the separation that shadows carry in light mode.

Layouts are flex-first: horizontal groups wrap rather than overflow, and widths are
expressed as \`flex-basis\` rather than \`width\`, so most layouts respond to their
**container** and need no media query at all.

## Foundations — the reasoning
${foundations.map((f) => `- \`${f.id}\` — **${f.title}**: ${f.summary}`).join('\n')}

Retrieve with \`get_foundation({ id })\`.

## Components — ${components.length} total
${componentList}

Retrieve with \`get_component({ id })\`, code with \`get_component_code({ id, framework })\`.

## Layout recipes — ${layouts.length} page blueprints
${layouts.map((l) => `- \`${l.id}\` — **${l.name}**: ${l.summary}`).join('\n')}

Retrieve with \`get_layout({ id })\`.

## UX patterns — ${patterns.length}
${patterns.map((p) => `- \`${p.id}\` — **${p.name}**: ${p.summary}`).join('\n')}

Retrieve with \`get_pattern({ id })\`.

## Themes
${THEMES.map((t) => `- \`${t}\` — **${themeInfo[t].label}**: ${themeInfo[t].description}`).join('\n')}

## Densities
${Object.entries(densities).map(([k, d]) => `- \`${k}\` — ${d.description}`).join('\n')}

## Token groups
${tokenGroups().map((g) => `- \`${g}\` (${semanticTokens.filter((t) => t.group === g).length} tokens)`).join('\n')}

Plus dimensional scales: ${Object.keys(scales).join(', ')}.

## Export formats
${EXPORT_FORMATS.map((f) => `- \`${f}\` — ${formatDescriptions[f]}`).join('\n')}

## Verification tools
- \`check_contrast\` — WCAG verdict for any colour pair
- \`audit_theme\` — every declared pairing across every theme; this is a build gate
- \`validate_markup\` — lints HTML/CSS against the spec
- \`suggest_token\` — describe an intent, get the right token

## Getting started
Call \`get_setup\` for the HTML scaffold, the pre-paint theme script and the
stylesheet bundle. Call \`get_foundation({ id: "dark-mode" })\` before implementing
dark mode — it lists the nine things that break silently.`);
    }
  );

  server.registerTool(
    'search',
    {
      title: 'Search the design system',
      description:
        'Full-text search across components, foundations, patterns, layouts and tokens. Use when you know what you need but not where it lives.',
      inputSchema: {
        query: z.string().min(2).describe('What you are looking for, e.g. "focus ring", "dark mode borders", "bulk selection".'),
        kinds: z
          .array(z.enum(['component', 'foundation', 'pattern', 'layout', 'token']))
          .optional()
          .describe('Restrict to certain kinds of result.'),
        limit: z.number().int().min(1).max(40).optional().describe('Maximum results (default 12).'),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ query, kinds, limit }) => {
      const results = search(query, { kinds: kinds as ResultKind[] | undefined, limit });
      if (results.length === 0) {
        return text(
          `No results for "${query}".\n\nTry \`get_overview\` for the full catalogue, or broaden the query.`
        );
      }
      const body = results
        .map(
          (r) =>
            `### ${r.title}  \`${r.id}\`\n**${r.kind}** · score ${r.score}\n\n${r.summary}\n${r.excerpt ? `\n> ${r.excerpt}\n` : ''}\nRetrieve: \`${r.retrieveWith}\``
        )
        .join('\n\n');
      return text(`# ${results.length} result(s) for "${query}"\n\n${body}`);
    }
  );

  /* ---------------- Foundations ---------------- */

  server.registerTool(
    'get_foundation',
    {
      title: 'Get a foundation document',
      description:
        'The reasoning behind the system: principles, colour, dark mode, responsive layout, typography, spacing, elevation, motion, accessibility, content and voice, iconography, density, internationalisation, data visualisation, theming. Read the relevant foundation before implementing in that area.',
      inputSchema: {
        id: z
          .enum(foundations.map((f) => f.id) as [string, ...string[]])
          .describe('Foundation id.'),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ id }) => text(formatFoundation(id))
  );

  /* ---------------- Components ---------------- */

  server.registerTool(
    'list_components',
    {
      title: 'List components',
      description: 'The component catalogue, optionally filtered by category or status.',
      inputSchema: {
        category: z
          .enum(componentCategories as unknown as [string, ...string[]])
          .optional()
          .describe('Filter by category.'),
        status: z.enum(['stable', 'beta', 'deprecated']).optional().describe('Filter by maturity.'),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ category, status }) => {
      let list = components;
      if (category) list = list.filter((c) => c.category === category);
      if (status) list = list.filter((c) => c.status === status);
      if (list.length === 0) return text('No components match that filter.');

      const rows = list
        .map((c) => `| \`${c.id}\` | ${c.name} | ${c.category} | ${c.status} | ${c.summary.split('. ')[0]}. |`)
        .join('\n');
      return text(`# Components (${list.length})

| id | Name | Category | Status | Summary |
|---|---|---|---|---|
${rows}

Full spec: \`get_component({ id })\`. Code: \`get_component_code({ id, framework })\`.`);
    }
  );

  server.registerTool(
    'get_component',
    {
      title: 'Get a component specification',
      description:
        'The complete spec for one component: anatomy, variants, sizes, states, props, tokens consumed, dark-mode behaviour, full accessibility contract (role, keyboard model, ARIA obligations, WCAG criteria, target size), content rules, and do/don\'t guidance.',
      inputSchema: {
        id: z.string().describe('Component id, e.g. "button", "table", "combobox".'),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ id }) => text(formatComponent(id))
  );

  server.registerTool(
    'get_component_code',
    {
      title: 'Get paste-ready component code',
      description:
        'Production code for a component in the requested framework. HTML returns reference markup with the required ARIA wiring; CSS returns the production stylesheet written against semantic tokens; framework options return typed wrappers that forward the accessibility attributes the spec requires.',
      inputSchema: {
        id: z.string().describe('Component id.'),
        framework: z
          .enum(FRAMEWORKS as unknown as [Framework, ...Framework[]])
          .describe(
            Object.entries(frameworkDescriptions)
              .map(([k, v]) => `${k}: ${v}`)
              .join(' | ')
          ),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ id, framework }) => {
      const spec = getComponent(id);
      if (!spec) {
        return text(`Unknown component "${id}".\n\nAvailable: ${components.map((c) => c.id).join(', ')}`);
      }
      const lang =
        framework === 'html' ? 'html'
        : framework === 'css' ? 'css'
        : framework === 'react' ? 'tsx'
        : framework === 'vue' ? 'vue'
        : framework === 'svelte' ? 'svelte'
        : framework === 'blazor' ? 'razor'
        : 'ts';

      return text(`# ${spec.name} — ${framework}

${frameworkDescriptions[framework]}

\`\`\`${lang}
${generateCode(spec, framework)}
\`\`\`

**Dark mode note:** ${spec.darkMode}

**Do not forget:**
${bullets(spec.accessibility.aria.slice(0, 4))}

${framework !== 'css' ? `\nThe CSS for this component is a separate call: \`get_component_code({ id: "${spec.id}", framework: "css" })\`. Token definitions come from \`export_tokens({ format: "css" })\`.` : ''}`);
    }
  );

  /* ---------------- Layouts and patterns ---------------- */

  server.registerTool(
    'get_layout',
    {
      title: 'Get a page layout recipe',
      description:
        'A complete page blueprint: regions, responsive strategy, accessibility obligations, dark-mode notes, and paste-ready markup plus CSS. All recipes are flex-first and most contain no media query.',
      inputSchema: {
        id: z
          .enum(layouts.map((l) => l.id) as [string, ...string[]])
          .describe('Layout id.'),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ id }) => text(formatLayout(id))
  );

  server.registerTool(
    'get_pattern',
    {
      title: 'Get a UX pattern',
      description:
        'A recurring UX problem and the Sekura answer: the problem, the solution, the rules, the accessibility obligations, and the anti-patterns to avoid.',
      inputSchema: {
        id: z
          .enum(patterns.map((p) => p.id) as [string, ...string[]])
          .describe('Pattern id.'),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ id }) => text(formatPattern(id))
  );

  /* ---------------- Tokens ---------------- */

  server.registerTool(
    'get_tokens',
    {
      title: 'Get token values',
      description:
        'Resolved token values. Filter by group, by name fragment, or return everything. Shows the value in every theme so dark-mode differences are visible side by side.',
      inputSchema: {
        group: z.string().optional().describe(`Token group: ${tokenGroups().join(', ')}.`),
        filter: z.string().optional().describe('Substring match on token name, e.g. "border", "action-primary".'),
        theme: themeEnum.optional().describe('Show only this theme. Omit to show all four.'),
        includeScales: z.boolean().optional().describe('Include non-colour scales (spacing, radius, motion, z-index, typography).'),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ group, filter, theme, includeScales }) => {
      let list = semanticTokens;
      if (group) list = list.filter((t) => t.group === group);
      if (filter) {
        const f = filter.toLowerCase().replace(/^--sk-/, '');
        list = list.filter((t) => t.name.includes(f) || t.description.toLowerCase().includes(f));
      }

      const sections: string[] = [];

      if (list.length > 0) {
        const themesToShow = theme ? [theme] : THEMES;
        const header = `| Token | ${themesToShow.join(' | ')} | Description |`;
        const sep = `|---|${themesToShow.map(() => '---|').join('')}---|`;
        const rows = list
          .map((t) => {
            const vals = themesToShow.map((th) => `\`${resolvePrimitive(t.values[th])}\``).join(' | ');
            const exempt = t.contrastExempt ? ' *(contrast-exempt)*' : '';
            return `| \`--sk-${t.name}\` | ${vals} | ${t.description}${exempt} |`;
          })
          .join('\n');
        sections.push(`## Colour tokens (${list.length})\n\n${header}\n${sep}\n${rows}`);
      } else {
        sections.push('No colour tokens matched.');
      }

      if (includeScales) {
        for (const [name, scale] of Object.entries(scales)) {
          const rows = Object.entries(scale)
            .map(([k, v]) => `| \`--sk-${name === 'zIndex' ? 'z' : name.replace(/([A-Z])/g, '-$1').toLowerCase()}-${k}\` | \`${v}\` |`)
            .join('\n');
          sections.push(`### ${name}\n\n| Token | Value |\n|---|---|\n${rows}`);
        }
        const typeRows = Object.entries(typeScale)
          .map(([k, v]) => `| \`${k}\` | \`${v.fontSize}\` | \`${v.lineHeight}\` | \`${v.fontWeight}\` | \`${v.letterSpacing}\` | ${v.description} |`)
          .join('\n');
        sections.push(`### Type scale\n\n| Style | Size | Line height | Weight | Tracking | Use |\n|---|---|---|---|---|---|\n${typeRows}`);

        const elevRows = Object.entries(elevation)
          .map(([k, v]) => `| \`--sk-elevation-${k}\` | \`${v.surface}\` | ${v.usage} |`)
          .join('\n');
        sections.push(`### Elevation\n\n| Token | Paired surface | Use |\n|---|---|---|\n${elevRows}\n\nElevation is two tokens, not one: in dark mode the shadow contributes almost nothing and surface lightness does the work.`);

        const bpRows = Object.entries(breakpoints)
          .map(([k, v]) => `| \`${k}\` | ${v.min} / ${v.px}px | ${v.columns} | ${v.description} |`)
          .join('\n');
        sections.push(`### Breakpoints\n\n| Name | Min | Columns | Purpose |\n|---|---|---|---|\n${bpRows}\n\nIn practice \`lg\` is the only breakpoint most features need — flex-first layouts respond to their container instead.`);
      }

      return text(
        `# Sekura tokens\n\n${sections.join('\n\n')}\n\n---\nExport machine-readable formats with \`export_tokens\`. Primitive ramps: ${Object.keys(ramps).join(', ')}.`
      );
    }
  );

  server.registerTool(
    'export_tokens',
    {
      title: 'Export tokens in a build format',
      description:
        'Emit the full token set in a consumable format. Everything is generated from one source, so a primitive change propagates to every output.',
      inputSchema: {
        format: z
          .enum(EXPORT_FORMATS as unknown as [ExportFormat, ...ExportFormat[]])
          .describe(
            Object.entries(formatDescriptions)
              .map(([k, v]) => `${k}: ${v}`)
              .join(' | ')
          ),
        theme: themeEnum.optional().describe('Only for the "json" format, which is single-theme.'),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ format, theme }) => {
      const out = exportTokens(format, theme);
      const lang =
        format === 'css' ? 'css'
        : format === 'scss' ? 'scss'
        : format === 'tailwind-v4' ? 'css'
        : format === 'swift' ? 'swift'
        : format === 'android' ? 'xml'
        : format === 'ts' || format === 'js' || format === 'tailwind-v3' ? 'ts'
        : 'json';
      return text(`# Tokens — ${format}\n\n${formatDescriptions[format]}\n\n\`\`\`${lang}\n${out}\n\`\`\``);
    }
  );

  server.registerTool(
    'get_primitives',
    {
      title: 'Get primitive colour ramps',
      description:
        'The raw colour ramps behind the semantic layer. Use these to build new semantic tokens or to re-brand. Never reference a primitive from product code — it does not change between themes, so it will not adapt to dark mode.',
      inputSchema: {
        ramp: z.string().optional().describe(`Ramp name: ${Object.keys(ramps).join(', ')}.`),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ ramp }) => {
      const entries = ramp ? { [ramp]: ramps[ramp] } : ramps;
      if (ramp && !ramps[ramp]) {
        return text(`Unknown ramp "${ramp}". Available: ${Object.keys(ramps).join(', ')}`);
      }
      const sections = Object.entries(entries)
        .map(([name, values]) => {
          const rows = Object.entries(values!)
            .map(([step, hex]) => `| \`${name}-${step}\` | \`${hex}\` |`)
            .join('\n');
          return `## ${name}\n\n${rampDescriptions[name] ?? ''}\n\n| Step | Value |\n|---|---|\n${rows}`;
        })
        .join('\n\n');
      return text(`# Primitive ramps

Primitives carry no meaning on their own. Product code consumes the semantic layer;
primitives exist so the semantic layer has evenly-stepped values to point at.

Two neutral steps are pinned by contrast rather than by eye: \`neutral-400\` is the
lightest grey clearing 3:1 on white (so borders stay locatable), and \`neutral-500\`
is the lightest clearing 4.5:1 on the subtle surface (so tertiary text stays
readable). Moving either lighter breaks a promise the audit will catch.

${sections}`);
    }
  );

  server.registerTool(
    'suggest_token',
    {
      title: 'Find the right token for an intent',
      description:
        'Describe what you are styling in plain words and get the semantic tokens that apply, with resolved values per theme and a note on why that token rather than a neighbour. Use this instead of guessing a token name or reaching for a hex value.',
      inputSchema: {
        intent: z
          .string()
          .min(3)
          .describe('e.g. "subtle border on a card", "text for a timestamp", "background for a dropdown menu".'),
        limit: z.number().int().min(1).max(20).optional(),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ intent, limit }) => {
      const found = suggestTokens(intent, limit ?? 6);
      if (found.length === 0) {
        return text(
          `No token matched "${intent}".\n\nTry \`get_tokens({ includeScales: true })\` to browse, or \`search({ query: "${intent}" })\`.`
        );
      }
      const body = found
        .map(
          (s) =>
            `### \`${s.cssVar}\`\n${s.description}\n\n| Theme | Value |\n|---|---|\n${THEMES.map((t) => `| ${t} | \`${s.values[t]}\` |`).join('\n')}\n\n**Why:** ${s.why}`
        )
        .join('\n\n');
      return text(`# Tokens for "${intent}"\n\n${body}`);
    }
  );

  /* ---------------- Verification ---------------- */

  server.registerTool(
    'check_contrast',
    {
      title: 'Check a colour pair against WCAG',
      description:
        'WCAG 2.2 contrast ratio and pass/fail verdict for a foreground/background pair. Accepts hex values or Sekura token names — passing tokens resolves them for the chosen theme, including compositing translucent values over the page.',
      inputSchema: {
        foreground: z.string().describe('Hex value, or a token name like "color-text-primary".'),
        background: z.string().describe('Hex value, or a token name.'),
        use: z
          .enum(['body-text', 'large-text', 'ui-component', 'decorative'])
          .optional()
          .describe('What the pair is for. Drives the threshold: 4.5:1 body, 3:1 large text and UI components.'),
        theme: themeEnum.optional().describe('Theme to resolve token names in (default light).'),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ foreground, background, use, theme }) => {
      const th = (theme ?? 'light') as ThemeName;

      const resolve = (input: string): { value: string; note: string } => {
        if (input.startsWith('#')) return { value: input, note: 'literal' };
        const cleaned = input.replace(/^--sk-/, '');
        const tk = getToken(cleaned);
        if (!tk) return { value: input, note: 'literal' };
        const v = opaqueValue(cleaned, th);
        return {
          value: v ?? resolvePrimitive(tk.values[th]),
          note: `token \`--sk-${cleaned}\` in ${th}${v && !resolvePrimitive(tk.values[th]).startsWith('#') ? ', composited over the page' : ''}`,
        };
      };

      const fg = resolve(foreground);
      const bg = resolve(background);

      let verdict;
      try {
        verdict = evaluateContrast(fg.value, bg.value, use ?? 'body-text');
      } catch (err) {
        return text(`Could not evaluate: ${(err as Error).message}`);
      }

      return text(`# Contrast: ${verdict.display}

**Foreground** \`${fg.value}\` (${fg.note})
**Background** \`${bg.value}\` (${bg.note})
**Use** ${verdict.use}

## Verdict: ${verdict.grade === 'fail' ? '❌ FAIL' : verdict.grade === 'AAA' ? '✅ AAA' : '✅ AA'}

${verdict.advice}

| Requirement | Threshold | Result |
|---|---|---|
| AA body text | 4.5:1 | ${verdict.passes.aaBodyText ? '✅ pass' : '❌ fail'} |
| AA large text (24px, or 18.66px bold) | 3:1 | ${verdict.passes.aaLargeText ? '✅ pass' : '❌ fail'} |
| AAA body text | 7:1 | ${verdict.passes.aaaBodyText ? '✅ pass' : '❌ fail'} |
| AAA large text | 4.5:1 | ${verdict.passes.aaaLargeText ? '✅ pass' : '❌ fail'} |
| Non-text (1.4.11) | 3:1 | ${verdict.passes.aaNonText ? '✅ pass' : '❌ fail'} |

${verdict.grade === 'fail' ? `\n## What to use instead\n\n${(() => {
        const safe = safeForegroundsOn(background.replace(/^--sk-/, ''), th);
        return safe.length
          ? safe.slice(0, 5).map((s) => `- \`--sk-${s.token}\` (\`${s.value}\`) — ${s.ratio}`).join('\n')
          : 'Move the foreground two steps further from the background on its ramp, then re-check.';
      })()}` : ''}`);
    }
  );

  server.registerTool(
    'audit_theme',
    {
      title: 'Audit every declared contrast pairing',
      description:
        'Runs every contrast promise the design system makes against one theme or all four. This is the build gate — run it after any palette change. A pairing that is not declared here is not promised and must not be used to carry meaning.',
      inputSchema: {
        theme: themeEnum.optional().describe('One theme, or omit for all four.'),
        failuresOnly: z.boolean().optional().describe('Show only failures (default true when everything passes).'),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ theme, failuresOnly }) => {
      const themesToCheck = theme ? [theme as ThemeName] : THEMES;
      const rows = auditThemes(themesToCheck);
      const failures = rows.filter((r) => !r.pass);

      const perTheme = themesToCheck
        .map((t) => {
          const inTheme = rows.filter((r) => r.theme === t);
          const failed = inTheme.filter((r) => !r.pass).length;
          return `| ${t} | ${inTheme.length - failed}/${inTheme.length} | ${failed === 0 ? '✅ pass' : `❌ ${failed} failing`} |`;
        })
        .join('\n');

      let detail = '';
      if (failures.length > 0) {
        detail = `\n## Failures\n\n${failures
          .map(
            (f) =>
              `### [${f.theme}] \`${f.foreground}\` on \`${f.background}\`\n${f.foregroundValue} on ${f.backgroundValue} → **${f.display}** (needs ${f.use === 'body-text' ? '4.5:1' : '3:1'})\n\n${f.note}`
          )
          .join('\n\n')}`;
      } else if (failuresOnly === false) {
        detail = `\n## All pairings\n\n| Theme | Foreground | Background | Ratio | Use |\n|---|---|---|---|---|\n${rows
          .map((r) => `| ${r.theme} | \`${r.foreground}\` | \`${r.background}\` | ${r.display} | ${r.use} |`)
          .join('\n')}`;
      }

      const tightest = [...rows]
        .filter((r) => r.use === 'body-text')
        .sort((a, b) => a.ratio - b.ratio)
        .slice(0, 5);

      return text(`# Contrast audit

${rows.length} checks across ${themesToCheck.length} theme(s).

| Theme | Satisfied | Result |
|---|---|---|
${perTheme}

**${failures.length === 0 ? '✅ All declared pairings satisfied.' : `❌ ${failures.length} pairing(s) failing.`}**
${detail}

## Tightest text pairings (least headroom)
${tightest.map((r) => `- **${r.display}** [${r.theme}] \`${r.foreground}\` on \`${r.background}\``).join('\n')}

These are where a future palette edit will break first. Watch them.

---
Wire this into CI: \`npm run audit:contrast\` exits non-zero on any failure.`);
    }
  );

  server.registerTool(
    'validate_markup',
    {
      title: 'Lint markup against the specification',
      description:
        'Checks HTML or CSS for the accessibility and design-system failures that actually ship: missing accessible names, unlabelled inputs, hard-coded colours that break in dark mode, flex containers that will overflow, positive tabindex, removed focus outlines, and misused live regions. Advisory — a clean result is not a certificate of accessibility.',
      inputSchema: {
        markup: z.string().min(1).describe('HTML and/or CSS to check.'),
        componentId: z.string().optional().describe('Check against a specific component spec as well.'),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ markup, componentId }) => {
      const findings = validateMarkup(markup, componentId);
      if (findings.length === 0) {
        return text(`# No issues found\n\n${summariseFindings(findings)}`);
      }
      const icon = { error: '❌', warning: '⚠️', info: 'ℹ️' } as const;
      const body = findings
        .map(
          (f) =>
            `### ${icon[f.severity]} ${f.rule}\n${f.message}\n${f.snippet ? `\n\`\`\`\n${f.snippet}\n\`\`\`\n` : ''}\n**Fix:** ${f.fix}${f.wcag ? `\n\n**WCAG:** ${f.wcag}` : ''}`
        )
        .join('\n\n');
      return text(`# Validation: ${summariseFindings(findings)}\n\n${body}\n\n---\nAutomated checks catch roughly a third of real barriers. Keyboard and screen-reader testing is still required.`);
    }
  );

  /* ---------------- Setup ---------------- */

  server.registerTool(
    'get_setup',
    {
      title: 'Get the project setup',
      description:
        'Everything needed to start: the HTML scaffold, the pre-paint theme script (which must be inline and synchronous, or you get a flash of the wrong theme), the reset, the utility layer, the prose styles, and the theme control markup.',
      inputSchema: {
        part: z
          .enum(['all', 'scaffold', 'theme-script', 'reset', 'utilities', 'prose', 'theme-control'])
          .optional()
          .describe('Which part to return (default all).'),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ part }) => {
      const p = part ?? 'all';
      const parts: string[] = [];

      if (p === 'all' || p === 'scaffold') {
        parts.push(`## HTML scaffold

\`\`\`html
<!doctype html>
<html lang="en" data-sk-density="comfortable">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <!-- Never set user-scalable=no or maximum-scale — it fails WCAG 1.4.4 outright. -->
  <title>Projects · Sekura Workspace</title>

  <!-- 1. Theme script FIRST, inline and synchronous, before any stylesheet. -->
  ${themeScript.split('\n').slice(2).join('\n  ')}

  <!-- 2. Tokens, then reset, then components. -->
  <link rel="stylesheet" href="/sekura/tokens.css" />
  <link rel="stylesheet" href="/sekura/base.css" />
  <link rel="stylesheet" href="/sekura/components.css" />
</head>
<body class="sk-app-shell">
  <a class="sk-skip-link" href="#main">Skip to main content</a>

  <header class="sk-top-bar sk-top-bar--sticky"> ... </header>

  <div class="sk-app-shell__body">
    <nav class="sk-side-nav" aria-label="Primary"> ... </nav>
    <main class="sk-app-shell__main" id="main" tabindex="-1">
      <div class="sk-app-shell__content"> ... </div>
    </main>
  </div>

  <!-- Must exist at load, empty. Creating the region and its content together
       announces nothing. -->
  <div class="sk-toast-region" role="status" aria-live="polite" aria-label="Notifications"></div>
</body>
</html>
\`\`\``);
      }

      if (p === 'theme-script') parts.push(`## Theme script\n\n\`\`\`html\n${themeScript}\n\`\`\``);
      if (p === 'all' && parts.length === 1) parts.push(`## Theme script\n\n\`\`\`html\n${themeScript}\n\`\`\``);
      if (p === 'all' || p === 'reset') parts.push(`## Reset\n\n\`\`\`css\n${resetCss}\n\`\`\``);
      if (p === 'all' || p === 'utilities') parts.push(`## Utilities\n\n\`\`\`css\n${utilitiesCss}\n\`\`\``);
      if (p === 'all' || p === 'prose') parts.push(`## Prose\n\n\`\`\`css\n${proseCss}\n\`\`\``);
      if (p === 'all' || p === 'theme-control') parts.push(`## Theme control\n\n\`\`\`html\n${themeToggleHtml}\n\`\`\``);

      return text(`# Sekura setup

Order matters. The theme script must run **before first paint** — inline in
\`<head>\`, synchronous, before any stylesheet. Anything asynchronous is too late
and produces a flash of the wrong theme on every page load.

${parts.join('\n\n')}

---
Get the token stylesheet with \`export_tokens({ format: "css" })\`, and per-component CSS with \`get_component_code({ id, framework: "css" })\`.`);
    }
  );

  server.registerTool(
    'get_stylesheet',
    {
      title: 'Get the complete stylesheet',
      description:
        'The entire Sekura stylesheet as one file: tokens for all four themes and three densities, reset, prose, utilities, and every component. This is the single artefact needed to render any Sekura interface.',
      inputSchema: {
        include: z
          .array(z.enum(['tokens', 'reset', 'prose', 'utilities', 'components']))
          .optional()
          .describe('Layers to include (default all).'),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ include }) => {
      const want = new Set(include ?? ['tokens', 'reset', 'prose', 'utilities', 'components']);
      const chunks: string[] = [];

      if (want.has('tokens')) chunks.push(exportTokens('css'));
      if (want.has('reset')) chunks.push(resetCss);
      if (want.has('prose')) chunks.push(proseCss);
      if (want.has('utilities')) chunks.push(utilitiesCss);
      if (want.has('components')) {
        chunks.push('@layer sk-components {');
        for (const c of components) {
          chunks.push(`\n/* ===== ${c.name} (${c.id}) ===== */\n${c.css}`);
        }
        chunks.push('}');
      }

      const css = chunks.join('\n\n');
      const kb = (css.length / 1024).toFixed(1);

      return text(`# Sekura stylesheet

${want.size} layer(s), ${components.length} components, ~${kb} KB uncompressed.

Cascade layers are declared in order \`sk-reset, sk-base, sk-components, sk-utilities\`,
so application styles outside those layers always win without needing \`!important\`.

\`\`\`css
${css}
\`\`\``);
    }
  );

  /* ---------------- Resources ---------------- */

  server.registerResource(
    'tokens-css',
    'sekura://tokens/css',
    {
      title: 'Sekura tokens (CSS)',
      description: 'CSS custom properties for all four themes and three densities.',
      mimeType: 'text/css',
    },
    async (uri) => ({
      contents: [{ uri: uri.href, mimeType: 'text/css', text: exportTokens('css') }],
    })
  );

  server.registerResource(
    'tokens-dtcg',
    'sekura://tokens/dtcg',
    {
      title: 'Sekura tokens (W3C DTCG)',
      description: 'W3C Design Tokens Community Group JSON.',
      mimeType: 'application/json',
    },
    async (uri) => ({
      contents: [{ uri: uri.href, mimeType: 'application/json', text: exportTokens('dtcg') }],
    })
  );

  server.registerResource(
    'principles',
    'sekura://foundations/principles',
    {
      title: 'Sekura design principles',
      description: 'The seven decisions everything else follows from.',
      mimeType: 'text/markdown',
    },
    async (uri) => ({
      contents: [{ uri: uri.href, mimeType: 'text/markdown', text: formatFoundation('principles') }],
    })
  );

  server.registerResource(
    'dark-mode',
    'sekura://foundations/dark-mode',
    {
      title: 'Sekura dark mode guide',
      description: 'How dark mode differs from light, and the nine things that break silently.',
      mimeType: 'text/markdown',
    },
    async (uri) => ({
      contents: [{ uri: uri.href, mimeType: 'text/markdown', text: formatFoundation('dark-mode') }],
    })
  );

  /* ---------------- Prompts ---------------- */

  server.registerPrompt(
    'build-page',
    {
      title: 'Build a page with Sekura',
      description: 'Scaffold a page using the correct layout recipe, components and tokens.',
      argsSchema: {
        description: z.string().describe('What the page does, e.g. "a list of API keys with search and bulk revoke".'),
        layout: z.string().optional().describe(`Layout recipe id, if known: ${layouts.map((l) => l.id).join(', ')}.`),
      },
    },
    ({ description, layout }) => ({
      messages: [
        {
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: `Build this page with the Sekura Design System: ${description}

Work in this order:
1. \`get_overview\` if you have not already, to see what exists.
2. ${layout ? `\`get_layout({ id: "${layout}" })\`` : 'Pick a layout recipe with `get_layout` — list them via `get_overview`.'}
3. \`get_component\` for each component you will use, then \`get_component_code\` for the markup and CSS.
4. \`get_foundation({ id: "responsive-layout" })\` before writing any layout CSS.
5. \`validate_markup\` on the result before you finish.

Hard requirements:
- Semantic tokens only. No hex values, no primitive tokens, no arbitrary spacing.
- Flex-first: horizontal groups wrap, text-bearing flex children get \`min-inline-size: 0\`, widths are \`flex-basis\` not \`width\`.
- Must work in light and dark. Check the dark-mode note on every component you use.
- Every interactive element keyboard operable with a visible focus indicator.
- Loading, empty, error and no-access states all designed, not just the happy path.`,
          },
        },
      ],
    })
  );

  server.registerPrompt(
    'review-ui',
    {
      title: 'Review UI against Sekura',
      description: 'Audit existing markup for design-system and accessibility compliance.',
      argsSchema: {
        markup: z.string().describe('The HTML/CSS to review.'),
      },
    },
    ({ markup }) => ({
      messages: [
        {
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: `Review this against the Sekura Design System.

Run \`validate_markup\` on it first, then check by hand for the things a linter cannot see:

- **Dark mode.** Would every colour still work at \`data-sk-theme="dark"\`? Look specifically for shadow-only elevation with no border, borders that would be too bright, and any baked-in SVG fill.
- **Colour alone.** Is any status, selection or direction conveyed by colour with no icon, shape or text?
- **Keyboard.** Is every interactive element reachable, in a sensible order, with a visible focus ring?
- **Flex overflow.** Do horizontal groups wrap? Do text-bearing flex children have \`min-inline-size: 0\`?
- **States.** Are loading, empty and error states present, or only the happy path?
- **Copy.** Do errors say how to fix? Do buttons name their specific action?

Markup:

\`\`\`html
${markup}
\`\`\``,
          },
        },
      ],
    })
  );

  server.registerPrompt(
    'implement-dark-mode',
    {
      title: 'Add dark mode to existing UI',
      description: 'Convert an interface to support the Sekura dark theme correctly.',
      argsSchema: {
        target: z.string().describe('What to convert, e.g. "our settings page" or a path.'),
      },
    },
    ({ target }) => ({
      messages: [
        {
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: `Add proper dark mode support to: ${target}

Read \`get_foundation({ id: "dark-mode" })\` first — it lists the nine failures that pass a design review and break in production.

Then work through:
1. Replace every hard-coded colour with a semantic token. Use \`suggest_token\` when unsure which.
2. Set \`color-scheme\` on the root, or scrollbars and native controls stay light.
3. Add the pre-paint theme script from \`get_setup({ part: "theme-script" })\`. It must be inline and synchronous.
4. Check elevation: raised surfaces go *lighter* on dark, recessed go *darker*, and every elevated element keeps its border.
5. Check borders: they go *darker* on dark, not lighter.
6. Check every SVG data URI, autofill style, and illustration asset.
7. Run \`audit_theme\` and fix anything failing.
8. Offer three theme choices — System, Light, Dark — with System as the default.`,
          },
        },
      ],
    })
  );

  return server;
}
