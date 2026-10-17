# Upgrading to Sekura 3.2.0

This guide covers consuming applications and the generated samples. Install CSS,
behaviors, native React artifacts and MCP references from the same build. The
source patch for this release is based on **3.1.0**, commit
`115375177e0aff5e8dbadf39bdb55d0b10948f2c`; it is not a patch that can be applied
directly to arbitrary v2 or v3.0.0 source files. An older repository branch must
first integrate that upstream base, resolving its own custom changes.

## Choose the upgrade path

| Starting version | Required work |
|---|---|
| v2.1, or an earlier v2 release | Follow **Path A**, the v3 foundation migration below, the 3.1 navigation changes, and **Path C** reliability/deployment changes. The automated v2 name baseline is specifically v2.1. |
| v3.0.0 | Follow **Path B**, including the intervening field-order and sidebar-hierarchy changes. Then follow **Path C**. The v2 geometry bridge is unnecessary. |
| v3.0.1–v3.0.3 | Follow **Path B** and review the 3.1 navigation changes; retain already-adopted alignment/hierarchy markup, then follow **Path C**. |
| v3.1.0 or v3.1.x | Follow **Path C**. Navigation width remains fixed; no width UI is introduced. |

Existing public component IDs, CSS classes, semantic tokens and behavior exports
remain available. This protects integration names, not every old CSS override or
interaction assumption. Navigation trees and submenus are opt-in. The disabled
menu item correction, command focus handoff and explicit drawer styling require
the checks below even when no new feature is adopted.

### Path A — v2 to v3.2.0

1. Retain the deployed v2 application build, lockfile, generated artifacts and
   representative screenshots. The recorded baseline is v2.1 at `dc4d498`.
   Earlier v2 consumers also review the v2.1 implementation/dependency metadata,
   event and framework-recipe changes in `CHANGELOG.md` and `DESIGN-REVIEW.md`.
2. Follow the **v2 foundation migration** later in this guide: fonts, colors,
   density, field ordering, shared geometry and modal-background ownership.
   Keep application data, services, routes and permission checks in the host.
3. Build 3.2.0, install its complete matching asset set in an isolated application
   branch and regenerate reference recipes selectively. Merge their changes into
   application code; do not overwrite application handlers with generated demos.
4. If necessary, use the existing `data-sk-geometry="v2"` bridge while replacing
   fixed dimensions. It preserves a documented geometry subset, not v2 colors or
   behavior. Never load both complete v2 and v3 stylesheets together.
5. Apply the navigation changes below. Existing selection trees can remain in
   selection mode; route navigation is an explicit adoption decision.
6. Follow **Path C**, then run repository compatibility checks and the consuming application's critical
   workflows before rollout. Retain the old application and assets for rollback.

### Path B — v3.0.0 or v3.0.x to v3.2.0

1. Retain the deployed application, lockfile and matching v3.0 assets. Keep the v3
   visual foundations; do not introduce the v2 geometry bridge for this upgrade.
2. From the original v3.0.0 release, adopt the **3.0.1 alignment update** and
   **Sidebar hierarchy in 3.0.1** sections below. Explanatory hints precede their
   controls; errors remain after controls; parent links and toggles are separate.
3. Add `.sk-side-nav--drawer` to primary navigation that uses a responsive drawer.
   A plain `.sk-side-nav` now remains in the document flow, which is required for
   local Settings navigation. Keep the existing drawer owner and opener wiring.
4. Remove navigation width controls and their storage handlers. The UI uses
   `--sk-layout-nav-width`, with no width input or drag handle. Old `sk-nav-width`
   values are ignored by the updated samples. Mobile drawer and open/close
   navigation controls remain available.
5. Update menu expectations: `aria-disabled="true"` commands receive arrow-key
   focus but never execute. Native `disabled` buttons remain unfocusable. A
   command closes its menu before `onSelect` and `sk:menu:select`, so a new dialog
   or destination can retain focus. Remove delayed-focus workarounds.
6. Adopt submenus and navigation trees only where useful, using the contracts
   below. Rebuild samples and MCP references, run `test:navigation`, and verify
   the application's own route, permission and error handling. Follow **Path C**
   for the additional reliability and deployment changes.

### Path C — v3.1.0 or v3.1.x to v3.2.0

1. Retain the deployed application, lockfile, configuration and complete asset
   set. The recorded 3.1.0 public-name baseline is commit `115375177e0a`.
2. Install matching 3.2.0 CSS, behavior and framework artifacts. Review **Input
   and overlay contracts** below and remove workarounds for duplicate events,
   invalid committed values, toast eviction and nested Escape handling.
3. Merge the updated Angular, Blazor or Web Component recipes into the host if
   those frameworks are used. Preserve application state and handlers. Recipes
   are editable integration examples, not an in-place upgrade to a framework SDK.
4. Review **HTTP deployment changes** before restarting an existing deployment.
   External hosts and proxy peers now need explicit configuration. A deployment
   with missing CSS or behavior artifacts reports 503 from `/health`.
5. Reimport corrected token exports and native design-tool controls into a copy
   of the design file, using [DESIGN-HANDOFF.md](./DESIGN-HANDOFF.md). Check aliases,
   field order and supported coverage before replacing the team's library.
6. Run `npm run verify` and the consuming application's critical workflows. This
   checks public-name baselines for v2.1, v3.0.0 and v3.1.0, plus focused behavior,
   server, product, framework and release-policy regressions. Complete the
   application-specific manual checks in `MANUAL-VALIDATION.md` before rollout.

## Reliability contracts in 3.2

### Input and overlay contracts

- **Numbers:** parsing respects the configured locale's decimal separator,
  grouping and digits. An invalid draft remains editable and invalid; public
  getters and callbacks retain the last valid committed value. Do not derive
  application data from a formatted string using `parseFloat`. Initial numeric
  values normalize to configured step/bounds; inferred precision includes
  fractional bounds. Explicitly insufficient precision throws `RangeError`
  instead of displaying a different canonical value. Destroying a controller
  restores canonical ASCII text only while the field still contains its owned
  formatted display, so reinitialization does not reinterpret locale grouping.
  An uncommitted draft is retained.
- **Dates and ranges:** typed, calendar and programmatic updates use the same
  date and range validation. Invalid drafts do not replace committed values.
  One accepted date/range action produces one controller change callback;
  remove host code that compensates for duplicate calendar events. Disabled
  date reasons are literal text. Calendar opening chooses a usable date and
  its Escape handling participates in the existing overlay stack.
- **Tag input:** strict suggestions support keyboard traversal, active-option
  announcement, selection and Escape. Selection tabs and segments do not
  activate disabled targets. Tab navigation and menu disabled-item semantics
  remain distinct; the menu contract below is unchanged.
- **Toasts:** excess messages queue instead of evicting an existing message.
  Focus or hover pauses the same timeout. The message resumes only after both
  have left. Keep urgent blocking failures and field correction at their task
  boundary; avoid an extra live announcement when focus already explains it.
- **Cleanup:** destroy manually owned controllers before replacing their DOM.
  Automatic framework roots also clean up removed descendants and ancestors.
  A calendar inside a modal closes before the modal, and removing its owner
  releases the modal background state.
- **Validation ownership:** controller errors preserve the current host business
  error before taking ownership. Correcting or destroying a controller restores
  only the custom validity and `aria-invalid` state that it still owns; later
  host validation updates remain in place.

The `editing-and-commit` pattern separates draft, committed value, validation,
notification ownership and cleanup. The Form integration lab shows explicit
save boundaries and comparison after a conflict or uncertain acknowledgment.
The application still owns persistence, revision checks and merge policy.

### Framework and package integration

Angular recipes use `afterNextRender` for DOM enhancement. They can render on
the server and hydrate without calling browser-only APIs during SSR. The
repository tests an actual Angular render/hydration fixture; a full production
`ngc` build of every consuming application remains its owner's responsibility.

Blazor recipes wrap enhanced markup in `<sekura-behaviour-root>` and call the
additive `Sekura.defineAutoEnhanceElement()` registration API after first render.
The element owns descendants and disconnect cleanup. Do not add a second
manual `enhance` owner inside that root. Existing public `enhance` and `dispose`
APIs remain available for other integration strategies. The real Blazor Server
fixture covers conditional child and component/host removal with a modal open.
Separate browser lifecycle fixtures cover ancestor removal and same-turn
child/host removal.

Scoped recipes rewrite single IDs, ID lists, local fragments, table headers,
ARIA details/error references and modern popover/command targets consistently.
Keep external fragment URLs unchanged. Regenerate scoped recipes when adding
multiple copies of the same example.

`@sekura/behaviours` now supplies an actual `.cjs` entry for `require()` and type
declarations for the normal and `/min` exports. Install the newly packed tarball;
do not copy an old generated `package.json` over the new bundle.

### HTTP deployment changes

| Setting / behavior | 3.2 contract | Upgrade action |
|---|---|---|
| Local HTTP binding | Defaults to `127.0.0.1` | Set `HOST` explicitly only when another interface is required. |
| Container binding | Docker retains `HOST=0.0.0.0` | Restrict host exposure using published port bindings and your existing network policy. |
| `SEKURA_TRUST_PROXY` | Defaults to `false`; accepts explicit Express IP/subnet peer lists. Legacy `true` trusts loopback only. | List only actual proxy peers. The edge must overwrite forwarded headers with a single value. |
| `SEKURA_ALLOWED_HOSTS` | Exact comma-separated hostnames or host:port entries; no wildcard | Include the direct Host sent by the proxy and any allowed forwarded host. Loopback hosts and the configured external host are included automatically. |
| `SEKURA_ALLOWED_ORIGINS` | Exact comma-separated HTTP(S) origins | Add deliberate extra origins if needed. The resolved server origin and configured external origin are accepted. Missing Origin remains valid for non-browser MCP clients. This is not a CORS or authentication feature. |
| `SEKURA_EXTERNAL_URL` | Pins generated public URLs, including an external prefix | Prefer an explicit value for a known deployment URL. Host validation still applies to the incoming request. |
| `SEKURA_ASSET_ROOT` | Optional absolute directory containing `dist-css`, `dist-js`, and `sample` | Leave unset for the normal installed package/container. Current working directory no longer chooses which files are served. |
| Stable CSS and JS URLs | Require revalidation; conditional requests use validators | Remove proxy rules that force old unversioned assets to stay immutable. |
| `/health` | Returns 503 when required CSS/behavior artifacts are missing or a declared contrast pair fails | Build/copy matching artifacts before starting the server. Documentation availability is reported separately. |

Use `.env.example` as the complete deployment reference. Test the actual public
prefix, a real MCP request, stylesheet, script and health response after updating
configuration. Failed Host/Origin/forwarding checks return a bounded 403 response
before the MCP transport is created. These controls do not add authentication.

HTTP JSON bodies are limited to 1 MiB. Markup validation also bounds input length,
parsed nodes, depth, naming work and number of findings. A `validation-limit`
error means validation did not complete; never treat it as a clean result.

### Token and contrast consumers

CSS/SCSS/flat-JSON scale exports, token discovery and lint use the emitted CSS
name registry. Corrected names include type size/line/letter-spacing and z-index
casing. Other export formats use their documented target-specific mappings. Unknown token lookalikes are
reported; explicitly declared component-local custom properties remain valid.
The [DTCG 2025.10 format](https://www.designtokens.org/tr/2025.10/format/) and
[color module](https://www.designtokens.org/tr/2025.10/color/) define the structured
value shapes. This release uses structured color, dimension, duration and typography values.
Fluid typography projects the minimum size and retains original CSS expressions
in `$extensions`. Easing is not included in this export. Older consumers that
expect string colors or dimensions must adapt. DTCG/Figma alpha primitives now
resolve within their own exported palettes; the corresponding CSS values
already existed. Native platform exports also
state their coverage; they are not a complete set of compiled native components.

Contrast results composite a translucent background over an opaque backdrop,
then the foreground. Pass `backdrop` when the real surface is known. The MCP tool
uses and discloses the selected theme's base surface if it is omitted. A ratio
for one declared pair does not validate images, gradients or every UI state.

## Navigation contracts in 3.1

### Fixed width and responsive navigation

```html
<!-- Primary navigation: one explicit drawer owner and a named opener. -->
<button type="button" data-sk-drawer-open="app-nav" aria-controls="app-nav">
  Open navigation
</button>
<nav id="app-nav" class="sk-side-nav sk-side-nav--drawer"
     aria-label="Primary" data-sk-drawer
     data-sk-modal="(max-width: 63.999rem)" hidden>
  <!-- Native links and separate branch disclosure buttons. -->
</nav>

<!-- Local navigation: remains in the page, without a drawer controller. -->
<nav class="sk-side-nav" aria-label="Settings sections">
  <a class="sk-side-nav__item" href="#profile" aria-current="location">Profile</a>
</nav>
<section id="profile" aria-labelledby="profile-title">
  <h2 id="profile-title">Profile</h2>
</section>
```

The declarative example opens when its trigger is used. For a desktop shell that
starts open, own `createDrawer` manually with the same media query, call `show()`
for the expanded desktop state and wire the trigger. Do not also enhance that
nav through `data-sk-drawer`. The application owns desktop collapse. A collapsed
rail containing child destinations must expose a named expand control before
those destinations can be browsed. It does not expose a width control.

The documentation sidebar now groups components from the catalogue's categories,
expands the current route's full ancestor path and keeps search visible on mobile.
Search results include their category context. Breadcrumb overflow uses ordinary
links in a disclosure; local fragment navigation uses valid section targets.

### Action submenus

Keep the existing `createMenu(trigger, menu, options)` API. Mark child triggers
with `data-sk-submenu`, `aria-haspopup="menu"` and `aria-controls`; only the root
receives automatic `data-sk-menu-trigger` initialization. Add a named
`data-sk-menu-back` menuitem to the child panel for the mobile drilldown view.

`submenuMode` accepts `auto` (default), `cascade` or `drilldown`.
`submenuMediaQuery` controls the automatic breakpoint; its default is
`(max-width: 40rem)`. `data-sk-menu-mode` on the root menu is the declarative
equivalent of the mode option. Submenu targets are present at initialization;
application-owned lazy command fetching is not implied.

When a menu belongs to an active modal dialog or drawer, keep its submenu DOM
and any portal container inside that modal. Logical menu ownership does not
override native modal inertness or the modal controller's focus trap.

One Escape closes one active level, forward/back arrows mirror in RTL, and Tab
leaves the entire menu chain. Checkable items retain their existing stay-open
behavior. Use stable `data-value` command IDs and wire permissions and command
outcomes in the application. The `component-menu.html` reference and the
`example-detail.html` Share → Export flow are working examples.

### Opt-in navigation trees

```js
import { createTree } from '@sekura/behaviours';

// root has data-sk-custom-tree so enhance() does not create a second owner.
// Each role=treeitem has a unique, nonempty, stable data-value ID.
const tree = createTree(root, {
  navigation: true,
  onActivate(item, id) {
    // Open the route and render its content using the host application's APIs.
    // Call tree.setCurrent(id) only after that navigation succeeds.
  },
});

tree.filter('guidelines'); // Loaded labels only; matching ancestors stay visible.
tree.filter('');           // Restore the previous expansion state.
tree.revealCurrent();      // Reveal without moving focus by default.
tree.revealCurrent({ focus: true }); // Explicit focus request from a user action.
// Before replacing the view:
tree.destroy();
```

For automatic ownership, use `data-sk-tree-navigation` on a `.sk-tree[role=tree]`,
omit `data-sk-custom-tree`, and handle `sk:tree:activate` with `{ item, id, value }`.
This is a presence marker: remove the attribute to disable it; assigning the
string `"false"` still enables navigation. With automatic ownership, the host
renders `aria-current="page"` from its successful route state. Use a manually
owned controller when the host needs `setCurrent`, `filter` or `revealCurrent`.
For a manually owned controller, the `onActivate` callback is an alternative to
that event listener; avoid executing an outcome twice. `setCurrent(id)` returns
false for an unknown or unloaded ID and leaves the current marker unchanged;
`setCurrent(null)` clears it. A loaded author-hidden item can be current, but
`revealCurrent()` never overrides author-hidden content and returns false when
the current item cannot be shown. These methods update the tree, not the host route.

`TreeConfigurationError` identifies invalid modes, missing/duplicate IDs, invalid
lazy children or multiple current items. A navigation tree cannot also be a
checkbox multi-select tree. Current-page state uses `aria-current="page"`; it is
independent of keyboard focus. Decide whether successful navigation keeps tree
focus or moves focus to the destination heading, and apply that policy consistently.

Existing single-select and tri-state trees retain their default behavior and
`sk:tree:select` events. `id` is additive; the existing `value` field remains.
Lazy providers keep abort, retry and stale-response protection. A second
disclosure action cancels a pending open. Filtering searches loaded nodes only;
remote search providers must supply usable paths and a way to load them.

## Build, verify and distribute matching artifacts

Use the Node LTS version in `.nvmrc`. From the patched repository:

```bash
npm ci
npm run build
npm run build:behaviours
npm run emit:css
npm run site:build
npm run verify:sample
npm run test:compatibility
npm run test:integration
npm run test:mcp
node node_modules/playwright-core/cli.js install --with-deps chromium firefox webkit
npm run test:navigation
```

`npm run verify` is the full release gate, including generated framework recipes,
all browser suites, accessibility checks and design-kit creation. It additionally
requires the .NET 10 SDK for Razor validation and the browser system libraries.
`npm run site:publish` creates a local portable `dist-site/` bundle; it does not
upload a site. The tracked sample behavior bundle and manifest are regenerated
from the same 3.2.0 build.

For an application that consumes the generated behavior package, create a local
tarball with `npm pack ./dist-js`, then install that tarball in the application.
Do the same for `dist-react` after `npm run build:react` when native React exports
are used. Copy the matching `dist-css` artifacts or serve them from the matching
MCP deployment. A local build does not publish a registry package or Git tag.

For Angular applications, keep the application's compiler/toolchain within the
[official Angular compatibility matrix](https://angular.dev/reference/versions).
The repository uses its own current TypeScript compiler for server and recipe
checks and an actual Angular SSR/hydration fixture; this is not a complete `ngc` build of every recipe.

## MCP migration discovery

`get_migration_guide({ fromVersion: "2.x" })` returns the v2 path and baseline.
`get_migration_guide({ fromVersion: "3.0.0" })` or `"3.0.x"` returns the v3.0 path
and recorded v3.0.0 baseline. `"3.1.0"` or `"3.1.x"` returns the 3.1 path and
recorded 3.1.0 baseline. `componentId` remains an optional filter. Omitting
`fromVersion` preserves the complete guide and existing v2 baseline response.
The existing `sekura://migration/v2-to-v3` resource remains available; new resource
addresses are `sekura://migration/v3.2`, `sekura://migration/v3.1-to-v3.2` and
`sekura://migration/v3.0-to-v3.2`. The older v3.1 resource addresses remain
compatibility aliases to the current guide; the response states its target version.

Runtime metadata adds optional purposes, state ownership, conditional controller
requirements, stable identity and supported capabilities. Keep unknown additive
fields when forwarding structured responses. `validate_integration` now checks
the features actually present in sidebar markup and stable IDs in opted-in tree
navigation. Declare an `onActivate` or activation-event outcome using
`tree-view:sk:tree:activate` in `handledEvents`; declarations still need runtime tests.

## Rollback from 3.2

Restore the previous application build, its lockfile and its complete matching
Sekura asset set together. Do not serve new controllers with old CSS or overwrite
application records. To reverse an uncommitted source patch, use `git apply -R`
only after its reverse check succeeds and after preserving any later work. After
a release commit has been shared, use a reviewed revert commit instead of
rewriting shared history.

---

## V2 foundation migration retained for Path A

The redesign changes presentation while retaining the existing `sk-*` class names,
`--sk-*` token names, component IDs, behavior exports, themes, densities, and recipe
IDs. Verify it in the consuming application before rolling it out.
No application records, routes, permissions, or stored documents need migration.

## Branches and rollback baseline

- The recorded v2.1 baseline is `dc4d498`; `compatibility/v2-contract.json`
  preserves its public integration names.
- The original v3.0.0 tag is `73d22913fa513d40926b5639096dd951d3d1fcbb`;
  `compatibility/v3.0-contract.json` preserves its public names as well.
- The current target is 3.2.0, based on the reviewed 3.1.0 source.
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
  return focus. Desktop collapse is a demo preference; navigation uses the system
  width and has no width control.

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
`sk-nav-collapsed`, `sk-demo-workspace-note`, and
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
command execution and persistence remain application-owned. All 71 components are marked stable. The current package version is 3.2.0.
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

The docs shell also supplies route matching, current-item scrolling and a
responsive drawer trigger. Those are host integration responsibilities, not
automatic behavior of `sk-side-nav`. For a
matching responsive shell, own `createDrawer(nav, { modal:
"(max-width: 63.999rem)" })`, show it for the expanded desktop rail, and wire the
trigger to `show()`/`close()`. Do not also auto-initialize that same nav using
`data-sk-drawer`. On router updates, use the owned disclosure's `open()` method
or rerender with matching `aria-expanded` and `hidden` state; changing only
`aria-expanded` cannot synchronize an already initialized controller.

Navigation uses the fixed system width token. Remove width inputs, drag handles
and remembered-width behavior when adopting the 3.1 shell. Keep navigation
open/close and mobile drawer controls. Workspace is example terminology: use the
application’s own names and preserve its intentional workspace functionality.

Use a divided, labeled `sk-side-nav__open-items` section for application-owned
open documents. Do not render them as children of the preceding menu item.
Keep document section anchors in a separate "On this page" navigation. The
redundant "Sekura Workspace" product text is removed from the generated starter
and examples; use the application's own name where an identity is needed.
