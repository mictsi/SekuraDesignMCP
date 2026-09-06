/**
 * Structural CSS lint for every component stylesheet.
 *
 * Catches the class of authoring mistake a TypeScript compiler cannot see,
 * because component CSS is a string as far as the compiler is concerned:
 * unbalanced braces, a selector followed by an at-rule, hard-coded colours, and
 * references to tokens that do not exist.
 *
 * Added after building the sample site surfaced an invalid selector/at-rule
 * combination in the dialog stylesheet that had shipped unnoticed.
 */

import { components } from '../data/components/index.js';
import { layouts } from '../data/layouts.js';
import { proseCss, resetCss, utilitiesCss } from '../data/base-css.js';
import { scales, semanticTokens } from '../data/tokens.js';

interface Issue {
  source: string;
  rule: string;
  detail: string;
}

const issues: Issue[] = [];

const knownTokens = new Set(semanticTokens.map((t) => t.name));
// Dimensional scales and the handful of locally-scoped custom properties
// components define for themselves.
const scalePrefixes = [
  'space', 'radius', 'border-width', 'opacity', 'z', 'duration', 'easing',
  'font-family', 'font-weight', 'font-size', 'line-height', 'letter-spacing',
  'container', 'elevation', 'control-height', 'control-padding', 'row-padding',
  'stack-gap', 'section-gap', 'focus-ring', 'breakpoint', 'palette',
  'grid-min', 'grid-gap', 'cluster-gap', 'sidebar-width', 'content-min',
  'slider-progress', 'slider-direction', 'control-size', 'dir-scale',
];
void scales;

function lint(source: string, css: string): void {
  /* Balanced braces. */
  let depth = 0;
  for (const ch of css) {
    if (ch === '{') depth += 1;
    else if (ch === '}') depth -= 1;
    if (depth < 0) break;
  }
  if (depth !== 0) {
    issues.push({ source, rule: 'unbalanced-braces', detail: `brace depth ends at ${depth}` });
  }

  /* A selector list must not run into an at-rule. */
  const selectorThenAtRule = /,\s*\n?\s*@(media|supports|layer|container)\b/.exec(css);
  if (selectorThenAtRule) {
    issues.push({
      source,
      rule: 'selector-then-at-rule',
      detail: `a selector list is followed by "${selectorThenAtRule[0].trim()}", which is invalid CSS and silently drops the whole rule`,
    });
  }

  /* Hard-coded colours. Everything must go through a token so it adapts to the
     theme. rgb()/rgba() overlays are permitted where a token cannot express a
     compositing value, but a bare hex never is. */
  const hex = /(?:^|[\s:,(])(#[0-9a-f]{3,8})\b/gi;
  let m: RegExpExecArray | null;
  while ((m = hex.exec(css)) !== null) {
    // Ignore hex inside data: URIs, which are inert SVG markup re-declared per theme.
    const before = css.slice(Math.max(0, m.index - 120), m.index);
    if (before.includes('data:image/svg+xml')) continue;
    issues.push({ source, rule: 'hard-coded-colour', detail: `${m[1]} — use a semantic token` });
  }

  /* Every referenced token must exist. */
  const varRe = /var\(\s*--sk-([a-z0-9-]+)/gi;
  while ((m = varRe.exec(css)) !== null) {
    const name = m[1]!;
    if (knownTokens.has(name)) continue;
    if (scalePrefixes.some((p) => name === p || name.startsWith(`${p}-`))) continue;
    issues.push({ source, rule: 'unknown-token', detail: `--sk-${name}` });
  }

  /* A forced-colors block that names a selector the component does not have is
     dead CSS that reads as coverage. It is worse than no block: it makes the
     component look handled in a grep and in a review. Everything a
     forced-colors block targets must exist in the normal rules.

     A component may have several such blocks — one per concern — so all of them
     are collected and checked against everything outside all of them, rather
     than against whatever happens to precede the first. */
  const fcBlocks: string[] = [];
  let normal = '';
  {
    let i = 0;
    while (i < css.length) {
      const at = css.indexOf('@media (forced-colors: active)', i);
      if (at === -1) {
        normal += css.slice(i);
        break;
      }
      normal += css.slice(i, at);
      // Walk to the matching close brace of the at-rule.
      let depth = 0;
      let j = css.indexOf('{', at);
      const bodyStart = j;
      for (; j < css.length; j += 1) {
        if (css[j] === '{') depth += 1;
        else if (css[j] === '}') {
          depth -= 1;
          if (depth === 0) break;
        }
      }
      fcBlocks.push(css.slice(bodyStart, j + 1));
      i = j + 1;
    }
  }

  for (const block of fcBlocks) {
    const targets = new Set<string>();
    for (const m of block.matchAll(/\.(sk-[a-z0-9_-]+)/g)) targets.add(`.${m[1]!}`);
    for (const m of block.matchAll(/(\[[a-z-]+(?:[~^|*$]?="[^"]*")?\])/g)) targets.add(m[1]!);
    for (const m of block.matchAll(/(::[a-z-]+)/g)) targets.add(m[1]!);
    for (const t of targets) {
      if (normal.includes(t)) continue;
      issues.push({
        source,
        rule: 'dead-forced-colors-selector',
        detail: `${t} — the forced-colors block targets something this component does not have`,
      });
    }
  }

  /* Every component must have decided about Windows High Contrast Mode: either
     it repairs what HCM discards, or it states that it draws nothing HCM can
     discard. Silence is the third case, and it is indistinguishable from
     nobody having looked — which is exactly what this rule removes. */
  if (source.startsWith('component:')) {
    const decided =
      css.includes('@media (forced-colors: active)') ||
      /forced-colors:\s*nothing to repair/.test(css);
    if (!decided) {
      issues.push({
        source,
        rule: 'forced-colors-undecided',
        detail:
          'no forced-colors block and no note saying none is needed — add one, or ' +
          'a `/* forced-colors: nothing to repair — <why>. */` comment',
      });
    }
  }

  /* Physical properties where a logical one exists — these break RTL. */
  const physical =
    /(?:^|[;{\s])(margin-(?:left|right)|padding-(?:left|right)|border-(?:left|right)(?:-color|-width|-style)?|(?:^|\s)(?:left|right))\s*:/gm;
  while ((m = physical.exec(css)) !== null) {
    issues.push({
      source,
      rule: 'physical-property',
      detail: `${m[1]!.trim()} — use the logical equivalent so RTL works without a second stylesheet`,
    });
  }
}

for (const c of components) lint(`component:${c.id}`, c.css);
const allComponentCss = components.map(c => c.css).join('\n');
for (const c of components) for (const size of c.sizes) {
  if (size.className && !size.className.includes('{') && !allComponentCss.includes('.' + size.className)) {
    issues.push({ source: `component:${c.id}`, rule: 'missing-size-selector', detail: size.className });
  }
}
for (const l of layouts) lint(`layout:${l.id}`, l.css);
lint('base:reset', resetCss);
lint('base:prose', proseCss);
lint('base:utilities', utilitiesCss);

console.log('Sekura CSS lint');
console.log('='.repeat(78));

if (issues.length === 0) {
  console.log(`\nAll ${components.length + layouts.length + 3} stylesheets are structurally valid,`);
  console.log('use semantic tokens only, and reference no unknown token.');
  process.exit(0);
}

const bySource = new Map<string, Issue[]>();
for (const i of issues) {
  const list = bySource.get(i.source) ?? [];
  list.push(i);
  bySource.set(i.source, list);
}

for (const [source, list] of bySource) {
  console.log(`\n${source}`);
  for (const i of list) console.log(`  [${i.rule}] ${i.detail}`);
}

console.log(`\n${issues.length} issue(s) across ${bySource.size} stylesheet(s).`);
process.exit(1);
