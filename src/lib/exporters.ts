/**
 * Token exporters.
 *
 * One source of truth (`src/data/primitives.ts` + `src/data/semantic.ts`) produces
 * every downstream artefact. Nothing here re-states a value; everything is derived,
 * so a primitive edit propagates to CSS, Tailwind, iOS and Android in one step.
 */

import {
  alpha,
  borderWidth,
  breakpoints,
  containerWidth,
  densities,
  duration,
  easing,
  elevation,
  focusRing,
  fontFamily,
  fontWeight,
  opacity,
  radius,
  ramps,
  space,
  typeScale,
  zIndex,
} from '../data/primitives.js';
import {
  resolvePrimitive,
  semanticTokens,
  THEMES,
  themeInfo,
  type ThemeName,
} from '../data/tokens.js';

export const EXPORT_FORMATS = [
  'css',
  'scss',
  'dtcg',
  'tailwind-v4',
  'tailwind-v3',
  'js',
  'ts',
  'swift',
  'android',
  'figma',
  'json',
] as const;
export type ExportFormat = (typeof EXPORT_FORMATS)[number];

export const formatDescriptions: Record<ExportFormat, string> = {
  css: 'CSS custom properties for every theme and density. The canonical runtime artefact — everything else is generated for tooling that cannot consume CSS.',
  scss: 'Sass variables plus theme mixins, for pipelines that still compile Sass.',
  dtcg: 'W3C Design Tokens Community Group JSON. The interchange format for design tools and token pipelines.',
  'tailwind-v4': 'Tailwind CSS v4 @theme block mapping tokens to utility namespaces.',
  'tailwind-v3': 'Tailwind CSS v3 JavaScript config object.',
  js: 'Plain ES module exporting a nested token object.',
  ts: 'TypeScript module with literal types, so token names are checked at compile time.',
  swift: 'Swift extension with UIColor values resolved per theme, for iOS.',
  android: 'Android colors.xml plus dimens.xml, with a values-night variant for dark.',
  figma: 'Tokens Studio for Figma JSON, with one token set per theme.',
  json: 'Flat resolved key/value JSON for one theme. The simplest thing to consume programmatically.',
};

const PREFIX = 'sk';

function cssVar(name: string): string {
  return `--${PREFIX}-${name}`;
}

/* ------------------------------------------------------------------ *
 * Non-colour token emission, shared by several exporters
 * ------------------------------------------------------------------ */

function scaleEntries(): Array<[string, string]> {
  const out: Array<[string, string]> = [];
  for (const [k, v] of Object.entries(space)) out.push([`space-${k}`, v]);
  for (const [k, v] of Object.entries(radius)) out.push([`radius-${k}`, v]);
  for (const [k, v] of Object.entries(borderWidth)) out.push([`border-width-${k}`, v]);
  for (const [k, v] of Object.entries(opacity)) out.push([`opacity-${k}`, v]);
  for (const [k, v] of Object.entries(zIndex)) out.push([`z-${k}`, v]);
  for (const [k, v] of Object.entries(duration)) out.push([`duration-${k}`, v]);
  for (const [k, v] of Object.entries(easing)) out.push([`easing-${k}`, v]);
  for (const [k, v] of Object.entries(fontFamily)) out.push([`font-family-${k}`, v]);
  for (const [k, v] of Object.entries(fontWeight)) out.push([`font-weight-${k}`, v]);
  for (const [k, v] of Object.entries(containerWidth)) out.push([`container-${k}`, v]);
  for (const [k, v] of Object.entries(typeScale)) {
    out.push([`font-size-${k}`, v.fontSize]);
    out.push([`line-height-${k}`, v.lineHeight]);
    out.push([`font-weight-${k}`, v.fontWeight]);
    out.push([`letter-spacing-${k}`, v.letterSpacing]);
  }
  out.push(['focus-ring-width', focusRing.width!]);
  out.push(['focus-ring-offset', focusRing.offset!]);
  for (const [k, v] of Object.entries(breakpoints)) out.push([`breakpoint-${k}`, v.min]);
  return out;
}

/* ------------------------------------------------------------------ *
 * CSS
 * ------------------------------------------------------------------ */

export function exportCss(): string {
  const lines: string[] = [];

  lines.push('/*');
  lines.push(' * Sekura Design System — design tokens');
  lines.push(' * Generated. Do not edit by hand; edit the token source and re-export.');
  lines.push(' *');
  lines.push(' * Product code consumes ONLY the semantic layer (--sk-color-*, --sk-space-*, …).');
  lines.push(' * Primitive values (--sk-palette-*) are published for reference and for building');
  lines.push(' * new semantic tokens — never reference them from a component.');
  lines.push(' */');
  lines.push('');

  // Primitives, published for reference.
  lines.push(':root {');
  lines.push('  /* --- Primitive palette (reference only) --- */');
  for (const [rampName, rampValues] of Object.entries(ramps)) {
    for (const [step, hex] of Object.entries(rampValues)) {
      lines.push(`  ${cssVar(`palette-${rampName}-${step}`)}: ${hex};`);
    }
  }
  for (const [k, v] of Object.entries(alpha)) {
    lines.push(`  ${cssVar(`palette-alpha-${k}`)}: ${v};`);
  }
  lines.push('');
  lines.push('  /* --- Dimensional scales (theme-independent) --- */');
  for (const [name, value] of scaleEntries()) {
    lines.push(`  ${cssVar(name)}: ${value};`);
  }
  lines.push('}');
  lines.push('');

  // Density.
  lines.push('/* --- Density -------------------------------------------------------');
  lines.push('   Density changes control size only. It never reduces a hit target below');
  lines.push('   24x24 CSS px (WCAG 2.2 SC 2.5.8) nor text below body-sm.');
  lines.push('   ------------------------------------------------------------------- */');
  for (const [name, d] of Object.entries(densities)) {
    const selector =
      name === 'comfortable'
        ? ':root, [data-sk-density="comfortable"]'
        : `[data-sk-density="${name}"]`;
    lines.push(`${selector} {`);
    lines.push(`  /* ${d.description} */`);
    lines.push(`  ${cssVar('control-height-sm')}: ${d.controlHeightSm};`);
    lines.push(`  ${cssVar('control-height-md')}: ${d.controlHeightMd};`);
    lines.push(`  ${cssVar('control-height-lg')}: ${d.controlHeightLg};`);
    lines.push(`  ${cssVar('control-padding-inline')}: ${d.controlPaddingInline};`);
    lines.push(`  ${cssVar('control-padding-block')}: ${d.controlPaddingBlock};`);
    lines.push(`  ${cssVar('row-padding-block')}: ${d.rowPaddingBlock};`);
    lines.push(`  ${cssVar('stack-gap')}: ${d.stackGap};`);
    lines.push(`  ${cssVar('section-gap')}: ${d.sectionGap};`);
    lines.push('}');
    lines.push('');
  }

  // Themes.
  lines.push('/* --- Themes --------------------------------------------------------');
  lines.push('   Every semantic token is defined in all four themes. Dark is a peer of');
  lines.push('   light, not an inversion: floating surfaces get LIGHTER as they rise,');
  lines.push('   and saturated hues step UP the ramp rather than down.');
  lines.push('   ------------------------------------------------------------------- */');
  for (const theme of THEMES) {
    const info = themeInfo[theme];
    lines.push(`${info.selector} {`);
    lines.push(`  color-scheme: ${info.colorScheme};`);
    let currentGroup = '';
    for (const token of semanticTokens) {
      if (token.group !== currentGroup) {
        currentGroup = token.group;
        lines.push(`  /* ${currentGroup} */`);
      }
      lines.push(`  ${cssVar(token.name)}: ${resolvePrimitive(token.values[theme])};`);
    }
    // Elevation is theme-dependent because a drop shadow is nearly invisible on dark.
    lines.push('  /* elevation */');
    for (const [level, spec] of Object.entries(elevation)) {
      const isDark = theme === 'dark' || theme === 'hc-dark';
      lines.push(`  ${cssVar(`elevation-${level}`)}: ${isDark ? spec.dark : spec.light};`);
    }
    lines.push('}');
    lines.push('');
  }

  // System preference bindings.
  lines.push('/* --- Automatic theme selection -------------------------------------');
  lines.push('   Applies when the page has not pinned a theme with data-sk-theme.');
  lines.push('   A theme explicitly chosen by the user always wins.');
  lines.push('   ------------------------------------------------------------------- */');
  lines.push('@media (prefers-color-scheme: dark) {');
  lines.push('  :root:not([data-sk-theme]) {');
  lines.push('    color-scheme: dark;');
  for (const token of semanticTokens) {
    lines.push(`    ${cssVar(token.name)}: ${resolvePrimitive(token.values.dark)};`);
  }
  for (const [level, spec] of Object.entries(elevation)) {
    lines.push(`    ${cssVar(`elevation-${level}`)}: ${spec.dark};`);
  }
  lines.push('  }');
  lines.push('}');
  lines.push('');
  lines.push('@media (prefers-contrast: more) {');
  lines.push('  :root:not([data-sk-theme]) {');
  for (const token of semanticTokens) {
    lines.push(`    ${cssVar(token.name)}: ${resolvePrimitive(token.values['hc-light'])};`);
  }
  lines.push('  }');
  lines.push('}');
  lines.push('');
  lines.push('@media (prefers-contrast: more) and (prefers-color-scheme: dark) {');
  lines.push('  :root:not([data-sk-theme]) {');
  for (const token of semanticTokens) {
    lines.push(`    ${cssVar(token.name)}: ${resolvePrimitive(token.values['hc-dark'])};`);
  }
  lines.push('  }');
  lines.push('}');
  lines.push('');
  lines.push('/* Users who ask for less motion get it globally, not per component. */');
  lines.push('@media (prefers-reduced-motion: reduce) {');
  lines.push('  :root {');
  for (const key of Object.keys(duration)) {
    lines.push(`    ${cssVar(`duration-${key}`)}: 0ms;`);
  }
  lines.push('  }');
  lines.push('  *, *::before, *::after {');
  lines.push('    animation-duration: 0.01ms !important;');
  lines.push('    animation-iteration-count: 1 !important;');
  lines.push('    transition-duration: 0.01ms !important;');
  lines.push('    scroll-behavior: auto !important;');
  lines.push('  }');
  lines.push('}');

  return lines.join('\n');
}

/* ------------------------------------------------------------------ *
 * SCSS
 * ------------------------------------------------------------------ */

export function exportScss(): string {
  const lines: string[] = ['// Sekura Design System — Sass tokens (generated)', ''];
  for (const [rampName, rampValues] of Object.entries(ramps)) {
    lines.push(`// ${rampName}`);
    for (const [step, hex] of Object.entries(rampValues)) {
      lines.push(`$${PREFIX}-${rampName}-${step}: ${hex};`);
    }
    lines.push('');
  }
  for (const [name, value] of scaleEntries()) {
    lines.push(`$${PREFIX}-${name}: ${value};`);
  }
  lines.push('');
  for (const theme of THEMES) {
    lines.push(`@mixin ${PREFIX}-theme-${theme.replace('-', '')} {`);
    lines.push(`  color-scheme: ${themeInfo[theme].colorScheme};`);
    for (const token of semanticTokens) {
      lines.push(`  ${cssVar(token.name)}: ${resolvePrimitive(token.values[theme])};`);
    }
    lines.push('}');
    lines.push('');
  }
  return lines.join('\n');
}

/* ------------------------------------------------------------------ *
 * W3C Design Tokens (DTCG)
 * ------------------------------------------------------------------ */

interface DtcgNode {
  $type?: string;
  $value?: string;
  $description?: string;
  [key: string]: unknown;
}

export function exportDtcg(): string {
  const root: Record<string, DtcgNode> = {};

  const palette: Record<string, DtcgNode> = {};
  for (const [rampName, rampValues] of Object.entries(ramps)) {
    const group: Record<string, DtcgNode> = {};
    for (const [step, hex] of Object.entries(rampValues)) {
      group[step] = { $type: 'color', $value: hex };
    }
    palette[rampName] = group;
  }
  root.palette = palette;

  // One group per theme, with references into the palette so the relationship
  // survives the round trip into design tools.
  for (const theme of THEMES) {
    const group: Record<string, DtcgNode> = {};
    for (const token of semanticTokens) {
      const raw = token.values[theme];
      const isRef = raw.includes('.') && !raw.startsWith('#') && !raw.startsWith('rgb');
      group[token.name] = {
        $type: 'color',
        $value: isRef ? `{palette.${raw.replace('.', '.')}}` : resolvePrimitive(raw),
        $description: token.description,
      };
    }
    root[`theme-${theme}`] = group;
  }

  const dimension: Record<string, DtcgNode> = {};
  for (const [k, v] of Object.entries(space)) dimension[`space-${k}`] = { $type: 'dimension', $value: v };
  for (const [k, v] of Object.entries(radius)) dimension[`radius-${k}`] = { $type: 'dimension', $value: v };
  root.dimension = dimension;

  const typography: Record<string, DtcgNode> = {};
  for (const [k, v] of Object.entries(typeScale)) {
    typography[k] = {
      $type: 'typography',
      $value: {
        fontFamily: v.fontFamily === 'mono' ? fontFamily.mono : fontFamily.sans,
        fontSize: v.fontSize,
        fontWeight: v.fontWeight,
        lineHeight: v.lineHeight,
        letterSpacing: v.letterSpacing,
      } as unknown as string,
      $description: v.description,
    };
  }
  root.typography = typography;

  const durationGroup: Record<string, DtcgNode> = {};
  for (const [k, v] of Object.entries(duration)) durationGroup[k] = { $type: 'duration', $value: v };
  root.duration = durationGroup;

  return JSON.stringify(
    {
      $description:
        'Sekura Design System tokens in W3C Design Tokens Community Group format. Semantic groups are provided per theme; product code should consume a theme group, never the palette.',
      ...root,
    },
    null,
    2
  );
}

/* ------------------------------------------------------------------ *
 * Tailwind
 * ------------------------------------------------------------------ */

export function exportTailwindV4(): string {
  const lines: string[] = [
    '/* Sekura Design System — Tailwind CSS v4 theme (generated) */',
    '/* Import the Sekura tokens stylesheet first; these map onto its custom */',
    '/* properties, so switching data-sk-theme also switches every utility.   */',
    '',
    '@theme {',
  ];
  for (const token of semanticTokens) {
    if (!token.name.startsWith('color-')) continue;
    const utility = token.name.replace(/^color-/, '');
    lines.push(`  --color-${utility}: var(${cssVar(token.name)});`);
  }
  for (const [k, v] of Object.entries(space)) lines.push(`  --spacing-${k}: ${v};`);
  for (const [k, v] of Object.entries(radius)) lines.push(`  --radius-${k}: ${v};`);
  for (const [k, v] of Object.entries(typeScale)) lines.push(`  --text-${k}: ${v.fontSize};`);
  for (const [k, v] of Object.entries(breakpoints)) lines.push(`  --breakpoint-${k}: ${v.min};`);
  lines.push(`  --font-sans: ${fontFamily.sans};`);
  lines.push(`  --font-mono: ${fontFamily.mono};`);
  lines.push('}');
  return lines.join('\n');
}

export function exportTailwindV3(): string {
  const colors: Record<string, string> = {};
  for (const token of semanticTokens) {
    if (!token.name.startsWith('color-')) continue;
    colors[token.name.replace(/^color-/, '')] = `var(${cssVar(token.name)})`;
  }
  const spacing: Record<string, string> = {};
  for (const [k, v] of Object.entries(space)) spacing[k] = v;
  const borderRadius: Record<string, string> = { ...radius };
  const fontSize: Record<string, [string, Record<string, string>]> = {};
  for (const [k, v] of Object.entries(typeScale)) {
    fontSize[k] = [v.fontSize, { lineHeight: v.lineHeight, letterSpacing: v.letterSpacing, fontWeight: v.fontWeight }];
  }
  const screens: Record<string, string> = {};
  for (const [k, v] of Object.entries(breakpoints)) if (v.px > 0) screens[k] = v.min;

  const config = {
    darkMode: ['class', '[data-sk-theme="dark"]'],
    theme: {
      extend: {
        colors,
        spacing,
        borderRadius,
        fontSize,
        screens,
        fontFamily: { sans: [fontFamily.sans], mono: [fontFamily.mono] },
        zIndex,
        transitionDuration: duration,
        transitionTimingFunction: easing,
      },
    },
  };

  return `/** Sekura Design System — Tailwind CSS v3 config (generated).
 *  Colours resolve to CSS custom properties, so a theme switch is a single
 *  attribute change with no Tailwind rebuild.
 */
module.exports = ${JSON.stringify(config, null, 2)};
`;
}

/* ------------------------------------------------------------------ *
 * JS / TS
 * ------------------------------------------------------------------ */

function tokenObject(): Record<string, unknown> {
  const themes: Record<string, Record<string, string>> = {};
  for (const theme of THEMES) {
    const t: Record<string, string> = {};
    for (const token of semanticTokens) t[token.name] = resolvePrimitive(token.values[theme]);
    themes[theme] = t;
  }
  return {
    palette: ramps,
    alpha,
    themes,
    space,
    radius,
    borderWidth,
    opacity,
    zIndex,
    duration,
    easing,
    fontFamily,
    fontWeight,
    typeScale,
    breakpoints,
    containerWidth,
    densities,
    elevation,
  };
}

export function exportJs(): string {
  return `// Sekura Design System tokens (generated)\nexport const tokens = ${JSON.stringify(tokenObject(), null, 2)};\n\nexport default tokens;\n`;
}

export function exportTs(): string {
  const names = semanticTokens.map((t) => `  | '${t.name}'`).join('\n');
  return `// Sekura Design System tokens (generated)

/** Every semantic token name, so a typo becomes a compile error. */
export type SekuraTokenName =
${names};

export type SekuraTheme = ${THEMES.map((t) => `'${t}'`).join(' | ')};

export const tokens = ${JSON.stringify(tokenObject(), null, 2)} as const;

/** Resolve a semantic token to its CSS custom property reference. */
export function token(name: SekuraTokenName): string {
  return \`var(--sk-\${name})\`;
}

export default tokens;
`;
}

/* ------------------------------------------------------------------ *
 * Native platforms
 * ------------------------------------------------------------------ */

function camel(name: string): string {
  return name.replace(/-([a-z0-9])/g, (_, c: string) => c.toUpperCase());
}

export function exportSwift(): string {
  const lines: string[] = [
    '// Sekura Design System — iOS colours (generated)',
    '//',
    '// Each token resolves at runtime from the trait collection, so a system',
    '// appearance change re-resolves every colour without any manual work.',
    '',
    'import UIKit',
    '',
    'public enum SekuraColor {',
  ];
  for (const token of semanticTokens) {
    const light = resolvePrimitive(token.values.light);
    const dark = resolvePrimitive(token.values.dark);
    if (!light.startsWith('#') || !dark.startsWith('#')) continue;
    lines.push(`    /// ${token.description}`);
    lines.push(`    public static let ${camel(token.name)} = UIColor { traits in`);
    lines.push(`        traits.userInterfaceStyle == .dark`);
    lines.push(`            ? UIColor(hex: "${dark}")`);
    lines.push(`            : UIColor(hex: "${light}")`);
    lines.push('    }');
    lines.push('');
  }
  lines.push('}');
  lines.push('');
  lines.push('public enum SekuraSpace {');
  for (const [k, v] of Object.entries(space)) {
    const pt = parseFloat(v) * (v.endsWith('rem') ? 16 : 1);
    lines.push(`    public static let space${k}: CGFloat = ${pt}`);
  }
  lines.push('}');
  return lines.join('\n');
}

export function exportAndroid(): string {
  const light: string[] = [
    '<?xml version="1.0" encoding="utf-8"?>',
    '<!-- Sekura Design System — res/values/colors.xml (generated) -->',
    '<resources>',
  ];
  const dark: string[] = [
    '<?xml version="1.0" encoding="utf-8"?>',
    '<!-- Sekura Design System — res/values-night/colors.xml (generated) -->',
    '<resources>',
  ];
  const snake = (n: string) => n.replace(/-/g, '_');
  for (const token of semanticTokens) {
    const l = resolvePrimitive(token.values.light);
    const d = resolvePrimitive(token.values.dark);
    if (!l.startsWith('#') || !d.startsWith('#')) continue;
    light.push(`    <color name="sk_${snake(token.name)}">${l}</color>`);
    dark.push(`    <color name="sk_${snake(token.name)}">${d}</color>`);
  }
  light.push('</resources>');
  dark.push('</resources>');

  const dimens: string[] = [
    '<?xml version="1.0" encoding="utf-8"?>',
    '<!-- Sekura Design System — res/values/dimens.xml (generated) -->',
    '<resources>',
  ];
  for (const [k, v] of Object.entries(space)) {
    const dp = parseFloat(v) * (v.endsWith('rem') ? 16 : 1);
    dimens.push(`    <dimen name="sk_space_${k}">${dp}dp</dimen>`);
  }
  dimens.push('</resources>');

  return [
    '<!-- ===== res/values/colors.xml ===== -->',
    light.join('\n'),
    '',
    '<!-- ===== res/values-night/colors.xml ===== -->',
    dark.join('\n'),
    '',
    '<!-- ===== res/values/dimens.xml ===== -->',
    dimens.join('\n'),
  ].join('\n');
}

export function exportFigma(): string {
  const sets: Record<string, unknown> = {};

  const palette: Record<string, unknown> = {};
  for (const [rampName, rampValues] of Object.entries(ramps)) {
    const group: Record<string, unknown> = {};
    for (const [step, hex] of Object.entries(rampValues)) {
      group[step] = { value: hex, type: 'color' };
    }
    palette[rampName] = group;
  }
  sets.palette = palette;

  for (const theme of THEMES) {
    const group: Record<string, unknown> = {};
    for (const token of semanticTokens) {
      const raw = token.values[theme];
      const isRef = raw.includes('.') && !raw.startsWith('#') && !raw.startsWith('rgb');
      group[token.name] = {
        value: isRef ? `{palette.${raw}}` : resolvePrimitive(raw),
        type: 'color',
        description: token.description,
      };
    }
    sets[theme] = group;
  }

  const spacingSet: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(space)) spacingSet[k] = { value: v, type: 'spacing' };
  sets.spacing = spacingSet;

  sets.$themes = THEMES.map((theme) => ({
    id: theme,
    name: themeInfo[theme].label,
    selectedTokenSets: { palette: 'source', [theme]: 'enabled', spacing: 'enabled' },
  }));

  return JSON.stringify(sets, null, 2);
}

export function exportJson(theme: ThemeName = 'light'): string {
  const out: Record<string, string> = {};
  for (const token of semanticTokens) out[token.name] = resolvePrimitive(token.values[theme]);
  for (const [name, value] of scaleEntries()) out[name] = value;
  return JSON.stringify(out, null, 2);
}

/* ------------------------------------------------------------------ *
 * Dispatch
 * ------------------------------------------------------------------ */

export function exportTokens(format: ExportFormat, theme: ThemeName = 'light'): string {
  switch (format) {
    case 'css': return exportCss();
    case 'scss': return exportScss();
    case 'dtcg': return exportDtcg();
    case 'tailwind-v4': return exportTailwindV4();
    case 'tailwind-v3': return exportTailwindV3();
    case 'js': return exportJs();
    case 'ts': return exportTs();
    case 'swift': return exportSwift();
    case 'android': return exportAndroid();
    case 'figma': return exportFigma();
    case 'json': return exportJson(theme);
    default: {
      const exhaustive: never = format;
      throw new Error(`Unknown export format: ${String(exhaustive)}`);
    }
  }
}
