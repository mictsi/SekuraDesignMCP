# Design system audit — 6 September 2026

The system has substantial coverage: 67 components, semantic tokens, four themes, three densities, layout recipes, and reusable interaction controllers. The largest gaps are between the specification, generated framework code, and the behavior of the documentation examples. Fix those contracts before expanding the component catalogue.

This records the original findings before implementation. All 18 findings are addressed in the subsequent changes; see [DESIGN-REVIEW.md](DESIGN-REVIEW.md) for resolution evidence, migration notes and remaining coverage limits.

## Scope and evidence

Reviewed component specifications and CSS, framework generation, controller initialization, documentation scripts, and authored example pages. Rebuilt the artifacts and checked all 98 generated pages at 320, 390, and 1280 CSS pixels: 294 viewport geometry checks. Also exercised selected actions in Chromium and inspected mobile screenshots.

Existing checks passed:

| Check | Result |
| --- | --- |
| TypeScript and behavior builds | Passed |
| Contrast audit | 344/344 declared pairings |
| CSS lint | 79 stylesheets passed |
| MCP smoke suite | 836 passed |
| Generated-page verification | 98 pages passed |
| Controller behavior tests | 107 passed |
| Existing LTR/RTL regression | 73 passed |
| axe accessibility scan | 35 pages × 2 themes; zero violations |

Passing these checks does not establish that every advertised component or action works. The additional checks below found failures outside their coverage. This audit did not include screen-reader testing, physical touch devices, Firefox/WebKit execution, full framework typechecking, or every possible application workflow.

## Fix first: generated code and actions

### 1. Generated React examples do not compile — high priority

**Confirmed:** Parsing all 67 generated React outputs with esbuild found eight JSX syntax failures: combobox, tag-input, date-picker, date-range-picker, menu, disclosure, popover, and tooltip. Their return expressions contain adjacent elements without a fragment or enclosing element.

**Source:** [src/lib/codegen.ts](src/lib/codegen.ts), `reactWithController`, around lines 223–267.

**Change:** Generate valid component-specific element trees. Add a compile gate for every generated framework output, starting with React. Existing smoke checks only require an output longer than 100 characters that does not start with “Unknown”.

**Acceptance:** All generated React examples parse and typecheck in a small consumer fixture; mount interactive outputs and exercise at least their primary action.

### 2. Generated wrappers lose semantics, content, and CSS mapping — high priority

**Confirmed in source:** Controller-backed React wrappers create empty generic `div` elements and never render their `children`. Inputs and dialog controllers consequently receive the wrong element types. Vue and Svelte controller templates also use generic `div` elements. Generic wrappers render components such as links and inputs as `div`s. Only React's button has a dedicated semantic template.

Class generation assumes `sk-${component.id}`, but 12 IDs have no corresponding base class in the component CSS: segmented-control, form-field, text-field, search-field, file-upload, number-input, date-range-picker, status-indicator, loading-screen, stat-tile, description-list, and tree-view. For example, text-field styling is `.sk-input`, not `.sk-text-field`. The docs' component class chip makes the same assumption.

**Sources:** [src/lib/codegen.ts](src/lib/codegen.ts), `baseClass`, controller templates, and generic templates; [src/site/pages.ts](src/site/pages.ts), around line 1930.

**Change:** Add explicit root class, native element, parts, child slots, controller ref types, and event bindings to component metadata. Generate from those contracts; remove `as never` casts that hide incompatible refs. Expose controller options and application callbacks in wrappers.

**Acceptance:** A generated text field is an editable, labelled input; a link is an anchor; a dialog has working open/close behavior; children render; emitted classes exist in the distributed CSS.

### 3. Documentation demos do not load the tested controllers — high priority

**Confirmed in Chromium:** `window.Sekura` is undefined on the generated pages. Number input's increment button leaves `45` unchanged. Clicking the collapsed accordion header leaves `aria-expanded="false"` unchanged.

**Sources:** [src/site/shell.ts](src/site/shell.ts), script includes around lines 508, 550, and 586; [sample/assets/app.js](sample/assets/app.js), `init`; [src/behaviours/auto.ts](src/behaviours/auto.ts).

**Change:** Load the generated behavior bundle and initialize it after markup exists. Migrate duplicated menu/tab/dialog/popover/tooltip implementations in `app.js` onto the shared controllers. Update legacy marker names as part of that migration; simply adding `enhance()` would leave some components unwired and double-bind others.

**Acceptance:** Every live demo's documented action works using the shipped controllers, with one handler owner per interaction. Exercise the actual documentation pages in tests.

### 4. Bulk selection includes filtered-out rows — high priority

**Confirmed in Chromium:** On the projects example, search for `Website redesign`. One row remains visible. Check “Select all”: all eight rows become selected and the bulk bar says “8 zones selected”. The search and selection systems operate on different row sets.

**Source:** [sample/assets/app.js](sample/assets/app.js), `initTables` and `initSearch`, around lines 605–766.

**Change:** Derive filtering, pagination, selection, header checkbox state, counts, and action targets from shared list state. Select only eligible visible rows by default. Make selecting all matching results an explicit separate action. Parameterize the resource noun instead of hardcoding “zones”.

**Acceptance:** Filtering to one project and selecting all selects exactly that project; bulk actions identify the same set the UI shows. Define what happens to existing selection when filters change.

### 5. Busy buttons still activate from the keyboard — high priority

**Confirmed in Chromium:** A reference button with `aria-busy="true"` fires two click events when pressing Enter and Space. CSS suppresses pointer events only. The generated React button forwards `onClick` without guarding `busy` or `aria-disabled`.

**Sources:** [src/data/components/actions.ts](src/data/components/actions.ts), around line 202; [src/lib/codegen.ts](src/lib/codegen.ts), `reactButton`.

**Change:** Guard action and submit handlers while busy or aria-disabled, preserving focus. Provide a working plain-HTML behavior contract as well as framework bindings.

**Acceptance:** Repeated click, Enter, Space, and implicit form submission cannot dispatch a duplicate operation while pending; the label and focus remain stable.

### 6. Slider value, visible output, and accessible value diverge — high priority

**Confirmed in Chromium:** Pressing End changes the reference slider from `3600` to `86400`. Its output still says “1 hour”, `aria-valuetext` still says “3600 seconds, 1 hour”, and `--sk-slider-progress` remains unset. Chromium's CSS fill falls back to 50% regardless of the selected value.

**Source:** [src/data/components/forms.ts](src/data/components/forms.ts), slider markup and CSS around lines 1820–1933; no matching slider synchronizer in the shipped controllers or demo script.

**Change:** Synchronize value, formatted output, accessible value, and progress percentage on input and programmatic updates. Compute progress from `(value - min) / (max - min)`, account for direction, and document range-slider support separately.

**Acceptance:** Minimum, midpoint, maximum, pointer, keyboard, and programmatic changes produce consistent values and track fills.

## Layout, sizing, and missing CSS

### 7. Sign-in layout overflows on mobile — high priority

**Confirmed in Chromium and screenshots:** At 390px, the example banner consumes about 141px horizontally, and the main form runs from x≈141 to x≈415. The same form also overflows at 320px. `.sk-auth` uses flex's default row direction while the bare-page shell puts the banner and form beside each other.

**Sources:** [sample/assets/docs.css](sample/assets/docs.css), lines 960–969; [src/site/shell.ts](src/site/shell.ts), bare example rendering around line 538.

**Change:** Stack banner and main vertically, give the content region room to shrink, and center the card inside that region. Test the banner's return link and long form text too.

**Acceptance:** No form content or navigation clips at 320px or 390px, in LTR and RTL. The 320 CSS-pixel target is also the reflow equivalent of a 1280px viewport at 400% zoom. [W3C Reflow guidance](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html).

### 8. Top-bar example clips account controls — medium priority

**Confirmed in Chromium:** In the top-bar component demo at 320px, the utilities extend to x≈343 and the account control is clipped by the demo area. Responsive rules use viewport width, although the embedded component has considerably less available width.

**Sources:** [src/data/components/navigation.ts](src/data/components/navigation.ts), top-bar CSS around lines 181–268; [sample/assets/docs.css](sample/assets/docs.css), demo container styling.

**Change:** Define a container-aware compact top bar, with explicit overflow behavior for utilities and environment information. Keep account and navigation actions reachable. Page-level shells can also be demonstrated in isolated frames at selectable widths.

**Acceptance:** The component fits both a narrow host container and a narrow viewport without clipping its actions.

### 9. Density does not produce aligned control heights — high priority

**Confirmed with the distributed stylesheet in Chromium:** Same nominal medium size, default root font:

| Density | Button | Text input | Number input wrapper |
| --- | ---: | ---: | ---: |
| Comfortable | 40px | 43.6px | 50px |
| Compact | 36px | 43.6px | 50px |
| Dense | 32px | 43.6px | 50px |

Text input's fixed padding and body line height set a floor above the density minimum. Number input's two 24px step buttons plus its surrounding border set another floor. This produces uneven form rows and toolbars, especially in dense mode.

**Sources:** [src/data/components/forms.ts](src/data/components/forms.ts), `.sk-input` around line 339 and `.sk-number__step` around line 2366; [src/data/primitives.ts](src/data/primitives.ts), density definitions around line 628.

**Change:** Define shared control line-height, padding, border, and minimum-size relationships for buttons, inputs, selects, search, and composite fields. For number steppers, resolve the conflict between two vertically stacked targets and a compact field—consider side-by-side controls or an explicitly taller variant. Preserve text enlargement and usable targets rather than forcing clipping with fixed heights.

**Acceptance:** Publish a side-by-side sizing fixture for all controls in all sizes/densities. Equivalent controls align intentionally; any exceptions are named and documented.

### 10. Several advertised size modifiers have no CSS — medium priority

**Confirmed by comparing component metadata with emitted selectors:** These concrete size classes are advertised but absent:

- `sk-button-group--sm`
- `sk-field--sm` and `sk-field--lg`
- `sk-combobox--sm`
- `sk-date-picker--sm`
- `sk-date-range--sm`
- `sk-pagination--sm`

Other variants are also marker-only, but a missing selector alone does not establish a defect: some variants legitimately change markup, attributes, or behavior instead.

**Sources:** `sizes` entries in [actions.ts](src/data/components/actions.ts), [forms.ts](src/data/components/forms.ts), and [navigation.ts](src/data/components/navigation.ts).

**Change:** Implement promised sizes or document the actual child modifiers required. Distinguish visual modifiers from behavior and composition variants in metadata. Validate concrete advertised classes while allowing explicitly declared marker-only variants and parameterized class families.

**Acceptance:** Each advertised size has a rendered example and changes the intended dimensions; there are no silent no-op size options.

## Accessibility and runtime consistency

### 11. Tooltips never mount in the normal docs initialization path — medium priority

**Confirmed in Chromium:** Focusing a theme control produces no tooltip element; `.sk-tooltip` count is zero and the trigger has no tooltip description relationship. `initTooltips()` runs during DOMContentLoaded, then registers another DOMContentLoaded listener to append its element, after that event's dispatch has already begun.

The duplicate implementation also immediately hides on leaving the trigger, preventing users from moving onto the tooltip.

**Source:** [sample/assets/app.js](sample/assets/app.js), `initTooltips`, around lines 544–597.

**Change:** Use the shared tooltip controller, mount the tip immediately when initializing, preserve existing `aria-describedby` references, and verify hover transfer and Escape.

**Acceptance:** Focus and hover show the tip; Escape dismisses it; pointer movement onto the tip keeps it available. See [W3C hover/focus content guidance](https://www.w3.org/WAI/WCAG22/Understanding/content-on-hover-or-focus.html).

### 12. Accordion keyboard contract is incorrectly attributed to ARIA guidance — medium priority

**Confirmed in source:** `createAccordion` forces headers into one roving tab stop and describes this as the ARIA authoring practice. The current APG accordion pattern includes all focusable accordion elements in the page Tab sequence.

**Source:** [src/behaviours/controllers/disclosure.ts](src/behaviours/controllers/disclosure.ts), around lines 108–166.

**Change:** Keep every enabled accordion header reachable by Tab. If arrow navigation is provided, make it supplementary. Correct the specifications, generated descriptions, and tests together.

**Acceptance:** Tab reaches each header and focusable element in expanded content; Enter/Space toggle the focused panel. This is a pattern mismatch, not by itself a complete WCAG conformance assessment. [W3C APG accordion pattern](https://www.w3.org/WAI/ARIA/apg/patterns/accordion/).

### 13. The reset defeats findable disclosures — medium priority

**Confirmed in Chromium:** The `hidden="until-found"` reference panel computes to `display: none` because the global reset applies `[hidden] { display: none !important; }`. A hidden-until-found element with that display value cannot be revealed through find-in-page or fragment navigation.

**Sources:** [src/data/base-css.ts](src/data/base-css.ts), around line 56; [src/data/components/data-display.ts](src/data/components/data-display.ts), findable disclosure around line 1683.

**Change:** Exclude the until-found state from ordinary hidden styling. Teach disclosure behavior to preserve the state and synchronize expansion on `beforematch`; setting `panel.hidden` as an ordinary boolean is insufficient for that variant.

**Acceptance:** Browser search and fragment navigation reveal the panel, with the trigger state updated. Ordinary hidden menus and panels remain hidden. [MDN hidden-state documentation](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Global_attributes/hidden).

### 14. Enhancement teardown prevents successful reinitialization — high priority

**Confirmed in Chromium:** `enhance()` wires one disclosure; after `destroy()`, another `enhance()` reports zero additions and clicking no longer opens it. Cleanup removes listeners without clearing the enhancement marker. Elements are also claimed before their targets are verified, so a missing target can permanently mark an unwired control as initialized.

`autoEnhance()` observes additions but does not dispose removed controllers; its returned cleanup disconnects only the observer. This leaves document-level listeners vulnerable to leaks during repeated DOM swaps.

**Source:** [src/behaviours/auto.ts](src/behaviours/auto.ts), `claim`, `each`, returned `destroy`, and `autoEnhance`.

**Change:** Register a marker only after successful initialization, clear it on teardown, track controller disposal for removed subtrees, and allow a supplied root element itself to be enhanced. Define ownership for openers that are inserted after their dialogs.

**Acceptance:** Initialize → interact → destroy → initialize works; adding a previously missing target allows enhancement; repeated subtree replacement does not accumulate active listeners.

### 15. Floating surfaces use inconsistent positioning — medium priority

**Confirmed in Chromium:** In the RTL projects example, the Filters trigger sits at x≈622–733 while its popup sits at x≈338–658. The docs script writes a physical left measurement into logical `inset-inline-start`, effectively treating it as a right offset under RTL. It also omits the shared positioner's tracking and vertical flip handling for popovers.

**Sources:** [sample/assets/app.js](sample/assets/app.js), `positionMenu` and `initPopovers`; [src/behaviours/core/position.ts](src/behaviours/core/position.ts).

**Change:** Use one positioner for menus, popovers, tooltips, and calendar surfaces. Resolve logical alignment explicitly; constrain surface size and provide internal scrolling when it cannot fit the viewport.

**Acceptance:** Open overlays remain anchored and reachable in both directions, near every edge, while scrolling/resizing, and in a short viewport. Include open overlays in regression tests; the current RTL test excludes fixed-position descendants.

## Example workflows and documentation

### 16. Several example actions have no meaningful outcome — medium priority

**Confirmed in source:** Projects' Apply and Clear filter buttons only close the popover. Removing a filter chip only removes its DOM node; it does not update list state. Date range inputs have an enhancement marker but no calendar element required by that enhancer. Settings' Change photo button has no handler. Async settings switches simulate success but do not persist their values, despite the page saying preferences are stored on the device. “Undo” on generic demo toasts only announces a message.

**Sources:** [sample/pages/example-list.html](sample/pages/example-list.html), around lines 54–127; [sample/pages/example-settings.html](sample/pages/example-settings.html), around line 229; [sample/assets/app.js](sample/assets/app.js), `initSwitches` and `initDemoActions`.

**Change:** Back examples with a small deterministic in-memory model, plus local persistence only where promised. Implement filter/apply/clear, pagination, create/edit/delete/undo, and settings outcomes. Explicitly label intentionally simulated remote operations.

**Acceptance:** Every enabled action either changes visible demo state, navigates to a meaningful destination, or clearly explains its simulation. Undo restores the previous state. Include success, delayed success, failure, retry, and cancellation examples.

### 17. Clipboard actions report success on failure — medium priority

**Confirmed in source:** Both copy implementations use `.then(done, done)` and call `done()` even when the clipboard API is unavailable. Users see “Copied” after permission rejection or unsupported access.

**Sources:** [sample/assets/docs.js](sample/assets/docs.js), `initCodeCopy`, around lines 68–94; [sample/assets/app.js](sample/assets/app.js), `initCopy`, around lines 939–964.

**Change:** Separate success and failure handling. Announce success only after a resolved write. Offer selectable text or an explicit fallback instruction when copying fails; preserve the action's accessible name.

**Acceptance:** Test resolved, rejected, and unavailable clipboard paths. A failed write never reports “Copied”.

### 18. Sign-in error focus does not move as intended — medium priority

**Confirmed in source:** The submit handler calls `.focus()` on `#signin-error`, a plain `div` with no `tabindex`. The error can appear without the intended focus transfer. The “Forgot your password?” link only adds `?reset=1`; the static page has no reset branch.

**Source:** [sample/pages/example-signin.html](sample/pages/example-signin.html), around lines 21–30 and 80.

**Change:** Provide a programmatically focusable error summary with appropriate field relationships, and a working reset demonstration or an explicit explanation. Keep password-manager compatibility and the existing non-specific authentication error wording.

**Acceptance:** Failed submission visibly displays and focuses the error summary while retaining values; password recovery leads to a meaningful flow.

## Additions that would improve completeness

These are proposed additions, not claims that every related concept is absent.

| Addition | Purpose |
| --- | --- |
| Per-component support matrix | Distinguish specification, CSS, native behavior, JS controller, generated framework binding, and verified demo. A single “stable” badge currently hides these differences. |
| Component dependency metadata | Identify required base styles, child-component CSS, icons, controller, and initialization markers. Verify that per-component exports include or document transitive dependencies. |
| Visual state gallery | Render sizes, densities, themes, focus, hover, disabled, busy, invalid, read-only, empty, and long-content variants—not only their text descriptions. |
| Action contract | Standardize pending, success, failure, cancellation, duplicate suppression, permissions, undo, and focus restoration. Show complete examples for each. |
| Form composition recipes | Cover mixed controls with hints of unequal lengths, inline actions, grouped validation, async field validation, unsaved changes, and submit/retry behavior. |
| Complex-widget implementation coverage | Complete or explicitly scope tree navigation, upload queues/progress/cancel/retry, slider synchronization, and pagination state. These need more than a CSS example. |
| Responsive content guidance | Demonstrate long translated labels, unbroken identifiers, multi-line button labels, enlarged text, nested containers, and touch layouts. Define intentional exceptions to alignment. |
| Generated documentation facts | Derive counts and implementation status from the registry/build. README currently claims 81, 85, and 96 pages in different places; the build produces 98. |

## Verification changes

1. Compile and mount generated output, instead of checking string length.
2. Run behavior assertions against published examples using the same bundle consumers receive.
3. Discover all generated pages for accessibility checks. The current axe list covers 35 of 98 pages at desktop width and only initial states.
4. Add 320px to the existing layout regression, include sign-in, and test open overlays rather than exempting all fixed surfaces. The present suite covers 12 pages at 390, 768, and 1280px.
5. Add targeted screenshot fixtures for control alignment and critical layouts across four themes and three densities. Use a focused matrix rather than an unnecessarily large Cartesian product.
6. Add keyboard checks for busy/disabled actions, error focus, lifecycle teardown, clipboard rejection, and filter/selection interactions.
7. Extend coverage to actual browser zoom/text enlargement, long translations, reduced motion, forced colors, touch targets, Firefox, and WebKit. Add manual screen-reader checks for representative workflows.

## Suggested implementation order

1. Repair framework generation and its compilation gate (findings 1–2).
2. Make documentation consume the shared behavior package; fix initialization lifecycle (3, 14). This removes the main source of implementation drift.
3. Fix incorrect actions and state: selection, busy activation, slider synchronization, example workflows, clipboard, and error focus (4–6, 16–18).
4. Correct mobile layouts, control sizing, and missing size contracts (7–10).
5. Correct tooltip, accordion, findable disclosure, and floating-position behavior (11–13, 15).
6. Publish the support matrix and visual state gallery, then expand complex-widget coverage.

Apply the relevant regression check alongside each fix. The existing token and CSS foundations are worth keeping; the priority is making their advertised behavior and examples dependable.
