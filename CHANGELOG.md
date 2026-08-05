# Changelog

All notable changes are recorded here. This project follows
[Semantic Versioning](https://semver.org/).

The version in `package.json` is the single source of truth — the server, the
documentation site, the behaviours bundle and the container tag all derive from
it, and `npm run check:version` fails the build if a literal drifts back in.

## What counts as a breaking change

A **major** bump is required for any of these, because each silently breaks
consuming code rather than failing loudly:

- Renaming or removing a **semantic token**.
- Renaming or removing a **component class**.
- Changing a component's **keyboard model** or ARIA contract.
- Removing an MCP **tool**, or changing a tool's required arguments.
- Changing the **focus ring** treatment or the **spacing scale**.

Changing a **primitive value** is a minor bump: the semantic layer absorbs it and
the contrast audit proves nothing regressed.

---

## [Unreleased]

## [1.0.0]

First release.

### Design system

- **112 semantic tokens** across nine groups, resolving per theme.
- **Four themes** — light, dark, and a high-contrast variant of each. Dark is a
  peer of light, not an inversion: floating surfaces get lighter as they rise,
  saturated fills step up the ramp so their labels flip to near-black, and
  borders take over the separation work that shadows do in light mode.
- **Three densities**, changing control size only — never text below 14px or a
  hit target below 24×24 CSS px.
- **55 components**, each with anatomy, variants, states, props, a dark-mode
  note, and a complete keyboard and ARIA contract.
- **15 foundations**, **15 UX patterns**, **9 layout recipes**.
- Flex-first layout: composition primitives wrap rather than overflow, so most
  layouts respond to their container and need no media query.

### Behaviours (`@sekura/behaviours`)

- Framework-agnostic implementation of every keyboard and ARIA contract.
  **9.1 KB gzipped, zero dependencies.**
- DOM-based rather than state-based, so React, Vue, Svelte, Angular, Blazor,
  htmx and plain HTML drive identical code with no per-framework
  reimplementation.
- Controllers: menu, combobox, tabs, segmented, accordion, disclosure, dialog,
  drawer, popover, tooltip, selection, async switch, theme, toaster.
- `enhance()` is idempotent, so server-rendered stacks can call it again after
  swapping HTML in.

### Verification

Everything below is a build gate, not a report:

- **312 contrast checks** — 78 declared pairings across four themes.
- **CSS structural lint** over all 67 stylesheets.
- **704 MCP smoke checks** — every tool, component, framework, export format.
- **63 behaviour assertions** driven through a real browser.
- **axe-core** across 20 pages in both themes: 0 violations.
- **81 documentation pages** verified for dangling references and broken links.

### Known limitations

Recorded rather than hidden:

- **RTL** mirrors correctly but produces 37px of horizontal overflow on the list
  example that does not occur in LTR. Reproducible, unresolved.
- **`forced-colors`** is handled in 10 of 55 components.
- **No screen-reader test pass.** The keyboard model is verified by machine; the
  announcements are not verified against real assistive technology.
- **Fonts are referenced, not bundled.** No `@font-face` or woff2 ships, so the
  system falls back to system fonts out of the box.
- Absent components: date picker, time picker, number input, editable data grid,
  chart components, rich text editor, colour picker, transfer list, rating,
  notification centre, tour, tag input, tree grid.
- Vue, Svelte and Angular codegen still emits class-mapping wrappers; only React
  wires the controllers so far.

[Unreleased]: https://github.com/OWNER/SekuraDesignMCP/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/OWNER/SekuraDesignMCP/releases/tag/v1.0.0
