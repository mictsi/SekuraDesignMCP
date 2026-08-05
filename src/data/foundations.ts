/**
 * Foundations — the reasoning behind the tokens.
 *
 * A token file says *what* a value is. These say *why*, and what happens if you
 * ignore it. Each foundation is written to be read by an agent that has to make a
 * decision, so rules are stated as rules, not as suggestions.
 */

export interface Foundation {
  id: string;
  title: string;
  summary: string;
  /** Non-negotiable rules. */
  rules: string[];
  /** The full prose. */
  body: string;
  related: string[];
}

export const foundations: Foundation[] = [
  {
    id: 'principles',
    title: 'Design principles',
    summary: 'The seven decisions everything else in Sekura follows from.',
    rules: [
      'Semantic before literal: product code names roles, never values.',
      'Dark mode is a peer, not a filter.',
      'Never carry meaning in colour alone.',
      'Flex first: layouts adapt because they wrap, not because a breakpoint fired.',
      'Accessible by construction, not by audit.',
      'State the truth about system state, including when it is bad.',
      'One way to do each thing.',
    ],
    body: `## 1. Semantic before literal

Product code references \`--sk-color-text-primary\`, never \`#181e27\` and never
\`--sk-palette-neutral-900\`. A component that names a role can be re-themed; a
component that names a value cannot. This single rule is what makes four themes
cost the same as one.

The practical test: if you can grep a component's CSS for a hex value, the
component is broken, and it is broken specifically in dark mode.

## 2. Dark mode is a peer, not a filter

Dark mode is not light mode inverted, and it is not \`filter: invert()\`. Three
things behave differently:

- **Elevation reverses.** In light mode a floating surface stays white and casts a
  shadow. In dark mode the shadow is nearly invisible against a dark page, so
  elevation is carried by *lightness*: the higher a surface floats, the lighter it
  gets. A card is \`neutral-900\` on a \`neutral-950\` page; a dialog is
  \`neutral-850\`. Recessed surfaces go the other way and get darker.
- **Saturated hues step up, not down.** Cobalt-600 reads as a confident blue on
  white and as a muddy near-black on a dark page. Every brand and status colour
  moves *up* the ramp in dark mode, which means the text on top of it flips from
  white to near-black.
- **Borders matter more.** With shadows contributing almost nothing, a border is
  often the only thing separating a card from the page. A component styled with a
  shadow and no border looks correct in light mode and disappears in dark mode.

## 3. Never carry meaning in colour alone

Every status pairs a colour with an icon and a text label. Every selected state
pairs a tint with a border or a bar. Every delta pairs a colour with an arrow and
a hidden description. This is WCAG 1.4.1, but it is also just correct: roughly one
in twelve men has some form of colour vision deficiency, and everyone loses colour
fidelity in bright sunlight.

The dark-mode consequence is sharper than people expect. The subtle tints that
carry selection in light mode — \`cobalt-50\` on white — have no dark equivalent
that is both visible and calm. \`cobalt-950\` on \`neutral-950\` is nearly identical
in lightness. So in dark mode the *bar* is the signal and the tint is decoration.
Ship only the tint and dark-mode users see no selection at all.

## 4. Flex first

Sekura composes with flexbox by default and reaches for grid only when rows and
columns must align in two dimensions. Three habits follow:

- Horizontal groups wrap (\`flex-wrap: wrap\`) rather than overflow.
- Children declare \`flex\` explicitly instead of inheriting \`0 1 auto\`.
- Anything containing text sets \`min-inline-size: 0\`, because a flex item's
  default \`min-width: auto\` refuses to shrink below its content and is the single
  most common cause of horizontal page scroll.

Widths are expressed as \`flex-basis\` — an *ideal* width the layout may depart
from — rather than \`width\`, which is a demand. The result is that most layouts
respond to their **container** rather than to the viewport, and need no media
query at all. See the Responsive layout foundation.

## 5. Accessible by construction

Accessibility is a property of the component contract, not a phase before release.
Every component in this system documents its role, keyboard model, ARIA
obligations and target size, and every colour pairing the system promises is
verified by an automated audit across all four themes. \`audit_theme\` is a build
gate, not a report.

Automated checks catch perhaps a third of real barriers. The rest needs a keyboard
and a screen reader.

## 6. State the truth about system state

An interface that says "Saved" when work is queued is lying. Sekura distinguishes
requested, pending, applied, failed, conflicted and degraded, and shows the one
that is actually true. A pending switch shows pending. A partial batch failure
says which items failed. This is a design principle because the temptation to
smooth it over is a design temptation.

## 7. One way to do each thing

One focus ring. One spacing scale. One set of status colours. One elevation scale.
When a component needs something the system does not have, the answer is to extend
the system deliberately, not to add a local exception — local exceptions are how a
design system becomes a stylesheet.`,
    related: ['color', 'dark-mode', 'responsive-layout', 'accessibility'],
  },

  {
    id: 'color',
    title: 'Colour',
    summary:
      'Three layers — primitive ramps, semantic roles, component usage — with every promised pairing verified against WCAG in all four themes.',
    rules: [
      'Product code uses semantic tokens only. Primitives are for building semantic tokens.',
      'Every colour pairing the system promises is declared and machine-verified.',
      'Colour is never the only signal.',
      'Text tokens clear 4.5:1. Control boundaries, icons and focus rings clear 3:1.',
      'Disabled states are exempt from contrast minimums, and must never be the only place information lives.',
    ],
    body: `## The three layers

**Primitives** are raw values: \`cobalt-600\` is \`#3a4fdd\` and means nothing on its
own. Eight ramps (neutral, cobalt, aqua, jade, amber, crimson, azure, violet) of
eleven to thirteen steps each.

**Semantic tokens** name roles: \`--sk-color-surface-raised\`,
\`--sk-color-text-secondary\`, \`--sk-color-action-danger-bg\`. Each resolves to a
different primitive per theme. This is the only layer product code may touch.

**Components** consume semantic tokens. A component never chooses a primitive.

## Why the ramp steps are where they are

Two steps in the neutral ramp are pinned by contrast rather than by eye:

- \`neutral-400\` (\`#8590a3\`) is the lightest grey that still clears **3:1 on
  white**, so borders drawn with it are locatable (WCAG 1.4.11).
- \`neutral-500\` (\`#676f82\`) is the lightest grey that clears **4.5:1 on the
  subtle surface**, so tertiary text stays readable everywhere it appears.

Moving either of these lighter breaks a promise the system makes. The audit will
catch it.

## The contrast contract

The system declares 73 pairings and verifies each in all four themes — 292 checks
in total. Run \`audit_theme\` to see them, or \`check_contrast\` for an arbitrary
pair. The declared pairings are the promise; a pairing that is not declared is not
promised, and must not be used to carry meaning.

Thresholds applied:

| Use | Ratio | Criterion |
|---|---|---|
| Body text | 4.5:1 | 1.4.3 |
| Large text (24px, or 18.66px bold) | 3:1 | 1.4.3 |
| Control boundaries, icons, focus rings, chart series | 3:1 | 1.4.11 |
| Disabled controls | exempt | 1.4.3 exception |

Sekura holds a few things to a higher bar than WCAG requires, because they are
where real products fail: **placeholder text** and **tertiary text** are both held
to full 4.5:1 body contrast, and the **unfilled track** of a switch or progress bar
is treated as a meaningful graphical object rather than decoration.

## Status colours

Five intents (success, warning, danger, info, neutral), each supplying five roles:
\`surface\`, \`border\`, \`text\`, \`solid\`, \`on-solid\`. That is enough to build a
tinted banner, an outlined chip or a solid badge without inventing a colour.

Amber is the difficult one. It is intrinsically light, so \`status-warning-on-solid\`
is dark in every theme — the only status where that is true. Reusing the
white-on-solid pattern from the other intents produces roughly 1.9:1 and fails.

## Violet is reserved

Violet is reserved for AI and automation affordances, so machine-generated content
is never mistaken for a user action or a confirmed fact. Do not use it as a general
accent.

## Data visualisation

Eight categorical series, ordered so the first four remain distinguishable under
deuteranopia and protanopia. Beyond eight, group the remainder into "Other" —
adding a ninth colour makes the whole chart harder to read, not just the ninth
series. Series step lighter in dark themes and are each audited at 3:1 against the
plot background.`,
    related: ['dark-mode', 'accessibility', 'data-visualisation', 'principles'],
  },

  {
    id: 'dark-mode',
    title: 'Dark mode',
    summary:
      'How dark mode actually differs from light mode, and the specific places a naive implementation breaks.',
    rules: [
      'Set color-scheme on the root, or browser-rendered UI stays light.',
      'Apply the theme before first paint with a synchronous inline script.',
      'Floating surfaces get lighter as they rise; recessed surfaces get darker.',
      'Saturated fills step up the ramp, so the text on them flips to dark.',
      'Borders carry separation that shadows carry in light mode.',
      'Offer three choices — light, dark, system — with system as the default.',
    ],
    body: `## The elevation inversion

This is the rule everything else follows from.

| Surface | Light | Dark |
|---|---|---|
| Page | \`neutral-0\` (white) | \`neutral-950\` |
| Sunken (code wells, drop zones) | \`neutral-100\` | \`neutral-975\` — *darker* than the page |
| Raised (cards, panels) | \`neutral-0\` + shadow | \`neutral-900\` — *lighter* than the page |
| Overlay (menus, dialogs) | \`neutral-0\` + bigger shadow | \`neutral-850\` — lighter still |

In light mode every surface is white and the shadow does the work. In dark mode
the shadow contributes almost nothing, so lightness does the work instead. A
component that expresses elevation only through \`box-shadow\` looks correct in
light mode and flat in dark mode.

The corollary: **keep the border**. On a dark page, \`border-default\` is frequently
the only thing separating a card from what is behind it.

## Borders go darker, not lighter

Counter-intuitive, and the most common dark-mode bug in tables. A separator rule is
\`neutral-200\` in light mode. The instinct is to make it lighter on dark; the
correct value is \`neutral-800\`, which is *further from white*. A light rule on a
dark page produces bright lines that visually outrank the data they separate.

## Saturated colour steps up

\`cobalt-600\` is a confident blue on white and a muddy near-black on
\`neutral-950\`. Every brand and status fill moves up the ramp in dark mode —
\`600 → 400\` — which means the text on top must flip from white to near-black.
This is why \`--sk-color-action-primary-text\` is a token rather than a constant.

Tinted status surfaces need the same treatment but more so. The light-mode tint is
the \`50\` step; the dark-mode equivalent is the \`950\` step — a deep, saturated,
nearly-black version of the hue — not a darkened \`50\`, which reads as muddy grey.

## The things that break silently

These are the details that pass a design review and fail in production:

1. **\`color-scheme\` not set.** Scrollbars, native select popups, spellcheck
   underlines, date pickers and form control internals all stay light. Set
   \`color-scheme: dark\` on the root — this is what makes a dark mode look designed
   rather than retrofitted.
2. **Theme applied after paint.** A flash of light theme on every page load. The
   theme script must be inline in \`<head>\` and synchronous, before any stylesheet.
3. **Chrome's autofill background.** A hard-coded pale yellow with no supported
   override. Paint over it with a large inset box-shadow and set
   \`-webkit-text-fill-color\`.
4. **SVG chevrons in data URIs.** A stroke colour baked into a \`background-image\`
   cannot inherit \`currentColor\`. Re-declare the image per theme, or the select
   arrow vanishes.
5. **WebKit's search clear button.** A dark glyph that disappears on a dark field.
   Suppress \`::-webkit-search-cancel-button\` and supply your own.
6. **Raster illustrations.** A flat PNG will be wrong in one theme. Use inline SVG
   with \`currentColor\`, or two files behind a \`prefers-color-scheme\` media query.
7. **Opacity used for disabled states.** Opacity on a dark surface collapses toward
   the background much faster than on a light one. Use an explicit colour.
8. **Scrims too weak.** A 48% scrim over an already-dark page produces almost no
   perceived change, so the page does not read as inactive. Dark mode uses 64%.
9. **Syntax highlighting.** A light-mode highlight palette on a dark background is
   the classic developer-tool failure. Map highlight roles onto the audited chart
   palette so they inherit verified contrast.

## Theme selection

Offer three options, not two: **System**, **Light**, **Dark** — with System as the
default. A two-state toggle silently overrides the user's OS preference the moment
they touch it, and they can never get back to "follow the system" without clearing
storage.

High contrast is a separate axis, driven by \`prefers-contrast: more\`, producing
\`hc-light\` and \`hc-dark\`. Do not conflate it with dark mode.

Announce theme changes in a polite live region. The visual change is completely
silent to a screen reader user.

## Verifying

\`audit_theme\` checks every declared pairing in every theme. Dark mode is not
finished when it looks right; it is finished when the audit passes and someone has
used it for an hour.`,
    related: ['color', 'accessibility', 'theming', 'principles'],
  },

  {
    id: 'responsive-layout',
    title: 'Responsive layout',
    summary:
      'Flex-first composition. Most Sekura layouts respond to their container and need no media query at all.',
    rules: [
      'Compose with flex. Use grid only for genuine two-dimensional alignment.',
      'Horizontal groups set flex-wrap: wrap.',
      'Declare flex explicitly on children; do not rely on the 0 1 auto default.',
      'Set min-inline-size: 0 on any flex child that can contain text.',
      'Express width as flex-basis, not width.',
      'The page must never scroll horizontally at 320px or at 400% zoom.',
    ],
    body: `## Why flex first

A breakpoint asks "how wide is the *viewport*?". That is the wrong question — a
card does not care about the viewport, it cares about the column it is sitting in.
The same card in a sidebar and in a full-width region needs different layouts at
the same viewport width.

Flex answers the right question implicitly. A wrapping flex row reflows when *its
container* runs out of room, wherever that container happens to be. So most Sekura
layouts contain no media query, and the ones that do are shell-level decisions
(does the navigation rail persist?) rather than content decisions.

## The four habits

### 1. Wrap by default

\`\`\`css
.sk-cluster {
  display: flex;
  flex-wrap: wrap;   /* not optional */
  gap: var(--sk-space-8);
}
\`\`\`

A toolbar that wraps to two lines at 360px is working. A toolbar that produces a
horizontal scrollbar is broken. If wrapping is genuinely wrong — a tab strip, say —
pair \`nowrap\` with an explicit overflow strategy (\`overflow-x: auto\` plus
scroll-snap). Never \`nowrap\` alone.

### 2. Declare flex explicitly

\`\`\`css
.sk-cluster > *        { flex: 0 1 auto; min-inline-size: 0; }
.sk-cluster__grow      { flex: 1 1 auto; min-inline-size: 0; }
.sk-button__icon       { flex: 0 0 auto; }
\`\`\`

Saying what each child does — shrink, grow, or neither — makes the layout's
behaviour under pressure predictable instead of emergent.

### 3. \`min-inline-size: 0\`

This is the most important line in the whole foundation.

A flex item's default is \`min-width: auto\`, which means **it will not shrink below
its content's intrinsic size**. A long unbroken hostname, a wide table, or a
\`white-space: nowrap\` label will push its flex parent wider than the container,
and the whole page scrolls sideways.

\`\`\`css
.sk-app-shell__main {
  flex: 1 1 auto;
  min-inline-size: 0;   /* without this, a wide table breaks the entire shell */
  overflow-y: auto;
}
\`\`\`

Text truncation also silently fails without it: \`text-overflow: ellipsis\` needs
the element to actually be narrower than its content, and \`min-width: auto\`
guarantees it never is. The \`.sk-truncate\` utility therefore includes
\`min-inline-size: 0\` rather than leaving it to the caller.

### 4. flex-basis, not width

\`flex-basis\` states an *ideal* width the layout may depart from. \`width\` states a
demand. Sidebars, search fields and card columns all use basis:

\`\`\`css
.sk-side-nav { flex: 0 0 16rem; }              /* ideal 16rem, never grows */
.sk-search   { flex: 1 1 20rem; max-inline-size: 32rem; }  /* wants 20rem, takes more */
\`\`\`

## The breakpoint-free two-column layout

\`\`\`css
.sk-sidebar-layout {
  display: flex;
  flex-wrap: wrap;
  gap: var(--sk-space-24);
}
.sk-sidebar-layout__sidebar { flex: 1 1 18rem;  min-inline-size: 0; }
.sk-sidebar-layout__content { flex: 999 1 60%;  min-inline-size: 0; }
\`\`\`

The sidebar wants 18rem. The content refuses to go below 60% of the row. When both
cannot be satisfied, the flex container wraps them onto separate rows. That is the
entire responsive mechanism — no media query, and it triggers on *container* width,
which is what you actually wanted.

## When to use grid

Grid earns its place when rows and columns must align in two dimensions: card
grids, dashboard tiles, form layouts with aligned label columns. Use \`auto-fit\`
with a \`min()\` guard so it still needs no breakpoints:

\`\`\`css
grid-template-columns: repeat(auto-fit, minmax(min(18rem, 100%), 1fr));
\`\`\`

The \`min(18rem, 100%)\` is essential. Without it, a container narrower than 18rem
overflows instead of collapsing to a single column.

Never use \`grid-auto-flow: dense\` — it reorders items visually while leaving DOM
order alone, which desynchronises focus order from visual order and is a documented
WCAG failure (2.4.3).

## Breakpoints, where they are still needed

| Name | Min width | Columns | Purpose |
|---|---|---|---|
| xs | 0 | 4 | Phone. Single column. |
| sm | 30rem / 480px | 4 | Large phone. |
| md | 48rem / 768px | 8 | Tablet. Two-column content viable. |
| lg | 64rem / 1024px | 12 | Laptop. Navigation rail becomes persistent. |
| xl | 80rem / 1280px | 12 | Desktop. Detail panels sit beside content. |
| 2xl | 96rem / 1536px | 12 | Wide. Content capped, margins absorb the rest. |

In practice \`lg\` is the only breakpoint most features need, because it marks the
one genuine layout change: the navigation rail stops being a drawer.

## Container queries

For components that must adapt to their own width rather than the viewport's, use
\`container-type: inline-size\` via the \`.sk-cq\` utility. Prefer flex where flex
suffices — it is simpler and has no containment side effects — but container
queries are the right tool when a component needs a genuinely different layout in a
narrow column.

## Reflow

WCAG 1.4.10 requires content to work at 320px wide without horizontal scrolling,
which is equivalent to 400% zoom on a 1280px display. Sekura satisfies this by
wrapping rather than overflowing, and by giving wide content — tables, code blocks,
tab strips — its own scroll container so the *page* never scrolls sideways.

Those scroll containers need \`tabindex="0"\` and an accessible name, or keyboard
users cannot scroll them at all.`,
    related: ['principles', 'accessibility', 'density'],
  },

  {
    id: 'typography',
    title: 'Typography',
    summary:
      'One sans family, one mono family, and a scale where visual size is decoupled from heading level.',
    rules: [
      'Heading level reflects document structure; type style reflects visual hierarchy. They are not the same axis.',
      'Never set font size below 13px for content.',
      'Body text is capped at roughly 68 characters per line.',
      'Use tabular figures for anything that updates or is compared in a column.',
      'Never disable user zoom.',
    ],
    body: `## Families

- **Inter Variable** for everything in the interface. Chosen for its large x-height,
  unambiguous \`1 l I\` and \`0 O\`, and its variable axis, which lets the whole scale
  ship in one file.
- **JetBrains Mono Variable** for code, identifiers, hostnames, keys and hashes.
  Anything a user compares character by character.

Both are open-licensed. Subset them and self-host with \`font-display: swap\`; a
third-party font CDN adds a request to the critical path and a privacy question you
do not need.

## The scale

Nineteen styles across five families: \`display-*\` (marketing), \`heading-*\`,
\`body-*\`, \`label-*\`, \`code-*\`, plus \`overline\`. Each style is a complete set —
size, line height, weight and tracking — because those four values are only correct
together. Tracking tightens as size grows: large text at default tracking looks
loose and unresolved.

The display and heading styles use \`clamp()\` so they interpolate smoothly with
viewport width rather than jumping at a breakpoint mid-sentence.

## Heading level is not font size

\`<h2>\` means "second-level section of this document". It does not mean 30px. A
dialog title, a card title and a section heading may all be \`heading-md\` visually
while occupying entirely different levels in three different outlines.

Choose the heading *level* from the document structure — so the outline is correct
for screen reader users navigating by heading — and the *style* from the visual
hierarchy. Sekura's reset deliberately strips default heading sizes to force this
choice to be explicit.

## Measure

Body text is capped at \`68ch\` (\`--sk-container-prose\`). Beyond about 75
characters the eye loses its place returning to the next line. Below about 45 it
breaks reading rhythm. Table cells and UI labels are exempt — they are scanned, not
read.

## Numbers

Use \`font-variant-numeric: tabular-nums\` for anything in a column, anything
compared, and anything that updates live. Proportional figures make a live counter
jitter as digits change width, which is distracting in exactly the situation where
you want the user to read the number.

## Text wrapping

- \`text-wrap: balance\` on headings, so short headings do not leave one orphaned
  word on the second line.
- \`text-wrap: pretty\` on body copy, to avoid orphans and bad ragging.
- \`overflow-wrap: anywhere\` on anything that can contain a long unbroken string —
  hostnames, keys, URLs. Without it, one long token forces its container wider than
  the viewport.

## Accessibility

- Never set \`user-scalable=no\` or \`maximum-scale=1\`. It fails WCAG 1.4.4 outright.
- Text must survive 200% zoom without loss (1.4.4) and reflow at 320px (1.4.10).
- Users must be able to override spacing — line height to 1.5×, paragraph spacing
  to 2× — without content being clipped (1.4.12). This is why Sekura uses
  \`min-block-size\` rather than fixed heights on text-bearing elements.
- Set \`lang\` on \`<html>\`, and on any element whose language differs (3.1.2).`,
    related: ['color', 'accessibility', 'content-and-voice'],
  },

  {
    id: 'spacing',
    title: 'Spacing and rhythm',
    summary: 'A 4px grid with pixel-named tokens, applied through gap rather than margins.',
    rules: [
      'All spacing comes from the scale. There are no arbitrary values.',
      'Layout primitives own spacing; children have no margins.',
      'Use gap, not margins, for spacing between siblings.',
      'Related things are closer together than unrelated things — proximity is a grouping signal.',
    ],
    body: `## The scale

4px base. Token names are the pixel value at a 16px root, so \`--sk-space-12\` is
unambiguously 12px and needs no mental arithmetic from a t-shirt size.

\`0, 1, 2, 4, 6, 8, 10, 12, 16, 20, 24, 28, 32, 40, 48, 56, 64, 80, 96, 128\`

Values are emitted in \`rem\` so they scale with the user's root font size. A user
who has set a 20px default gets proportionally larger spacing, which is the point.

## gap, not margin

Spacing between siblings belongs to the parent, not to the children:

\`\`\`css
/* Yes */
.sk-stack { display: flex; flex-direction: column; gap: var(--sk-space-16); }
.sk-stack > * { margin-block: 0; }

/* No */
.card + .card { margin-top: 16px; }
\`\`\`

\`gap\` does not collapse, does not need \`:last-child\` exceptions, and works
identically in flex and grid. It also means a component can be moved between
containers without carrying spacing assumptions with it.

## Applied rhythm

| Relationship | Space |
|---|---|
| Label to its control | 6 |
| Between form fields | 16 |
| Between field groups | 24 |
| Between page sections | 32 |
| Between major regions | 48 |
| Inside a button (inline) | 16 |
| Inside a card | 16 |
| Between adjacent buttons | 8 |

## Proximity carries meaning

The gap between a label and its input must be visibly smaller than the gap between
one field and the next, or the label appears to belong to the field above it. This
is not a stylistic preference — mis-grouped labels are a genuine usability failure,
and one that survives review because everyone reading the form already knows what
it says.

## Density

Density modes (comfortable, compact, dense) change control padding and row height
only. They never reduce text below \`body-sm\`, and never reduce a hit target below
24×24 CSS px. Dense mode is for data grids and log views, must always offer a way
back to comfortable, and must never be the default for a first-time user.`,
    related: ['responsive-layout', 'density', 'typography'],
  },

  {
    id: 'elevation',
    title: 'Elevation and depth',
    summary: 'Six levels, expressed as shadow in light mode and as surface lightness in dark mode.',
    rules: [
      'Every elevated component pairs a shadow token with a surface token.',
      'Elevation communicates stacking order, not importance.',
      'Keep borders on elevated surfaces — in dark mode the border does the separating.',
      'Do not invent a shadow outside the scale.',
    ],
    body: `## The scale

| Level | Surface | Use |
|---|---|---|
| 0 | base | Flush with the page. |
| 1 | raised | Cards, table containers, resting input wells. |
| 2 | raised | Hovered card, sticky table header, segmented control. |
| 3 | overlay | Dropdown menus, popovers, comboboxes. |
| 4 | overlay | Modal dialogs, drawers, command palette. |
| 5 | overlay | Toasts floating above everything. |

## Why elevation is two tokens, not one

In light mode elevation is a shadow: the surface stays white and the shadow does
all the work. In dark mode a drop shadow against a near-black page is almost
invisible, so elevation is carried by **surface lightness** instead — a raised
surface is lighter than the page, and an overlay is lighter still.

That is why every elevated component specifies both:

\`\`\`css
.sk-card {
  background-color: var(--sk-color-surface-raised);  /* lighter on dark */
  border: 1px solid var(--sk-color-border-default);  /* does the work on dark */
  box-shadow: var(--sk-elevation-1);                 /* does the work on light */
}
\`\`\`

Drop any one of the three and the component is wrong in one of the two themes.

## Recessed surfaces invert

\`surface-sunken\` — code blocks, drop zones, inactive tab strips — goes *darker*
than the page in dark mode, the opposite direction from floating surfaces. This is
the one place where a dark-mode surface should be darker than its parent.

## Shadows are never brand-coloured

Shadows use a neutral near-black at low alpha. Coloured shadows read as a glow, and
a glow reads as a state (focus, selection, error) rather than as depth.`,
    related: ['dark-mode', 'color', 'principles'],
  },

  {
    id: 'motion',
    title: 'Motion',
    summary: 'Motion explains what changed and where it came from. It never makes the user wait.',
    rules: [
      'Nothing user-initiated takes longer than 200ms.',
      'Everything respects prefers-reduced-motion.',
      'Never animate a property that triggers layout.',
      'Motion may not be the only way something is communicated.',
    ],
    body: `## Durations

| Token | Value | Use |
|---|---|---|
| instant | 0ms | Direct-manipulation results. |
| fast | 120ms | Hover, focus, checkbox, switch, tooltip. |
| normal | 200ms | Menus, popovers, accordions, tab panels, toasts. |
| slow | 320ms | Dialogs, drawers, page transitions. |
| slower | 480ms | Large surface reveals, onboarding. |
| deliberate | 640ms | Progress and skeleton loops only. |

The ceiling for anything the user initiated is \`normal\`. A 400ms button state makes
the whole product feel sluggish, and the perception compounds — users do not
attribute it to the animation, they attribute it to the application being slow.

## Easing

- \`standard\` — most transitions.
- \`entrance\` — elements arriving. Decelerates into place.
- \`exit\` — elements leaving. Accelerates away, and is faster than the entrance,
  because nobody wants to watch something leave.
- \`emphasised\` — slight overshoot, for toggles and switches where a little physical
  feedback helps.

## Reduced motion

\`prefers-reduced-motion: reduce\` is a medical accessibility setting, not a
stylistic preference. Sekura zeroes all duration tokens globally under it, and adds
a blanket override for animations and transitions.

Two deliberate exceptions:

- **Spinners** slow to 2s rather than stopping. A frozen spinner communicates
  nothing, and it is the only signal that work is happening.
- **Progress bars** keep their fill transition, because the movement *is* the
  information.

Everything else stops. Parallax, auto-playing carousels, and large-surface slides
are removed entirely.

## What not to animate

Animate \`opacity\`, \`transform\`, \`translate\`, \`scale\` and \`rotate\` — these are
composited and do not trigger layout. Avoid animating \`width\`, \`height\`, \`top\`,
\`left\`, \`margin\` or \`padding\`; they force layout on every frame and are the usual
cause of janky UI.

## Motion is never the only signal

A toast that slides in must also be announced in a live region. A row that
highlights on update must also carry a status. Motion is an accent on a message
that exists without it.`,
    related: ['accessibility', 'principles'],
  },

  {
    id: 'accessibility',
    title: 'Accessibility',
    summary:
      'WCAG 2.2 Level AA is the floor, treated as a component contract rather than a release checklist.',
    rules: [
      'Native elements before ARIA. The first rule of ARIA is not to use ARIA.',
      'Every interactive element is keyboard operable with a visible focus indicator.',
      'Colour is never the only signal.',
      'Every control has an accessible name that includes its visible label.',
      'Minimum target size is 24×24 CSS px.',
      'Dynamic content changes are announced.',
    ],
    body: `## Standard

**WCAG 2.2 Level AA**, plus a few places where Sekura goes further: placeholder and
tertiary text are held to full body contrast, and switch and progress tracks are
treated as meaningful graphics rather than decoration.

## WCAG 2.2's newer criteria

The 2.2 additions are the ones most component libraries have not caught up with:

- **2.4.11 Focus Not Obscured (Minimum).** A focused element must not be hidden
  behind a sticky header. Handled with \`scroll-margin-block-start\` on focus
  targets — set globally in the reset, not per component.
- **2.4.13 Focus Appearance.** The focus indicator needs sufficient area and
  contrast. Sekura's 2px ring with a 2px offset clears it.
- **2.5.7 Dragging Movements.** Anything achievable by dragging must also be
  achievable with a single pointer. File upload has a button; reorderable lists need
  move-up/move-down controls.
- **2.5.8 Target Size (Minimum).** 24×24 CSS px. Sekura enforces it with an
  \`::after\` hit area so a visually small control still has a usable target.
- **3.2.6 Consistent Help.** Help lives in the same place on every page.
- **3.3.7 Redundant Entry.** Do not ask for the same information twice in one flow.
- **3.3.8 Accessible Authentication.** No cognitive function test without an
  alternative. Do not block paste on password fields — it breaks password managers
  and is a security anti-pattern as well as an accessibility one.

## Keyboard

Every interactive element must be reachable and operable by keyboard. Specific
obligations:

- Tab order follows visual order. Never a positive \`tabindex\`.
- Escape closes any overlay and returns focus to what opened it.
- Composite widgets (tabs, menus, trees, segmented controls) take **one** tab stop
  and use arrow keys internally, via a roving tabindex.
- Focus is never lost. When content is removed, move focus somewhere sensible —
  focus falling to \`<body>\` strands the user at the top of the page.
- Any scrollable region needs \`tabindex="0"\` and an accessible name, or keyboard
  users cannot scroll it.

## Naming

Every control needs an accessible name. Prefer a visually hidden \`<span>\` to
\`aria-label\` — it survives translation pipelines that skip attributes, and it is
visible in the DOM where developers will notice if it is wrong.

The name must **contain the visible label** (WCAG 2.5.3). A button reading "Save"
with \`aria-label="Submit form"\` cannot be activated by a voice control user saying
"click Save".

## Live regions

- \`role="status"\` / \`aria-live="polite"\` — announced at the next natural pause.
  Use for confirmations, result counts, loading completion. This is the default.
- \`role="alert"\` / \`aria-live="assertive"\` — interrupts immediately. Reserve for
  genuine failures. Overusing it makes a product hostile to screen reader users.

The live region container must exist in the DOM **before** the message is inserted.
Adding the region and its content together announces nothing — this is the most
common live-region bug.

## Forms

- Visible, persistent labels. A placeholder is not a label.
- Hint above the control, error below it.
- \`aria-describedby\` listing hint then error, in that order — order determines
  reading order.
- \`aria-invalid\` on failure, removed when fixed.
- Group radios and checkboxes in a \`<fieldset>\` with a \`<legend>\`.
- Errors say how to fix, not just that something is wrong.
- Preserve user input when server validation fails.

## Forced colours

Windows High Contrast mode discards author colours entirely. Components that rely
on a background colour to convey state must restore that state with system colours
under \`@media (forced-colors: active)\`, using \`Highlight\`, \`ButtonText\`,
\`GrayText\` and \`Canvas\`.

## Testing

Automated tooling catches roughly a third of real barriers. The remainder needs:

- Keyboard-only traversal of every critical path.
- A screen reader — NVDA with Firefox, VoiceOver with Safari, at minimum.
- 200% zoom and a 320px viewport.
- Reduced motion, forced colours, and both dark and high-contrast themes.

Use \`validate_markup\` to catch the common patterns and \`audit_theme\` to verify
contrast, then do the manual work anyway.`,
    related: ['color', 'dark-mode', 'responsive-layout', 'content-and-voice'],
  },

  {
    id: 'content-and-voice',
    title: 'Content and voice',
    summary: 'Plain, specific, and honest about system state. The interface says what happened.',
    rules: [
      'Sentence case everywhere except proper nouns.',
      'Say what happened and what to do next.',
      'Be specific about scope and quantity.',
      'Never blame the user.',
      'Use absolute timestamps; relative time is supporting detail.',
    ],
    body: `## Voice

Direct, calm, precise. The reader is a competent professional doing their job, not
a guest to be entertained. Skip exclamation marks, skip jokes in error states, and
skip the word "simply" — if it were simple they would not be reading the message.

## Capitalisation

Sentence case for everything: buttons, labels, headings, menu items, table headers.
Title Case slows reading and creates arbitrary decisions about which words to
capitalise. Proper nouns and product names keep their capitalisation.

## Buttons

Verb plus object, naming the specific thing: "Delete zone", not "Delete" and never
"OK". In a confirmation dialog the confirm button repeats the action so it reads
correctly out of context — a screen reader user tabbing to it hears only the button.

## Errors

Three parts, in order: what happened, why, what to do.

> Two of twelve records failed to apply because the parent zone rejected the
> delegation. Retry the change, or open the operation to see which records failed.

Never: "An error occurred." Never: "You entered an invalid value." The system
failed to accept the value; the user did not fail.

Include a correlation ID for technical failures. Never expose raw provider errors,
stack traces, internal hostnames or credential types.

## Specificity

- "3 of 12 records" not "some records".
- "Up to 10 MB" not "file too large".
- "Between 60 and 86400 seconds" not "invalid TTL".

Quantify impact before destructive actions: "This removes 128 records and cannot be
undone."

## Empty states

Four genuinely different situations needing four different messages:

| Situation | Heading | Body |
|---|---|---|
| First use | "No zones yet" | What a zone is, and how to make one. |
| No results | "No zones match your filters" | Which filters, and an offer to clear them. |
| No access | "You do not have access to this zone" | How to request it — without revealing what exists. |
| Error | "Could not load zones" | Retry, plus a correlation ID. |

Using the same copy for first-use and no-results is the most common empty-state
mistake, and it is confusing in both directions.

## Time

Absolute timestamps with the user's timezone, with relative time as supporting
detail: "4 August 2026, 09:12 UTC (2 hours ago)". Relative time alone is
ambiguous the moment the page has been open for a while, and worthless in an audit
log.

Always use \`<time datetime="...">\` with an ISO value.

## Terminology

One word per concept, product-wide. If it is a "zone" on one screen it is not a
"domain" on the next. Define technical terms on first use in a given context.

## Placeholders in examples

Use reserved, obviously-fake values: \`example.com\`, \`192.0.2.10\`,
\`YOUR_API_KEY\`. Never real hostnames, real IPs, real customer names, or real
credentials — including in screenshots.`,
    related: ['accessibility', 'principles'],
  },

  {
    id: 'iconography',
    title: 'Iconography',
    summary: 'A 24px grid, 1.5px strokes, currentColor throughout, and never the only label.',
    rules: [
      'Icons are drawn on a 24px grid with 1.5px strokes and round caps.',
      'Icons inherit currentColor. Never hard-code a fill.',
      'Decorative icons are aria-hidden; meaningful icons need a text alternative.',
      'One glyph per concept, product-wide.',
    ],
    body: `## Construction

- 24×24 viewBox, with a 1px safe margin.
- 1.5px strokes, round caps and joins.
- Optical alignment over mathematical centring — a play triangle centred by maths
  looks off-centre to the eye.
- Rendered at 16px (dense), 20px (default) and 24px (large). Below 16px, strokes
  need to be redrawn rather than scaled.

## Colour

\`fill: currentColor\` — always. An icon that inherits its colour is automatically
correct in every theme, every variant and every state. An icon with a baked-in fill
is a dark-mode bug waiting to be filed.

The exception that catches people out: SVGs embedded as \`background-image\` data
URIs cannot inherit \`currentColor\`. The select chevron is the common case, and it
must be re-declared per theme.

## Meaning

Icons supplement text; they do not replace it. An icon-only control needs a
visually hidden label, and ideally a tooltip as well — they serve different users.

Reuse ruthlessly. One glyph per concept across the whole product. A trash can that
means "delete" on one screen and "archive" on another is worse than no icon.

## Status icons

Status is always colour **plus** icon **plus** text. The icons are distinguishable
by shape, not only by hue:

| Intent | Shape |
|---|---|
| Success | Tick in a circle |
| Warning | Exclamation in a triangle |
| Danger | Cross in a circle |
| Info | Lowercase i in a circle |
| Pending | Ring outline, not a filled dot |

Pending is deliberately a ring rather than a fill, so it is distinguishable from
settled states by shape alone.

## Delivery

Ship as an SVG sprite referenced with \`<use href="#sk-icon-name">\`. One request,
cached, and every instance inherits \`currentColor\`. Add \`aria-hidden="true"\` and
\`focusable="false"\` — the latter matters for older engines that make SVGs
focusable by default.`,
    related: ['color', 'accessibility', 'dark-mode'],
  },

  {
    id: 'density',
    title: 'Density',
    summary: 'Three modes that change control size without ever compromising legibility or hit targets.',
    rules: [
      'Density changes padding and row height only.',
      'Never below body-sm text, never below a 24×24 hit target.',
      'Comfortable is the default and must always be reachable.',
      'Density is a user preference, persisted per user.',
    ],
    body: `## The modes

**Comfortable** (default) — mixed-ability audiences, touch input, marketing
surfaces. 40px controls, 12px row padding.

**Compact** — operator consoles and admin tools where more rows on screen is worth
a tighter rhythm. 36px controls, 8px row padding.

**Dense** — data grids and log views only. 32px controls, 4px row padding. Always
offer a way back, and never make it the default for a first-time user.

## What density does not change

- Font size never drops below \`body-sm\` (14px).
- Hit targets never drop below 24×24 CSS px. Where padding is trimmed, an
  \`::after\` pseudo-element restores the target area — so the control looks dense
  and still behaves correctly.
- Focus indicators keep their full 2px ring and 2px offset.
- Icons stay at least 16px.

## Implementation

Density is a single attribute on the root, so it costs one line to change and
nothing to maintain:

\`\`\`html
<html data-sk-density="compact">
\`\`\`

Components consume \`--sk-control-height-md\`, \`--sk-control-padding-inline\` and
friends rather than hard-coding sizes, which is what makes the switch instant.

## Choosing

Match density to the task, not to taste. A user reading a log file wants density. A
user filling in a form they will complete once wants comfortable. When in doubt,
comfortable — it is far easier to recover from "this feels roomy" than from "I
cannot hit the button".`,
    related: ['spacing', 'accessibility', 'responsive-layout'],
  },

  {
    id: 'internationalisation',
    title: 'Internationalisation and RTL',
    summary: 'Logical properties throughout, so right-to-left works without a second stylesheet.',
    rules: [
      'Use logical properties everywhere. Never left/right, never margin-left.',
      'Never concatenate translated strings.',
      'Allow 30–50% text expansion in every layout.',
      'Format dates, numbers and currency with Intl, never by hand.',
    ],
    body: `## Logical properties

Sekura uses logical properties throughout, with no exceptions:

| Physical | Logical |
|---|---|
| \`width\` / \`height\` | \`inline-size\` / \`block-size\` |
| \`margin-left\` | \`margin-inline-start\` |
| \`padding-top\` | \`padding-block-start\` |
| \`border-left\` | \`border-inline-start\` |
| \`text-align: left\` | \`text-align: start\` |
| \`left: 0\` | \`inset-inline-start: 0\` |

Setting \`dir="rtl"\` then mirrors the entire interface with no additional CSS. This
is why every component in this system specifies \`inline-size\` rather than
\`width\` — it is not pedantry, it is the whole RTL strategy.

## What does not mirror

- Icons representing physical objects or absolute direction: clocks, media
  play/pause, volume.
- Numbers, and charts with a time axis.
- Logos.

Icons that *do* mirror: back and forward arrows, chevrons in disclosures and
breadcrumb separators, list indent guides, progress direction.

Keyboard handlers need explicit direction awareness too: Arrow Right should move to
the *previous* item in an RTL tab list. CSS mirrors automatically; JavaScript does
not.

## Text expansion

German runs 30–50% longer than English; Finnish and Russian longer still. Layouts
must absorb this. Flex-first composition helps enormously — a wrapping cluster
handles a long label by taking a second line, whereas a fixed grid clips it.

Never set a fixed width on a control sized to its English label.

## Strings

Never concatenate. \`"Delete " + count + " records"\` is unlocalisable, because
word order and pluralisation rules differ. Use full parameterised strings with
proper plural categories — Arabic has six.

Do not put text in images. Do not encode meaning in string casing; some languages
have no case distinction.

## Formatting

Use \`Intl.DateTimeFormat\`, \`Intl.NumberFormat\` and \`Intl.RelativeTimeFormat\`.
Hand-rolled formatting produces wrong separators, wrong date orders and wrong
currency placement.

Technical identifiers — hostnames, record types, IP addresses — are **not**
translated and stay LTR even in an RTL layout. Wrap them in an element with
\`dir="ltr"\`, or a mixed-direction string will render in a genuinely confusing
order.

## Language attributes

\`lang\` on \`<html>\`, and on any element whose language differs from the page
(WCAG 3.1.1 and 3.1.2). Screen readers switch voice and pronunciation rules based
on it.`,
    related: ['typography', 'accessibility', 'responsive-layout'],
  },

  {
    id: 'data-visualisation',
    title: 'Data visualisation',
    summary: 'Eight colourblind-safe categorical series, audited per theme, never relying on colour alone.',
    rules: [
      'Maximum eight categorical series. Beyond that, group into "Other".',
      'Every series is distinguishable without colour.',
      'Charts always have an accessible text alternative.',
      'Never truncate a bar chart axis.',
    ],
    body: `## The palette

Eight categorical series, ordered so the first four stay distinguishable under
deuteranopia and protanopia — the two most common forms of colour vision
deficiency. Series step lighter in dark themes and are each audited at 3:1 against
the plot background.

Order: cobalt, aqua, amber, crimson, violet, jade, azure, neutral.

A ninth colour does not add a ninth readable series; it makes all nine harder to
tell apart. Group the tail into "Other".

## Beyond colour

Colour alone is never sufficient:

- **Line charts** — vary dash pattern and marker shape as well as colour.
- **Bar charts** — direct-label where possible, so no legend lookup is needed.
- **Pie and donut** — direct-label, and reconsider whether a bar chart is better.
  It usually is.
- **Heatmaps** — pair a sequential ramp with a value label at each cell, or offer a
  table view.

## Text alternatives

Every chart needs one. In order of preference:

1. A visible data table beside or beneath the chart, in a disclosure.
2. A \`<figcaption>\` describing the trend and the notable values.
3. \`role="img"\` with a thorough \`aria-label\` — the weakest option, because it
   collapses the whole chart to one string.

Never ship a chart with only an alt text of "chart".

## Axes

- Bar chart axes **always** start at zero. A truncated axis exaggerates
  differences, and that is a correctness issue, not a style one.
- Line charts may truncate, but must label the range clearly.
- Gridlines use \`--sk-color-chart-grid\`, deliberately faint — they orient, they do
  not compete.
- Axis labels are text and are held to 4.5:1.

## Interaction

- Tooltips must have a keyboard equivalent; hover-only data is invisible to
  keyboard users.
- Provide a data table as the accessible interaction path.
- Announce filter and range changes politely.

## Dark mode

The plot background is \`surface-base\`, not a raised surface — a chart on a lighter
panel in dark mode makes the series colours read as washed out. Series step up the
ramp exactly as brand colours do.`,
    related: ['color', 'accessibility', 'dark-mode'],
  },

  {
    id: 'theming',
    title: 'Theming and white-labelling',
    summary: 'How to re-brand Sekura without forking it, and what you must re-verify when you do.',
    rules: [
      'Override primitives, never components.',
      'Re-run the contrast audit after any palette change. It is a build gate.',
      'A brand colour that fails contrast must be adjusted, not exempted.',
      'Keep the semantic token names identical.',
    ],
    body: `## The supported extension point

Re-theming means replacing primitive ramp values and letting the semantic layer
re-resolve. It does not mean editing component CSS.

\`\`\`css
:root {
  --sk-palette-cobalt-600: #7c3aed;  /* new brand hue */
  --sk-palette-cobalt-400: #a78bfa;  /* the dark-mode step */
  --sk-palette-cobalt-700: #6d28d9;
}
\`\`\`

Every button, link, focus ring, selected row and active tab follows, in all four
themes, with no component changes.

## You must supply both directions

A brand colour is not one value. Light mode needs a step dark enough for white text
(4.5:1); dark mode needs a step light enough to hold weight against a dark page,
with dark text on top. Supplying only the light-mode value is the most common
white-labelling mistake, and it produces a dark theme where the primary button is
an unreadable dark blob.

## Verify, do not assume

After any palette change, run \`audit_theme\`. It checks 73 declared pairings across
four themes. A brand colour that fails is not an exception to be documented — it is
a colour that has to move. Use \`suggest_token\` or \`check_contrast\` to find the
nearest step that passes.

Wire it into CI:

\`\`\`bash
npm run audit:contrast   # non-zero exit on any failure
\`\`\`

## Multiple brands in one application

Scope the overrides:

\`\`\`css
[data-sk-brand="acme"] { --sk-palette-cobalt-600: #b45309; }
\`\`\`

Themes and brands are independent axes: \`data-sk-theme\` × \`data-sk-brand\` ×
\`data-sk-density\` all compose.

## What you may not change

- Semantic token **names**. Renaming them breaks every component.
- The focus ring treatment. One ring, everywhere, is a system guarantee.
- The spacing scale. Density modes are the supported way to change rhythm.
- Contrast thresholds. They are the floor, not a default.`,
    related: ['color', 'dark-mode', 'principles'],
  },
];

const byId = new Map(foundations.map((f) => [f.id, f]));

export function getFoundation(id: string): Foundation | undefined {
  return byId.get(id.toLowerCase().trim());
}
