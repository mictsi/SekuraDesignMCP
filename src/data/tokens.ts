/**
 * Token model assembly: resolves the semantic layer against the primitive layer and
 * exposes lookup helpers used by every tool in the server.
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
} from './primitives.js';
import {
  contrastRequirements,
  semanticTokens,
  THEMES,
  themeInfo,
  type SemanticToken,
  type ThemeName,
} from './semantic.js';
import { evaluateContrast, flatten, type ContrastVerdict } from '../lib/color.js';

export const TOKEN_PREFIX = 'sk';

/** Resolve a primitive reference such as "cobalt.600" or "alpha.black-8" to a CSS value. */
export function resolvePrimitive(ref: string): string {
  if (!ref.includes('.')) return ref; // literal: "transparent", "#fff", "0"
  const dot = ref.indexOf('.');
  const family = ref.slice(0, dot);
  const step = ref.slice(dot + 1);

  if (family === 'alpha') {
    const value = alpha[step];
    if (!value) throw new Error(`Unknown alpha primitive: ${ref}`);
    return value;
  }
  const ramp = ramps[family];
  if (!ramp) return ref; // not a reference after all (e.g. a bare hex)
  const value = ramp[step];
  if (!value) {
    throw new Error(
      `Unknown primitive: ${ref}. "${family}" has steps: ${Object.keys(ramp).join(', ')}`
    );
  }
  return value;
}

export function resolveToken(token: SemanticToken, theme: ThemeName): string {
  return resolvePrimitive(token.values[theme]);
}

const tokenIndex = new Map<string, SemanticToken>(
  semanticTokens.map((tk) => [tk.name, tk])
);

export function getToken(name: string): SemanticToken | undefined {
  return tokenIndex.get(name) ?? tokenIndex.get(name.replace(/^--sk-/, ''));
}

export function tokenGroups(): string[] {
  return [...new Set(semanticTokens.map((tk) => tk.group))];
}

export function tokensInGroup(group: string): SemanticToken[] {
  return semanticTokens.filter((tk) => tk.group === group);
}

/** The full resolved colour map for one theme: token name -> CSS value. */
export function resolvedTheme(theme: ThemeName): Record<string, string> {
  const out: Record<string, string> = {};
  for (const tk of semanticTokens) out[tk.name] = resolveToken(tk, theme);
  return out;
}

/**
 * Resolve a token to an *opaque* hex so contrast can be measured. Translucent tokens
 * are composited over the theme's base surface, which is how they actually render.
 */
export function opaqueValue(tokenName: string, theme: ThemeName): string | null {
  const tk = getToken(tokenName);
  if (!tk) return null;
  const raw = resolveToken(tk, theme);
  if (raw === 'transparent') {
    const base = getToken('color-surface-base');
    return base ? resolveToken(base, theme) : null;
  }
  if (raw.startsWith('#')) return raw;

  // rgb(r g b / p%) — composite over the theme base surface.
  const m = /^rgb\(\s*(\d+)\s+(\d+)\s+(\d+)\s*\/\s*([\d.]+)%\s*\)$/.exec(raw);
  if (m) {
    const base = getToken('color-surface-base');
    if (!base) return null;
    const backdrop = resolveToken(base, theme);
    const toHex2 = (n: number) => n.toString(16).padStart(2, '0');
    const a = Math.round((parseFloat(m[4]!) / 100) * 255);
    const hex8 = `#${toHex2(+m[1]!)}${toHex2(+m[2]!)}${toHex2(+m[3]!)}${toHex2(a)}`;
    return flatten(hex8, backdrop);
  }
  return null;
}

export interface AuditRow {
  theme: ThemeName;
  foreground: string;
  background: string;
  foregroundValue: string;
  backgroundValue: string;
  use: ContrastVerdict['use'];
  ratio: number;
  display: string;
  grade: ContrastVerdict['grade'];
  pass: boolean;
  note: string;
}

/** Run every declared contrast promise against one theme, or all themes. */
export function auditThemes(themes: readonly ThemeName[] = THEMES): AuditRow[] {
  const rows: AuditRow[] = [];
  for (const theme of themes) {
    for (const req of contrastRequirements) {
      const fg = opaqueValue(req.foreground, theme);
      const bg = opaqueValue(req.background, theme);
      if (!fg || !bg) {
        throw new Error(
          `Contrast requirement references an unknown token: ${req.foreground} on ${req.background}`
        );
      }
      const verdict = evaluateContrast(fg, bg, req.use);
      rows.push({
        theme,
        foreground: req.foreground,
        background: req.background,
        foregroundValue: fg,
        backgroundValue: bg,
        use: req.use,
        ratio: verdict.ratio,
        display: verdict.display,
        grade: verdict.grade,
        pass: verdict.grade !== 'fail',
        note: req.note,
      });
    }
  }
  return rows;
}

/** Non-colour token groups, exposed through the same lookup surface as colour. */
export const scales = {
  space,
  radius,
  borderWidth,
  opacity,
  zIndex,
  duration,
  easing,
  fontFamily,
  fontWeight,
  containerWidth,
} as const;

export type ScaleName = keyof typeof scales;

export {
  breakpoints,
  contrastRequirements,
  densities,
  elevation,
  focusRing,
  semanticTokens,
  THEMES,
  themeInfo,
  typeScale,
  ramps,
};
export type { SemanticToken, ThemeName };
