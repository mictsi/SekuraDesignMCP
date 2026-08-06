# Sekura Design System

**Version 1.0.0** · A design and UX specification for accessible, dark-mode-first
product interfaces.

This document is the human-readable specification. The same content is served
machine-readable over MCP by the server in this repository, so an agent building an
interface can query it directly rather than reading prose. See `README.md` for how
to run it.

---

## Contents

1. [Purpose and scope](#1-purpose-and-scope)
2. [Design principles](#2-design-principles)
3. [Token architecture](#3-token-architecture)
4. [Colour](#4-colour)
5. [Dark mode](#5-dark-mode)
6. [Typography](#6-typography)
7. [Spacing, density and rhythm](#7-spacing-density-and-rhythm)
8. [Responsive layout](#8-responsive-layout)
9. [Elevation and depth](#9-elevation-and-depth)
10. [Motion](#10-motion)
11. [Iconography](#11-iconography)
12. [Component contract](#12-component-contract)
13. [Component catalogue](#13-component-catalogue)
14. [Layout recipes](#14-layout-recipes)
15. [UX patterns](#15-ux-patterns)
16. [Content and voice](#16-content-and-voice)
17. [Accessibility](#17-accessibility)
18. [Internationalisation](#18-internationalisation)
19. [Data visualisation](#19-data-visualisation)
20. [Theming and white-labelling](#20-theming-and-white-labelling)
21. [Governance](#21-governance)
22. [Design review checklist](#22-design-review-checklist)

---

## 1. Purpose and scope

Sekura defines the visual language, interaction model, accessibility contract and
content standards for every Sekura product surface.

**In scope:** every screen, component, state, empty state, error state and
administrative workflow in a Sekura application, in light and dark themes, at every
supported viewport, on every supported input method.

**Out of scope:** brand marketing collateral, print, and third-party embedded
interfaces.

The system targets an interface that is dense enough for expert work, calm under
failure, explicit about impact, and safe by default.

### What makes this specification unusual

Three things are deliberately different from most design systems:

- **Dark mode is specified, not derived.** Every component documents what changes in
  dark mode and why. Dark mode is a first-class theme with its own rules, not a
  filter applied to the light theme.
- **The contrast contract is machine-verified.** The system declares 73 colour
  pairings and verifies all of them across four themes — 292 checks — on every
  build. A palette change that breaks a promise fails the build.
- **Layout is flex-first.** Composition primitives wrap rather than overflow, and
  widths are ideals rather than demands, so most layouts respond to their
  **container** and need no media query at all.

---

## 2. Design principles

### 2.1 Semantic before literal

Product code references `--sk-color-text-primary`. It never references `#181e27`,
and it never references `--sk-palette-neutral-900`.

A component that names a *role* can be re-themed. A component that names a *value*
cannot. This single rule is what makes four themes cost the same as one.

The practical test: if you can grep a component's CSS for a hex value, the component
is broken — and it is broken specifically in dark mode.

### 2.2 Dark mode is a peer, not a filter

Dark mode is not light mode inverted. Elevation reverses direction, saturated hues
step up rather than down, and borders take over the separation work that shadows do
in light mode. Section 5 covers this in full.

### 2.3 Never carry meaning in colour alone

Every status pairs a colour with an icon and a text label. Every selected state
pairs a tint with a border or a bar. Every delta pairs a colour with an arrow and a
description.

This is WCAG 1.4.1, but it is also simply correct: roughly one in twelve men has
some form of colour vision deficiency, and everyone loses colour fidelity in bright
sunlight.

The dark-mode consequence is sharper than expected. The subtle tints that carry
selection in light mode have no dark equivalent that is both visible and calm —
`cobalt-950` against `neutral-950` is nearly identical in lightness. **In dark mode
the bar is the signal and the tint is decoration.** Ship only the tint and
dark-mode users see no selection at all.

### 2.4 Flex first

Horizontal groups wrap rather than overflow. Children declare `flex` explicitly.
Anything containing text sets `min-inline-size: 0`. Widths are expressed as
`flex-basis`, not `width`. Section 8 covers this in full.

### 2.5 Accessible by construction

Accessibility is a property of the component contract, not a phase before release.
Every component documents its role, keyboard model, ARIA obligations and target
size. Every promised colour pairing is verified automatically.

Automated checks catch perhaps a third of real barriers. The rest needs a keyboard
and a screen reader.

### 2.6 State the truth about system state

An interface that says "Saved" when work is queued is lying. Distinguish requested,
pending, applied, failed, conflicted and degraded, and show the one that is actually
true. This is a design principle because the temptation to smooth it over is a
design temptation.

### 2.7 One way to do each thing

One focus ring. One spacing scale. One set of status colours. One elevation scale.
When a component needs something the system lacks, extend the system deliberately —
local exceptions are how a design system becomes a stylesheet.

---

## 3. Token architecture

Three layers, and product code may only touch the middle one.

```
Primitives          Semantic                    Components
──────────          ────────                    ──────────
cobalt-600     →    color-action-primary-bg  →  .sk-button--primary
#3a4fdd             (per theme)                 background-color: var(--sk-color-action-primary-bg)
```

**Primitives** are raw, context-free values. Eight ramps of 11–13 steps.
`cobalt-600` means nothing on its own.

**Semantic tokens** name roles. Each resolves to a different primitive per theme.
112 tokens across nine groups: surface, text, border, focus, action, status, form,
chart, ai.

**Components** consume semantic tokens and never choose a primitive.

### Naming

```
--sk-{group}-{role}-{variant}-{state}

--sk-color-surface-raised
--sk-color-action-primary-bg-hover
--sk-color-status-danger-on-solid
--sk-space-16
--sk-radius-lg
```

### Scales

| Scale | Values |
|---|---|
| Spacing | 20 steps, 4px base, named by pixel value |
| Radius | none, xs, sm, md, lg, xl, 2xl, 3xl, full |
| Border width | hairline, thin, thick, heavy, accent |
| Elevation | 0–5, theme-dependent |
| Duration | instant, fast, normal, slow, slower, deliberate |
| Easing | standard, entrance, exit, emphasised, linear |
| Z-index | below … debug, 13 named layers |
| Breakpoints | xs, sm, md, lg, xl, 2xl |
| Type scale | 19 complete styles |

### Distribution

Tokens export to CSS custom properties, SCSS, W3C DTCG JSON, Tailwind v3 and v4,
JS/TS, Swift, Android XML and Figma Tokens Studio format. All generated from one
source, so a primitive edit propagates everywhere in one step.

---

## 4. Colour

### 4.1 Primitive ramps

| Ramp | Role |
|---|---|
| `neutral` | Cool grey, slightly blue-cast. Surfaces, text, borders. |
| `cobalt` | Brand hue. Primary actions, selection, focus. |
| `aqua` | Secondary accent. Non-action emphasis. |
| `jade` | Success, healthy, applied. |
| `amber` | Warning, degraded. |
| `crimson` | Error, destructive, failed. |
| `azure` | Informational, in progress. |
| `violet` | **Reserved** for AI and automation affordances. |

### 4.2 Two steps are pinned by contrast, not by eye

- **`neutral-400` = `#8590a3`** — the lightest grey that still clears **3:1 on
  white**, so borders drawn with it remain locatable (WCAG 1.4.11).
- **`neutral-500` = `#676f82`** — the lightest grey that clears **4.5:1 on the
  subtle surface**, so tertiary text stays readable wherever it appears.

Moving either lighter breaks a promise the system makes, and the audit will catch
it.

### 4.3 The contrast contract

The system declares 73 pairings and verifies each in all four themes.

| Use | Ratio | Criterion |
|---|---|---|
| Body text | 4.5:1 | 1.4.3 |
| Large text (24px, or 18.66px bold) | 3:1 | 1.4.3 |
| Control boundaries, icons, focus rings, chart series | 3:1 | 1.4.11 |
| Disabled controls | exempt | 1.4.3 exception |

Sekura exceeds WCAG in three places where real products commonly fail:

- **Placeholder text** is held to full 4.5:1 body contrast.
- **Tertiary text** is held to 4.5:1, not treated as decorative.
- **Switch and progress tracks** are treated as meaningful graphical objects at 3:1,
  because "off" must be visible rather than merely absent.

A pairing not declared in the contract is not promised, and must not be used to
carry meaning.

### 4.4 Status colours

Five intents, each supplying five roles — `surface`, `border`, `text`, `solid`,
`on-solid` — which is enough to build a tinted banner, an outlined chip or a solid
badge without inventing a colour.

**Amber is the difficult one.** It is intrinsically light, so
`status-warning-on-solid` is dark in every theme — the only status where that is
true. Reusing the white-on-solid pattern from the other intents produces roughly
1.9:1 and fails.

### 4.5 Violet is reserved

Violet marks AI and automation affordances so machine-generated content is never
mistaken for a user action or a confirmed fact. Do not use it as a general accent.

---

## 5. Dark mode

### 5.1 The elevation inversion

This is the rule everything else follows from.

| Surface | Light | Dark |
|---|---|---|
| Page | `neutral-0` (white) | `neutral-950` |
| Sunken — code wells, drop zones | `neutral-100` | `neutral-975` — **darker** than the page |
| Raised — cards, panels | `neutral-0` + shadow | `neutral-900` — **lighter** than the page |
| Overlay — menus, dialogs | `neutral-0` + bigger shadow | `neutral-850` — lighter still |

In light mode every surface is white and the shadow does the work. In dark mode the
shadow contributes almost nothing, so **lightness** does the work instead.

A component that expresses elevation only through `box-shadow` looks correct in
light mode and flat in dark mode. **Keep the border** — on a dark page it is
frequently the only thing separating a card from what is behind it.

### 5.2 Borders go darker, not lighter

Counter-intuitive, and the most common dark-mode bug in tables. A separator rule is
`neutral-200` in light mode. The instinct is to lighten it for dark; the correct
value is `neutral-800`, which is *further from white*. A light rule on a dark page
produces bright lines that visually outrank the data they separate.

### 5.3 Saturated colour steps up

`cobalt-600` is a confident blue on white and a muddy near-black on `neutral-950`.
Every brand and status fill moves **up** the ramp in dark mode — `600 → 400` — which
means the text on top flips from white to near-black. This is why
`--sk-color-action-primary-text` is a token rather than a constant.

Tinted status surfaces need the same treatment but more so. The light-mode tint is
the `50` step; the dark-mode equivalent is the `950` step — a deep, saturated,
nearly-black version of the hue — **not** a darkened `50`, which reads as muddy
grey.

### 5.4 The nine things that break silently

These pass a design review and fail in production:

1. **`color-scheme` not set.** Scrollbars, native select popups, spellcheck
   underlines, date pickers and form control internals all stay light. This is what
   makes a dark mode look retrofitted rather than designed.
2. **Theme applied after paint.** A flash of light theme on every load. The theme
   script must be inline in `<head>` and synchronous, before any stylesheet.
3. **Chrome's autofill background.** A hard-coded pale yellow with no supported
   override. Paint over it with a large inset box-shadow and set
   `-webkit-text-fill-color`.
4. **SVG chevrons in data URIs.** A stroke colour baked into a `background-image`
   cannot inherit `currentColor`. Re-declare per theme, or the select arrow vanishes.
5. **WebKit's search clear button.** A dark glyph that disappears on a dark field.
   Suppress `::-webkit-search-cancel-button` and supply your own.
6. **Raster illustrations.** A flat PNG will be wrong in one theme. Use inline SVG
   with `currentColor`, or two files behind a `prefers-color-scheme` query.
7. **Opacity for disabled states.** Opacity on a dark surface collapses toward the
   background much faster than on a light one. Use an explicit colour.
8. **Scrims too weak.** A 48% scrim over an already-dark page produces almost no
   perceived change, so the page does not read as inactive. Dark uses 64%.
9. **Syntax highlighting.** A light-mode highlight palette on a dark background is
   the classic developer-tool failure. Map highlight roles onto the audited chart
   palette so they inherit verified contrast.

### 5.5 Theme selection

Offer **three** options — System, Light, Dark — with System as the default. A
two-state toggle silently overrides the user's OS preference the moment they touch
it, and they can never return to "follow the system".

High contrast is a **separate axis**, driven by `prefers-contrast: more`, producing
`hc-light` and `hc-dark`. Do not conflate it with dark mode.

Announce theme changes in a polite live region — the visual change is completely
silent to a screen reader user.

---

## 6. Typography

### 6.1 Families

- **Inter Variable** — the entire interface. Large x-height, unambiguous `1 l I` and
  `0 O`, single variable file.
- **JetBrains Mono Variable** — code, identifiers, hostnames, keys, hashes. Anything
  compared character by character.

Both open-licensed. Subset and self-host with `font-display: swap`.

### 6.2 The scale

19 styles across five families — `display-*`, `heading-*`, `body-*`, `label-*`,
`code-*`, plus `overline`. Each is a complete set (size, line height, weight,
tracking) because those four values are only correct together. Tracking tightens as
size grows.

Display and heading styles use `clamp()` so they interpolate with viewport width
rather than jumping at a breakpoint mid-sentence.

### 6.3 Heading level is not font size

`<h2>` means "second-level section of this document". It does not mean 30px. A
dialog title, a card title and a section heading may all be `heading-md` visually
while occupying different levels in three different outlines.

Choose the heading **level** from document structure, and the **style** from visual
hierarchy. The reset strips default heading sizes to force this choice to be
explicit.

### 6.4 Measure and numbers

Body text is capped at `68ch`. Table cells and UI labels are exempt — they are
scanned, not read.

Use `font-variant-numeric: tabular-nums` for anything in a column, compared, or
updating live. Proportional figures make a live counter jitter as digits change
width.

---

## 7. Spacing, density and rhythm

### 7.1 Scale

4px base. Token names are the pixel value at a 16px root, so `--sk-space-12` is
unambiguously 12px:

`0, 1, 2, 4, 6, 8, 10, 12, 16, 20, 24, 28, 32, 40, 48, 56, 64, 80, 96, 128`

Emitted in `rem` so they scale with the user's root font size.

### 7.2 gap, not margin

Spacing between siblings belongs to the parent:

```css
/* Yes */
.sk-stack { display: flex; flex-direction: column; gap: var(--sk-space-16); }
.sk-stack > * { margin-block: 0; }

/* No */
.card + .card { margin-top: 16px; }
```

`gap` does not collapse, needs no `:last-child` exceptions, and works identically in
flex and grid.

### 7.3 Applied rhythm

| Relationship | Space |
|---|---|
| Label to control | 6 |
| Between form fields | 16 |
| Between field groups | 24 |
| Between page sections | 32 |
| Between major regions | 48 |
| Adjacent buttons | 8 |

The gap between a label and its input **must** be visibly smaller than the gap
between fields, or the label appears to belong to the field above it.

### 7.4 Density

Three modes changing control padding and row height only.

| Mode | Control | Row padding | Use |
|---|---|---|---|
| Comfortable | 40px | 12px | Default. Mixed audiences, touch, marketing. |
| Compact | 36px | 8px | Operator consoles, admin tools. |
| Dense | 32px | 4px | Data grids and log views only. |

Density **never** reduces text below `body-sm` (14px) or a hit target below 24×24
CSS px. Where padding is trimmed, an `::after` pseudo-element restores the target
area. Dense mode always offers a way back and is never the default for a first-time
user.

---

## 8. Responsive layout

### 8.1 Why flex first

A breakpoint asks "how wide is the *viewport*?" — the wrong question. A card does
not care about the viewport; it cares about the column it is in. The same card in a
sidebar and in a full-width region needs different layouts at the same viewport
width.

Flex answers the right question implicitly. A wrapping flex row reflows when *its
container* runs out of room. Most Sekura layouts therefore contain no media query,
and the ones that do are shell-level decisions rather than content decisions.

### 8.2 The four habits

**1. Wrap by default.**

```css
.sk-cluster { display: flex; flex-wrap: wrap; gap: var(--sk-space-8); }
```

A toolbar that wraps to two lines at 360px is working. A toolbar that produces a
horizontal scrollbar is broken. If wrapping is genuinely wrong — a tab strip — pair
`nowrap` with an explicit overflow strategy. Never `nowrap` alone.

**2. Declare flex explicitly.**

```css
.sk-cluster > *   { flex: 0 1 auto; min-inline-size: 0; }
.sk-cluster__grow { flex: 1 1 auto; min-inline-size: 0; }
.sk-button__icon  { flex: 0 0 auto; }
```

**3. `min-inline-size: 0` — the most important line in the system.**

A flex item's default is `min-width: auto`, which means **it will not shrink below
its content's intrinsic size**. A long hostname, a wide table, or a `nowrap` label
will push its flex parent wider than the container, and the whole page scrolls
sideways.

```css
.sk-app-shell__main {
  flex: 1 1 auto;
  min-inline-size: 0;   /* without this, a wide table breaks the entire shell */
  overflow-y: auto;
}
```

Text truncation also fails silently without it: `text-overflow: ellipsis` needs the
element to be narrower than its content, and `min-width: auto` guarantees it never
is.

**4. `flex-basis`, not `width`.**

`flex-basis` states an *ideal* width the layout may depart from. `width` states a
demand.

```css
.sk-side-nav { flex: 0 0 16rem; }
.sk-search   { flex: 1 1 20rem; max-inline-size: 32rem; }
```

### 8.3 The breakpoint-free two-column layout

```css
.sk-sidebar-layout { display: flex; flex-wrap: wrap; gap: var(--sk-space-24); }
.sk-sidebar-layout__sidebar { flex: 1 1 18rem;  min-inline-size: 0; }
.sk-sidebar-layout__content { flex: 999 1 60%;  min-inline-size: 0; }
```

The sidebar wants 18rem. The content refuses to go below 60% of the row. When both
cannot be satisfied, the container wraps them onto separate rows. That is the entire
responsive mechanism, and it triggers on **container** width.

### 8.4 When to use grid

Grid earns its place for genuine two-dimensional alignment: card grids, dashboard
tiles, aligned form columns. Use `auto-fit` with a `min()` guard:

```css
grid-template-columns: repeat(auto-fit, minmax(min(18rem, 100%), 1fr));
```

The `min(18rem, 100%)` is essential — without it a container narrower than 18rem
overflows instead of collapsing to one column.

Never use `grid-auto-flow: dense`. It reorders items visually while leaving DOM
order alone, desynchronising focus order from visual order (WCAG 2.4.3 failure).

### 8.5 Breakpoints

| Name | Min | Columns | Purpose |
|---|---|---|---|
| xs | 0 | 4 | Phone. Single column. |
| sm | 30rem / 480px | 4 | Large phone. |
| md | 48rem / 768px | 8 | Tablet. Two-column content viable. |
| lg | 64rem / 1024px | 12 | Laptop. Navigation rail becomes persistent. |
| xl | 80rem / 1280px | 12 | Desktop. Detail panels beside content. |
| 2xl | 96rem / 1536px | 12 | Wide. Content capped. |

In practice `lg` is the only breakpoint most features need, because it marks the one
genuine layout change.

### 8.6 Reflow

WCAG 1.4.10 requires content to work at 320px without horizontal scrolling —
equivalent to 400% zoom on a 1280px display. Sekura satisfies this by wrapping
rather than overflowing, and by giving wide content its own scroll container so the
**page** never scrolls sideways.

Those scroll containers need `tabindex="0"` and an accessible name, or keyboard
users cannot scroll them at all.

---

## 9. Elevation and depth

| Level | Surface | Use |
|---|---|---|
| 0 | base | Flush with the page. |
| 1 | raised | Cards, table containers, input wells. |
| 2 | raised | Hovered card, sticky table header. |
| 3 | overlay | Menus, popovers, comboboxes. |
| 4 | overlay | Dialogs, drawers, command palette. |
| 5 | overlay | Toasts. |

Elevation is **two tokens, not one**. Every elevated component pairs a shadow with a
surface:

```css
.sk-card {
  background-color: var(--sk-color-surface-raised);  /* lighter on dark */
  border: 1px solid var(--sk-color-border-default);  /* does the work on dark */
  box-shadow: var(--sk-elevation-1);                 /* does the work on light */
}
```

Drop any one and the component is wrong in one of the two themes.

Shadows are never brand-coloured — a coloured shadow reads as a glow, and a glow
reads as a state.

---

## 10. Motion

| Token | Value | Use |
|---|---|---|
| instant | 0ms | Direct-manipulation results. |
| fast | 120ms | Hover, focus, checkbox, switch, tooltip. |
| normal | 200ms | Menus, popovers, accordions, toasts. |
| slow | 320ms | Dialogs, drawers, page transitions. |
| slower | 480ms | Large surface reveals. |
| deliberate | 640ms | Progress and skeleton loops only. |

**The ceiling for anything the user initiated is `normal`.** A 400ms button state
makes the whole product feel sluggish, and users attribute the delay to the
application, not the animation.

Animate `opacity`, `transform`, `translate`, `scale` and `rotate` — composited, no
layout. Never animate `width`, `height`, `top`, `left`, `margin` or `padding`.

`prefers-reduced-motion: reduce` is a medical accessibility setting. All durations
zero out globally. Two deliberate exceptions: **spinners** slow to 2s rather than
stopping (a frozen spinner communicates nothing), and **progress bars** keep their
fill transition (the movement *is* the information).

Motion is never the only signal. A toast that slides in is also announced.

---

## 11. Iconography

- 24×24 viewBox, 1.5px strokes, round caps and joins, 1px safe margin.
- Optical alignment over mathematical centring.
- Rendered at 16px, 20px and 24px. Below 16px, strokes are redrawn rather than
  scaled.
- **`fill: currentColor` always.** An icon that inherits its colour is automatically
  correct in every theme, variant and state.

The exception that catches people out: SVGs embedded as `background-image` data URIs
cannot inherit `currentColor`. The select chevron is the common case and must be
re-declared per theme.

Status icons are distinguishable by **shape**, not only hue: tick in a circle,
exclamation in a triangle, cross in a circle, `i` in a circle, and a **ring outline**
for pending — deliberately not a filled dot, so it is distinguishable from settled
states by shape alone.

Ship as an SVG sprite referenced with `<use>`, marked `aria-hidden="true"
focusable="false"`.

---

## 12. Component contract

Every component in this system documents, without exception:

| Field | Requirement |
|---|---|
| Summary | What it does, in one paragraph. |
| When to use / when not to use | Both. A component with no "when not to use" is not finished. |
| Anatomy | Every part, marked required or optional. |
| Variants | Each with the situation it is for. |
| Sizes | Each with its control height and type style. |
| States | Rest, hover, focus-visible, active, disabled, and any component-specific states. |
| Props | Name, type, default, description. |
| Tokens used | The semantic tokens consumed. |
| **Dark mode** | What specifically changes, and why. |
| Accessibility | Role, full keyboard model, ARIA obligations, WCAG criteria, screen-reader behaviour, target size. |
| Content | Microcopy rules for text inside it. |
| Do / Don't | Concrete, not generic. |
| Code | Reference HTML with ARIA wiring, plus production CSS. |

### Universal requirements

- Built on a native element wherever one exists. The first rule of ARIA is not to
  use ARIA.
- Keyboard operable with a visible focus indicator.
- Minimum 24×24 CSS px target, enforced by an `::after` hit area where the visual
  box is smaller.
- Correct in light, dark, `hc-light` and `hc-dark`.
- Survives `forced-colors: active`.
- Respects `prefers-reduced-motion`.
- Uses logical properties, so RTL works with no additional CSS.
- Consumes semantic tokens only.

---

## 13. Component catalogue

**55 components across seven categories.** Full specifications are available via
`get_component({ id })`.

### Layout (7)
`app-shell` · `page-header` · `stack` · `cluster` · `sidebar-layout` · `grid` ·
`divider`

The composition primitives. Flex-first, so `stack`, `cluster` and `sidebar-layout`
produce responsive results with no media queries.

### Action (5)
`button` · `icon-button` · `button-group` · `split-button` · `link`

### Form (12)
`form-field` · `text-field` · `textarea` · `select` · `checkbox` · `radio-group` ·
`switch` · `combobox` · `search-field` · `slider` · `file-upload` · `fieldset`

The most accessibility-sensitive group. `form-field` does the label/hint/error
association work once so no individual control repeats it.

### Navigation (9)
`skip-link` · `top-bar` · `side-nav` · `breadcrumbs` · `tabs` · `pagination` ·
`stepper` · `menu` · `command-palette`

### Feedback (8)
`alert` · `toast` · `inline-message` · `progress` · `spinner` · `skeleton` ·
`empty-state` · `status-indicator`

### Data display (10)
`table` · `card` · `stat-tile` · `badge` · `avatar` · `description-list` ·
`code-block` · `kbd` · `timeline` · `tree-view`

### Overlay (4)
`dialog` · `drawer` · `popover` · `tooltip`

---

## 14. Layout recipes

Nine complete page blueprints, each with regions, responsive strategy,
accessibility obligations, dark-mode notes, and paste-ready markup:

| Recipe | Purpose |
|---|---|
| `dashboard` | Metric tiles, primary chart, recent activity. |
| `list-page` | Filterable, sortable, paginated table with bulk actions. |
| `list-detail` | Master list beside a detail panel — inline on wide, modal drawer on narrow. |
| `form-page` | Single-column form with error summary and sticky actions. |
| `wizard` | Multi-step flow with a stepper. |
| `settings` | Section navigation beside grouped controls. |
| `detail-page` | Identity header, metadata, tabbed views. |
| `auth` | Centred card on a plain background. |
| `docs` | Long-form content with section nav and on-page contents. |

---

## 15. UX patterns

Fifteen recurring problems and their answers. Each documents the problem, the
solution, the rules, the accessibility obligations, and the anti-patterns:

`destructive-confirmation` · `form-validation` · `loading-states` ·
`search-and-filter` · `bulk-actions` · `saving` · `notifications` · `permissions` ·
`progressive-disclosure` · `keyboard-shortcuts` · `responsive-tables` ·
`optimistic-ui` · `onboarding` · `error-recovery` · `theme-switching`

Two worth highlighting here:

**Destructive confirmation.** Match friction to consequence. Most destructive
actions deserve **undo**, not a dialog — undo is faster for the common case and
actually protects against the mistake rather than against the click. Reserve typed
confirmation for genuinely irreversible high-impact actions, and always focus the
safe option.

**Bulk actions.** "Select all" is ambiguous. The header checkbox scopes to the
**current page** and shows indeterminate when partially selected. Selecting
everything matching a filter is a separate, explicit escalation — never an implicit
leap.

---

## 16. Content and voice

Direct, calm, precise. The reader is a competent professional, not a guest to be
entertained. No exclamation marks, no jokes in error states, and never the word
"simply".

**Sentence case everywhere** except proper nouns. Title Case slows reading.

**Buttons** are verb plus object, naming the specific thing: "Delete zone", not
"Delete" and never "OK". In a confirmation dialog the confirm button repeats the
action so it reads correctly out of context.

**Errors** have three parts in order — what happened, why, what to do:

> Two of twelve records failed to apply because the parent zone rejected the
> delegation. Retry the change, or open the operation to see which records failed.

Never "An error occurred." Never "You entered an invalid value" — the system failed
to accept the value; the user did not fail.

**Be specific.** "3 of 12 records", not "some records". Quantify impact before
destructive actions.

**Empty states** are four genuinely different situations:

| Situation | Heading | Body |
|---|---|---|
| First use | "No zones yet" | What a zone is, and how to make one. |
| No results | "No zones match your filters" | Which filters, and an offer to clear them. |
| No access | "You do not have access to this zone" | How to request it — without revealing what exists. |
| Error | "Could not load zones" | Retry, plus a correlation ID. |

**Time** is absolute with the user's timezone, with relative time as supporting
detail. Always `<time datetime="...">` with an ISO value.

**Examples** use reserved, obviously-fake values: `example.com`, `192.0.2.10`,
`YOUR_API_KEY`. Never real hostnames, IPs, customer names or credentials — including
in screenshots.

---

## 17. Accessibility

**WCAG 2.2 Level AA is the floor.**

### WCAG 2.2's newer criteria

The 2.2 additions are the ones most component libraries have not caught up with:

- **2.4.11 Focus Not Obscured** — a focused element must not sit behind a sticky
  header. Handled with `scroll-margin-block-start` set globally in the reset.
- **2.4.13 Focus Appearance** — 2px ring with 2px offset.
- **2.5.7 Dragging Movements** — anything draggable must have a single-pointer
  alternative.
- **2.5.8 Target Size (Minimum)** — 24×24 CSS px, enforced by `::after` hit areas.
- **3.2.6 Consistent Help** — help lives in the same place on every page.
- **3.3.7 Redundant Entry** — do not ask twice in one flow.
- **3.3.8 Accessible Authentication** — never block paste on password fields; it
  breaks password managers and is a security anti-pattern as well.

### Keyboard

- Tab order follows visual order. Never a positive `tabindex`.
- Escape closes any overlay and returns focus to what opened it.
- Composite widgets take **one** tab stop and use arrow keys internally.
- Focus is never lost — focus falling to `<body>` strands the user.
- Any scrollable region needs `tabindex="0"` and an accessible name.

### Naming

Prefer a visually hidden `<span>` to `aria-label` — it survives translation
pipelines that skip attributes and is visible in the DOM where developers notice if
it is wrong.

The name must **contain the visible label** (WCAG 2.5.3). A button reading "Save"
with `aria-label="Submit form"` cannot be activated by voice control.

### Live regions

- `role="status"` / polite — confirmations, counts, loading completion. **The
  default.**
- `role="alert"` / assertive — genuine failures only. Overusing it makes a product
  hostile with a screen reader.

The container must exist in the DOM **before** the message is inserted. Adding both
together announces nothing.

### Testing

| Layer | Method |
|---|---|
| Contrast | `audit_theme` — build gate |
| Markup patterns | `validate_markup` |
| Keyboard | Manual traversal of every critical path |
| Screen reader | NVDA + Firefox, VoiceOver + Safari |
| Reflow | 320px viewport, 400% zoom |
| Modes | Reduced motion, forced colours, dark, high contrast |

Automated tooling catches roughly a third of real barriers. Do the manual work
anyway.

---

## 18. Internationalisation

**Logical properties throughout, with no exceptions.** `inline-size` not `width`,
`margin-inline-start` not `margin-left`, `text-align: start` not `left`. Setting
`dir="rtl"` then mirrors the entire interface with no additional CSS. This is the
whole RTL strategy.

**What does not mirror:** icons for physical objects or absolute direction, numbers,
time-axis charts, logos. **What does:** back/forward arrows, disclosure chevrons,
breadcrumb separators, indent guides.

Keyboard handlers need explicit direction awareness — CSS mirrors automatically,
JavaScript does not.

**Text expansion.** German runs 30–50% longer than English. Flex-first composition
absorbs this naturally; a fixed grid clips it. Never set a fixed width on a control
sized to its English label.

**Never concatenate strings.** Word order and pluralisation rules differ — Arabic
has six plural categories. Use `Intl.DateTimeFormat`, `Intl.NumberFormat` and
`Intl.RelativeTimeFormat` rather than hand-rolled formatting.

Technical identifiers are **not** translated and stay LTR even in RTL layouts. Wrap
them in `dir="ltr"`.

---

## 19. Data visualisation

Eight categorical series, ordered so the first four remain distinguishable under
deuteranopia and protanopia. Beyond eight, group into "Other" — a ninth colour makes
all nine harder to read.

Order: cobalt, aqua, amber, crimson, violet, jade, azure, neutral. Each audited at
3:1 against the plot background in every theme.

**Colour alone is never sufficient.** Line charts vary dash pattern and marker
shape. Bar charts direct-label. Heatmaps pair a ramp with value labels or offer a
table view.

**Every chart needs a text alternative**, preferably a visible data table in a
disclosure. Never ship a chart whose only alt text is "chart".

**Bar chart axes always start at zero.** A truncated axis exaggerates differences —
that is a correctness issue, not a style one.

In dark mode the plot background is `surface-base`, not a raised surface; a chart on
a lighter panel makes series colours read as washed out.

---

## 20. Theming and white-labelling

Re-theming means replacing primitive ramp values and letting the semantic layer
re-resolve. It does **not** mean editing component CSS.

```css
:root {
  --sk-palette-cobalt-600: #7c3aed;  /* light-mode brand */
  --sk-palette-cobalt-400: #a78bfa;  /* dark-mode step — required */
  --sk-palette-cobalt-700: #6d28d9;
}
```

**You must supply both directions.** A brand colour is not one value: light mode
needs a step dark enough for white text, dark mode a step light enough to hold
weight with dark text on top. Supplying only the light-mode value is the most common
white-labelling mistake and produces a dark theme with an unreadable primary button.

**Verify, do not assume.** Run `audit_theme` after any palette change. A brand
colour that fails is not an exception to document — it is a colour that has to move.

Themes, brands and densities are independent axes and compose:
`data-sk-theme` × `data-sk-brand` × `data-sk-density`.

**What may not change:** semantic token *names*, the focus ring treatment, the
spacing scale, or the contrast thresholds.

---

## 21. Governance

### Component maturity

| Status | Meaning |
|---|---|
| `stable` | Complete spec, verified accessibility, semver-protected API. |
| `beta` | Usable, API may change in a minor version. |
| `deprecated` | Scheduled for removal, with a documented migration. |

### Adding to the system

1. Show that no existing component covers the need.
2. Write the full spec — every field in §12, including "when not to use" and the
   dark-mode note.
3. Declare any new colour pairing in the contrast contract.
4. Run `audit_theme` and `validate_markup`.
5. Verify by keyboard and screen reader.
6. Ship as `beta`; promote after real use.

### Changing a token

- **Primitive value** — run the audit. It is a build gate.
- **Semantic mapping** — run the audit and review every consuming component.
- **Token rename** — a breaking change requiring a major version and a codemod.

### The build gate

```bash
npm run audit:contrast   # exits non-zero on any failed pairing
npm run smoke            # exercises every tool, component and export
```

Both run inside the Docker build. An image whose palette breaks a declared pairing
does not get built.

---

## 22. Design review checklist

**Tokens**
- [ ] No hex values in component code.
- [ ] No primitive tokens referenced from product code.
- [ ] No arbitrary spacing, radius or duration values.

**Dark mode**
- [ ] Verified in `light`, `dark`, `hc-light` and `hc-dark`.
- [ ] `color-scheme` set on the root.
- [ ] Theme applied before first paint.
- [ ] Elevated surfaces keep their border.
- [ ] Selected states use a bar or border, not a tint alone.
- [ ] No SVG data URI with a baked-in stroke colour.
- [ ] Illustrations are theme-aware.

**Layout**
- [ ] No horizontal page scroll at 320px or 400% zoom.
- [ ] Horizontal groups wrap.
- [ ] Text-bearing flex children have `min-inline-size: 0`.
- [ ] Widths are `flex-basis`, not `width`.
- [ ] Wide content scrolls in its own container, and that container is focusable and named.

**Accessibility**
- [ ] Every control has an accessible name containing its visible label.
- [ ] Keyboard-only operation verified on every path.
- [ ] Focus visible everywhere, logical order, never lost.
- [ ] Nothing conveyed by colour alone.
- [ ] Every target at least 24×24 CSS px.
- [ ] Form errors identified, associated, and explain how to fix.
- [ ] Live regions exist before their content, and use the right politeness.
- [ ] Verified with a screen reader.

**States**
- [ ] Loading, empty, error and no-access states all designed.
- [ ] First-use and no-results have different copy.
- [ ] Pending work shown honestly; nothing claims success before confirmation.

**Content**
- [ ] Sentence case.
- [ ] Buttons name their specific action.
- [ ] Errors say how to fix.
- [ ] Absolute timestamps.
- [ ] No real infrastructure data in examples or screenshots.
