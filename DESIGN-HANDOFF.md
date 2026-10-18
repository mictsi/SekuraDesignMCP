# Sekura 3.2.1 design handoff

Use this guide with the matching 3.2.1 web assets, component manifest and generated
Figma starter. Record the package version in the design file before reviewing or
sharing changes. This release keeps 71 web component specifications, six native
React controls and six Figma component sets; these are different coverage levels.

## Start from the user's task

Use the dedicated Documents example to review reading, finding a page, revealing
the current page, opening details and saving a local note. It has one application
frame and a separate link back to documentation. Page search covers the loaded
document pages; it does not imply a global or remote content search.

When updating existing screens, remove inherited Workspace captions, menu groups
and headers. Use the actual destination/task name only where it adds useful
context. Review breadcrumbs, search labels, browser titles and onboarding states
alongside the initial screen; runtime updates must not restore the old copy.
Follow [the identity migration steps](./MIGRATION.md#remove-inherited-example-identity),
including preservation of routes, IDs and saved-data keys.

Review navigation as four independent states: keyboard focus, expanded branch,
current route and application-owned open documents. Keep destination links and
disclosure buttons separate. The navigation width is the fixed system token;
there is no width input, reset control, drag handle or stored user width. Pages
docks on desktop and becomes a modal drawer on narrow screens. Secondary mobile
document actions live in an ordinary disclosure.

## What the artifacts cover

| Artifact | Included | Verification boundary |
|---|---|---|
| Component specification | 71 components, anatomy, states, accessibility and integration contracts | Stable describes API maturity; check actual implementation and application outcomes. |
| Web CSS and behavior bundle | Four themes, three densities, native markup and documented controllers | Automated browser checks cover selected interactions. Human assistive-technology acceptance remains open. |
| Native React package | Button, TextField, Textarea, Select, Checkbox and Switch | The other framework outputs are editable reference recipes. |
| Figma starter | The same six control families, 216 variants across theme/density/relevant state | Native editable layers and API-shaped generator tests; actual Figma import and visual review are required. |
| DTCG/token exports | Semantic token aliases, structured DTCG 2025.10 values and documented projections | Read emitted coverage metadata; fluid CSS typography and partial native exports need target-specific decisions. |
| Documents/Form lab | Working navigation, local persistence and simulated save recovery | Host authentication, authorization, durable storage and merge policy remain application responsibilities. |

The source component manifest supplies design-kit coverage. The generated
`dist-design-kit/components.json` records version, coverage, field order and
verification scope. Do not infer coverage from a green maturity badge.

## Build and compare

```bash
npm ci
npm run build
npm run build:behaviours
npm run emit:css
npm run site:build
npm run build:design-kit
```

The design-kit build requires Chromium. Follow `design-tools/figma/README.md` to
create a development plugin using the generated code and the ID assigned by
Figma. Run it in a copy of the design file. Each run appends a versioned page;
review it before replacing any published library or existing instances.

Compare the native sets with the matching component pages and workbench. Use
the component page preview to switch theme, density and supported disabled state;
the copyable example includes those selections. Use the workbench and keyboard
interaction for states that the starter does not draw, such as focus and menus.

| Check | Compare | Acceptance |
|---|---|---|
| Identity | Release version, component ID, theme, density and state | Every compared artifact belongs to the same release. |
| Field order | Rest and invalid field variants | Label → explanatory hint → control → error; hints remain above the control. |
| Geometry | Control height, border, radius, label wrapping and spacing | Matches the generated web reference at the selected density; no per-field margin compensation. |
| Type | Long labels, numbers, localized dates, RTL | Text remains editable; wrapping and reading order remain clear. Review Figma Inter versus web platform font metrics. |
| Color | Light, dark, high-contrast light and high-contrast dark | Token aliases resolve; foreground/background/backdrop combinations match the actual surface. |
| State | Rest, invalid, disabled, checked or busy where available | State has a textual/semantic counterpart; no success claim from a local checkpoint alone. |
| Interaction | Tab, arrow keys, Escape, pointer and touch | Focus and activation are distinct; disabled commands do not execute; one Escape closes one layer. |

The starter does not reproduce browser-native select popups, focus/hover CSS,
indeterminate checkboxes or full composite widgets. Prototype transitions show a
state transition; they do not perform a request or establish production behavior.

## Editing and feedback decisions

Document each form section's save boundary. Immediate settings, an explicit
section save and a final wizard commit can coexist, but each needs clear copy
and a truthful durability claim. Distinguish these states in the design:

| State | Meaning | Useful action |
|---|---|---|
| Draft | Local edits have not been committed | Continue editing or explicitly discard. |
| Saving | A write is in progress | Show progress and the application's cancellation semantics. |
| Saved locally | A checkpoint exists on this device | Explain the device/session boundary. |
| Saved | The intended service acknowledged this revision | Confirm the actual result without duplicate announcements. |
| Failed | A known failure occurred | Retain the draft and offer a relevant correction or retry. |
| Conflict | The current revision differs from the edit's base | Compare values and explicitly choose a resolution. |
| Unknown outcome | A write may have succeeded but acknowledgment was lost | Check the latest revision before attempting another write. |

Validation follows the same rules for typing, calendar selection and
programmatic updates. An invalid draft remains available to correct; it does not
replace the committed value. The controller owns input semantics and the host
owns business validation and persistence. Use one notification owner for an
outcome. Ordinary field errors use local, polite feedback; an error summary can
receive focus after submit. Reserve assertive interruption for an urgent,
blocking condition, not every failed operation. Queued toasts must not remove a
message while it contains focus or is hovered.

## Permission and recovery decisions

Decide whether the existence of a destination may be disclosed. For confidential
resources, omit them and keep server enforcement authoritative. For discoverable
but unavailable capabilities, a disabled or permission page can explain access
and a useful next step. Hiding or disabling UI is not a permission check.

If access changes during editing, preserve the draft only as allowed by the
application's data policy, stop unauthorized writes and explain how to recover.
Document what happens on refresh, route change, network loss and session expiry.

## Review record

Record reviewer, date, release version, design-file version, browser/OS,
assistive technology or device, theme, density, task, result and evidence.
Use pass, fail or blocked only after performing the check. The release's
`MANUAL-VALIDATION.md` contains the screen-reader, system contrast, physical touch
and real browser zoom procedures. These remain unverified by a human tester in
this source patch. Publishing a team design library is a separate action.
