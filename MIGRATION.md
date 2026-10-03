# Migrating from Sekura 2.1 to 3.0

The redesign changes presentation while retaining the existing `sk-*` class names,
`--sk-*` token names, component IDs, behavior exports, themes, densities, and recipe
IDs. Verify it in the consuming application before rolling it out.
No application records, routes, permissions, or stored documents need migration.

## Branches and rollback baseline

- `feature/2.1.0` preserves the previous `main` at `dc4d498`.
- `3.0.0` contains the redesign; the current maintenance package version is `3.0.2`.
- `main` includes the redesign merged from `3.0.0`.
- `compatibility/v2-contract.json` records the public names from that baseline.
  `npm run test:compatibility` rejects removals. This is an API-name check, not a
  guarantee that every application-specific override still looks correct.

## What changes

| Area | Version 2 | Version 3 | Consumer action |
|---|---|---|---|
| Identity | Violet-leaning cobalt and blue-grey surfaces | Clear blue actions, neutral canvas and chrome | Remove literal color overrides; use semantic tokens |
| Dark mode | Grey-blue surface and text steps | Deep charcoal surfaces; bright neutral text | Use semantic text tokens; remove opacity from essential text |
| Badges | Capsule shape | 4px rectangular corners, matching tags | Remove custom pill-radius overrides |
| Field rows | Independently stacked fields | Shared label/hint/control/feedback tracks | Adopt `sk-field-row` for related fields; put `sk-field__hint` before controls and errors in `sk-field__support` |
| Typography | Inter and JetBrains Mono preferred | Platform sans and monospace, no font download | Check wrapping, translated labels, charts and PDFs |
| Reading | Fluid page titles and a character-based measure | 32/40px titles, 16/24px body, 760px document column | Adopt `sk-document` where appropriate; heading semantics stay native |
| Controls | Medium controls 40 / 36 / 32px by density | 36 / 32 / 28px, with 14px control text | Check composed toolbars and fixed row heights |
| Metadata | 13px | 12/16px, adequate contrast | Keep essential instructions and controls at 14px or larger |
| Shell | 56px header, 256px navigation, 448px detail panel | 48px header, 272px navigation, 360px details | Replace fixed offsets with `--sk-layout-*` tokens |
| Surfaces | More raised containers | Continuous canvas; borders and modest corners | Avoid wrapping whole documents in cards |
| Drawers | Modal focus trap | Modal focus trap plus inert background and scrim | Keep modal-owned controls inside the drawer; avoid unrelated portals |
| New compositions | Application-specific markup | Document canvas, content header, activity list, save state | Optional, additive adoption |

Table density continues to use 12 / 8 / 4px block padding, scoped with
`data-sk-density`. Existing table modifier classes remain supported. Existing
application density preferences remain valid. Control dimensions are minimums:
wrapping, larger text and touch input can increase them.

## Phase 1 — inventory and capture

1. Pin the currently deployed Sekura version and retain its generated assets and
   lockfile. Record which application build uses them.
2. Inventory custom CSS, literal dimensions, token overrides, native React
   imports, generated framework recipes, controllers, and portal containers.
3. Capture representative v2 screens in light/dark themes, at 320–390px and desktop
   widths, with long labels, 200% text, validation, loading and failure states.
4. Record the application's critical paths: navigation, search, form submission,
   selection, dialogs, drawers, and save/retry. These are the migration baseline.

Exit: a reproducible current application build and a named owner for acceptance.

## Phase 2 — isolated preview

1. Build the release branch with `npm ci` and `npm run verify`.
2. Install CSS, behaviors, and any native React package from the **same build**.
   Regenerate token exports and design-tool artifacts from that build too.
3. Switch the complete stylesheet behind an application release flag. Do not load
   the v2 and v3 full bundles together: their shared selectors would compete.
4. Keep existing markup and application handlers initially. Do not regenerate
   framework recipes over application business logic. Compare generated diffs
   and integrate only the intended visual and accessibility changes.

For a slower geometry migration, put this on your application root:

```html
<html data-sk-geometry="v2" data-sk-density="comfortable">
```

The bridge retains previous control heights, control padding, shell dimensions,
body line heights, metadata size and title sizing while using the v3 palette.
It is included in the v3 tokens CSS. It does **not** restore every old pixel,
font, component detail or spacing rule, and does not recreate v2 behavior.
Remove the attribute once the application's layouts are accepted. Scope the
attribute around an application root, not around unrelated sibling fragments.

Exit: the application's existing workflows work using the matching release assets.

## Phase 3 — adapt composition

- Replace sticky offsets, navigation widths and panel widths with
  `--sk-layout-header-height`, `--sk-layout-nav-width`, and
  `--sk-layout-detail-width`. Do not assume every toolbar is exactly 32px tall.
- Migrate reading/detail views to `sk-document` and `sk-content-header` as useful.
  Keep data-intensive views wide; keep tables and code scrolling locally.
- Align peer controls by their visible borders with matching size and density.
  For related fields use `sk-field-row`, a label, `sk-field__control`, and
  `sk-field__support`; put dynamic errors inside that support region. Use
  `sk-field-row__actions` for unlabeled actions. Do not use offsets to align
  unrelated wrappers. Keep applied chips and density controls in their own row.
- Use `sk-activity-list` for recent work and compact resource listings. Preserve
  real links, row-specific action names, selection and filter state.
- Use `sk-save-state` only with truthful application state. A local checkpoint is
  not a server acknowledgement. Saving is not publishing; copying is not sharing
  access. Ignore the reference document's application-specific ACL and editor
  model unless the product actually implements those features.
- Keep one owner for controller state and call cleanup before replacing a view.
  Modal drawers now prevent background interaction; test nested surfaces and
  return focus. Desktop collapse and navigation width are demo preferences.

Exit: new composition is accepted without removing application functionality.

## Phase 4 — validate in the application

Run the repository gates, then the application's own tests. Check at minimum:

- Keyboard navigation, focus return, Escape, menu placement and modal containment.
- Light, dark and both high-contrast themes, including custom brand overrides.
- Touch targets, dense tables, RTL, long translations, 200% text and mobile reflow.
- Errors, retry, cancellation, stale responses and preserved input.
- Copy/paste, browser Back, saved preferences and application-owned persistence.
- Selective CSS dependencies and all framework bindings the application uses.
- Screen-reader announcements and reading order with real assistive technology.

Automated contrast and accessibility results do not replace manual acceptance.
The Figma kit uses Inter as a portable approximation of platform typography;
review its text metrics before publishing a team library.

Exit: design, engineering and accessibility owners accept the changed screens.

## Phase 5 — controlled rollout and rollback

Release to an internal cohort first. Monitor layout defects, failed interactions
and support reports before expanding. Remove the geometry bridge per application
once its fixed assumptions are gone. Keep the previous complete asset set until
at least one stable application release has passed.

Rollback by selecting the previous application build or restoring its pinned
Sekura packages and generated assets together. Do not revert application data or
clear unrelated preferences. Version 3 introduces only optional demo-local keys:
`sk-nav-collapsed`, `sk-nav-width`, `sk-demo-workspace-note`, and
`sk-demo-workspace-star`. They do not modify an application's domain data.

## Guidance for developers and AI agents

State the target Sekura version and framework before requesting or generating
code. Query the component specification, implementation dependencies and event
contract; do not infer props from the visual example. Preserve existing IDs,
events, accessibility names and application services. Prefer semantic tokens;
keep application-specific decisions in the application. Run
`validate_integration` for generated markup, then execute runtime tests.

Do not convert an application to a Confluence clone merely because the design
reference contains publishing, ACL, editor and collaboration workflows. This
release adopts the reusable visual language and interaction principles. The
workspace example is explicitly a local demonstration, not a secure multi-user
content system.

## Component behavior and maturity

Selection accents now use a straight 4px logical leading edge in side navigation,
trees, tables, comboboxes, command results and documentation section navigation. Remove consumer CSS that paints a
second selection shadow or hard-codes a right edge. Tabs retain their underline.

The optional APIs are additive: `createCommandPalette`, `createRangeSlider`,
`createTree(root, { multiSelect, loadChildren })` and combobox `loadOptions`, `multiple`,
`allowCustom`, `values`, `onChange` and `displayLabel`. Existing single-combobox
inputs still receive the selected value by default. Enable `displayLabel` only if
your application reads selected IDs from the controller or events instead.

Combobox controllers now own a popup wrapper around the listbox; keep status text
outside role=listbox, and avoid consumer CSS that depends on the listbox being
a direct child of the field. Existing option IDs and aria-controls remain valid.

Use one controller owner. Custom lazy trees need `data-sk-custom-tree`; custom
uploads need `data-sk-custom-upload`; manually initialized sliders need
`data-sk-custom-slider` on their root. Omit the auto markers from manually managed
comboboxes and palettes. Release controllers with `destroy()` before unmounting.
The multi-tree selection event adds `checked`; range sliders emit
`sk:slider:range-change` with `values`. Existing event names remain available.

Review the advanced [workbench](sample/workbench.html) and
[support contracts](sample/support.html). Search providers, file transport,
command execution and persistence remain application-owned. All 71 components are marked stable. The current package version is 3.0.2.
Implementation completion and automated checks do not substitute for the
application and screen-reader review documented in MANUAL-VALIDATION.md.

## Align grouped filter actions

Place actions inside the same `sk-field-row` as the labeled inputs. Inside
`sk-field-row__actions`, wrap Apply/Reset peers in one
`sk-field-row__action-group`. Place explanatory `sk-field__hint` text directly after the label and before the
control. Keep only validation/counters in `sk-field__support`.
This aligns the control borders even when labels or hints wrap. Preserve a
single action button as a direct child when upgrading existing markup; grouped
actions use the new wrapper to align and wrap together. Avoid bottom-aligning
entire fields or placing the actions after the row. Narrow layouts intentionally
wrap to preserve readable labels and usable targets.

## 3.0.1 alignment update

Move explanatory hints out of post-control support wrappers and place them
immediately after the label, before the control. DOM order and visual order must
match. Existing class names remain supported; `sk-field-row` now shares four
tracks. Validation stays after the control, so errors cannot move peer inputs.
Native React fields use this order automatically. Rebuild generated recipes.

Use `sk-page-header--section` with an h2/h3 for comparison panels. Group heading
and description in `sk-page-header__titles`; put labeled controls and their
buttons in `sk-page-header__controls sk-field-row`. Card headers use
`sk-card__heading` and `sk-card__actions`. Unlabeled action groups are centred;
heading/description groups align at the top. Wrap rather than squeezing controls.

Datalist and combobox `sk-input` controls have a persistent, theme-aware dropdown
indicator. Keep the native `list` or combobox ARIA/controller wiring; do not add a
second hover-only arrow. Clicking an already-focused closed combobox reopens it.

### Sidebar hierarchy in 3.0.1

Parent links and expand buttons are separate actions. Adopt
`sk-side-nav__branch-row`, `sk-side-nav__toggle`, and `sk-side-nav__children` for
nested destinations, with `data-sk-disclosure`/`aria-controls` referencing the
child list ID. Call `enhance` as usual, or own `createDisclosure` manually.
Initialize the active route's parent with `aria-expanded="true"`; update that
state with your router. The parent uses `data-active-ancestor`; only the exact
child route uses `aria-current="page"`.

The docs sidebar uses this same CSS and disclosure controller. Its chevron turns
down when expanded; the child list gets a 1px neutral leading guide. The exact
current page has a separate 4px leading accent. Collapsing the list hides its
guide and removes its links from the tab order. Expansion does not navigate or
change the current route. Logical properties mirror these indicators in RTL.

The docs shell also supplies route matching, current-item scrolling, remembered
width/collapse preferences, and a responsive drawer trigger. Those are host
integration responsibilities, not automatic behavior of `sk-side-nav`. For a
matching responsive shell, own `createDrawer(nav, { modal:
"(max-width: 63.999rem)" })`, show it for the expanded desktop rail, and wire the
trigger to `show()`/`close()`. Do not also auto-initialize that same nav using
`data-sk-drawer`. On router updates, use the owned disclosure's `open()` method
or rerender with matching `aria-expanded` and `hidden` state; changing only
`aria-expanded` cannot synchronize an already initialized controller.

Use a divided, labeled `sk-side-nav__open-items` section for application-owned
open documents. Do not render them as children of the preceding menu item.
Keep document section anchors in a separate "On this page" navigation. The
redundant "Sekura Workspace" product text is removed from the generated starter
and examples; use the application's own name where an identity is needed.
