# Manual design and accessibility acceptance

Status: **not yet performed by a human tester**. Automated keyboard events, browser touch emulation, forced-colors emulation and screenshots are supporting evidence. They do not substitute for a screen reader, operating-system contrast mode, real browser zoom or physical touch testing.

Build the site, then run `npm run demo:server`. Use `/form-lab.html`, `/example-list.html`, `/component-dialog.html` and `/component-combobox.html`. Record browser, OS, assistive technology/version, input device, theme, viewport, date and tester. File each failure with reproduction steps, expected/actual behavior and a screenshot or speech transcript where appropriate.

| Pass | Procedure | Acceptance |
| --- | --- | --- |
| Keyboard only | Tab/Shift+Tab the form; change team; enter Taken; submit; recover. Open menu and modal; use arrows and Escape. | Logical order; every action reachable; focus visible; summary links reach fields; modal traps focus and restores it to its opener. |
| NVDA + Firefox/Chrome on Windows | Navigate by headings, landmarks and forms; check name availability; revoke permission while saving; trigger a conflict. | Names, required/invalid/disabled state and hints announced correctly; useful status changes spoken once; stale availability results never announced; retained draft discoverable. |
| VoiceOver + Safari on macOS/iOS | Repeat the form, combobox, modal and recovery workflows using native screen-reader navigation. | Active option, expanded state and selected values are understandable; modal and error summary receive useful focus; no inaccessible action. |
| Browser zoom | At 200% and 400% browser zoom, test form, menu and dialog at a desktop width that yields approximately 320 CSS px. | No clipped text or unavailable controls; whole-page horizontal scroll unnecessary; complex tables may scroll in their own named region. |
| Text settings | Enlarge browser default fonts to 200%; apply text spacing (line 1.5, paragraph 2, letter .12em, word .16em). Try long German label and RTL. | Labels, hints, errors and actions wrap without overlap; no content is hidden or truncated. |
| Windows contrast themes | Enable an actual system contrast theme; use checkbox, switch, errors and modal. | Boundaries, checked/disabled/focus states remain distinguishable without relying on background color alone. |
| Physical touch | iOS Safari and Android Chrome: tap labels, select owners, submit, cancel, open/dismiss overlays; rotate device and show virtual keyboard. | Targets can be activated reliably; adjacent actions do not intercept taps; focused fields and actions stay reachable. |
| Figma library | Import the generated plugin into a scratch file; inspect all six sets, switch theme/density/state, resize instances, edit labels and play prototype toggles. | Editable layers, expected auto-layout, correct variant names and state transitions; compare appearance against the matching web workbench before publishing. |

## Result template

- Tester / date:
- OS / browser / assistive technology / device:
- Page / theme / density / direction / viewport or zoom:
- Procedure:
- Result: pass / fail / blocked (never prefill pass)
- Evidence / issue:

Production conformance and a published team design library remain unclaimed until these checks are recorded.
