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

- **`forced-colors` is now decided for every component** — 63 with a repair
  block, 4 with an explicit note that they draw nothing High Contrast Mode can
  discard. A new `forced-colors-undecided` lint rule fails the build on silence,
  because silence is indistinguishable from nobody having looked. Writing the
  last 24 found a real bug in my own earlier work: the description list's
  divider is `border-block-start`, and I had set the end edge — a rule that
  would have looked like coverage while doing nothing.
- **`npm run test:announce`** — an accessible-name audit. It is explicitly *not*
  a screen reader test and says so in its own output; phrasing, timing and
  reading order still need a person with NVDA, JAWS or VoiceOver, and that pass
  has still not happened. What it does check is what axe does not: name
  *uniqueness within a region*. It immediately found the detail example
  breaking this system's own rule — six identical "Inspect" buttons in a task
  table, which a screen reader reads as "Inspect, Inspect, Inspect" with no way
  to tell which task. Also fixed several "Show markup" buttons on the docs
  pages.
- **`forced-colors` coverage went from 10 components to 29.** Windows High
  Contrast Mode discards author background colours and drops `box-shadow`
  entirely, which breaks two things silently: state carried by a background
  (the current nav item, a selected table row, the filled part of a slider
  track) becomes invisible, and floating surfaces (dialog, drawer, popover,
  menu, combobox, toast, command palette) lose the only thing separating them
  from the page behind. Seventeen components were repaired, each with a block
  written for what it specifically loses rather than a boilerplate paste.
- **`dead-forced-colors-selector` lint rule.** A block naming a selector the
  component does not have is worse than no block, because it reads as coverage
  in a grep and in review. Writing these turned up exactly one such mistake in
  my own work — a `.sk-command-palette__option` that has never existed — so the
  rule now fails the build. 52 selectors checked.
- **LLM-friendly tool errors.** The server never set `isError`. A bad component
  id returned a *success* response reading "Unknown component" — which a model
  has no way to distinguish from an answer, so it carries on and invents the
  component. Following the semantic-error guidance in Kumaran Srinivasan's
  "LLM-Friendly Error Handling: Designing MCP Servers for AI", every failure now
  carries a machine-branchable `code`, a `hint` from a fixed vocabulary
  (`RETRY_LATER`, `CHECK_INPUT`, `TRY_ALTERNATIVE`, `REPORT_TO_USER`), a
  `traceId`, an explicit retryability statement, and the closest valid values by
  Damerau-Levenshtein distance rather than a dump of all 67 ids.

  Empty results are now explicitly *not* errors: they say so and give
  `count: 0`, because a model cannot otherwise tell "there genuinely are none"
  from "something broke and substituted a default" — the article's
  No-Fake-Empty-Data principle. `npm run test:errors` enforces the contract in
  94 checks, including that no stack trace ever reaches the model.
- **Three components for failure and waiting: loading screen, error page and
  error boundary.** 67 components. The boundary is the one most products lack:
  it contains a failure to one region and states what still works, which is the
  sentence that stops a user reloading and losing their place. `role="alert"`
  only when the failure followed a user action.
- **Seven components: date picker, date range picker, number input, tag input,
  toolbar, segmented control and meter.** 64 components. Each has a real
  controller in the behaviours package, not just CSS.

  The **date picker** is the largest: a calendar grid on the ARIA Date Picker
  Dialog pattern, with day/week/month/year keyboard navigation, a roving
  tabindex so the calendar is one tab stop rather than forty-two, focus trapped
  while open and returned to the trigger on close, and a text input that stays
  authoritative — typing a date beats fourteen arrow presses and is the only
  route for voice or switch input. `<input type="date">` is rejected on purpose:
  its layout, keyboard model and format differ on every platform.

  The **number input** exists because the system already told people not to use
  `type="number"` and then offered nothing in its place. It does not bind the
  wheel, and it clamps on blur rather than per keystroke so "10" stays typeable
  when the minimum is 5.

  The **tag input** arms the last token on Backspace and removes it only on a
  second press. The **toolbar** and **segmented control** are one tab stop each.
  The **meter** is `role="meter"`, deliberately not `progressbar` — progress
  implies a task that finishes, and a screen reader treats the two differently.

  Behaviours bundle: 9.1 KB → 13.6 KB gzipped. Behaviour assertions: 63 → 107.
- **Charts and data grids are documented as deliberate non-goals**, which is
  different from being missing. The data-visualisation foundation now says the
  system ships the palette, the tokens and the accessibility contract but not
  chart components, and shows how to point any renderer at the live tokens so
  the chart follows the theme. The Table component carries the equivalent note
  about data grids: keep the ARIA contract, let TanStack or AG Grid draw cells.
- **`examples.html`** — an index of the worked examples, generated from the same
  list that builds them so it cannot advertise a page that does not exist.
- **`npm run site:publish`** — a self-contained static bundle in `dist-site/`,
  including a 404 page. It is a gate: it refuses to produce a bundle containing
  a root-absolute reference, which is the failure that works at a domain root
  and 404s in a subdirectory.
- **Disclosure and Accordion** — 57 components. The behaviours package has
  shipped `createDisclosure` and `createAccordion` since 1.0.0, `enhance()`
  already wired them, and the behaviour tests already covered them, but neither
  existed as a component: the system shipped the hard part and left the easy
  part to you. Both now carry CSS, markup, the full ARIA contract and
  controller-backed codegen in all eight frameworks.

  The accordion is headings wrapping buttons with a roving tabindex, so a
  ten-item accordion is one tab stop and appears in the document outline. The
  disclosure has a `findable` variant using `hidden="until-found"`, so
  find-in-page can still reach collapsed reference content.

  The marketing example's FAQ now uses the real accordion rather than the
  `.sk-details` styling that had been standing in for it.
- **All container settings moved to `.env`**, with `.env.example` as the
  documented sample. `docker compose up`, `./run.sh start` and
  `docker run --env-file .env` now read the same file, so there is one place to
  look when a deployment misbehaves. `run.sh` loads it, letting an exported
  value win so `SEKURA_PORT=9000 ./run.sh start` still works for a one-off.
- **`npm run check:env`** — a gate running both directions: every setting the
  code reads must be documented, and every setting documented must be read by
  something. A setting someone will set, restart for, and watch do nothing is
  worse than an undocumented one. It also rejects quoted values, because
  `docker run --env-file` keeps the quotes as part of the value while Compose
  strips them — a bug that would only appear in one of the two ways this project
  documents starting the container. Finding the first violations immediately:
  the README's configuration table was missing three settings, and `SAMPLE_PORT`
  and `SEKURA_MCP_PORT` were undocumented entirely.
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

### Removed

- **`SAMPLE_PORT` and the standalone documentation server.** There are now
  exactly two ports: `SEKURA_PORT` (published, host side) and `PORT` (internal,
  container side). A third port serving the same documentation the server
  already publishes at `<app_path>/docs/` was a second address for one thing.
  `npm run sample`, `./run.sh docs` and `src/scripts/serve-sample.ts` are gone
  with it.
- **The redirect from `/` on a prefixed deployment.** Nothing is served outside
  the app path any more. The redirect was a convenience, but it made a prefixed
  deployment answer at two URLs, and the one that is not the real address is the
  one that ends up in a bookmark or a proxy rule.
- **`SEKURA_MCP_PORT`.** It was an alias for `PORT` with no behaviour of its
  own, so every deployment had two ways to say one thing and a reader had to
  check which one won. `PORT` is the only port now. Anything setting the alias
  falls back to the default 8080, which `check:env` would not have caught — so
  it is called out here rather than left to be discovered.

### Fixed

- **`validate_markup` flagged decorative buttons.** A `<button>` that is
  `aria-hidden="true"` with `tabindex="-1"` is removed from the accessibility
  tree and needs no name — that is the correct way to render a number input's
  steppers, whose operation `role="spinbutton"` already announces. The linter
  now recognises it, and gained a stronger rule in exchange:
  `aria-hidden-focusable` fails a button that is `aria-hidden` but still
  reachable, which is a worse defect than a missing name.
- **`dead-forced-colors-selector` only checked the first block** in a component.
  The date picker has two, so selectors defined between them were reported as
  dead. It now collects every block and checks them all against everything
  outside all of them.
- **`chevron-up` was missing from the icon sprite** — down, left and right were
  all present.
- **`./run.sh start` no longer starts a second documentation server on port
  4173.** The MCP endpoint, the health check and the docs are all served from
  one port under one path prefix; a separate copy on another port both
  duplicated it and contradicted that. The standalone server is still available
  as `./run.sh docs` for iterating on the site itself.
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
