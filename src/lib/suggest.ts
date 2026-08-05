/**
 * Natural-language token suggestion.
 *
 * Maps an intent described in words ("a subtle border on a card in dark mode")
 * onto the semantic tokens that actually apply, with the resolved value per theme
 * and a note on why that token rather than a neighbour.
 */

import { contrastRatio } from './color.js';
import {
  opaqueValue,
  resolvePrimitive,
  semanticTokens,
  THEMES,
  type ThemeName,
} from '../data/tokens.js';

export interface Suggestion {
  token: string;
  cssVar: string;
  description: string;
  values: Record<ThemeName, string>;
  why: string;
  score: number;
}

/** Intent keywords mapped to the token groups and name fragments they imply. */
const INTENT_MAP: Array<{
  match: RegExp;
  fragments: string[];
  why: string;
}> = [
  { match: /\b(page|body|backdrop|background of the page)\b/, fragments: ['surface-base'], why: 'The page itself. Everything else sits on this.' },
  { match: /\b(card|panel|raised|elevated)\b/, fragments: ['surface-raised', 'border-default', 'elevation'], why: 'Cards are raised surfaces: lighter than the page in dark mode, with a border that does the separating work where the shadow cannot.' },
  { match: /\b(menu|dropdown|dialog|modal|popover|overlay|floating|toast)\b/, fragments: ['surface-overlay', 'border-default'], why: 'Floating surfaces use surface-overlay, which is lighter still in dark mode.' },
  { match: /\b(sunken|recessed|well|code block|drop zone)\b/, fragments: ['surface-sunken'], why: 'Recessed regions go darker than the page in dark mode — the opposite direction from floating ones.' },
  { match: /\b(hover)\b/, fragments: ['surface-hover', 'bg-hover', 'border-hover', 'link-hover'], why: 'Hover washes are translucent so they composite correctly over whatever is beneath.' },
  { match: /\b(selected|active|current|chosen)\b/, fragments: ['surface-selected', 'border-brand', 'text-brand'], why: 'Selection needs BOTH the tint and a brand-coloured bar or border — on dark the tint alone is imperceptible.' },
  { match: /\b(disabled|inoperable)\b/, fragments: ['disabled'], why: 'Disabled tokens are exempt from contrast minimums, so never put information only in a disabled state.' },
  { match: /\b(primary|main|heading|title|body text|default text)\b/, fragments: ['text-primary'], why: 'Default text colour, verified above 4.5:1 on every content surface.' },
  { match: /\b(secondary|supporting|description|help text|hint)\b/, fragments: ['text-secondary'], why: 'Supporting text that still carries information, held to full body contrast.' },
  { match: /\b(muted|tertiary|metadata|timestamp|caption|subtle text|low emphasis)\b/, fragments: ['text-tertiary'], why: 'The lowest emphasis the system permits for readable content. Still 4.5:1.' },
  { match: /\b(placeholder)\b/, fragments: ['text-placeholder'], why: 'Held to full body contrast deliberately — most systems fail here.' },
  { match: /\b(link|anchor|hyperlink)\b/, fragments: ['text-link'], why: 'Always pair with an underline; colour alone never signals a link.' },
  { match: /\b(border|divider|separator|rule|outline|stroke)\b/, fragments: ['border-'], why: 'Borders go DARKER in dark mode, not lighter. A light-mode rule reused on dark outranks the content it separates.' },
  { match: /\b(input|field|text ?box|form control)\b/, fragments: ['field-'], why: 'Field borders are the control boundary and are held to 3:1 against both the page and a raised card.' },
  { match: /\b(focus|focus ring|keyboard focus)\b/, fragments: ['focus-'], why: 'One ring everywhere. 2px with a 2px offset, clearing WCAG 2.4.13.' },
  { match: /\b(button|action|cta)\b/, fragments: ['action-'], why: 'Action fills step UP the ramp in dark mode, so their label colour flips to near-black.' },
  { match: /\b(danger|destructive|error|delete|fail)\b/, fragments: ['danger', 'error'], why: 'Never the only signal — pair with an icon and explicit text.' },
  { match: /\b(success|applied|healthy|ok|complete|valid)\b/, fragments: ['success'], why: 'Never the only signal — pair with an icon and explicit text.' },
  { match: /\b(warning|degraded|caution|attention)\b/, fragments: ['warning'], why: 'Amber is intrinsically light, so its on-solid text is dark in every theme.' },
  { match: /\b(info|informational|notice|note)\b/, fragments: ['info'], why: 'Neutral notices and in-progress states.' },
  { match: /\b(brand|accent|highlight)\b/, fragments: ['brand', 'surface-brand'], why: 'Brand fills step up the ramp in dark mode.' },
  { match: /\b(chart|graph|series|plot|visuali[sz]ation|data ?viz)\b/, fragments: ['chart-'], why: 'Eight series, ordered so the first four survive the common colour vision deficiencies.' },
  { match: /\b(ai|machine|generated|assistant|automation)\b/, fragments: ['ai-'], why: 'Reserved so machine-generated content is never mistaken for confirmed fact.' },
  { match: /\b(scrim|dim|backdrop behind)\b/, fragments: ['scrim'], why: 'Deepens from 48% to 64% on dark; a weak scrim over a dark page does not read as inactive.' },
  { match: /\b(tooltip)\b/, fragments: ['surface-inverse', 'text-on-inverse'], why: 'Tooltips deliberately invert relative to the page in both themes, so they stand out rather than blending into the overlay stack.' },
  { match: /\b(checkbox|radio|switch|toggle|track)\b/, fragments: ['control-'], why: 'The unfilled track is treated as a meaningful graphic and held to 3:1 — "off" must be visible, not merely absent.' },
];

export function suggestTokens(intent: string, limit = 6): Suggestion[] {
  const q = intent.toLowerCase();

  const fragmentScores = new Map<string, { score: number; why: string }>();
  for (const entry of INTENT_MAP) {
    if (!entry.match.test(q)) continue;
    for (const frag of entry.fragments) {
      const existing = fragmentScores.get(frag);
      fragmentScores.set(frag, {
        score: (existing?.score ?? 0) + 10,
        why: existing?.why ?? entry.why,
      });
    }
  }

  // Fall back to raw word matching against token names when no intent matched.
  const words = q.split(/[^a-z0-9]+/).filter((w) => w.length > 2);

  const scored: Suggestion[] = [];
  for (const token of semanticTokens) {
    let score = 0;
    let why = '';

    for (const [frag, info] of fragmentScores) {
      if (token.name.includes(frag)) {
        score += info.score;
        if (!why) why = info.why;
      }
    }
    for (const word of words) {
      if (token.name.includes(word)) score += 3;
      if (token.description.toLowerCase().includes(word)) score += 1;
    }

    if (score <= 0) continue;

    const values = {} as Record<ThemeName, string>;
    for (const theme of THEMES) values[theme] = resolvePrimitive(token.values[theme]);

    scored.push({
      token: token.name,
      cssVar: `var(--sk-${token.name})`,
      description: token.description,
      values,
      why: why || 'Matched on token name and description.',
      score,
    });
  }

  return scored.sort((a, b) => b.score - a.score).slice(0, limit);
}

/**
 * Given a background token, list the foreground tokens that are safe on it.
 * Answers "what text colour can I use on this surface?" with verified numbers
 * rather than a guess.
 */
export function safeForegroundsOn(
  backgroundToken: string,
  theme: ThemeName,
  minRatio = 4.5
): Array<{ token: string; value: string; ratio: string }> {
  const bg = opaqueValue(backgroundToken, theme);
  if (!bg) return [];

  const out: Array<{ token: string; value: string; ratio: string; raw: number }> = [];
  for (const token of semanticTokens) {
    if (!token.name.startsWith('color-text') && !token.name.includes('-text')) continue;
    if (token.contrastExempt) continue;
    const fg = opaqueValue(token.name, theme);
    if (!fg) continue;
    const ratio = contrastRatio(fg, bg);
    if (ratio >= minRatio) {
      out.push({ token: token.name, value: fg, ratio: `${ratio.toFixed(2)}:1`, raw: ratio });
    }
  }
  return out.sort((a, b) => b.raw - a.raw).map(({ raw, ...rest }) => rest);
}
