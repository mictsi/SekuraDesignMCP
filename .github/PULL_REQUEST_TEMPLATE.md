## What and why

<!-- What changes, and what problem it solves. -->

## Checks

- [ ] `npm run verify` passes locally
- [ ] No hex values or `--sk-palette-*` in component code
- [ ] Verified in **light and dark** (and high contrast, if colours changed)
- [ ] Keyboard-only path works; focus is visible and never lost

## If this touches colour

- [ ] `npm run audit:contrast` passes
- [ ] Any new pairing is declared in `contrastRequirements`

## If this touches an interactive component

- [ ] Keyboard model implemented in `src/behaviours/`, not only documented
- [ ] Assertions added to `src/scripts/test-behaviours.ts`

## Breaking change?

<!-- Renaming a token or class, changing a keyboard contract, or removing an MCP
     tool is major. Say so here and add a CHANGELOG entry. -->
