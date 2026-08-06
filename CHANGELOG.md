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

### Changed

- **Examples rewritten.** The six example pages demonstrated a DNS product,
  which meant a designer had to learn DNS before they could read the design
  system. They now demonstrate a team project workspace — an archetype every
  designer has built — and three new ones were added:
  - **Loading, empty & error** — the four states every screen has beyond the one
    in the mockup, including the three empty states that are routinely given the
    same copy, and `disabled` vs `aria-disabled` side by side.
  - **Onboarding wizard** — the first real use of the stepper.
  - **Marketing & pricing** — the system at display type sizes outside app
    chrome, which nothing else in the docs showed.
- **DNS vocabulary removed from the system itself.** It had leaked into the
  component examples, the 15 patterns, the 9 layout recipes and the docs pages —
  around 180 lines across 13 files. The design system is generic; its examples
  now are too.
- **Node 24 (Krypton), the active LTS line**, for the container and the
  workflows. Dependabot proposed Node 25, which is odd-numbered and therefore
  never becomes LTS. CI now runs the gates on both supported LTS lines, 22 and
  24, so `engines: >=22` is verified rather than asserted.
- Dependencies updated to current stable: TypeScript 7, zod 4, Express 5.2,
  axe-core 4.13, `@types/node` 24, MCP SDK 1.30. All GitHub Actions moved to
  their current majors.

### Added

- **The container can be published under a path.** `SEKURA_BASE_PATH` sets where
  the process listens; `SEKURA_EXTERNAL_URL` sets the base that generated links
  are built from. Two settings rather than one because a proxy configured with
  `proxy_pass http://app:8080/` **strips** the prefix — the app must keep
  listening at the root while every link it emits carries `/design-system`, and
  one variable cannot express that. With Traefik or ingress-nginx neither is
  needed: `X-Forwarded-Prefix` is honoured. `SEKURA_TRUST_PROXY=false` refuses
  forwarded headers when the container is directly exposed.
- **The image now publishes the artefacts it describes**: `/css/` (the complete
  stylesheet and per-component files), `/js/` (the behaviours bundles) and
  `/docs/` (the 85-page documentation site) join `/tokens.css` and
  `/tokens.json`. Previously only the token files were reachable over HTTP.
- **`/manifest.json` and the `get_endpoints` tool** — the URL of every published
  artefact, resolved for the deployment actually serving the request. A consumer
  behind a proxy cannot compute these, because only the server knows the prefix
  it is reachable on.
- **`npm run test:urls`** — 54 checks over the four deployment shapes: root,
  TLS-terminated, prefix passed through, prefix stripped. Plus forged
  `X-Forwarded-Host` being ignored when the proxy is untrusted. CI additionally
  runs the real image mounted at `/design-system` and asserts no artefact URL
  loses the prefix and no internal host leaks.
- **8 `chart-N-on-solid` tokens** and 32 contrast checks covering them. 120
  tokens, 344 checks.
- **`npm run check:deps`** — a build gate enforcing two rules a dependency bot
  will otherwise break: no pre-release versions anywhere in the tree, and every
  Node reference inside the supported LTS window. The window is a closed
  interval (22–24), not just a floor: an even major is *Current*, not LTS, until
  the October after it ships, so `@types/node@26` had to be rejected on the same
  grounds as `node:25-alpine` despite being even. It also checks that the Node
  major the container builds on is one CI actually tests, and that no action is
  pinned to a branch.
- **Dependabot `ignore` rules** for the `node` image and `@types/node` majors,
  so the two declined proposals do not return every month. Minor and patch
  updates within the line still come through.
- **`.sk-details`** styling. The shell's collapsible reference sections have
  been referencing this class since 1.0.0 without it existing anywhere, so they
  were rendering with browser defaults.

### Fixed

- **Repository URLs said `OWNER`.** `package.json`, the CHANGELOG compare links,
  `SECURITY.md` and the GHCR pull command all carried the placeholder, so the
  advisory link went nowhere and the documented `docker run` could not resolve.
- **Avatar initials failed WCAG 1.4.3.** The tints came from the chart palette
  with `text-on-brand` layered on top — white on `chart-2` is **3.46:1** in light
  mode, against a 4.5:1 requirement. The palette is audited at 3:1, which is the
  *non-text* threshold (1.4.11) and correct for a chart fill; text drawn on that
  fill is text. Two different promises, conflated. Each tint is now paired with
  an audited on-solid colour, and the pairing is in the contract so it cannot
  regress. Found by axe only once a tinted avatar moved into a visible tab — the
  previous example had them inside a hidden panel, which axe skips.
- **`test:rtl` ran before `site:build`**, so it tested whatever the previous
  build had left in `sample/`. Reordered in both `npm run verify` and CI.
- Removed `sample/assets/site.css` — 380 lines referenced by nothing.

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
  (344 across 86 pairings as of Unreleased.)
- **CSS structural lint** over all 67 stylesheets.
- **704 MCP smoke checks** — every tool, component, framework, export format.
- **63 behaviour assertions** driven through a real browser.
- **axe-core** across 20 pages in both themes: 0 violations.
- **81 documentation pages** verified for dangling references and broken links.

### Known limitations

Recorded rather than hidden:

- **RTL** is now verified — 55 checks across 9 pages, 3 widths, both directions.
  The previously reported "37px RTL overflow" was a *measurement* error, not a
  defect: `scrollWidth - clientWidth` over-reports in RTL on containers where
  nothing is clipped. No element escapes its container in either direction. See
  `src/scripts/test-rtl.ts`.
- **`forced-colors`** is handled in 10 of 55 components.
- **No screen-reader test pass.** The keyboard model is verified by machine; the
  announcements are not verified against real assistive technology.
- Absent components: date picker, time picker, number input, editable data grid,
  chart components, rich text editor, colour picker, transfer list, rating,
  notification centre, tour, tag input, tree grid.
- Fonts are referenced but not bundled; the icon set is not in the distributable.
- The behaviours package is packed into releases but not published to npm.
- Chromium only — no Firefox or WebKit in the test matrix.

[Unreleased]: https://github.com/mictsi/SekuraDesignMCP/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/mictsi/SekuraDesignMCP/releases/tag/v1.0.0
