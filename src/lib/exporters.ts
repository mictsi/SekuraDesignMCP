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
  layout,
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
import { legacyGeometryCss } from '../data/compatibility.js';
import { densityEntries, scaleEntries } from './token-registry.js';
import { parseColor } from './color.js';

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
  dtcg: 'DTCG 2025.10 JSON: palette/alpha, four semantic themes, spacing, radius, typography and durations. Fluid typography uses its minimum size with original CSS preserved in extensions; other CSS-only scales are not represented.',
  'tailwind-v4': 'Tailwind CSS v4 @theme inline block; utilities resolve tokens at the element, including nested theme roots.',
  'tailwind-v3': 'Tailwind CSS v3 JavaScript config object.',
  js: 'Plain ES module exporting a nested token object.',
  ts: 'TypeScript module with literal types, so token names are checked at compile time.',
  swift: 'UIKit token source: semantic colors (light/dark and increased contrast) and spacing at a 16-point rem baseline. No component or full typography parity; native compilation is consumer-verified.',
  android: 'Android resource sections: all semantic colors including alpha, light/dark modes and spacing at a 16-dp rem baseline. Split into the named files. High-contrast modes, components and native compilation are consumer-owned.',
  figma: 'Tokens Studio for Figma JSON, with one token set per theme.',
  json: 'Flat resolved key/value JSON for one theme. The simplest thing to consume programmatically.',
};

const PREFIX = 'sk';

function cssVar(name: string): string {
  return `--${PREFIX}-${name}`;
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
    for (const [name, value] of densityEntries(d)) lines.push(`  ${cssVar(name)}: ${value};`);
    lines.push('}');
    lines.push('');
  }

  lines.push(legacyGeometryCss());

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
  // A positive global duration creates transitions for default property:all,
  // including inherited visibility. Reduced motion must make focusability
  // changes immediate (for example returning from a drilldown submenu).
  lines.push('    transition-duration: 0ms !important;');
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
  $value?: unknown;
  $description?: string;
  [key: string]: unknown;
}

function dtcgColor(value: string): { colorSpace: 'srgb'; components: number[]; alpha: number } {
  const color = parseColor(value);
  return { colorSpace: 'srgb', components: [color.r / 255, color.g / 255, color.b / 255], alpha: color.a };
}

function dtcgDimension(value: string): { value: number; unit: 'px' | 'rem' } {
  if (value === '0') return { value: 0, unit: 'px' };
  const match = /^(-?[\d.]+)(px|rem)$/.exec(value);
  if (!match || !Number.isFinite(Number(match[1]))) throw new Error(`Cannot represent CSS dimension in DTCG: ${value}`);
  return { value: Number(match[1]), unit: match[2] as 'px' | 'rem' };
}

export function exportDtcg(): string {
  const root: Record<string, DtcgNode> = {};

  const palette: Record<string, DtcgNode> = {};
  for (const [rampName, rampValues] of Object.entries(ramps)) {
    const group: Record<string, DtcgNode> = {};
    for (const [step, hex] of Object.entries(rampValues)) {
      group[step] = { $type: 'color', $value: dtcgColor(hex) };
    }
    palette[rampName] = group;
  }
  palette.alpha = Object.fromEntries(Object.entries(alpha).map(([name, value]) => [name, { $type: 'color', $value: dtcgColor(value) }]));
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
        $value: isRef ? `{palette.${raw}}` : dtcgColor(resolvePrimitive(raw)),
        $description: token.description,
      };
    }
    root[`theme-${theme}`] = group;
  }

  const dimension: Record<string, DtcgNode> = {};
  for (const [k, v] of Object.entries(space)) dimension[`space-${k}`] = { $type: 'dimension', $value: dtcgDimension(v) };
  for (const [k, v] of Object.entries(radius)) dimension[`radius-${k}`] = { $type: 'dimension', $value: dtcgDimension(v) };
  root.dimension = dimension;

  const typography: Record<string, DtcgNode> = {};
  for (const [k, v] of Object.entries(typeScale)) {
    const minimum = /^clamp\(\s*([^,]+),/.exec(v.fontSize)?.[1]?.trim();
    const fontSize = dtcgDimension(minimum ?? v.fontSize);
    const trackingEm = /^(-?[\d.]+)em$/.exec(v.letterSpacing);
    const letterSpacing = trackingEm ? { value: Number(trackingEm[1]) * fontSize.value, unit: fontSize.unit } : dtcgDimension(v.letterSpacing);
    typography[k] = {
      $type: 'typography',
      $value: {
        fontFamily: (v.fontFamily === 'mono' ? fontFamily.mono! : fontFamily.sans!).split(',').map(family => family.trim().replace(/^['"]|['"]$/g, '')),
        fontSize,
        fontWeight: Number(v.fontWeight),
        lineHeight: Number(v.lineHeight),
        letterSpacing,
      },
      $description: `${v.description}${minimum ? ' DTCG uses the minimum of the CSS fluid size; restore the CSS expression for responsive web typography.' : ''}`,
      $extensions: { 'io.github.mictsi.sekura': { cssFontSize: v.fontSize, cssLetterSpacing: v.letterSpacing, projection: minimum ? 'fluid-minimum' : 'static' } },
    };
  }
  root.typography = typography;

  const durationGroup: Record<string, DtcgNode> = {};
  for (const [k, v] of Object.entries(duration)) durationGroup[k] = { $type: 'duration', $value: { value: parseFloat(v), unit: v.endsWith('ms') ? 'ms' : 's' } };
  root.duration = durationGroup;

  return JSON.stringify(
    {
      $description:
        'Sekura tokens in DTCG 2025.10 format. Coverage: palette including alpha, four semantic themes, spacing, radius, typography and durations. Fluid type is projected at its minimum and original CSS is preserved in extensions. Product code consumes a theme group, never the palette.',
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
    '@theme inline {',
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
  const uiColor = (value: string): string => {
    const { r, g, b, a } = parseColor(value);
    return `UIColor(red: ${r / 255}, green: ${g / 255}, blue: ${b / 255}, alpha: ${a})`;
  };
  const lines: string[] = [
    '// Sekura UIKit tokens (generated). Requires iOS 13+ dynamic UIColor.',
    '// All semantic colors, including alpha and increased-contrast variants.',
    '// Spacing assumes 1rem = 16pt. Components/typography are not exported.',
    '// This source has not been native-compiled by the web verification suite.',
    'import UIKit', '', 'public enum SekuraColor {',
  ];
  for (const token of semanticTokens) {
    lines.push(`    /// ${token.description}`);
    lines.push(`    public static let ${camel(token.name)} = UIColor { traits in`);
    lines.push('        if traits.accessibilityContrast == .high {');
    lines.push(`            return traits.userInterfaceStyle == .dark ? ${uiColor(resolvePrimitive(token.values['hc-dark']))} : ${uiColor(resolvePrimitive(token.values['hc-light']))}`);
    lines.push('        }');
    lines.push(`        return traits.userInterfaceStyle == .dark ? ${uiColor(resolvePrimitive(token.values.dark))} : ${uiColor(resolvePrimitive(token.values.light))}`);
    lines.push('    }', '');
  }
  lines.push('}', '', 'public enum SekuraSpace {');
  for (const [key, value] of Object.entries(space)) lines.push(`    public static let space${key}: CGFloat = ${parseFloat(value) * (value.endsWith('rem') ? 16 : 1)}`);
  lines.push('}');
  return lines.join('\n');
}

export function exportAndroid(): string {
  const argb = (value: string): string => {
    const { r, g, b, a } = parseColor(value);
    return `#${[a * 255, r, g, b].map(channel => Math.round(channel).toString(16).padStart(2, '0')).join('')}`;
  };
  const files: string[] = [
    '<!-- Split each section into the named resource file. -->',
    '<!-- Semantic colors include alpha. Modes: light and dark only. -->',
    '<!-- Spacing assumes 1rem = 16dp. Native compilation, high-contrast modes -->',
    '<!-- and component/typography parity remain consumer responsibilities. -->',
  ];
  for (const [theme, directory] of [['light', 'values'], ['dark', 'values-night']] as const) {
    files.push(`<!-- ===== res/${directory}/colors.xml ===== -->`, '<?xml version="1.0" encoding="utf-8"?>', '<resources>');
    for (const token of semanticTokens) files.push(`    <color name="sk_${token.name.replace(/-/g, '_')}">${argb(resolvePrimitive(token.values[theme]))}</color>`);
    files.push('</resources>', '');
  }
  files.push('<!-- ===== res/values/dimens.xml ===== -->', '<?xml version="1.0" encoding="utf-8"?>', '<resources>');
  for (const [key, value] of Object.entries(space)) files.push(`    <dimen name="sk_space_${key}">${parseFloat(value) * (value.endsWith('rem') ? 16 : 1)}dp</dimen>`);
  files.push('</resources>');
  return files.join('\n');
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
  palette.alpha = Object.fromEntries(Object.entries(alpha).map(([name, value]) => [name, { value, type: 'color' }]));
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
