# Design review after implementation

6 September 2026 · version 2.0.0

The 18 defects in [the original audit](DESIGN-AUDIT.md) are addressed. The documentation now runs the distributed controllers, framework output preserves native markup, and the worked examples demonstrate local application outcomes. The support matrix makes the remaining application responsibilities explicit.

## Resolution evidence

| Original findings | Change | Verification |
| --- | --- | --- |
| 1–2: broken generated code and semantics | Generate editable native reference trees with unique IDs, children/slots where supported, and lifecycle cleanup. Correct root-class metadata. Keep React Button's dedicated props API. | All 67 React, Angular and Web Component outputs typecheck; Vue/Svelte compile; Angular templates parse; all 67 Blazor recipes compile with no warnings. Selected React recipes mount twice with unique IDs and working actions. |
| 3, 14: docs behavior and lifecycle | Load the built bundle on every page; replace duplicate controllers; register only successful enhancement; clear ownership on teardown; dispose removed subtrees and support late openers/targets. | Documentation actions, missing-target retry, destroy/reinitialize and subtree-removal regressions. |
| 4: hidden-row selection | Filtering, pagination, visible selection, counts and action targets share list state. Hidden rows lose selection. | Filter to one project, select, delete and undo; change filters and pages. |
| 5–6: busy activation and slider state | Guard busy/aria-disabled actions and submitters; synchronize native range value, output, accessible value and track fill. | Keyboard activation is suppressed; slider End reaches the matching value, text and fill. Programmatic consumers use `setValue()` or `update()`. |
| 7–10: layout and sizing | Stack sign-in content; use a container-aware top bar; align control padding with density; place number steppers side by side; implement missing size selectors. | All-page 320px geometry; 113 LTR/RTL checks; button/input/select/number sizing across three sizes and three densities; advertised-size CSS gate. |
| 11–13: tooltip, accordion and findable disclosure | Shared tooltip mounting, hover transfer and cleanup; every accordion header is tabbable; preserve `hidden="until-found"` and synchronize `beforematch`. | Focus/Escape, header Tab indices, hidden-state CSS and beforematch regressions. |
| 15: floating positioning | One tracked positioner for menus, popovers, tooltips and date fields, with RTL alignment, flipping and viewport constraints. | Open RTL popover anchor checks while resizing to 390px and 320px. |
| 16: example outcomes | Local project filtering, pagination, creation/editing, duplication, exports, deletion and undo; task creation/editing/deletion; three-step onboarding; persisted preferences; photo preview; upload and save failure/retry/cancel examples. | Browser workflows on the actual generated pages. Remote simulations are labelled and do not claim real persistence. |
| 17–18: clipboard and sign-in | Report clipboard rejection as failure; focus a real error summary; provide a reset demonstration. | Rejected clipboard write, sign-in error focus and recovery-flow regressions. |

Additional issues discovered while implementing and reviewing were corrected: keyboard menu activation now preserves native links and delegated actions; row deletion waits for the selected project's confirmation; keyboard theme/density choices apply; dialog close callbacks fire once; initially open drawers have matching state; caption counts follow filtering; date filters have visible labels; task-save feedback no longer covers the next action; an unnamed home link and invalid definition-list placeholder are fixed.

## Review as a designer

The control workbench provides a useful comparison surface: all four themes, three densities, three control sizes, disabled/busy/invalid/read-only states, and wrapping long labels. The save and upload examples show failure and recovery alongside successful outcomes. Mobile sign-in and project layouts were inspected visually, including 320px sign-in and narrow long-label controls in dark mode.

Alignment is intentional rather than a fixed-height promise for every state: ordinary controls align; multi-line button labels grow. Small dense number steppers retain a 24px target by including the wrapper border in their hit area. Tables retain their own horizontal scrolling on small screens.

The most valuable next design work is:

1. A reusable design-tool component library with variants and the same support/ownership information as the code. Token exports alone do not provide component composition and interaction prototypes.
2. A broader form-composition gallery: mixed hints, translated content, async field validation, dependent fields, and permission changes during editing.
3. Manual keyboard, screen-reader, zoom/text-enlargement, touch and forced-colors review on representative workflows. Automated contrast and accessibility scans do not establish complete conformance.

## Review as a developer

The integration contract is clearer: load the full stylesheet or follow the component manifest's CSS dependencies recursively, then use native markup and one controller owner. The documentation consumes the same behavior artifact as applications.

Framework output is an editable recipe, not a complete framework component library. React Button exposes a dedicated typed props API; other recipes preserve reference content and lifecycle. Applications supply state, permissions, navigation and network outcomes. Controllers expose events or callbacks for that purpose. Upload transport is supplied explicitly; the tree controller currently supports single selection.

Next developer priorities are a versioned framework-native component API where demand justifies it, Firefox/WebKit coverage, and application-level integration examples with real request adapters. Local project/task demos intentionally remain examples, not a durable multi-user datastore. Do not adopt their storage model as production architecture.

## Review as an AI-agent consumer

MCP component responses and `component-manifest.json` now expose the actual root class, dependencies, controller and application responsibilities. Build-derived counts replace contradictory documentation claims. Agents should read that implementation metadata before choosing markup or promising functionality.

A reliable integration sequence is:

1. Read the component specification and its implementation metadata.
2. Generate the appropriate reference recipe and load its CSS dependencies.
3. Preserve native element types, accessible names, unique IDs and controller markers.
4. Supply application callbacks, persistence, permissions and failure handling explicitly.
5. Compile the consumer, mount it, and exercise its actions at narrow widths and with the keyboard.

Useful next additions are structured MCP output schemas for executable recipes and event contracts, and an integration validator that checks selected components, dependencies and initialization together. The current manifest is machine-readable, but a string/code response is not proof of a correct assembled application.

## Migration from version 1

- Regenerate and review framework integrations. Generic wrapper assumptions such as passing all specification props to an empty root div are no longer valid. React recipes accept children and an `onReady(root)` callback; other outputs show their lifecycle directly.
- Accordion headers now all participate in the Tab sequence. Remove application code that forces one roving tab stop across headers.
- Remove duplicate demo/controller listeners. Choose explicit controllers or automatic enhancement for a given element. `enhance(root).destroy()` releases that call's controllers; `dispose(root)` releases registered controllers in a subtree; `autoEnhance(root)` returns a cleanup for its observed scope.
- Review custom control-height overrides and number-stepper layouts against the new density calculations.
- Use a slider controller's `setValue()`/`update()` after programmatic value changes; assigning a DOM property alone does not emit input events.
- Full local verification requires Node/npm, Chromium and the .NET 10 SDK. CI installs the SDK for Razor compilation.

## Validation and limits

The verification pipeline covers TypeScript, dependency/version/environment policy, token contrast, CSS structure and size selectors, MCP tools and error contracts, framework recipes, browser behavior, generated-site references, portable static output, LTR/RTL layouts, accessible names, example workflows and all-page axe scanning.

| Check | Result |
| --- | --- |
| Generated framework recipes | 67 components validated in each emitted framework format |
| Token contrast / CSS | 344 contrast pairings; 79 stylesheets pass |
| MCP smoke / errors | 836 smoke checks; 94 error-contract checks pass |
| Shared browser behavior | 107 assertions pass |
| Design and example workflows | 20 regression scenarios pass |
| LTR/RTL layout / accessible names | 113 layout checks; 90 name checks pass |
| Generated pages / accessibility | 100 pages verified; 200 axe scans, zero violations |

The full site contains 100 generated pages; the published static bundle adds its 404 page. All 100 pages are scanned in light and dark themes. High-contrast themes are covered by token contrast checks and available in the workbench, rather than a claim that every live widget state was scanned in every theme.

Remaining validation limits: Chromium is the executed browser; no manual assistive-technology pass or physical touch-device pass was performed. Razor, Vue, Svelte, Angular and Web Component compilation is not equivalent to running every generated component in those frameworks. React runtime coverage is representative. Native browser find-in-page was not driven through browser chrome; the disclosure's CSS and beforematch synchronization were checked directly.
