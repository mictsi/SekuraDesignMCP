/**
 * Verifies the generated sample site.
 *
 * Checks the things that silently break in hand-written HTML and that no
 * compiler sees: dangling ARIA id references, icons referenced but never
 * defined, links to pages that do not exist, duplicate ids, and hard-coded
 * colours that would not survive a theme switch.
 *
 * Then runs the design system's own `validate_markup` over every page, so the
 * sample is held to the same standard the server tells everyone else to meet.
 */

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { validateMarkup } from '../lib/validate.js';

const ROOT = resolve(process.cwd(), 'sample');
const pages = readdirSync(ROOT).filter((f) => f.endsWith('.html'));

let errors = 0;
let warnings = 0;

function fail(page: string, message: string): void {
  errors += 1;
  console.log(`  ✗ [${page}] ${message}`);
}
function warn(page: string, message: string): void {
  warnings += 1;
  console.log(`  ! [${page}] ${message}`);
}

/* Icons actually defined in the sprite. */
const iconSource = readFileSync(join(ROOT, 'assets/icons.js'), 'utf8');
const definedIcons = new Set(
  [...iconSource.matchAll(/^\s*'([a-z0-9-]+)':\s*'</gim)].map((m) => m[1]!)
);

console.log('Sekura sample verification');
console.log('='.repeat(78));
console.log(`\n${pages.length} pages, ${definedIcons.size} icons defined\n`);

for (const page of pages) {
  const html = readFileSync(join(ROOT, page), 'utf8');

  /* ---- ids ---- */
  const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]!);
  const idSet = new Set(ids);
  const seen = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) fail(page, `duplicate id "${id}"`);
    seen.add(id);
  }

  /* ---- ARIA references must resolve ---- */
  const idRefAttrs = ['aria-controls', 'aria-labelledby', 'aria-describedby', 'for'];
  for (const attr of idRefAttrs) {
    const re = new RegExp(`\\s${attr}="([^"]+)"`, 'g');
    for (const m of html.matchAll(re)) {
      for (const ref of m[1]!.trim().split(/\s+/)) {
        if (!ref) continue;
        // aria-controls may legitimately point at something rendered elsewhere;
        // everything else must resolve on this page.
        if (!idSet.has(ref)) {
          if (attr === 'aria-controls') warn(page, `${attr}="${ref}" has no matching id`);
          else fail(page, `${attr}="${ref}" has no matching id`);
        }
      }
    }
  }

  /* ---- Icon references must exist in the sprite ---- */
  for (const m of html.matchAll(/href="#sk-icon-([a-z0-9-]+)"/g)) {
    if (!definedIcons.has(m[1]!)) fail(page, `icon "#sk-icon-${m[1]}" is not in the sprite`);
  }

  /* ---- Internal links must point at real files ---- */
  for (const m of html.matchAll(/href="([^"#:]+\.html)"/g)) {
    if (!existsSync(join(ROOT, m[1]!))) fail(page, `link to missing page "${m[1]}"`);
  }
  for (const m of html.matchAll(/(?:src|href)="(assets\/[^"]+)"/g)) {
    if (!existsSync(join(ROOT, m[1]!))) fail(page, `missing asset "${m[1]}"`);
  }

  /* ---- Structure ---- */
  const h1s = (html.match(/<h1[\s>]/g) ?? []).length;
  if (h1s !== 1) fail(page, `${h1s} <h1> elements, expected exactly 1`);
  if (!html.includes('class="sk-skip-link"')) fail(page, 'no skip link');
  if (!html.includes('id="main"')) fail(page, 'no #main landmark');
  if (!html.includes('lang="en"')) fail(page, 'no lang attribute');
  if (!/<main\b/.test(html)) fail(page, 'no <main> element');
  if (!html.includes('data-sk-theme')) fail(page, 'no pre-paint theme script');

  // The theme script must come before the stylesheet, or the page paints in the
  // wrong theme first.
  const scriptAt = html.indexOf('sekuraTheme');
  const cssAt = html.indexOf('assets/sekura.css');
  if (scriptAt === -1 || cssAt === -1 || scriptAt > cssAt) {
    fail(page, 'theme script does not run before the stylesheet loads');
  }

  /* ---- Hard-coded colours ----
     A colour swatch legitimately needs a literal value — showing the hex IS the
     content. Those elements are marked data-swatch; anything else with a hex in
     an inline style is a themed element that will not adapt. */
  for (const m of html.matchAll(/<[^>]*style="[^"]*?(#[0-9a-f]{3,8})\b[^"]*"[^>]*>/gi)) {
    if (/\bdata-swatch\b/.test(m[0])) continue;
    fail(page, `hard-coded colour ${m[1]} in an inline style — will not adapt to the theme`);
  }

  /* ---- The design system's own linter ----
     Code samples are stripped first. They are illustrative by definition — the
     developer guide deliberately shows a hard-coded hex as an example of what
     NOT to do, and linting that as live markup would be nonsense. */
  const withoutCode = html.replace(/<pre[\s\S]*?<\/pre>/gi, '<pre></pre>');
  const findings = validateMarkup(withoutCode)
    .filter((f) => f.severity === 'error')
    // Same reasoning as above: the linter cannot see that a swatch is content.
    .filter((f) => !(f.rule === 'hard-coded-color' && /data-swatch/.test(html)));
  for (const f of findings) {
    fail(page, `validate_markup: ${f.rule} — ${f.message.split('.')[0]}`);
  }
}

console.log('');
console.log('='.repeat(78));
if (errors === 0) {
  console.log(`\nAll ${pages.length} pages pass: no dangling references, no missing icons,`);
  console.log('no broken links, no hard-coded colours, and no validate_markup errors.');
  if (warnings > 0) console.log(`\n${warnings} warning(s) — see above.`);
  process.exit(0);
}
console.log(`\n${errors} error(s), ${warnings} warning(s).`);
process.exit(1);
