# Contributing

## The two rules

Everything else follows from these, and a change that breaks either will be
caught by a gate rather than by review:

1. **Product code references semantic tokens only.** Never a hex value, never a
   `--sk-palette-*` primitive. A component that names a *value* cannot be
   re-themed, and it will be wrong in dark mode.
2. **Dark mode is a peer of light, not an inversion.** Floating surfaces get
   *lighter* as they rise, saturated fills step *up* the ramp so their labels
   flip to near-black, and borders take over the separation that shadows do in
   light mode.

## Setup

```bash
npm ci
npm run verify        # everything, ~3 minutes
```

`npm run verify` is the same chain CI runs. If it passes locally it passes in CI.

## The gates

Each exits non-zero. None of them is advisory.

| Command | Checks |
|---|---|
| `check:version` | No version literal drifted from `package.json` |
| `audit:contrast` | Every declared colour pairing, all four themes |
| `lint:css` | Structure, tokens only, no physical properties |
| `smoke` | Every MCP tool, component, framework, export format |
| `test:behaviours` | Real key presses in a browser |
| `test:a11y` | axe-core, WCAG 2.2 AA, both themes |
| `verify:sample` | Dangling references, links, markup lint |

## Making changes

### Changing a colour

Edit the ramp in `src/data/primitives.ts` or the mapping in
`src/data/semantic.ts`, then run `npm run audit:contrast`. If it fails, the
colour moves — the thresholds do not. Use `suggest_token` or `check_contrast`
from the MCP server to find a step that passes.

Two neutral steps are pinned by contrast rather than by eye and are commented as
such. Moving them lighter breaks a promise.

### Adding a component

1. Show no existing component covers it.
2. Write the full spec in `src/data/components/` — every field, including
   *when not to use* and a substantive dark-mode note. The smoke test rejects a
   dark-mode note under 80 characters, because "same as light" is not true.
3. Write the CSS against semantic tokens. `lint:css` rejects hex values and
   physical properties.
4. If it is interactive, implement the keyboard model in
   `src/behaviours/controllers/` and add assertions to
   `src/scripts/test-behaviours.ts`. A documented contract with no
   implementation is how consumers end up building it wrong.
5. Declare any new colour pairing in `contrastRequirements`.
6. Ship as `beta`; promote after real use.

### Changing a keyboard contract

That is a **breaking change**. It requires a major version and a changelog
entry, because consumers have muscle memory.

## Style

- Comments explain *why*, not *what*. The code already says what.
- Logical properties (`inline-size`, `margin-inline-start`), never physical.
  This is the whole RTL strategy.
- Flex-first: wrap rather than overflow, declare `flex` explicitly, and put
  `min-inline-size: 0` on any flex child that can hold text.
- British spelling in prose (`colour`, `behaviour`); American in code
  identifiers where the platform uses it (`color`, `center`).

## What not to do

- Do not add a dependency without a strong reason. `@sekura/behaviours` has
  zero, and that is a feature.
- Do not weaken a gate to make a change pass.
- Do not add a local exception to the design system. Extend it deliberately, or
  the system becomes a stylesheet.
