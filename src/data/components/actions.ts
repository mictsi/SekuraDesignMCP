import type { ComponentSpec } from './types.js';

export const actionComponents: ComponentSpec[] = [
  {
    id: 'button',
    name: 'Button',
    category: 'action',
    status: 'stable',
    summary:
      'Triggers an action in the current context. A button does something; it never navigates. If it changes the URL, it is a Link wearing the wrong clothes.',
    whenToUse: [
      'Submitting a form, saving, applying, running, retrying.',
      'Opening a dialog, drawer, popover or menu.',
      'Any state change that happens without a page navigation.',
    ],
    whenNotToUse: [
      'Navigation — use Link, even when it is styled to look like a button.',
      'Toggling a single binary setting — use Switch, which announces its state.',
      'Choosing between mutually exclusive options — use Radio group or Segmented control.',
      'More than one primary action on a surface. If everything is primary, nothing is.',
    ],
    anatomy: [
      { part: 'Container', required: true, description: 'The interactive element. Always a real <button> or <a>, never a styled <div>.' },
      { part: 'Label', required: true, description: 'A verb phrase in sentence case describing the outcome.' },
      { part: 'Leading icon', required: false, description: 'Reinforces the label. Decorative, so aria-hidden="true".' },
      { part: 'Trailing icon', required: false, description: 'Signals a consequence: a chevron for "opens a menu", an external-link glyph for "leaves the app".' },
      { part: 'Busy indicator', required: false, description: 'Replaces the leading icon while an async action is in flight. The label stays put so the button does not resize.' },
    ],
    variants: [
      { name: 'Primary', className: 'sk-button--primary', description: 'Solid brand fill.', use: 'The single most important action on the surface.' },
      { name: 'Secondary', className: 'sk-button--secondary', description: 'Outlined, transparent fill.', use: 'Actions a user may reasonably take but should not be nudged toward.' },
      { name: 'Ghost', className: 'sk-button--ghost', description: 'No fill and no border until hovered.', use: 'Tertiary actions, toolbar actions, and actions repeated on every row of a list.' },
      { name: 'Danger', className: 'sk-button--danger', description: 'Solid crimson fill.', use: 'Irreversible destruction. Reserve it; a page full of red buttons stops meaning "careful".' },
      { name: 'Danger ghost', className: 'sk-button--danger-ghost', description: 'Crimson label, no fill.', use: 'A destructive action inside a row or menu, where a solid red block would dominate.' },
      { name: 'Success', className: 'sk-button--success', description: 'Solid jade fill.', use: 'Completing work the user already committed to — the final step of a wizard, not a general save.' },
    ],
    sizes: [
      { name: 'Small', className: 'sk-button--sm', height: 'var(--sk-control-height-sm)', typeStyle: 'label-sm', description: 'Table rows, toolbars, chips. Padding shrinks but the hit area is padded back to 24px minimum.' },
      { name: 'Medium', className: '', height: 'var(--sk-control-height-md)', typeStyle: 'label-md', description: 'Default. Use unless there is a reason not to.' },
      { name: 'Large', className: 'sk-button--lg', height: 'var(--sk-control-height-lg)', typeStyle: 'body-md', description: 'Primary call to action on a marketing page or a focused single-task screen.' },
    ],
    states: [
      { name: 'Rest', description: 'Default appearance.', trigger: 'default' },
      { name: 'Hover', description: 'Fill darkens one step in light mode, lightens one step in dark mode.', trigger: ':hover:not(:disabled)' },
      { name: 'Focus visible', description: 'Two-tone focus ring with an offset gap. Applied only for keyboard focus.', trigger: ':focus-visible' },
      { name: 'Active', description: 'Fill moves a further step and the button drops 1px, so a press feels physical.', trigger: ':active:not(:disabled)' },
      { name: 'Disabled', description: 'Flat grey, no pointer. The reason must be stated adjacently — a disabled button with no explanation is a dead end.', trigger: '[disabled]' },
      { name: 'Busy', description: 'Spinner replaces the leading icon, aria-busy="true", pointer-events suppressed but focus retained.', trigger: '[aria-busy="true"]' },
    ],
    props: [
      { name: 'variant', type: "'primary' | 'secondary' | 'ghost' | 'danger' | 'danger-ghost' | 'success'", default: "'secondary'", description: 'Visual and semantic weight.' },
      { name: 'size', type: "'sm' | 'md' | 'lg'", default: "'md'", description: 'Control height and type style.' },
      { name: 'iconStart', type: 'ReactNode', description: 'Decorative leading icon.' },
      { name: 'iconEnd', type: 'ReactNode', description: 'Trailing icon signalling a consequence.' },
      { name: 'busy', type: 'boolean', default: 'false', description: 'Async action in flight. Sets aria-busy and shows the spinner.' },
      { name: 'fullWidth', type: 'boolean', default: 'false', description: 'Stretches to the container. Use on narrow layouts, not on desktop forms.' },
      { name: 'disabled', type: 'boolean', default: 'false', description: 'Inoperable. Always pair with a visible explanation.' },
    ],
    tokensUsed: [
      'color-action-primary-bg', 'color-action-primary-bg-hover', 'color-action-primary-bg-active', 'color-action-primary-text',
      'color-action-secondary-bg-hover', 'color-action-secondary-border', 'color-action-secondary-text',
      'color-action-ghost-text', 'color-action-ghost-bg-hover',
      'color-action-danger-bg', 'color-action-danger-text',
      'color-action-success-bg', 'color-action-success-text',
      'color-action-disabled-bg', 'color-action-disabled-text',
      'color-focus-ring', 'color-focus-ring-offset',
      'radius-md', 'space-8', 'space-16', 'duration-fast', 'easing-standard',
    ],
    darkMode:
      'Brand and status fills step *up* the ramp (cobalt-600 becomes cobalt-400) rather than down, because a dark page needs a lighter fill to hold the same visual weight. Consequently the label flips from white to near-black: --sk-color-action-primary-text resolves to neutral-950 in dark. Hover moves toward lighter, not darker — the direction of every interactive transition inverts. Ghost and secondary hover washes switch from a black tint to a white tint so they lighten rather than muddy the surface.',
    accessibility: {
      role: 'Native <button>. Use type="button" explicitly unless the button submits a form — an untyped button inside a form submits it.',
      keyboard: [
        { keys: 'Tab / Shift+Tab', action: 'Move focus to and from the button.' },
        { keys: 'Enter', action: 'Activate.' },
        { keys: 'Space', action: 'Activate. Native buttons fire on keyup for Space; do not reimplement this.' },
      ],
      aria: [
        'aria-busy="true" while an async action is running.',
        'aria-disabled="true" instead of the disabled attribute when the button must stay focusable so a screen-reader user can discover why it is unavailable.',
        'aria-expanded and aria-controls when the button opens a disclosure, menu or dialog.',
        'aria-describedby pointing at the explanation when the button is disabled.',
        'Icon-only buttons require an accessible name — see Icon button.',
      ],
      wcag: [
        '1.4.3 Contrast (Minimum) — every fill/label pair is audited at 4.5:1.',
        '1.4.11 Non-text Contrast — the secondary variant is located by its outline, held to 3:1.',
        '2.1.1 Keyboard — native element, no custom key handling.',
        '2.4.7 Focus Visible.',
        '2.4.13 Focus Appearance — 2px ring with 2px offset clears the minimum indicator area.',
        '2.5.8 Target Size (Minimum) — 24x24 CSS px enforced at every size.',
        '3.2.2 On Input — a button never changes context without the user asking.',
      ],
      screenReader:
        'Announced as "<label>, button". When busy, announce progress through a separate polite live region rather than by mutating the label — a label that changes mid-press is disorienting.',
      targetSize:
        'Minimum 24x24 CSS px including padding. The small variant is 32px tall by default; where it is genuinely inline (inside a sentence) the 24px exception applies and a ::after pseudo-element extends the hit area rather than the visual box.',
    },
    content: [
      'Sentence case. "Save changes", not "Save Changes" and not "SAVE CHANGES".',
      'Start with a verb and name the object: "Delete project", not "Delete", and never "OK".',
      'In a confirmation dialog, the confirm button repeats the specific action so it reads correctly out of context: "Delete 12 records", not "Confirm".',
      'Keep it under four words where possible. If it needs a sentence, the explanation belongs above the button.',
      'Never use "Click here". The label is the target.',
    ],
    dos: [
      'Exactly one primary button per surface.',
      'Put the primary action on the right in a dialog footer, and first in the DOM reading order of a form.',
      'Keep the label fixed while busy; show progress in the spinner and a live region.',
      'State why a disabled button is disabled, next to the button.',
    ],
    donts: [
      'Do not use a button for navigation, or a link for an action.',
      'Do not disable a submit button to prevent double submission — handle idempotency on the server and show a busy state.',
      'Do not rely on colour alone to mark the destructive option; the label must say what will be destroyed.',
      'Do not nest interactive elements inside a button.',
    ],
    html: `<!-- Primary action -->
<button type="submit" class="sk-button sk-button--primary">Save changes</button>

<!-- Secondary with a leading icon -->
<button type="button" class="sk-button sk-button--secondary">
  <svg class="sk-button__icon" aria-hidden="true" focusable="false" width="16" height="16"><use href="#sk-icon-download" /></svg>
  Export as CSV
</button>

<!-- Destructive, naming its target -->
<button type="button" class="sk-button sk-button--danger">Delete 12 records</button>

<!-- Async in flight: label unchanged, spinner shown, progress announced separately -->
<button type="submit" class="sk-button sk-button--primary" aria-busy="true">
  <span class="sk-button__spinner" aria-hidden="true"></span>
  Save changes
</button>
<p class="sk-visually-hidden" role="status">Saving changes.</p>

<!-- Disabled with a stated reason -->
<button type="button" class="sk-button sk-button--primary" aria-disabled="true" aria-describedby="publish-hint">
  Publish
</button>
<p id="publish-hint" class="sk-field__hint">Add at least one record before publishing.</p>`,
    css: `.sk-button {
  /* Layout */
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--sk-space-8);
  min-height: var(--sk-control-height-md);
  padding-inline: var(--sk-control-padding-inline);
  padding-block: var(--sk-control-padding-block);
  border: var(--sk-border-width-hairline) solid transparent;
  border-radius: var(--sk-radius-md);
  /* Type */
  font-family: var(--sk-font-family-sans);
  font-size: var(--sk-font-size-label-md);
  line-height: var(--sk-line-height-label-md);
  font-weight: var(--sk-font-weight-medium);
  letter-spacing: var(--sk-letter-spacing-label-md);
  text-decoration: none;
  white-space: nowrap;
  /* Behaviour */
  cursor: pointer;
  user-select: none;
  position: relative;
  transition:
    background-color var(--sk-duration-fast) var(--sk-easing-standard),
    border-color var(--sk-duration-fast) var(--sk-easing-standard),
    color var(--sk-duration-fast) var(--sk-easing-standard),
    translate var(--sk-duration-fast) var(--sk-easing-standard);
}

/* Guarantees WCAG 2.2 SC 2.5.8 even when padding is trimmed to nothing. */
.sk-button::after {
  content: "";
  position: absolute;
  inset: 50% 0 0 50%;
  translate: -50% -50%;
  min-width: 24px;
  min-height: 24px;
  width: 100%;
  height: 100%;
}

.sk-button:focus-visible {
  outline: var(--sk-focus-ring-width) solid var(--sk-color-focus-ring);
  outline-offset: var(--sk-focus-ring-offset);
}

.sk-button:active:not(:disabled, [aria-disabled="true"]) {
  translate: 0 1px;
}

.sk-button:disabled,
.sk-button[aria-disabled="true"] {
  cursor: not-allowed;
  background-color: var(--sk-color-action-disabled-bg);
  border-color: transparent;
  color: var(--sk-color-action-disabled-text);
  translate: none;
}

.sk-button[aria-busy="true"] {
  cursor: progress;
  /* Focus is retained deliberately: removing it would strand a keyboard user. */
  pointer-events: none;
}

/* --- Variants --- */
.sk-button--primary {
  background-color: var(--sk-color-action-primary-bg);
  color: var(--sk-color-action-primary-text);
}
.sk-button--primary:hover:not(:disabled, [aria-disabled="true"]) {
  background-color: var(--sk-color-action-primary-bg-hover);
}
.sk-button--primary:active:not(:disabled, [aria-disabled="true"]) {
  background-color: var(--sk-color-action-primary-bg-active);
}

.sk-button--secondary {
  background-color: var(--sk-color-action-secondary-bg);
  border-color: var(--sk-color-action-secondary-border);
  color: var(--sk-color-action-secondary-text);
}
.sk-button--secondary:hover:not(:disabled, [aria-disabled="true"]) {
  background-color: var(--sk-color-action-secondary-bg-hover);
  border-color: var(--sk-color-border-interactive);
}
.sk-button--secondary:active:not(:disabled, [aria-disabled="true"]) {
  background-color: var(--sk-color-action-secondary-bg-active);
}

.sk-button--ghost {
  background-color: transparent;
  color: var(--sk-color-action-ghost-text);
}
.sk-button--ghost:hover:not(:disabled, [aria-disabled="true"]) {
  background-color: var(--sk-color-action-ghost-bg-hover);
}
.sk-button--ghost:active:not(:disabled, [aria-disabled="true"]) {
  background-color: var(--sk-color-action-ghost-bg-active);
}

.sk-button--danger {
  background-color: var(--sk-color-action-danger-bg);
  color: var(--sk-color-action-danger-text);
}
.sk-button--danger:hover:not(:disabled, [aria-disabled="true"]) {
  background-color: var(--sk-color-action-danger-bg-hover);
}
.sk-button--danger:active:not(:disabled, [aria-disabled="true"]) {
  background-color: var(--sk-color-action-danger-bg-active);
}

.sk-button--danger-ghost {
  background-color: transparent;
  color: var(--sk-color-status-danger-text);
}
.sk-button--danger-ghost:hover:not(:disabled, [aria-disabled="true"]) {
  background-color: var(--sk-color-status-danger-surface);
}

.sk-button--success {
  background-color: var(--sk-color-action-success-bg);
  color: var(--sk-color-action-success-text);
}
.sk-button--success:hover:not(:disabled, [aria-disabled="true"]) {
  background-color: var(--sk-color-action-success-bg-hover);
}
.sk-button--success:active:not(:disabled, [aria-disabled="true"]) {
  background-color: var(--sk-color-action-success-bg-active);
}

/* --- Sizes --- */
.sk-button--sm {
  min-height: var(--sk-control-height-sm);
  padding-inline: var(--sk-space-12);
  font-size: var(--sk-font-size-label-sm);
  line-height: var(--sk-line-height-label-sm);
  gap: var(--sk-space-6);
}
.sk-button--lg {
  min-height: var(--sk-control-height-lg);
  padding-inline: var(--sk-space-24);
  font-size: var(--sk-font-size-body-md);
  line-height: var(--sk-line-height-body-md);
}

.sk-button--full-width {
  width: 100%;
}

/* Flex children are declared explicitly: the icon never shrinks, the label may
   shrink and truncate rather than force the button wider than its container. */
.sk-button__icon {
  flex: 0 0 auto;
  /* currentColor keeps the icon locked to the label in every variant and theme. */
  fill: currentColor;
}

.sk-button__label {
  flex: 0 1 auto;
  min-inline-size: 0;
}

/* Truncation is opt-in. A button that silently shortens its own action label is
   the wrong default: a label should be short enough not to need it. It is also
   a correctness fix — overflow:hidden on a flex item generates a scrollable
   overflow region under dir=rtl, which produced horizontal page scroll in RTL
   and RTL only. */
.sk-button--truncate .sk-button__label {
  overflow: hidden;
  text-overflow: ellipsis;
}

.sk-button__spinner {
  flex: 0 0 auto;
  width: 1em;
  height: 1em;
  border: 2px solid currentColor;
  border-block-start-color: transparent;
  border-radius: var(--sk-radius-full);
  animation: sk-spin var(--sk-duration-deliberate) linear infinite;
}

@keyframes sk-spin {
  to { rotate: 1turn; }
}

@media (prefers-reduced-motion: reduce) {
  .sk-button { transition-duration: var(--sk-duration-instant); }
  .sk-button:active:not(:disabled) { translate: none; }
  /* The spinner still turns — it is the only signal that work is happening —
     but slowly enough not to trigger vestibular discomfort. */
  .sk-button__spinner { animation-duration: 2s; }
}

/* Windows High Contrast / forced-colours: system colours replace ours entirely.
   We restore the boundary so variants remain distinguishable. */
@media (forced-colors: active) {
  .sk-button { border-color: ButtonBorder; forced-color-adjust: none; background-color: ButtonFace; color: ButtonText; }
  .sk-button:focus-visible { outline-color: Highlight; }
  .sk-button:disabled, .sk-button[aria-disabled="true"] { color: GrayText; border-color: GrayText; }
}`,
    related: ['icon-button', 'button-group', 'split-button', 'link', 'menu'],
  },

  {
    id: 'icon-button',
    name: 'Icon button',
    category: 'action',
    status: 'stable',
    summary:
      'A button whose entire label is an icon. It is the least discoverable control in the system and needs the most accessibility care.',
    whenToUse: [
      'Dense toolbars and table rows where a text label would not fit.',
      'Universally understood actions: close, expand, more, copy.',
      'Repeated row-level actions where the column header supplies context.',
    ],
    whenNotToUse: [
      'Any action whose icon is not instantly and unambiguously readable. If you had to think about which glyph to pick, users will have to think about what it means.',
      'The primary action of a page or dialog.',
      'When space exists for a text label. Text is always clearer.',
    ],
    anatomy: [
      { part: 'Container', required: true, description: 'Square, radius-md, sized to the control height.' },
      { part: 'Icon', required: true, description: '20px on medium. aria-hidden, because the accessible name comes from the label.' },
      { part: 'Visually hidden label', required: true, description: 'The accessible name. Not optional.' },
      { part: 'Tooltip', required: false, description: 'Shows the same text as the hidden label on hover and focus. Never a substitute for it.' },
    ],
    variants: [
      { name: 'Ghost', className: 'sk-icon-button--ghost', description: 'Default. Transparent until hovered.', use: 'Toolbars, table rows, dialog close buttons.' },
      { name: 'Secondary', className: 'sk-icon-button--secondary', description: 'Outlined.', use: 'Standalone actions that need a visible boundary to be found.' },
      { name: 'Primary', className: 'sk-icon-button--primary', description: 'Solid brand fill.', use: 'A floating compose or add action.' },
      { name: 'Danger', className: 'sk-icon-button--danger', description: 'Crimson label, tinted on hover.', use: 'Row-level delete.' },
    ],
    sizes: [
      { name: 'Small', className: 'sk-icon-button--sm', height: '2rem', typeStyle: 'icon 16px', description: 'Dense table rows. Hit area padded to 24px minimum.' },
      { name: 'Medium', className: '', height: '2.5rem', typeStyle: 'icon 20px', description: 'Default.' },
      { name: 'Large', className: 'sk-icon-button--lg', height: '3rem', typeStyle: 'icon 24px', description: 'Touch-first surfaces and floating actions.' },
    ],
    states: [
      { name: 'Rest', description: 'Icon only, no fill.', trigger: 'default' },
      { name: 'Hover', description: 'Circular or rounded wash appears behind the icon.', trigger: ':hover' },
      { name: 'Focus visible', description: 'Standard focus ring.', trigger: ':focus-visible' },
      { name: 'Pressed / toggled', description: 'Persistent fill with aria-pressed="true" when the button is a toggle.', trigger: '[aria-pressed="true"]' },
      { name: 'Disabled', description: 'Icon drops to disabled text colour.', trigger: '[disabled]' },
    ],
    props: [
      { name: 'label', type: 'string', required: true, description: 'The accessible name. Required — a build-time lint rejects an icon button without one.' },
      { name: 'icon', type: 'ReactNode', required: true, description: 'The glyph.' },
      { name: 'variant', type: "'ghost' | 'secondary' | 'primary' | 'danger'", default: "'ghost'", description: 'Visual weight.' },
      { name: 'size', type: "'sm' | 'md' | 'lg'", default: "'md'", description: 'Control size.' },
      { name: 'pressed', type: 'boolean | undefined', description: 'Set to make the button a toggle. Emits aria-pressed.' },
    ],
    tokensUsed: [
      'color-action-ghost-bg-hover', 'color-action-secondary-border', 'color-text-secondary',
      'color-surface-selected', 'color-focus-ring', 'radius-md', 'space-8',
    ],
    darkMode:
      'The hover wash flips from a black tint to a white tint. Because an icon button has no fill at rest, its only visible element is the glyph — so in dark mode the glyph uses --sk-color-text-secondary (neutral-300), not the tertiary step, to keep 7:1 against the page. Toggled state uses the cobalt-950 selected surface, which reads as a subtle glow rather than the light-mode cobalt-50 tint.',
    accessibility: {
      role: 'Native <button>, or <button aria-pressed> when it toggles.',
      keyboard: [
        { keys: 'Tab', action: 'Focus.' },
        { keys: 'Enter / Space', action: 'Activate, or toggle when aria-pressed is present.' },
      ],
      aria: [
        'An accessible name is mandatory: a visually hidden <span>, or aria-label. Prefer the hidden span — it survives translation pipelines that skip attributes.',
        'aria-pressed for toggles. Do not swap the icon *and* change aria-pressed; pick one signal and keep the name stable.',
        'aria-expanded and aria-controls when it opens a disclosure or menu.',
        'aria-hidden="true" and focusable="false" on the SVG.',
      ],
      wcag: [
        '1.1.1 Non-text Content — the hidden label is the text alternative.',
        '1.4.11 Non-text Contrast — the glyph is a meaningful graphic and clears 3:1.',
        '2.5.8 Target Size (Minimum) — 24x24 CSS px enforced by the ::after hit area.',
        '4.1.2 Name, Role, Value.',
      ],
      screenReader:
        'Announced as "<label>, button". A toggle adds "pressed" or "not pressed". If the icon changes on toggle, the label must not — "Mute"/"Unmute" is a name change that reads as a different control.',
      targetSize:
        'The visual box may be as small as 32px, but the ::after hit area guarantees 24x24 CSS px, and 44x44 is the target on touch-primary surfaces.',
    },
    content: [
      'The hidden label is a verb phrase, exactly as it would read on a text button: "Delete project", not "Delete icon" or "Trash".',
      'Never include the word "button" or "icon" in the label — the role is already announced.',
      'On a row action, include the row subject so the label stands alone: "Delete website-redesign".',
    ],
    dos: [
      'Give every icon button a tooltip *and* a hidden label. They serve different users.',
      'Use the same glyph for the same action everywhere in the product.',
      'Group related icon buttons in a Button group so their relationship is visible.',
    ],
    donts: [
      'Do not ship an icon button without an accessible name. This is the single most common accessibility defect in component libraries.',
      'Do not use an icon button for an action a user performs rarely — they will not remember the glyph.',
      'Do not put more than about five icon buttons in a row; past that, use a Menu.',
    ],
    html: `<!-- Standard: hidden label plus tooltip -->
<button type="button" class="sk-icon-button sk-icon-button--ghost" data-sk-tooltip="Copy record ID">
  <svg aria-hidden="true" focusable="false" width="20" height="20"><use href="#sk-icon-copy" /></svg>
  <span class="sk-visually-hidden">Copy record ID</span>
</button>

<!-- Toggle -->
<button type="button" class="sk-icon-button sk-icon-button--ghost" aria-pressed="false">
  <svg aria-hidden="true" focusable="false" width="20" height="20"><use href="#sk-icon-pin" /></svg>
  <span class="sk-visually-hidden">Pin this view</span>
</button>

<!-- Dialog close -->
<button type="button" class="sk-icon-button sk-icon-button--ghost" data-sk-dialog-close>
  <svg aria-hidden="true" focusable="false" width="20" height="20"><use href="#sk-icon-close" /></svg>
  <span class="sk-visually-hidden">Close dialog</span>
</button>`,
    css: `.sk-icon-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  inline-size: var(--sk-control-height-md);
  block-size: var(--sk-control-height-md);
  padding: 0;
  border: var(--sk-border-width-hairline) solid transparent;
  border-radius: var(--sk-radius-md);
  background-color: transparent;
  color: var(--sk-color-text-secondary);
  cursor: pointer;
  position: relative;
  transition:
    background-color var(--sk-duration-fast) var(--sk-easing-standard),
    color var(--sk-duration-fast) var(--sk-easing-standard);
}

.sk-icon-button::after {
  content: "";
  position: absolute;
  inset: 50% 0 0 50%;
  translate: -50% -50%;
  min-inline-size: 24px;
  min-block-size: 24px;
  inline-size: 100%;
  block-size: 100%;
}

.sk-icon-button > svg { fill: currentColor; pointer-events: none; }

.sk-icon-button:hover:not(:disabled) { background-color: var(--sk-color-surface-hover); color: var(--sk-color-text-primary); }
.sk-icon-button:active:not(:disabled) { background-color: var(--sk-color-surface-active); }
.sk-icon-button:focus-visible {
  outline: var(--sk-focus-ring-width) solid var(--sk-color-focus-ring);
  outline-offset: var(--sk-focus-ring-offset);
}
.sk-icon-button:disabled { color: var(--sk-color-text-disabled); cursor: not-allowed; }

.sk-icon-button[aria-pressed="true"] {
  background-color: var(--sk-color-surface-selected);
  color: var(--sk-color-text-brand);
}

.sk-icon-button--secondary { border-color: var(--sk-color-action-secondary-border); }
.sk-icon-button--primary {
  background-color: var(--sk-color-action-primary-bg);
  color: var(--sk-color-action-primary-text);
}
.sk-icon-button--primary:hover:not(:disabled) { background-color: var(--sk-color-action-primary-bg-hover); color: var(--sk-color-action-primary-text); }
.sk-icon-button--danger { color: var(--sk-color-status-danger-text); }
.sk-icon-button--danger:hover:not(:disabled) { background-color: var(--sk-color-status-danger-surface); color: var(--sk-color-status-danger-text); }

.sk-icon-button--sm { inline-size: var(--sk-control-height-sm); block-size: var(--sk-control-height-sm); }
.sk-icon-button--lg { inline-size: var(--sk-control-height-lg); block-size: var(--sk-control-height-lg); }

/* Touch-primary pointers get the full 44px recommended target. */
@media (pointer: coarse) {
  .sk-icon-button::after { min-inline-size: 44px; min-block-size: 44px; }
}

@media (forced-colors: active) {
  .sk-icon-button { color: ButtonText; }
  .sk-icon-button[aria-pressed="true"] { background-color: Highlight; color: HighlightText; }
}`,
    related: ['button', 'tooltip', 'menu', 'button-group'],
  },

  {
    id: 'button-group',
    name: 'Button group',
    category: 'action',
    status: 'stable',
    summary:
      'Binds two or more related buttons into one visual unit, so their relationship is structural rather than implied by proximity.',
    whenToUse: [
      'A set of actions that operate on the same object: Edit / Duplicate / Delete.',
      'A segmented control for switching a view between mutually exclusive modes.',
      'Pairing a primary action with a dropdown of variations — though Split button is usually better.',
    ],
    whenNotToUse: [
      'Unrelated actions that merely happen to sit near each other.',
      'More than five segments — use a Select.',
      'Mutually exclusive *data* choices in a form — use a Radio group, which has the right semantics.',
    ],
    anatomy: [
      { part: 'Container', required: true, description: 'A role="group" element with an accessible name, or role="radiogroup" for a segmented control.' },
      { part: 'Buttons', required: true, description: 'Two or more. Interior radii are squared off so the group reads as one object.' },
      { part: 'Divider', required: false, description: 'A hairline between adjacent segments, drawn with a negative margin so borders do not double up.' },
    ],
    variants: [
      { name: 'Actions', className: 'sk-button-group', description: 'A row of independent actions.', use: 'Toolbars.' },
      { name: 'Segmented', className: 'sk-button-group--segmented', description: 'Exactly one segment is selected at a time.', use: 'View switchers: List / Board / Calendar.' },
      { name: 'Vertical', className: 'sk-button-group--vertical', description: 'Stacked.', use: 'Narrow layouts and side panels.' },
    ],
    sizes: [
      { name: 'Small', className: 'sk-button-group--sm', height: '2rem', typeStyle: 'label-sm', description: 'Table toolbars.' },
      { name: 'Medium', className: '', height: '2.5rem', typeStyle: 'label-md', description: 'Default.' },
    ],
    states: [
      { name: 'Rest', description: 'All segments unselected, or all actions available.', trigger: 'default' },
      { name: 'Selected', description: 'Segmented control only. One segment carries the selected surface and aria-checked="true".', trigger: '[aria-checked="true"]' },
      { name: 'Focus within', description: 'Roving tabindex: the group takes one tab stop, arrows move between segments.', trigger: ':focus-within' },
    ],
    props: [
      { name: 'label', type: 'string', required: true, description: 'Accessible name for the group, e.g. "Record actions" or "View mode".' },
      { name: 'segmented', type: 'boolean', default: 'false', description: 'Switches to radiogroup semantics with a single selected value.' },
      { name: 'value', type: 'string', description: 'Selected segment, when segmented.' },
      { name: 'orientation', type: "'horizontal' | 'vertical'", default: "'horizontal'", description: 'Layout axis. Also sets aria-orientation.' },
    ],
    tokensUsed: ['color-surface-selected', 'color-border-default', 'color-text-brand', 'radius-md', 'color-focus-ring'],
    darkMode:
      'The selected segment in dark mode cannot rely on a light tint, so it uses --sk-color-surface-selected (cobalt-950) plus a cobalt-300 label and a 2px inset brand border. The border is what actually carries the selection at a glance; the tint alone is too subtle on a dark page.',
    accessibility: {
      role: 'role="group" with aria-label for actions. role="radiogroup" with role="radio" children for a segmented control.',
      keyboard: [
        { keys: 'Tab', action: 'Enter the group. For a segmented control the group is a single tab stop landing on the selected segment.' },
        { keys: 'Arrow Left / Right', action: 'Move between segments in a horizontal group, selecting as you go.' },
        { keys: 'Arrow Up / Down', action: 'Same, for a vertical group.' },
        { keys: 'Home / End', action: 'Jump to the first or last segment.' },
      ],
      aria: [
        'aria-label or aria-labelledby on the container. An unnamed group is just three loose buttons to a screen reader.',
        'aria-checked on each segment of a segmented control.',
        'aria-orientation when vertical.',
        'Roving tabindex: the selected segment has tabindex="0", the rest tabindex="-1".',
      ],
      wcag: [
        '1.3.1 Info and Relationships — the grouping must be programmatic, not just visual.',
        '2.1.1 Keyboard.',
        '2.4.3 Focus Order — arrow navigation follows visual order, respecting RTL.',
        '4.1.2 Name, Role, Value.',
      ],
      screenReader:
        'Announced as "<group name>, group" then each button. A segmented control announces "<name>, radio group" and each option as "<label>, radio, N of M, selected".',
      targetSize: 'Each segment independently satisfies 24x24 CSS px.',
    },
    content: [
      'Segment labels are nouns for modes ("List", "Board") and verbs for actions ("Edit", "Delete").',
      'Keep segment labels to a single word where possible — a segmented control with wrapping labels has too many segments.',
      'The group name should say what the segments have in common: "View mode", not "Options".',
    ],
    dos: [
      'Give the group an accessible name.',
      'Use a roving tabindex for segmented controls so the group is one tab stop.',
      'Mirror arrow-key direction under RTL — logical properties handle the layout, but the key handler needs explicit direction awareness.',
    ],
    donts: [
      'Do not mix a destructive button into a segmented control.',
      'Do not put more than one primary button in a group.',
      'Do not use a button group to fake tabs. Tabs control panels; button groups do not.',
    ],
    html: `<!-- Related actions -->
<div class="sk-button-group" role="group" aria-label="Record actions">
  <button type="button" class="sk-button sk-button--secondary">Edit</button>
  <button type="button" class="sk-button sk-button--secondary">Duplicate</button>
  <button type="button" class="sk-button sk-button--secondary">Export</button>
</div>

<!-- Segmented view switcher -->
<div class="sk-button-group sk-button-group--segmented" role="radiogroup" aria-label="View mode">
  <button type="button" class="sk-button-group__segment" role="radio" aria-checked="true"  tabindex="0">List</button>
  <button type="button" class="sk-button-group__segment" role="radio" aria-checked="false" tabindex="-1">Board</button>
  <button type="button" class="sk-button-group__segment" role="radio" aria-checked="false" tabindex="-1">Calendar</button>
</div>`,
    css: `/* Flex-first: the group wraps rather than overflowing, and each button is
   allowed to shrink but never below its text. This is why a toolbar that fits at
   1440px does not produce a horizontal scrollbar at 360px. */
.sk-button-group {
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
}
.sk-button-group > .sk-button { flex: 0 1 auto; min-inline-size: 0; }

.sk-button-group > .sk-button:not(:first-child) { margin-inline-start: calc(var(--sk-border-width-hairline) * -1); }
.sk-button-group > .sk-button:not(:first-child):not(:last-child) { border-radius: 0; }
.sk-button-group > .sk-button:first-child:not(:last-child) { border-start-end-radius: 0; border-end-end-radius: 0; }
.sk-button-group > .sk-button:last-child:not(:first-child) { border-start-start-radius: 0; border-end-start-radius: 0; }
/* Raise the focused button so its ring is not clipped by its neighbour. */
.sk-button-group > .sk-button:focus-visible { z-index: var(--sk-z-raised); }

.sk-button-group--vertical { flex-direction: column; }
.sk-button-group--vertical > .sk-button:not(:first-child) {
  margin-inline-start: 0;
  margin-block-start: calc(var(--sk-border-width-hairline) * -1);
}
.sk-button-group--vertical > .sk-button:first-child:not(:last-child) { border-radius: var(--sk-radius-md) var(--sk-radius-md) 0 0; }
.sk-button-group--vertical > .sk-button:last-child:not(:first-child) { border-radius: 0 0 var(--sk-radius-md) var(--sk-radius-md); }

/* --- Segmented --- */
.sk-button-group--segmented {
  padding: var(--sk-space-2);
  background-color: var(--sk-color-surface-sunken);
  border: var(--sk-border-width-hairline) solid var(--sk-color-border-subtle);
  border-radius: var(--sk-radius-lg);
  gap: var(--sk-space-2);
}

.sk-button-group__segment {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-block-size: calc(var(--sk-control-height-md) - var(--sk-space-8));
  padding-inline: var(--sk-space-12);
  border: var(--sk-border-width-thick) solid transparent;
  border-radius: var(--sk-radius-md);
  background-color: transparent;
  color: var(--sk-color-text-secondary);
  font: inherit;
  font-size: var(--sk-font-size-label-md);
  font-weight: var(--sk-font-weight-medium);
  cursor: pointer;
  transition: background-color var(--sk-duration-fast) var(--sk-easing-standard);
}

.sk-button-group__segment:hover:not([aria-checked="true"]) {
  background-color: var(--sk-color-surface-hover);
  color: var(--sk-color-text-primary);
}

.sk-button-group__segment[aria-checked="true"] {
  background-color: var(--sk-color-surface-selected);
  /* The border, not the tint, is what makes selection legible in dark mode. */
  border-color: var(--sk-color-border-brand);
  color: var(--sk-color-text-brand);
  font-weight: var(--sk-font-weight-semibold);
}

.sk-button-group__segment:focus-visible {
  outline: var(--sk-focus-ring-width) solid var(--sk-color-focus-ring);
  outline-offset: var(--sk-focus-ring-offset);
}

@media (forced-colors: active) {
  .sk-button-group__segment[aria-checked="true"] { background-color: Highlight; color: HighlightText; border-color: Highlight; }
}`,
    related: ['button', 'split-button', 'tabs', 'radio-group'],
  },

  {
    id: 'split-button',
    name: 'Split button',
    category: 'action',
    status: 'stable',
    summary:
      'A default action joined to a menu of related alternatives. The user gets one click for the common case and one extra click for the rest.',
    whenToUse: [
      'One action is chosen far more often than its siblings: "Save" alongside "Save and close", "Save as template".',
      'Export, deploy or run actions with several targets where one target is the obvious default.',
    ],
    whenNotToUse: [
      'The alternatives are equally likely — use a plain Menu so no option is privileged.',
      'The default action is destructive. A one-click irreversible action next to a menu invites mistakes.',
      'There are only two options. Show both as buttons.',
    ],
    anatomy: [
      { part: 'Primary segment', required: true, description: 'Performs the default action immediately. Labelled with that specific action.' },
      { part: 'Divider', required: true, description: 'A hairline making the two hit areas visibly separate — this is what stops mis-clicks.' },
      { part: 'Trigger segment', required: true, description: 'Opens the menu. Chevron icon, with its own accessible name.' },
      { part: 'Menu', required: true, description: 'A standard Menu containing the alternatives. The default action is repeated inside it.' },
    ],
    variants: [
      { name: 'Primary', className: 'sk-split-button--primary', description: 'Brand fill on both segments.', use: 'The main action of a page.' },
      { name: 'Secondary', className: 'sk-split-button--secondary', description: 'Outlined.', use: 'Default. Toolbars and secondary regions.' },
    ],
    sizes: [
      { name: 'Small', className: 'sk-split-button--sm', height: '2rem', typeStyle: 'label-sm', description: 'Toolbars.' },
      { name: 'Medium', className: '', height: '2.5rem', typeStyle: 'label-md', description: 'Default.' },
    ],
    states: [
      { name: 'Rest', description: 'Menu closed.', trigger: 'default' },
      { name: 'Open', description: 'Trigger shows aria-expanded="true" and a persistent pressed fill so the connection to the open menu is visible.', trigger: '[aria-expanded="true"]' },
      { name: 'Busy', description: 'Primary segment shows a spinner; the trigger is disabled so the user cannot start a second action mid-flight.', trigger: '[aria-busy="true"]' },
    ],
    props: [
      { name: 'label', type: 'string', required: true, description: 'The default action label.' },
      { name: 'menuLabel', type: 'string', default: "'More {label} options'", description: 'Accessible name for the trigger segment.' },
      { name: 'items', type: 'MenuItem[]', required: true, description: 'Alternatives. Must include the default action.' },
      { name: 'variant', type: "'primary' | 'secondary'", default: "'secondary'", description: 'Visual weight.' },
    ],
    tokensUsed: ['color-action-primary-bg', 'color-action-primary-text', 'color-action-secondary-border', 'color-border-inverse', 'color-focus-ring', 'radius-md'],
    darkMode:
      'The divider between the two segments is the detail that breaks in dark mode. On a light primary fill it is a white 24% overlay; on the dark theme, where the fill is cobalt-400 and the label is near-black, the divider inverts to a black 24% overlay. It is declared as its own token pairing rather than inherited, because inheriting currentColor would make it vanish exactly when it matters most.',
    accessibility: {
      role: 'Two sibling <button> elements inside a role="group". The trigger uses aria-haspopup="menu".',
      keyboard: [
        { keys: 'Tab', action: 'Focus the primary segment, then the trigger. Both are tab stops — the alternatives must be reachable.' },
        { keys: 'Enter / Space on primary', action: 'Run the default action.' },
        { keys: 'Enter / Space / Arrow Down on trigger', action: 'Open the menu and focus its first item.' },
        { keys: 'Escape', action: 'Close the menu and return focus to the trigger.' },
      ],
      aria: [
        'The trigger needs its own accessible name that references the default action: "More save options". "More" alone is meaningless in a list of controls.',
        'aria-haspopup="menu" and aria-expanded on the trigger.',
        'aria-controls pointing at the menu when open.',
        'role="group" with aria-label on the container.',
      ],
      wcag: [
        '1.3.1 Info and Relationships.',
        '2.1.1 Keyboard — both segments independently reachable.',
        '2.4.6 Headings and Labels — the trigger label must be distinguishable from the primary label.',
        '4.1.2 Name, Role, Value.',
      ],
      screenReader:
        'Reads as two controls: "Save, button" then "More save options, menu pop-up button, collapsed". Never merge them into one control.',
      targetSize: 'The trigger segment is at least 32px wide so it is not a sliver; both segments clear 24x24 CSS px.',
    },
    content: [
      'The primary label names the specific default: "Save and close", not "Save…".',
      'The trigger label is "More <action> options".',
      'Repeat the default action as the first item in the menu so the menu is a complete list.',
    ],
    dos: [
      'Make the default the genuinely most-used action, measured rather than assumed.',
      'Keep the divider at 3:1 against both fills.',
      'Disable the trigger while the primary action is busy.',
    ],
    donts: [
      'Do not make the default action destructive.',
      'Do not change the default based on last use without telling the user — a button that moves under your finger is worse than one extra click.',
      'Do not put more than about seven items in the menu.',
    ],
    html: `<div class="sk-split-button sk-split-button--secondary" role="group" aria-label="Save options">
  <button type="button" class="sk-split-button__action">Save and close</button>
  <button type="button" class="sk-split-button__trigger"
          aria-haspopup="menu" aria-expanded="false" aria-controls="save-menu">
    <svg aria-hidden="true" focusable="false" width="16" height="16"><use href="#sk-icon-chevron-down" /></svg>
    <span class="sk-visually-hidden">More save options</span>
  </button>
</div>
<div class="sk-menu" id="save-menu" role="menu" hidden>
  <button type="button" class="sk-menu__item" role="menuitem">Save and close</button>
  <button type="button" class="sk-menu__item" role="menuitem">Save and continue editing</button>
  <button type="button" class="sk-menu__item" role="menuitem">Save as template</button>
</div>`,
    css: `.sk-split-button { display: inline-flex; position: relative; }

.sk-split-button__action,
.sk-split-button__trigger {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-block-size: var(--sk-control-height-md);
  border: var(--sk-border-width-hairline) solid transparent;
  font: inherit;
  font-size: var(--sk-font-size-label-md);
  font-weight: var(--sk-font-weight-medium);
  cursor: pointer;
  transition: background-color var(--sk-duration-fast) var(--sk-easing-standard);
}

.sk-split-button__action {
  padding-inline: var(--sk-control-padding-inline);
  border-start-start-radius: var(--sk-radius-md);
  border-end-start-radius: var(--sk-radius-md);
}

.sk-split-button__trigger {
  inline-size: var(--sk-control-height-md);
  min-inline-size: 2rem;
  padding: 0;
  border-start-end-radius: var(--sk-radius-md);
  border-end-end-radius: var(--sk-radius-md);
}

.sk-split-button__action:focus-visible,
.sk-split-button__trigger:focus-visible {
  outline: var(--sk-focus-ring-width) solid var(--sk-color-focus-ring);
  outline-offset: var(--sk-focus-ring-offset);
  z-index: var(--sk-z-raised);
}

/* --- Secondary --- */
.sk-split-button--secondary .sk-split-button__action,
.sk-split-button--secondary .sk-split-button__trigger {
  background-color: var(--sk-color-action-secondary-bg);
  border-color: var(--sk-color-action-secondary-border);
  color: var(--sk-color-action-secondary-text);
}
.sk-split-button--secondary .sk-split-button__trigger { margin-inline-start: calc(var(--sk-border-width-hairline) * -1); }
.sk-split-button--secondary .sk-split-button__action:hover,
.sk-split-button--secondary .sk-split-button__trigger:hover { background-color: var(--sk-color-action-secondary-bg-hover); }

/* --- Primary --- */
.sk-split-button--primary .sk-split-button__action,
.sk-split-button--primary .sk-split-button__trigger {
  background-color: var(--sk-color-action-primary-bg);
  color: var(--sk-color-action-primary-text);
}
.sk-split-button--primary .sk-split-button__action:hover,
.sk-split-button--primary .sk-split-button__trigger:hover { background-color: var(--sk-color-action-primary-bg-hover); }

/* The divider must survive the label flipping from white (light) to near-black (dark),
   so it is declared per theme rather than inherited from currentColor. */
.sk-split-button--primary .sk-split-button__trigger {
  border-inline-start: var(--sk-border-width-hairline) solid rgb(255 255 255 / 32%);
}
[data-sk-theme="dark"] .sk-split-button--primary .sk-split-button__trigger,
[data-sk-theme="hc-dark"] .sk-split-button--primary .sk-split-button__trigger {
  border-inline-start-color: rgb(0 0 0 / 32%);
}

.sk-split-button__trigger[aria-expanded="true"] { background-color: var(--sk-color-surface-active); }

.sk-split-button--sm .sk-split-button__action,
.sk-split-button--sm .sk-split-button__trigger {
  min-block-size: var(--sk-control-height-sm);
  font-size: var(--sk-font-size-label-sm);
}
.sk-split-button--sm .sk-split-button__trigger { inline-size: var(--sk-control-height-sm); }`,
    related: ['button', 'menu', 'button-group'],
  },

  {
    id: 'link',
    name: 'Link',
    category: 'action',
    status: 'stable',
    summary:
      'Navigates somewhere. Underlined by default, because colour alone has never been an accessible signal for "this is a link".',
    whenToUse: [
      'Moving to another page, view or anchor.',
      'Downloading a file.',
      'Opening an external resource.',
    ],
    whenNotToUse: [
      'Performing an action — use Button. `href="#"` with a click handler is a broken link, not a button.',
      'Opening a dialog or menu in place.',
    ],
    anatomy: [
      { part: 'Anchor', required: true, description: 'A real <a> with a real href, so middle-click, copy-link and open-in-new-tab all work.' },
      { part: 'Underline', required: true, description: 'Present at rest inside prose. Offset from the baseline so descenders stay readable.' },
      { part: 'External indicator', required: false, description: 'An icon plus hidden text when the link leaves the application.' },
    ],
    variants: [
      { name: 'Inline', className: 'sk-link', description: 'Underlined, brand-coloured. The default.', use: 'Links inside sentences and paragraphs.' },
      { name: 'Standalone', className: 'sk-link--standalone', description: 'Underline appears on hover only; often paired with a trailing arrow.', use: 'Links that sit alone on their own line, where their linkness is obvious from position.' },
      { name: 'Quiet', className: 'sk-link--quiet', description: 'Inherits the surrounding text colour; underlined on hover.', use: 'Dense lists and table cells where a page of blue would be noise. Requires a non-colour affordance such as a whole-row hover.' },
      { name: 'Inverse', className: 'sk-link--inverse', description: 'For inverse and brand surfaces.', use: 'Footers and banners on a dark or brand-filled background.' },
    ],
    sizes: [
      { name: 'Inherit', className: '', height: 'auto', typeStyle: 'inherits from context', description: 'A link never sets its own font size. It matches the text it lives in.' },
    ],
    states: [
      { name: 'Rest', description: 'Brand colour, underlined.', trigger: 'default' },
      { name: 'Hover', description: 'Darker in light mode, lighter in dark mode; underline thickens.', trigger: ':hover' },
      { name: 'Focus visible', description: 'Standard focus ring with a small radius so it hugs the text.', trigger: ':focus-visible' },
      { name: 'Visited', description: 'Violet, in long-form prose only. Suppressed in application chrome, where "visited" is meaningless and leaks history.', trigger: ':visited' },
      { name: 'Current', description: 'aria-current="page" for a link pointing at the page you are on.', trigger: '[aria-current]' },
    ],
    props: [
      { name: 'href', type: 'string', required: true, description: 'Destination. Never "#".' },
      { name: 'variant', type: "'inline' | 'standalone' | 'quiet' | 'inverse'", default: "'inline'", description: 'Treatment.' },
      { name: 'external', type: 'boolean', default: 'false', description: 'Adds the external icon and the hidden "opens in a new tab" text.' },
    ],
    tokensUsed: ['color-text-link', 'color-text-link-hover', 'color-text-link-visited', 'color-focus-ring', 'space-4'],
    darkMode:
      'Links step to cobalt-300 in dark mode. Cobalt-700 — the light-mode link colour — sits at roughly 2:1 against a dark page and would be unreadable, which is why link colour must be a token rather than a constant. The visited violet is likewise stepped up. Underline thickness stays identical across themes: thin underlines get lost against dark backgrounds, so the system uses a 1.5px underline everywhere rather than the browser default.',
    accessibility: {
      role: 'Native <a href>.',
      keyboard: [
        { keys: 'Tab', action: 'Focus.' },
        { keys: 'Enter', action: 'Follow. Space does not activate a link — that is correct and should not be patched.' },
      ],
      aria: [
        'aria-current="page" on the link representing the current location.',
        'Warn about a new tab in the accessible name: a visually hidden "(opens in a new tab)".',
        'Never aria-label a link with text that omits the visible label — voice control users say what they see (WCAG 2.5.3).',
      ],
      wcag: [
        '1.4.1 Use of Color — the underline is the non-colour signal, which is why it is on by default.',
        '2.4.4 Link Purpose (In Context) — "read more" repeated eight times fails this.',
        '2.4.7 Focus Visible.',
        '2.5.3 Label in Name.',
        '3.2.5 Change on Request — target="_blank" must be announced.',
      ],
      screenReader:
        'Announced as "<text>, link". Screen reader users often pull up a list of all links on a page, stripped of surrounding context — which is why every link text must make sense alone.',
      targetSize:
        'Inline links are exempt from SC 2.5.8 because they are in a sentence. Standalone links are not exempt and get vertical padding to reach 24px.',
    },
    content: [
      'Link text describes the destination: "Task field reference", not "click here" or "read more".',
      'Front-load the distinguishing word so the link is scannable.',
      'Do not include the word "link" — the role is announced.',
      'For downloads, state the format and size: "Audit log (CSV, 2.4 MB)".',
    ],
    dos: [
      'Keep underlines on for links inside prose.',
      'Use aria-current="page" for self-referential navigation links.',
      'Announce new tabs and downloads in the link text.',
    ],
    donts: [
      'Do not remove the underline and rely on colour.',
      'Do not use a link that looks like a button for a destructive action.',
      'Do not open new tabs by default. The user has a back button and knows how to use it.',
      'Do not style :visited inside application chrome.',
    ],
    html: `<p>
  See the <a class="sk-link" href="/docs/tasks">Task field reference</a> for
  supported types, or
  <a class="sk-link" href="https://example.org/rfc" target="_blank" rel="noreferrer noopener">
    the upstream specification
    <svg class="sk-link__external" aria-hidden="true" focusable="false" width="12" height="12"><use href="#sk-icon-external" /></svg>
    <span class="sk-visually-hidden">(opens in a new tab)</span>
  </a>.
</p>

<a class="sk-link sk-link--standalone" href="/reports/2026">
  View the full report
  <svg aria-hidden="true" focusable="false" width="16" height="16"><use href="#sk-icon-arrow-right" /></svg>
</a>

<a class="sk-link sk-link--quiet" href="/projects/website-redesign" aria-current="page">Website redesign</a>`,
    css: `.sk-link {
  color: var(--sk-color-text-link);
  text-decoration: underline;
  /* Fixed thickness: the browser default is too thin to survive on a dark surface. */
  text-decoration-thickness: 1.5px;
  text-underline-offset: var(--sk-space-4);
  border-radius: var(--sk-radius-xs);
  transition: color var(--sk-duration-fast) var(--sk-easing-standard);
}

.sk-link:hover {
  color: var(--sk-color-text-link-hover);
  text-decoration-thickness: 2px;
}

.sk-link:focus-visible {
  outline: var(--sk-focus-ring-width) solid var(--sk-color-focus-ring);
  outline-offset: var(--sk-focus-ring-offset);
  text-decoration: none;
}

/* Visited state is opt-in via .sk-prose, so application chrome does not leak history. */
.sk-prose .sk-link:visited { color: var(--sk-color-text-link-visited); }

.sk-link[aria-current] { font-weight: var(--sk-font-weight-semibold); }

.sk-link--standalone {
  display: inline-flex;
  align-items: center;
  gap: var(--sk-space-6);
  padding-block: var(--sk-space-4);
  font-weight: var(--sk-font-weight-medium);
  text-decoration: none;
}
.sk-link--standalone:hover { text-decoration: underline; }
.sk-link--standalone svg {
  fill: currentColor;
  transition: translate var(--sk-duration-fast) var(--sk-easing-standard);
}
.sk-link--standalone:hover svg { translate: var(--sk-space-2) 0; }

.sk-link--quiet { color: inherit; text-decoration: none; }
.sk-link--quiet:hover { color: var(--sk-color-text-link); text-decoration: underline; }

.sk-link--inverse { color: var(--sk-color-text-on-inverse); }
.sk-link--inverse:hover { color: var(--sk-color-text-on-inverse); text-decoration-thickness: 2px; }

.sk-link__external { fill: currentColor; vertical-align: baseline; margin-inline-start: var(--sk-space-2); }

@media (prefers-reduced-motion: reduce) {
  .sk-link--standalone:hover svg { translate: none; }
}`,
    related: ['button', 'breadcrumbs', 'side-nav'],
  },
];
