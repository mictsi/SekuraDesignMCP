/**
 * Colour maths for the Sekura Design System.
 *
 * Implements WCAG 2.2 relative luminance / contrast ratio (the normative
 * algorithm from https://www.w3.org/TR/WCAG22/#dfn-contrast-ratio) plus a
 * lightweight APCA-style perceptual lightness estimate used only for
 * advisory ranking — never for pass/fail claims.
 */

export interface Rgb {
  r: number;
  g: number;
  b: number;
}

export interface Hsl {
  h: number;
  s: number;
  l: number;
}

const HEX_RE = /^#?([0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;

export function parseHex(input: string): Rgb & { a: number } {
  const raw = input.trim();
  const match = HEX_RE.exec(raw);
  if (!match) {
    throw new Error(
      `Invalid hex colour: "${input}". Expected #rgb, #rgba, #rrggbb or #rrggbbaa.`
    );
  }
  let hex = match[1]!;
  if (hex.length === 3 || hex.length === 4) {
    hex = hex
      .split('')
      .map((c) => c + c)
      .join('');
  }
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  const a = hex.length === 8 ? parseInt(hex.slice(6, 8), 16) / 255 : 1;
  return { r, g, b, a };
}

export function toHex({ r, g, b }: Rgb): string {
  const part = (n: number) =>
    Math.max(0, Math.min(255, Math.round(n)))
      .toString(16)
      .padStart(2, '0');
  return `#${part(r)}${part(g)}${part(b)}`;
}

/** sRGB channel -> linear-light value, per WCAG 2.2. */
function linearise(channel8bit: number): number {
  const c = channel8bit / 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

/** WCAG relative luminance, 0 (black) .. 1 (white). */
export function relativeLuminance(colour: string | Rgb): number {
  const { r, g, b } = typeof colour === 'string' ? parseHex(colour) : colour;
  return (
    0.2126 * linearise(r) + 0.7152 * linearise(g) + 0.0722 * linearise(b)
  );
}

/** WCAG 2.2 contrast ratio, 1..21. Order of arguments is irrelevant. */
export function contrastRatio(a: string | Rgb, b: string | Rgb): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const lighter = Math.max(la, lb);
  const darker = Math.min(la, lb);
  return (lighter + 0.05) / (darker + 0.05);
}

/** Composite a translucent foreground over an opaque backdrop. */
export function flatten(foreground: string, backdrop: string): string {
  const f = parseHex(foreground);
  const b = parseHex(backdrop);
  return toHex({
    r: f.r * f.a + b.r * (1 - f.a),
    g: f.g * f.a + b.g * (1 - f.a),
    b: f.b * f.a + b.b * (1 - f.a),
  });
}

export type ContrastUse =
  | 'body-text'
  | 'large-text'
  | 'ui-component'
  | 'decorative';

export interface ContrastVerdict {
  foreground: string;
  background: string;
  ratio: number;
  /** The rounded value humans quote, e.g. "7.13:1". */
  display: string;
  passes: {
    aaBodyText: boolean;
    aaLargeText: boolean;
    aaaBodyText: boolean;
    aaaLargeText: boolean;
    aaNonText: boolean;
  };
  /** Highest WCAG level satisfied for the stated use. */
  grade: 'AAA' | 'AA' | 'fail';
  use: ContrastUse;
  advice: string;
}

const THRESHOLDS = {
  aaBodyText: 4.5,
  aaLargeText: 3,
  aaaBodyText: 7,
  aaaLargeText: 4.5,
  aaNonText: 3,
} as const;

export function evaluateContrast(
  foreground: string,
  background: string,
  use: ContrastUse = 'body-text'
): ContrastVerdict {
  const bg = background;
  // A translucent foreground must be judged as rendered, not as authored.
  const fg = parseHex(foreground).a < 1 ? flatten(foreground, bg) : foreground;
  const ratio = contrastRatio(fg, bg);
  const passes = {
    aaBodyText: ratio >= THRESHOLDS.aaBodyText,
    aaLargeText: ratio >= THRESHOLDS.aaLargeText,
    aaaBodyText: ratio >= THRESHOLDS.aaaBodyText,
    aaaLargeText: ratio >= THRESHOLDS.aaaLargeText,
    aaNonText: ratio >= THRESHOLDS.aaNonText,
  };

  let grade: ContrastVerdict['grade'];
  let advice: string;

  switch (use) {
    case 'body-text':
      grade = passes.aaaBodyText ? 'AAA' : passes.aaBodyText ? 'AA' : 'fail';
      advice = passes.aaBodyText
        ? `Cleared for body copy at any size (needs ${THRESHOLDS.aaBodyText}:1).`
        : `Below the ${THRESHOLDS.aaBodyText}:1 minimum for body copy. Darken the foreground or lighten the background.`;
      break;
    case 'large-text':
      grade = passes.aaaLargeText ? 'AAA' : passes.aaLargeText ? 'AA' : 'fail';
      advice = passes.aaLargeText
        ? `Cleared for text at 24px+, or 18.66px+ when bold (needs ${THRESHOLDS.aaLargeText}:1).`
        : `Below the ${THRESHOLDS.aaLargeText}:1 minimum even for large text.`;
      break;
    case 'ui-component':
      grade = passes.aaNonText ? 'AA' : 'fail';
      advice = passes.aaNonText
        ? `Cleared for control boundaries, icons, focus rings and graphical objects (WCAG 1.4.11, needs ${THRESHOLDS.aaNonText}:1).`
        : `Below the ${THRESHOLDS.aaNonText}:1 minimum for non-text contrast (WCAG 1.4.11). Controls will be hard to locate.`;
      break;
    default:
      grade = 'AAA';
      advice =
        'Decorative only — WCAG imposes no contrast minimum, but do not carry meaning with this pairing alone.';
  }

  return {
    foreground,
    background: bg,
    ratio,
    display: `${ratio.toFixed(2)}:1`,
    passes,
    grade,
    use,
    advice,
  };
}

export function rgbToHsl(colour: string | Rgb): Hsl {
  const { r, g, b } = typeof colour === 'string' ? parseHex(colour) : colour;
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const delta = max - min;
  const l = (max + min) / 2;

  let h = 0;
  let s = 0;
  if (delta !== 0) {
    s = l > 0.5 ? delta / (2 - max - min) : delta / (max + min);
    if (max === rn) h = ((gn - bn) / delta + (gn < bn ? 6 : 0)) * 60;
    else if (max === gn) h = ((bn - rn) / delta + 2) * 60;
    else h = ((rn - gn) / delta + 4) * 60;
  }
  return { h: Math.round(h), s: Math.round(s * 100), l: Math.round(l * 100) };
}

/**
 * Find the first step in a ramp that clears `target` contrast against `background`.
 * Used by `suggest_token` to answer "which step do I need here?".
 */
export function pickStepForContrast(
  ramp: Record<string, string>,
  background: string,
  target: number
): { step: string; hex: string; ratio: number } | null {
  const candidates = Object.entries(ramp)
    .map(([step, hex]) => ({ step, hex, ratio: contrastRatio(hex, background) }))
    .filter((c) => c.ratio >= target)
    // Prefer the *lowest* contrast that still clears the bar: it keeps the
    // palette calm instead of defaulting everything to near-black/near-white.
    .sort((a, b) => a.ratio - b.ratio);
  return candidates[0] ?? null;
}
