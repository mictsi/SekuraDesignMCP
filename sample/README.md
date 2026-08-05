# Sekura documentation site

An 81-page documentation site for the Sekura Design System — explanations, a
full colour guide, a type specimen, live demos, a complete component reference,
and six worked examples.

**Everything is generated from the design system's own data**, so the colour
guide shows genuinely audited contrast values and the component pages show the
same specification the MCP server serves. The docs cannot drift from the system
they document.

## Run it

```bash
./run.sh build && ./run.sh start     # http://localhost:4173
```

Or, without Docker:

```bash
npm run build && npm run emit:css && npm run site:build
npm run sample
```

It also works opened straight from the filesystem.

## What is here

### Get started
| Page | |
|---|---|
| `index.html` | Overview — the two rules, live theme comparison, where to go next |
| `structure.html` | The three token layers, naming, groups, themes, density |
| `develop.html` | Install, the HTML scaffold, using tokens, frameworks, build gates |

### Foundations
Thirteen pages: **Principles**, **Colour**, **Dark mode**, **Typography**,
**Spacing & density**, **Layout & responsive**, **Elevation & motion**,
**Iconography**, **Data visualisation**, **Content & voice**,
**Internationalisation**, **Accessibility**, **Theming**.

Each opens with the non-negotiable rules, then explanation with live demos, then
the full narrative in a collapsible section.

### Reference
| Page | |
|---|---|
| `tokens.html` | All 112 semantic tokens, filterable, with the value in each of the four themes |
| `components.html` | 55 components grouped by category |
| `component-*.html` | One page each: anatomy, variants, states, props, dark-mode note, full keyboard and ARIA contract, CSS |
| `patterns.html` | 15 UX patterns with their anti-patterns |
| `recipes.html` | 9 page blueprints with markup |

### Examples
Six pages showing the system in a real product: dashboard, list page with bulk
actions, detail page, form with validation, settings, sign-in.

## The pages worth seeing first

**`color.html`** — the colour guide. Every ramp step lists its contrast against
white *and* against black, which is what you actually need in order to know
whether a step is safe for text (4.5:1), safe only for a boundary (3:1), or
decorative. The two steps pinned by contrast rather than by eye are marked. Then
every semantic token with its value in all four themes, and the full contrast
contract — 73 declared pairings × 4 themes, with the measured ratio in each.

**`dark-mode.html`** — the elevation inversion, demonstrated with the same
markup rendered under both themes side by side. Plus the nine things that pass a
design review and break in production.

**`layout.html`** — flex-first explained with **resizable** demos. Drag the
corner of a demo and watch it reflow on *container* width, with no media query
involved.

## Try this

- **Switch the theme** in the header. Three options, System default. Watch cards
  get *lighter* than the page in dark mode while the border takes over from the
  shadow; watch table rules go *darker*; watch primary button labels flip from
  white to near-black.
- **Resize to 390px.** Nothing scrolls sideways. The nav collapses, the on-page
  contents drops, the theme switch goes icon-only.
- **Press `Ctrl`/`Cmd` + `K`** for the command palette — every page, component,
  pattern and recipe is indexed.
- **Use only the keyboard.** Tab first hits the skip link. Segmented controls are
  one tab stop with arrow keys. Every overlay closes on Escape and restores
  focus.

## Structure

```
sample/
├── pages/*.html        Source fragments for the six examples only
├── assets/
│   ├── sekura.css      The design system (generated — do not edit)
│   ├── docs.css        Documentation-site styles, built entirely from tokens
│   ├── app.js          Component behaviours: menus, dialogs, toasts, validation
│   ├── docs.js         Docs behaviours: scroll-spy, code copy, token filter
│   └── icons.js        SVG sprite, 46 icons on a 24px grid
└── *.html              Generated. Rebuild with `npm run site:build`.
```

The generator lives in `src/site/` and `src/scripts/build-site.ts`. The page
shell — pre-paint theme script, landmarks, skip link, live region — is defined
once in `src/site/shell.ts`, because it is the part every page must get
identically right.

`assets/sekura.css` is emitted by `npm run emit:css`. Editing it directly will be
overwritten; change the token or component source and regenerate.

## Verification

```bash
npm run verify:sample
```

Checks all 81 pages for dangling ARIA id references, icons referenced but never
defined, links to missing pages, duplicate ids, hard-coded colours and correct
document structure — then runs the design system's own `validate_markup` over
each page. The site is held to the standard the server tells everyone else to
meet.

Two documented exemptions, both marked in the source: colour swatches carry a
literal hex because showing the hex *is* the content, and code samples are
excluded from linting because the developer guide deliberately shows a
hard-coded value as an example of what not to do.

## Notes

The icon sprite is injected by `assets/icons.js` rather than referenced as an
external `.svg`, so the site also works from the filesystem, where browsers block
external SVG sprite references. A production build would serve a static `.svg`.

All example data is fictional and uses reserved values (`example.com`,
`192.0.2.10`). No credentials are collected or stored.
