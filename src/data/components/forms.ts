import type { ComponentSpec } from './types.js';

export const formComponents: ComponentSpec[] = [
  {
    id: 'form-field',
    name: 'Form field',
    category: 'form',
    status: 'stable',
    summary:
      'The wrapper that binds a label, hint, control and error message into one accessible unit. Every input in the system is wrapped by it — this is where the association work happens, so no individual control has to repeat it.',
    whenToUse: [
      'Around every text field, textarea, select, combobox, checkbox group, radio group, switch and file upload.',
    ],
    whenNotToUse: [
      'Around a search field in a toolbar, where the placeholder and icon carry the meaning and a visible label would be noise — use Search field, which handles its own labelling.',
    ],
    anatomy: [
      { part: 'Label', required: true, description: 'A real <label for>. Always visible; if the design says otherwise, the design is wrong more often than it is right.' },
      { part: 'Requirement marker', required: false, description: 'The word "Optional" on optional fields. Sekura marks the minority case, and never uses a bare asterisk.' },
      { part: 'Hint', required: false, description: 'Format guidance, placed *above* the control so it is read before the user starts typing rather than after they finish.' },
      { part: 'Control', required: true, description: 'The input itself.' },
      { part: 'Error', required: false, description: 'Placed below the control, with an icon and text. Announced politely on blur, assertively on submit.' },
      { part: 'Character counter', required: false, description: 'Below the control, opposite the error. Announced only at thresholds, not on every keystroke.' },
    ],
    variants: [
      { name: 'Stacked', className: 'sk-field', description: 'Label above control.', use: 'Default. Works at every width, which is why it is the default.' },
      { name: 'Inline', className: 'sk-field--inline', description: 'Label beside control, wrapping to stacked when space runs out.', use: 'Dense settings screens and filter bars.' },
      { name: 'Horizontal', className: 'sk-field--horizontal', description: 'Fixed label column with the control alongside; collapses to stacked below the md breakpoint.', use: 'Long settings forms where a label column aids scanning.' },
    ],
    sizes: [
      { name: 'Small', className: 'sk-field--sm', height: 'control-height-sm', typeStyle: 'body-sm', description: 'Filter bars and inline editing.' },
      { name: 'Medium', className: '', height: 'control-height-md', typeStyle: 'body-md', description: 'Default.' },
      { name: 'Large', className: 'sk-field--lg', height: 'control-height-lg', typeStyle: 'body-md', description: 'Single-question screens and touch-first forms.' },
    ],
    states: [
      { name: 'Rest', description: 'Neutral border.', trigger: 'default' },
      { name: 'Invalid', description: 'Crimson border, error text and icon, aria-invalid="true".', trigger: '[data-invalid]' },
      { name: 'Valid', description: 'Only after server confirmation of something genuinely uncertain, such as a hostname availability check. Never as a reward for typing.', trigger: '[data-valid]' },
      { name: 'Disabled', description: 'Whole field dimmed, control not focusable.', trigger: '[data-disabled]' },
      { name: 'Read only', description: 'Value visible and selectable but not editable. Distinct from disabled — the value still matters.', trigger: '[data-readonly]' },
    ],
    props: [
      { name: 'label', type: 'string', required: true, description: 'Visible label text.' },
      { name: 'hint', type: 'string', description: 'Format guidance shown above the control.' },
      { name: 'error', type: 'string', description: 'Validation message. Presence switches the field to invalid.' },
      { name: 'optional', type: 'boolean', default: 'false', description: 'Marks the field "Optional". Required fields are unmarked.' },
      { name: 'layout', type: "'stacked' | 'inline' | 'horizontal'", default: "'stacked'", description: 'Label placement.' },
    ],
    tokensUsed: ['color-text-primary', 'color-text-secondary', 'color-status-danger-text', 'color-field-border-error', 'space-4', 'space-6', 'space-8'],
    darkMode:
      'Error text uses crimson-200 on dark rather than crimson-800, because the light-mode error colour sits near 1.5:1 on a dark page. The hint uses text-secondary in both themes rather than tertiary: on dark surfaces the tertiary step is legible but visually recedes so far that users stop noticing format guidance entirely. Field borders step lighter, not darker, so the control boundary keeps its 3:1 against the darker page.',
    accessibility: {
      role: 'No role of its own. It exists to wire up the relationships the control cannot express alone.',
      keyboard: [{ keys: 'Tab', action: 'Focus moves to the control. The wrapper is never a tab stop.' }],
      aria: [
        '<label for="{id}"> pointing at the control id. Wrapping the control in the label also works and is more robust against id collisions.',
        'aria-describedby on the control listing the hint id and, when present, the error id — in that order, because order determines reading order.',
        'aria-invalid="true" when the field has an error. Never leave a stale aria-invalid behind after the user fixes it.',
        'aria-required="true" only when the control is not a native required element.',
        'The error message container is role="alert" on submit-time errors, and aria-live="polite" for blur-time errors.',
      ],
      wcag: [
        '1.3.1 Info and Relationships — label, hint and error are programmatically associated.',
        '2.4.6 Headings and Labels.',
        '3.3.1 Error Identification.',
        '3.3.2 Labels or Instructions.',
        '3.3.3 Error Suggestion — say how to fix it, not just that it is wrong.',
        '4.1.3 Status Messages.',
      ],
      screenReader:
        'On focus, announces "<label>, <hint>, <control role>, invalid, <error>". This is why hint order matters: put format guidance before the error so it is heard first.',
      targetSize: 'The label is a click target that focuses the control, which materially enlarges the effective hit area of checkboxes and radios.',
    },
    content: [
      'Labels are nouns, sentence case, no trailing colon: "Time to live", not "Time To Live:".',
      'Mark optional fields, not required ones — in most forms the required fields are the majority, and marking the majority is noise.',
      'Hints state the format positively: "Use lowercase letters, digits and hyphens", not "Must not contain uppercase".',
      'Errors say what is wrong and how to fix it: "Enter a TTL between 60 and 86400 seconds", not "Invalid value".',
      'Never put the error in the placeholder — it disappears the moment the user types.',
    ],
    dos: [
      'Keep the label visible. A placeholder is not a label; it vanishes exactly when a user needs to check what they are filling in.',
      'Validate on blur for format, on submit for everything, and never on every keystroke.',
      'Preserve the user’s input when server validation fails.',
      'Put the hint above the control and the error below it.',
    ],
    donts: [
      'Do not use placeholder text as the only label.',
      'Do not use colour alone to mark an invalid field — the icon and message do the work.',
      'Do not show a green tick simply because a field is non-empty.',
      'Do not clear a password field on a failed submit.',
    ],
    html: `<div class="sk-field">
  <label class="sk-field__label" for="ttl">
    Time to live
    <span class="sk-field__optional">Optional</span>
  </label>
  <p class="sk-field__hint" id="ttl-hint">Seconds before resolvers refresh this record. Between 60 and 86400.</p>
  <input class="sk-input" id="ttl" name="ttl" type="number" inputmode="numeric"
         aria-describedby="ttl-hint" />
</div>

<!-- Invalid: error id appended to aria-describedby, aria-invalid set -->
<div class="sk-field" data-invalid>
  <label class="sk-field__label" for="hostname">Hostname</label>
  <p class="sk-field__hint" id="hostname-hint">Lowercase letters, digits and hyphens.</p>
  <input class="sk-input" id="hostname" name="hostname" type="text"
         aria-invalid="true" aria-describedby="hostname-hint hostname-error" />
  <p class="sk-field__error" id="hostname-error">
    <svg aria-hidden="true" focusable="false" width="16" height="16"><use href="#sk-icon-warning" /></svg>
    Remove the uppercase letters. Hostnames must be lowercase.
  </p>
</div>`,
    css: `/* Flex column: the field never sets a width, so it fills whatever flex or grid
   cell it is placed in and stays responsive without media queries. */
.sk-field {
  display: flex;
  flex-direction: column;
  gap: var(--sk-space-6);
  min-inline-size: 0;
}

.sk-field__label {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: var(--sk-space-8);
  font-size: var(--sk-font-size-label-md);
  line-height: var(--sk-line-height-label-md);
  font-weight: var(--sk-font-weight-medium);
  color: var(--sk-color-text-primary);
}

.sk-field__optional {
  flex: 0 0 auto;
  font-size: var(--sk-font-size-body-xs);
  font-weight: var(--sk-font-weight-regular);
  color: var(--sk-color-text-tertiary);
}

.sk-field__hint {
  margin: 0;
  font-size: var(--sk-font-size-body-sm);
  line-height: var(--sk-line-height-body-sm);
  /* Secondary rather than tertiary: on dark surfaces tertiary recedes so far that
     users stop reading format guidance altogether. */
  color: var(--sk-color-text-secondary);
}

.sk-field__error {
  display: flex;
  align-items: flex-start;
  gap: var(--sk-space-6);
  margin: 0;
  font-size: var(--sk-font-size-body-sm);
  line-height: var(--sk-line-height-body-sm);
  color: var(--sk-color-status-danger-text);
}
.sk-field__error svg { flex: 0 0 auto; margin-block-start: 0.15em; fill: currentColor; }
.sk-field__error > span { flex: 1 1 auto; min-inline-size: 0; }

.sk-field__footer {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: var(--sk-space-8);
}
.sk-field__counter {
  flex: 0 0 auto;
  margin-inline-start: auto;
  font-size: var(--sk-font-size-body-xs);
  color: var(--sk-color-text-tertiary);
  font-variant-numeric: tabular-nums;
}

.sk-field[data-invalid] .sk-input,
.sk-field[data-invalid] .sk-select,
.sk-field[data-invalid] .sk-textarea {
  border-color: var(--sk-color-field-border-error);
  /* A second inset ring so the invalid state survives forced-colours mode,
     where our border colour is discarded. */
  box-shadow: inset 0 0 0 1px var(--sk-color-field-border-error);
}

.sk-field[data-valid] .sk-input { border-color: var(--sk-color-field-border-success); }

.sk-field[data-disabled] .sk-field__label,
.sk-field[data-disabled] .sk-field__hint { color: var(--sk-color-text-disabled); }

/* --- Inline: wraps to stacked automatically, no breakpoint needed --- */
.sk-field--inline {
  flex-direction: row;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--sk-space-8) var(--sk-space-12);
}
.sk-field--inline .sk-field__label { flex: 0 0 auto; }
.sk-field--inline .sk-input { flex: 1 1 12rem; min-inline-size: 0; }
.sk-field--inline .sk-field__hint,
.sk-field--inline .sk-field__error { flex: 1 0 100%; }

/* --- Horizontal: label column, collapsing below md --- */
.sk-field--horizontal { flex-direction: column; }
@media (min-width: 48rem) {
  .sk-field--horizontal {
    flex-direction: row;
    align-items: flex-start;
    gap: var(--sk-space-24);
  }
  .sk-field--horizontal .sk-field__label { flex: 0 0 14rem; padding-block-start: var(--sk-space-8); }
  .sk-field--horizontal > :not(.sk-field__label) { flex: 1 1 auto; min-inline-size: 0; }
}`,
    related: ['text-field', 'textarea', 'select', 'checkbox', 'radio-group', 'switch'],
  },

  {
    id: 'text-field',
    name: 'Text field',
    category: 'form',
    status: 'stable',
    summary: 'Single-line text entry. The most used control in any application, and the one most often shipped without a real label.',
    whenToUse: [
      'Short freeform text, numbers, emails, URLs, search terms within a form.',
      'Values with no fixed set of options.',
    ],
    whenNotToUse: [
      'More than roughly 80 characters of expected input — use Textarea.',
      'A known set of options — use Select or Radio group.',
      'A value the user picks rather than types — use Combobox or Date picker.',
    ],
    anatomy: [
      { part: 'Input', required: true, description: 'A native <input> with the right type and inputmode.' },
      { part: 'Leading adornment', required: false, description: 'An icon or fixed prefix such as "https://".' },
      { part: 'Trailing adornment', required: false, description: 'A unit ("seconds"), a clear button, or a password reveal toggle.' },
    ],
    variants: [
      { name: 'Default', className: 'sk-input', description: 'Bordered box.', use: 'Everywhere.' },
      { name: 'With adornments', className: 'sk-input-group', description: 'Prefix and/or suffix attached to the field.', use: 'Units, protocols, currency, inline actions.' },
      { name: 'Monospace', className: 'sk-input--mono', description: 'Monospace with tabular figures.', use: 'Identifiers, hostnames, keys, hashes, IP addresses — anything where character-by-character comparison matters.' },
    ],
    sizes: [
      { name: 'Small', className: 'sk-input--sm', height: '2rem', typeStyle: 'body-sm', description: 'Filter bars, inline table editing.' },
      { name: 'Medium', className: '', height: '2.5rem', typeStyle: 'body-md', description: 'Default.' },
      { name: 'Large', className: 'sk-input--lg', height: '3rem', typeStyle: 'body-md', description: 'Touch-first and single-question screens.' },
    ],
    states: [
      { name: 'Rest', description: 'Neutral border at 3:1.', trigger: 'default' },
      { name: 'Hover', description: 'Border steps one level stronger.', trigger: ':hover' },
      { name: 'Focus', description: 'Focus ring plus a stronger border. Focus is never signalled by the ring alone.', trigger: ':focus-visible' },
      { name: 'Invalid', description: 'Crimson border and inset ring.', trigger: '[aria-invalid="true"]' },
      { name: 'Disabled', description: 'Sunken fill, disabled text, not focusable.', trigger: ':disabled' },
      { name: 'Read only', description: 'Subtle fill, normal text, still focusable and selectable.', trigger: '[readonly]' },
    ],
    props: [
      { name: 'type', type: "'text' | 'email' | 'url' | 'tel' | 'number' | 'password'", default: "'text'", description: 'Native input type. Drives mobile keyboard and browser validation.' },
      { name: 'inputMode', type: 'string', description: 'Refines the on-screen keyboard independently of type, e.g. numeric for a PIN that must stay a string.' },
      { name: 'autoComplete', type: 'string', description: 'Required for anything about the user (WCAG 1.3.5). Use "off" only where it is genuinely wrong.' },
      { name: 'prefix', type: 'ReactNode', description: 'Leading adornment.' },
      { name: 'suffix', type: 'ReactNode', description: 'Trailing adornment.' },
      { name: 'mono', type: 'boolean', default: 'false', description: 'Monospace with tabular figures.' },
    ],
    tokensUsed: ['color-field-bg', 'color-field-border', 'color-field-border-hover', 'color-field-border-error', 'color-text-primary', 'color-text-placeholder', 'color-focus-ring', 'radius-md'],
    darkMode:
      'The field background is surface-base (the *page* colour), not a lighter raised colour — a lighter well on a dark page reads as disabled to most people, the opposite of the intent. The border does the work of defining the control, so it steps up to neutral-500 to hold 3:1 against both the page and a raised card. Placeholder text uses neutral-400 rather than the light-mode neutral-500, which would fall under 4.5:1 on dark. Browser autofill styling is explicitly overridden, because Chrome injects a hard-coded pale yellow that is unreadable in dark mode.',
    accessibility: {
      role: 'Native <input>.',
      keyboard: [
        { keys: 'Tab', action: 'Focus.' },
        { keys: 'Standard text editing keys', action: 'Handled natively. Do not intercept them.' },
        { keys: 'Escape', action: 'Clears the field only when a clear button is present, and only as a documented convenience.' },
      ],
      aria: [
        'Labelled by the Form field wrapper. Never rely on placeholder as the accessible name.',
        'aria-describedby for hint and error.',
        'aria-invalid on failure.',
        'autocomplete tokens on any field collecting information about the user — this is WCAG 1.3.5, not an optimisation.',
        'For number entry prefer type="text" with inputmode="numeric" and pattern, avoiding the spinner and its scroll-wheel accidents.',
      ],
      wcag: [
        '1.3.5 Identify Input Purpose.',
        '1.4.11 Non-text Contrast — the border is the control boundary.',
        '2.4.7 Focus Visible.',
        '3.3.2 Labels or Instructions.',
        '2.5.3 Label in Name.',
      ],
      screenReader: 'Announced as "<label>, edit text, <value>, <hint>". Invalid fields append "invalid entry" plus the error text.',
      targetSize: 'Height at every size exceeds 24px. Adornment buttons inside the field carry their own 24px hit area.',
    },
    content: [
      'Placeholders show an example, never an instruction: "api.example.com", not "Enter hostname".',
      'Put units in a suffix adornment rather than the label: "TTL" with a "seconds" suffix beats "TTL (seconds)".',
      'Do not pre-fill a field with a value the user must change.',
    ],
    dos: [
      'Set autocomplete on every field about the user.',
      'Match field width to expected content length — a 4-digit year field should not be 40 characters wide. This is a real affordance, not decoration.',
      'Use type="text" with inputmode="numeric" for identifiers that merely look numeric, such as postcodes and account numbers.',
    ],
    donts: [
      'Do not use a placeholder as a label.',
      'Do not block characters silently as the user types.',
      'Do not use type="number" for anything that is not a true quantity.',
      'Do not disable paste. It breaks password managers and is a security anti-pattern.',
    ],
    html: `<div class="sk-field">
  <label class="sk-field__label" for="host">Hostname</label>
  <input class="sk-input sk-input--mono" id="host" name="host" type="text"
         placeholder="api.example.com" autocomplete="off" spellcheck="false" />
</div>

<!-- With adornments -->
<div class="sk-field">
  <label class="sk-field__label" for="ttl2">Time to live</label>
  <div class="sk-input-group">
    <input class="sk-input" id="ttl2" type="text" inputmode="numeric" pattern="[0-9]*" value="3600" />
    <span class="sk-input-group__suffix" aria-hidden="true">seconds</span>
  </div>
</div>

<!-- Password with a reveal toggle -->
<div class="sk-field">
  <label class="sk-field__label" for="pw">Password</label>
  <div class="sk-input-group">
    <input class="sk-input" id="pw" type="password" autocomplete="current-password" />
    <button type="button" class="sk-input-group__action" aria-pressed="false" aria-controls="pw">
      <svg aria-hidden="true" focusable="false" width="16" height="16"><use href="#sk-icon-eye" /></svg>
      <span class="sk-visually-hidden">Show password</span>
    </button>
  </div>
</div>`,
    css: `.sk-input {
  /* No fixed width: the field fills its flex or grid cell. Width is communicated
     by flex-basis at the call site, never hard-coded here. */
  inline-size: 100%;
  min-inline-size: 0;
  min-block-size: var(--sk-control-height-md);
  padding-inline: var(--sk-space-12);
  padding-block: var(--sk-space-8);
  background-color: var(--sk-color-field-bg);
  border: var(--sk-border-width-hairline) solid var(--sk-color-field-border);
  border-radius: var(--sk-radius-md);
  color: var(--sk-color-text-primary);
  font-family: var(--sk-font-family-sans);
  font-size: var(--sk-font-size-body-md);
  line-height: var(--sk-line-height-body-md);
  transition:
    border-color var(--sk-duration-fast) var(--sk-easing-standard),
    background-color var(--sk-duration-fast) var(--sk-easing-standard);
}

.sk-input::placeholder { color: var(--sk-color-text-placeholder); opacity: 1; }
.sk-input:hover:not(:disabled, [readonly]) { border-color: var(--sk-color-field-border-hover); }

.sk-input:focus-visible {
  outline: var(--sk-focus-ring-width) solid var(--sk-color-focus-ring);
  outline-offset: var(--sk-focus-ring-offset);
  /* Border strengthens too: the ring alone disappears in forced-colours mode. */
  border-color: var(--sk-color-border-interactive);
}

.sk-input:disabled {
  background-color: var(--sk-color-field-bg-disabled);
  border-color: var(--sk-color-border-disabled);
  color: var(--sk-color-text-disabled);
  cursor: not-allowed;
}

.sk-input[readonly] {
  background-color: var(--sk-color-field-bg-readonly);
  border-color: var(--sk-color-border-subtle);
}

.sk-input--mono {
  font-family: var(--sk-font-family-mono);
  font-size: var(--sk-font-size-code-md);
  font-variant-numeric: tabular-nums;
}

.sk-input--sm { min-block-size: var(--sk-control-height-sm); padding-inline: var(--sk-space-8); font-size: var(--sk-font-size-body-sm); }
.sk-input--lg { min-block-size: var(--sk-control-height-lg); padding-inline: var(--sk-space-16); }

/* Chrome injects a hard-coded pale yellow autofill background that is unreadable
   in dark mode. There is no supported property to change it, so we paint over it
   with a large inset shadow and keep the caret and text under our own control. */
.sk-input:-webkit-autofill,
.sk-input:-webkit-autofill:hover,
.sk-input:-webkit-autofill:focus {
  -webkit-text-fill-color: var(--sk-color-text-primary);
  -webkit-box-shadow: 0 0 0 100px var(--sk-color-field-bg) inset;
  caret-color: var(--sk-color-text-primary);
  transition: background-color 100000s ease-in-out 0s;
}

/* --- Adornment group --- */
.sk-input-group {
  display: flex;
  align-items: stretch;
  inline-size: 100%;
  min-inline-size: 0;
  border: var(--sk-border-width-hairline) solid var(--sk-color-field-border);
  border-radius: var(--sk-radius-md);
  background-color: var(--sk-color-field-bg);
  overflow: hidden;
}
.sk-input-group:focus-within {
  outline: var(--sk-focus-ring-width) solid var(--sk-color-focus-ring);
  outline-offset: var(--sk-focus-ring-offset);
  border-color: var(--sk-color-border-interactive);
}
/* The input takes all remaining space; adornments never shrink. */
.sk-input-group > .sk-input {
  flex: 1 1 auto;
  min-inline-size: 0;
  border: none;
  border-radius: 0;
  background: transparent;
}
.sk-input-group > .sk-input:focus-visible { outline: none; }

.sk-input-group__prefix,
.sk-input-group__suffix {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  padding-inline: var(--sk-space-12);
  background-color: var(--sk-color-surface-sunken);
  color: var(--sk-color-text-secondary);
  font-size: var(--sk-font-size-body-sm);
  white-space: nowrap;
}
.sk-input-group__prefix { border-inline-end: var(--sk-border-width-hairline) solid var(--sk-color-border-subtle); }
.sk-input-group__suffix { border-inline-start: var(--sk-border-width-hairline) solid var(--sk-color-border-subtle); }

.sk-input-group__action {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  inline-size: var(--sk-control-height-md);
  border: none;
  background: transparent;
  color: var(--sk-color-text-secondary);
  cursor: pointer;
}
.sk-input-group__action:hover { background-color: var(--sk-color-surface-hover); color: var(--sk-color-text-primary); }
.sk-input-group__action > svg { fill: currentColor; }

@media (forced-colors: active) {
  .sk-input { border-color: ButtonBorder; }
  .sk-input:focus-visible { outline-color: Highlight; }
}`,
    related: ['form-field', 'textarea', 'combobox', 'search-field'],
  },

  {
    id: 'textarea',
    name: 'Textarea',
    category: 'form',
    status: 'stable',
    summary: 'Multi-line text entry that grows with its content rather than trapping the user in a small scrolling box.',
    whenToUse: ['Descriptions, comments, change reasons, notes, pasted configuration blocks.'],
    whenNotToUse: ['Short single-line values — use Text field.', 'Rich formatted content — use a dedicated editor.'],
    anatomy: [
      { part: 'Textarea', required: true, description: 'Native <textarea>, auto-growing up to a maximum then scrolling.' },
      { part: 'Character counter', required: false, description: 'Shown when a limit exists. Announced at thresholds only.' },
      { part: 'Resize handle', required: false, description: 'Vertical resize only. Horizontal resize breaks layouts.' },
    ],
    variants: [
      { name: 'Default', className: 'sk-textarea', description: 'Fixed rows, user-resizable vertically.', use: 'Most cases.' },
      { name: 'Auto-grow', className: 'sk-textarea--auto', description: 'Grows to fit content up to a max height.', use: 'Comment boxes and chat composers.' },
      { name: 'Monospace', className: 'sk-textarea--mono', description: 'Monospace, no spellcheck, no autocapitalise.', use: 'Configuration, zone files, certificates, JSON.' },
    ],
    sizes: [
      { name: 'Small', className: 'sk-textarea--sm', height: '3 rows', typeStyle: 'body-sm', description: 'Inline notes.' },
      { name: 'Medium', className: '', height: '4 rows', typeStyle: 'body-md', description: 'Default.' },
      { name: 'Large', className: 'sk-textarea--lg', height: '8 rows', typeStyle: 'body-md', description: 'Pasted blocks of configuration.' },
    ],
    states: [
      { name: 'Rest', description: 'Neutral border.', trigger: 'default' },
      { name: 'Focus', description: 'Ring plus stronger border.', trigger: ':focus-visible' },
      { name: 'Invalid', description: 'Crimson border and message.', trigger: '[aria-invalid="true"]' },
      { name: 'Near limit', description: 'Counter turns amber at 90% of the limit and crimson past it.', trigger: '[data-counter-state]' },
      { name: 'Disabled', description: 'Sunken fill, not focusable.', trigger: ':disabled' },
    ],
    props: [
      { name: 'rows', type: 'number', default: '4', description: 'Initial visible rows.' },
      { name: 'maxLength', type: 'number', description: 'Character limit. Enables the counter.' },
      { name: 'autoGrow', type: 'boolean', default: 'false', description: 'Grow to fit content up to maxBlockSize.' },
      { name: 'mono', type: 'boolean', default: 'false', description: 'Monospace, spellcheck off.' },
    ],
    tokensUsed: ['color-field-bg', 'color-field-border', 'color-text-primary', 'color-focus-ring', 'color-status-warning-text', 'radius-md'],
    darkMode:
      'Identical token strategy to Text field. The one addition is the counter, whose amber warning colour must step from amber-800 to amber-200: amber is the hue that degrades worst when a light-mode value is reused on dark, because mid-amber sits at roughly 2:1 against a near-black page and reads as a dull brown.',
    accessibility: {
      role: 'Native <textarea>.',
      keyboard: [
        { keys: 'Tab', action: 'Moves focus out of the textarea, it does not insert a tab. Do not change this — trapping Tab inside a textarea strands keyboard users.' },
        { keys: 'Enter', action: 'Inserts a newline. If Enter submits, that must be an explicit, documented affordance with a visible hint.' },
      ],
      aria: [
        'Labelled by the Form field wrapper.',
        'aria-describedby includes the counter so the limit is announced on focus, not discovered at the limit.',
        'The counter live region is aria-live="polite" and updates only at 90% and 100% — announcing every keystroke makes the control unusable with a screen reader.',
      ],
      wcag: ['1.3.1 Info and Relationships.', '3.3.2 Labels or Instructions.', '4.1.3 Status Messages.', '2.1.2 No Keyboard Trap.'],
      screenReader: 'Announced as "<label>, edit text, multiline". The limit is read from the description on focus.',
      targetSize: 'Well exceeds minimums. The resize handle is a native affordance and exempt.',
    },
    content: [
      'State the limit before the user hits it, in the hint: "Up to 500 characters".',
      'Counters count down remaining, not up — "120 remaining" is more actionable than "380/500".',
      'For a change reason, prompt for the why: "Why are you making this change?" beats "Comment".',
    ],
    dos: [
      'Allow vertical resize.',
      'Turn off spellcheck and autocapitalise for technical content.',
      'Let the user exceed a soft limit and warn, rather than silently truncating.',
    ],
    donts: [
      'Do not allow horizontal resize.',
      'Do not hard-block typing at the limit without any feedback.',
      'Do not make Enter submit unless you say so visibly.',
    ],
    html: `<div class="sk-field">
  <label class="sk-field__label" for="reason">Reason for change</label>
  <p class="sk-field__hint" id="reason-hint">Recorded in the audit log. Up to 500 characters.</p>
  <textarea class="sk-textarea" id="reason" name="reason" rows="4" maxlength="500"
            aria-describedby="reason-hint reason-count"></textarea>
  <div class="sk-field__footer">
    <span class="sk-field__counter" id="reason-count" aria-live="polite">500 characters remaining</span>
  </div>
</div>`,
    css: `.sk-textarea {
  inline-size: 100%;
  min-inline-size: 0;
  padding: var(--sk-space-8) var(--sk-space-12);
  background-color: var(--sk-color-field-bg);
  border: var(--sk-border-width-hairline) solid var(--sk-color-field-border);
  border-radius: var(--sk-radius-md);
  color: var(--sk-color-text-primary);
  font-family: var(--sk-font-family-sans);
  font-size: var(--sk-font-size-body-md);
  line-height: var(--sk-line-height-body-md);
  /* Vertical only: horizontal resize lets a user break the surrounding layout. */
  resize: vertical;
  min-block-size: calc(var(--sk-line-height-body-md) * 3);
  transition: border-color var(--sk-duration-fast) var(--sk-easing-standard);
}

.sk-textarea::placeholder { color: var(--sk-color-text-placeholder); opacity: 1; }
.sk-textarea:hover:not(:disabled, [readonly]) { border-color: var(--sk-color-field-border-hover); }
.sk-textarea:focus-visible {
  outline: var(--sk-focus-ring-width) solid var(--sk-color-focus-ring);
  outline-offset: var(--sk-focus-ring-offset);
  border-color: var(--sk-color-border-interactive);
}
.sk-textarea:disabled {
  background-color: var(--sk-color-field-bg-disabled);
  border-color: var(--sk-color-border-disabled);
  color: var(--sk-color-text-disabled);
  cursor: not-allowed;
  resize: none;
}

.sk-textarea--mono {
  font-family: var(--sk-font-family-mono);
  font-size: var(--sk-font-size-code-md);
  white-space: pre;
  overflow-wrap: normal;
  overflow-x: auto;
}

.sk-textarea--auto {
  resize: none;
  overflow-y: auto;
  max-block-size: 20rem;
  /* field-sizing lets the browser grow the control natively where supported;
     the JS auto-grow fallback is only needed for older engines. */
  field-sizing: content;
}

.sk-textarea--sm { font-size: var(--sk-font-size-body-sm); min-block-size: calc(var(--sk-line-height-body-sm) * 3); }
.sk-textarea--lg { min-block-size: calc(var(--sk-line-height-body-md) * 8); }

.sk-field__counter[data-counter-state="warning"] { color: var(--sk-color-status-warning-text); }
.sk-field__counter[data-counter-state="over"] { color: var(--sk-color-status-danger-text); font-weight: var(--sk-font-weight-medium); }`,
    related: ['form-field', 'text-field', 'code-block'],
  },

  {
    id: 'select',
    name: 'Select',
    category: 'form',
    status: 'stable',
    summary:
      'Choose one value from a known, closed list. Built on the native <select>, because the native control gets mobile pickers, keyboard type-ahead and assistive technology support for free.',
    whenToUse: [
      'More than about seven options, where radios would dominate the form.',
      'A familiar closed list: country, timezone, record type, environment.',
    ],
    whenNotToUse: [
      'Two to five options — use a Radio group so all choices are visible.',
      'Exactly two mutually exclusive options — use a Switch or Segmented control.',
      'A list the user needs to filter — use Combobox.',
      'Multiple selection — use checkboxes or a multi-select Combobox. Native multi-select is famously unusable.',
    ],
    anatomy: [
      { part: 'Select', required: true, description: 'Native <select>.' },
      { part: 'Chevron', required: true, description: 'Drawn as a background image, since the native arrow cannot be styled. Marked aria-hidden by virtue of being CSS.' },
      { part: 'Placeholder option', required: false, description: 'A disabled, selected, hidden first option when there is genuinely no default.' },
      { part: 'Option groups', required: false, description: '<optgroup> for long lists.' },
    ],
    variants: [
      { name: 'Default', className: 'sk-select', description: 'Bordered.', use: 'Forms.' },
      { name: 'Quiet', className: 'sk-select--quiet', description: 'Borderless until hover.', use: 'Toolbars and filter bars where several controls sit in a row.' },
    ],
    sizes: [
      { name: 'Small', className: 'sk-select--sm', height: '2rem', typeStyle: 'body-sm', description: 'Filter bars.' },
      { name: 'Medium', className: '', height: '2.5rem', typeStyle: 'body-md', description: 'Default.' },
      { name: 'Large', className: 'sk-select--lg', height: '3rem', typeStyle: 'body-md', description: 'Touch-first.' },
    ],
    states: [
      { name: 'Rest', description: 'Neutral border, chevron at text-secondary.', trigger: 'default' },
      { name: 'Hover', description: 'Border strengthens.', trigger: ':hover' },
      { name: 'Focus', description: 'Ring plus stronger border.', trigger: ':focus-visible' },
      { name: 'Placeholder shown', description: 'Text uses placeholder colour so an unmade choice is visibly distinct from a made one.', trigger: '[data-placeholder]' },
      { name: 'Invalid', description: 'Crimson border.', trigger: '[aria-invalid="true"]' },
      { name: 'Disabled', description: 'Sunken fill.', trigger: ':disabled' },
    ],
    props: [
      { name: 'placeholder', type: 'string', description: 'Text for the empty option. Omit when a sensible default exists — a pre-selected sensible default is better than forcing a choice.' },
      { name: 'options', type: 'Array<{value, label, disabled?, group?}>', required: true, description: 'The list.' },
      { name: 'quiet', type: 'boolean', default: 'false', description: 'Borderless toolbar treatment.' },
    ],
    tokensUsed: ['color-field-bg', 'color-field-border', 'color-text-primary', 'color-text-placeholder', 'color-focus-ring', 'radius-md'],
    darkMode:
      'The chevron is an inline SVG data URI, so its colour cannot be inherited — it is re-declared per theme with an explicit stroke. This is the single most common dark-mode bug in select components: a dark chevron baked into a background image that becomes invisible on a dark field. The native option list is rendered by the operating system, so `color-scheme: dark` must be set on the element for the dropdown itself to render dark; without it the popup stays white and flashes.',
    accessibility: {
      role: 'Native <select>.',
      keyboard: [
        { keys: 'Tab', action: 'Focus.' },
        { keys: 'Space / Enter / Alt+Down', action: 'Open the list.' },
        { keys: 'Arrow Up / Down', action: 'Move through options. On some platforms this changes the value directly while closed, which is native behaviour and must not be blocked.' },
        { keys: 'Type-ahead', action: 'Jump to an option by typing its first characters. Free with the native element.' },
        { keys: 'Escape', action: 'Close without changing.' },
      ],
      aria: [
        'Labelled by the Form field wrapper.',
        'A placeholder option must be disabled and hidden so it cannot be re-selected once a real choice is made.',
        'Do not add role="combobox" to a native select.',
        'Use <optgroup label> rather than styled separator options.',
      ],
      wcag: ['1.3.1 Info and Relationships.', '2.1.1 Keyboard.', '3.2.2 On Input — selecting a value must not auto-submit the form unless the user was warned.', '4.1.2 Name, Role, Value.'],
      screenReader: 'Announced as "<label>, combo box, <current value>, collapsed". Groups are announced as the user crosses them.',
      targetSize: 'Meets minimums at every size. The whole control opens the list, not just the chevron.',
    },
    content: [
      'Options are sentence case and parallel in structure.',
      'Sort by frequency of use, or alphabetically for long lists — never randomly.',
      'Placeholder reads "Select a record type", not "Please select…".',
      'Prefer a sensible default to a forced choice, unless the choice genuinely matters and has no safe default.',
    ],
    dos: [
      'Set color-scheme so the native dropdown follows the theme.',
      'Group long lists with optgroup.',
      'Keep the option list stable — options that appear and disappear are disorienting.',
    ],
    donts: [
      'Do not use a select for fewer than about five options.',
      'Do not auto-submit on change without warning.',
      'Do not use native multiple selection.',
      'Do not put interactive content in an option; it is text only.',
    ],
    html: `<div class="sk-field">
  <label class="sk-field__label" for="rtype">Record type</label>
  <div class="sk-select-wrapper">
    <select class="sk-select" id="rtype" name="rtype">
      <optgroup label="Address">
        <option value="A">A — IPv4 address</option>
        <option value="AAAA">AAAA — IPv6 address</option>
      </optgroup>
      <optgroup label="Delegation">
        <option value="NS">NS — Name server</option>
        <option value="CNAME">CNAME — Canonical name</option>
      </optgroup>
    </select>
  </div>
</div>`,
    css: `.sk-select-wrapper {
  display: flex;
  inline-size: 100%;
  min-inline-size: 0;
  position: relative;
}

.sk-select {
  flex: 1 1 auto;
  min-inline-size: 0;
  min-block-size: var(--sk-control-height-md);
  /* Inline-end padding leaves room for the chevron; logical so RTL flips it. */
  padding-inline: var(--sk-space-12) var(--sk-space-32);
  padding-block: var(--sk-space-8);
  background-color: var(--sk-color-field-bg);
  border: var(--sk-border-width-hairline) solid var(--sk-color-field-border);
  border-radius: var(--sk-radius-md);
  color: var(--sk-color-text-primary);
  font-family: var(--sk-font-family-sans);
  font-size: var(--sk-font-size-body-md);
  line-height: var(--sk-line-height-body-md);
  appearance: none;
  cursor: pointer;
  /* Makes the OS-rendered option list follow the theme instead of flashing white. */
  color-scheme: light;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' fill='none' stroke='%23676f82' stroke-width='1.75' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M4 6l4 4 4-4'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right var(--sk-space-12) center;
  background-size: 1rem;
}

[dir="rtl"] .sk-select { background-position: left var(--sk-space-12) center; }

/* The chevron is baked into a data URI and cannot inherit currentColor, so each
   dark theme re-declares it. Skipping this is the classic invisible-chevron bug. */
[data-sk-theme="dark"] .sk-select,
[data-sk-theme="hc-dark"] .sk-select {
  color-scheme: dark;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' fill='none' stroke='%238590a3' stroke-width='1.75' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M4 6l4 4 4-4'/%3E%3C/svg%3E");
}

.sk-select:hover:not(:disabled) { border-color: var(--sk-color-field-border-hover); }
.sk-select:focus-visible {
  outline: var(--sk-focus-ring-width) solid var(--sk-color-focus-ring);
  outline-offset: var(--sk-focus-ring-offset);
  border-color: var(--sk-color-border-interactive);
}
.sk-select:disabled {
  background-color: var(--sk-color-field-bg-disabled);
  border-color: var(--sk-color-border-disabled);
  color: var(--sk-color-text-disabled);
  cursor: not-allowed;
}
.sk-select[data-placeholder] { color: var(--sk-color-text-placeholder); }

.sk-select--quiet { border-color: transparent; background-color: transparent; }
.sk-select--quiet:hover:not(:disabled) { background-color: var(--sk-color-surface-hover); border-color: var(--sk-color-border-subtle); }

.sk-select--sm { min-block-size: var(--sk-control-height-sm); font-size: var(--sk-font-size-body-sm); padding-inline: var(--sk-space-8) var(--sk-space-28); }
.sk-select--lg { min-block-size: var(--sk-control-height-lg); }`,
    related: ['form-field', 'combobox', 'radio-group'],
  },

  {
    id: 'checkbox',
    name: 'Checkbox',
    category: 'form',
    status: 'stable',
    summary:
      'An independent binary choice, or one of several non-exclusive choices. Supports an indeterminate state for "some of the children are selected".',
    whenToUse: [
      'Opting in or out of a single thing: "Send me deployment notifications".',
      'Selecting several items from a list.',
      'Bulk selection in a table, with a tri-state header checkbox.',
    ],
    whenNotToUse: [
      'A setting that applies immediately with no save step — use Switch, which announces on/off rather than checked.',
      'Mutually exclusive options — use a Radio group.',
    ],
    anatomy: [
      { part: 'Input', required: true, description: 'A native <input type="checkbox">, visually replaced but never display:none — it stays in the accessibility tree and keeps native keyboard behaviour.' },
      { part: 'Box', required: true, description: 'The drawn square, with a 2px border at 3:1.' },
      { part: 'Mark', required: true, description: 'A tick, or a dash when indeterminate.' },
      { part: 'Label', required: true, description: 'Clickable, and part of the hit area.' },
      { part: 'Description', required: false, description: 'A second line under the label, associated via aria-describedby.' },
    ],
    variants: [
      { name: 'Default', className: 'sk-checkbox', description: 'Box and label.', use: 'Everywhere.' },
      { name: 'With description', className: 'sk-checkbox--described', description: 'Label plus a supporting line.', use: 'Settings where the consequence needs explaining.' },
      { name: 'Card', className: 'sk-checkbox--card', description: 'The whole bordered card is the target.', use: 'Prominent multi-select choices such as feature or plan selection.' },
    ],
    sizes: [
      { name: 'Small', className: 'sk-checkbox--sm', height: '1rem box', typeStyle: 'body-sm', description: 'Dense table row selection.' },
      { name: 'Medium', className: '', height: '1.25rem box', typeStyle: 'body-md', description: 'Default.' },
    ],
    states: [
      { name: 'Unchecked', description: 'Empty box, strong border.', trigger: 'default' },
      { name: 'Checked', description: 'Brand fill with a tick.', trigger: ':checked' },
      { name: 'Indeterminate', description: 'Brand fill with a dash. Set via the DOM property; there is no HTML attribute for it.', trigger: ':indeterminate' },
      { name: 'Focus visible', description: 'Ring around the box.', trigger: ':focus-visible' },
      { name: 'Disabled', description: 'Grey fill, disabled label.', trigger: ':disabled' },
      { name: 'Invalid', description: 'Crimson border, for a required agreement checkbox.', trigger: '[aria-invalid="true"]' },
    ],
    props: [
      { name: 'checked', type: 'boolean', description: 'Controlled checked state.' },
      { name: 'indeterminate', type: 'boolean', default: 'false', description: 'Tri-state. Must be applied as a DOM property, not an attribute.' },
      { name: 'description', type: 'string', description: 'Supporting line under the label.' },
      { name: 'variant', type: "'default' | 'card'", default: "'default'", description: 'Treatment.' },
    ],
    tokensUsed: ['color-control-checked', 'color-control-checked-mark', 'color-border-strong', 'color-surface-base', 'color-focus-ring', 'radius-sm'],
    darkMode:
      'The tick is drawn with currentColor against the checked fill, and the checked fill flips from cobalt-600 to cobalt-400 — so the tick colour flips from white to near-black along with it. Both are audited as a pair (control-checked-mark on control-checked) rather than assumed. The unchecked box relies entirely on its border to exist, so that border must clear 3:1 against the page in dark mode too, which is why it uses border-strong rather than border-default.',
    accessibility: {
      role: 'Native <input type="checkbox">.',
      keyboard: [
        { keys: 'Tab', action: 'Focus.' },
        { keys: 'Space', action: 'Toggle. Enter does not toggle a checkbox, and adding that is a deviation users do not expect.' },
      ],
      aria: [
        'A visible <label> associated by for/id, or by wrapping.',
        'aria-describedby for the description line.',
        'Groups of checkboxes live inside a <fieldset> with a <legend>. Without it, a screen reader user hears six unrelated checkboxes.',
        'The indeterminate state is a DOM property only. It is announced as "mixed".',
        'Never use aria-checked on a native checkbox; the browser owns that.',
      ],
      wcag: [
        '1.3.1 Info and Relationships — fieldset/legend for groups.',
        '1.4.11 Non-text Contrast — the box border and the tick both clear 3:1.',
        '2.1.1 Keyboard.',
        '2.5.8 Target Size — the label extends the target well past 24px.',
        '3.3.2 Labels or Instructions.',
      ],
      screenReader: 'Announced as "<label>, checkbox, checked / not checked / mixed". Group membership is announced from the legend.',
      targetSize: 'The box is 20px, but the label and its padding form a target at least 24px tall and usually much wider.',
    },
    content: [
      'Label the positive: "Enable audit logging", not "Do not disable audit logging". Negated checkboxes force double-negative reasoning.',
      'The label states what happens when checked.',
      'For consent, spell out the commitment rather than linking away for the substance.',
    ],
    dos: [
      'Wrap groups in a fieldset with a legend.',
      'Use the indeterminate state on a "select all" header checkbox.',
      'Keep the label clickable.',
    ],
    donts: [
      'Do not use display:none to hide the native input; it removes it from the accessibility tree.',
      'Do not apply a change immediately if the surrounding form has a Save button — mixed models confuse.',
      'Do not use a checkbox for a mutually exclusive choice.',
    ],
    html: `<fieldset class="sk-fieldset">
  <legend class="sk-fieldset__legend">Notifications</legend>

  <label class="sk-checkbox">
    <input type="checkbox" class="sk-checkbox__input" name="notify" value="deploy" checked />
    <span class="sk-checkbox__box" aria-hidden="true"></span>
    <span class="sk-checkbox__content">
      <span class="sk-checkbox__label">Deployment results</span>
      <span class="sk-checkbox__description">One message per deployment, successful or not.</span>
    </span>
  </label>

  <label class="sk-checkbox">
    <input type="checkbox" class="sk-checkbox__input" name="notify" value="drift" />
    <span class="sk-checkbox__box" aria-hidden="true"></span>
    <span class="sk-checkbox__content">
      <span class="sk-checkbox__label">Configuration drift</span>
    </span>
  </label>
</fieldset>

<!-- Tri-state select-all -->
<label class="sk-checkbox">
  <input type="checkbox" class="sk-checkbox__input" id="select-all" />
  <span class="sk-checkbox__box" aria-hidden="true"></span>
  <span class="sk-checkbox__content"><span class="sk-visually-hidden">Select all rows</span></span>
</label>
<script>document.getElementById('select-all').indeterminate = true;</script>`,
    css: `.sk-checkbox {
  display: flex;
  align-items: flex-start;
  gap: var(--sk-space-10);
  min-inline-size: 0;
  padding-block: var(--sk-space-4);
  cursor: pointer;
}

/* Visually hidden but still in the accessibility tree and still focusable.
   display:none or visibility:hidden would remove it from both. */
.sk-checkbox__input {
  position: absolute;
  inline-size: 1.25rem;
  block-size: 1.25rem;
  margin: 0;
  opacity: 0;
  cursor: pointer;
}

.sk-checkbox__box {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  inline-size: 1.25rem;
  block-size: 1.25rem;
  margin-block-start: 0.125rem;
  border: var(--sk-border-width-thick) solid var(--sk-color-border-strong);
  border-radius: var(--sk-radius-sm);
  background-color: var(--sk-color-surface-base);
  color: var(--sk-color-control-checked-mark);
  transition:
    background-color var(--sk-duration-fast) var(--sk-easing-standard),
    border-color var(--sk-duration-fast) var(--sk-easing-standard);
}

/* The tick and dash are drawn with currentColor so they flip automatically when
   the checked fill flips from cobalt-600 (light) to cobalt-400 (dark). */
.sk-checkbox__box::after {
  content: "";
  inline-size: 0.75rem;
  block-size: 0.75rem;
  scale: 0;
  transition: scale var(--sk-duration-fast) var(--sk-easing-emphasised);
  background-color: currentColor;
  mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpath d='M13.5 4.5l-7 7L3 8' fill='none' stroke='black' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
  mask-size: contain;
  mask-repeat: no-repeat;
}

.sk-checkbox__input:checked + .sk-checkbox__box,
.sk-checkbox__input:indeterminate + .sk-checkbox__box {
  background-color: var(--sk-color-control-checked);
  border-color: var(--sk-color-control-checked);
}
.sk-checkbox__input:checked + .sk-checkbox__box::after { scale: 1; }

.sk-checkbox__input:indeterminate + .sk-checkbox__box::after {
  scale: 1;
  mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpath d='M3.5 8h9' fill='none' stroke='black' stroke-width='2.5' stroke-linecap='round'/%3E%3C/svg%3E");
}

.sk-checkbox__input:focus-visible + .sk-checkbox__box {
  outline: var(--sk-focus-ring-width) solid var(--sk-color-focus-ring);
  outline-offset: var(--sk-focus-ring-offset);
}

.sk-checkbox__input:hover:not(:disabled) + .sk-checkbox__box { border-color: var(--sk-color-border-interactive); }

.sk-checkbox__input:disabled + .sk-checkbox__box {
  background-color: var(--sk-color-surface-disabled);
  border-color: var(--sk-color-border-disabled);
}
.sk-checkbox:has(.sk-checkbox__input:disabled) { cursor: not-allowed; color: var(--sk-color-text-disabled); }

.sk-checkbox__input[aria-invalid="true"] + .sk-checkbox__box { border-color: var(--sk-color-field-border-error); }

/* Text column shrinks and wraps instead of pushing the box out of the row. */
.sk-checkbox__content {
  flex: 1 1 auto;
  min-inline-size: 0;
  display: flex;
  flex-direction: column;
  gap: var(--sk-space-2);
}
.sk-checkbox__label { font-size: var(--sk-font-size-body-md); line-height: var(--sk-line-height-body-md); color: var(--sk-color-text-primary); }
.sk-checkbox__description { font-size: var(--sk-font-size-body-sm); line-height: var(--sk-line-height-body-sm); color: var(--sk-color-text-secondary); }

.sk-checkbox--card {
  padding: var(--sk-space-16);
  border: var(--sk-border-width-hairline) solid var(--sk-color-border-default);
  border-radius: var(--sk-radius-lg);
  background-color: var(--sk-color-surface-raised);
}
.sk-checkbox--card:has(.sk-checkbox__input:checked) {
  border-color: var(--sk-color-border-brand);
  background-color: var(--sk-color-surface-selected);
  box-shadow: inset 0 0 0 1px var(--sk-color-border-brand);
}

.sk-checkbox--sm .sk-checkbox__box { inline-size: 1rem; block-size: 1rem; }
.sk-checkbox--sm .sk-checkbox__box::after { inline-size: 0.625rem; block-size: 0.625rem; }

@media (prefers-reduced-motion: reduce) {
  .sk-checkbox__box, .sk-checkbox__box::after { transition-duration: var(--sk-duration-instant); }
}

@media (forced-colors: active) {
  .sk-checkbox__box { border-color: ButtonBorder; }
  .sk-checkbox__input:checked + .sk-checkbox__box { background-color: Highlight; border-color: Highlight; color: HighlightText; }
  .sk-checkbox__input:focus-visible + .sk-checkbox__box { outline-color: Highlight; }
}`,
    related: ['radio-group', 'switch', 'fieldset', 'table'],
  },

  {
    id: 'radio-group',
    name: 'Radio group',
    category: 'form',
    status: 'stable',
    summary:
      'Exactly one choice from a small, visible set. The group is the component; a lone radio button is always a bug.',
    whenToUse: [
      'Two to seven mutually exclusive options where seeing all of them at once helps the decision.',
      'Choices with consequences the user should compare side by side.',
    ],
    whenNotToUse: [
      'More than about seven options — use Select.',
      'Non-exclusive choices — use checkboxes.',
      'A binary immediate setting — use Switch.',
    ],
    anatomy: [
      { part: 'Fieldset', required: true, description: 'Wraps the group. Not optional — it is what makes the options a set.' },
      { part: 'Legend', required: true, description: 'The group question. Announced before every option.' },
      { part: 'Radios', required: true, description: 'Native inputs sharing one name attribute.' },
      { part: 'Descriptions', required: false, description: 'A supporting line per option.' },
    ],
    variants: [
      { name: 'Stacked', className: 'sk-radio-group', description: 'Vertical list.', use: 'Default. Easiest to scan and compare.' },
      { name: 'Inline', className: 'sk-radio-group--inline', description: 'Horizontal, wrapping.', use: 'Two or three short options.' },
      { name: 'Cards', className: 'sk-radio-group--cards', description: 'Bordered selectable cards.', use: 'Plan or mode selection where each option needs explaining.' },
    ],
    sizes: [
      { name: 'Medium', className: '', height: '1.25rem control', typeStyle: 'body-md', description: 'The only size. Radios are already small; shrinking them harms selection accuracy.' },
    ],
    states: [
      { name: 'Unselected', description: 'Empty circle with a strong border.', trigger: 'default' },
      { name: 'Selected', description: 'Brand ring with a filled centre dot.', trigger: ':checked' },
      { name: 'Focus visible', description: 'Ring around the control.', trigger: ':focus-visible' },
      { name: 'Disabled', description: 'Individual options may be disabled while the group stays usable.', trigger: ':disabled' },
      { name: 'Invalid', description: 'Group-level error shown once under the legend, not repeated per option.', trigger: '[data-invalid]' },
    ],
    props: [
      { name: 'legend', type: 'string', required: true, description: 'The question the group answers.' },
      { name: 'name', type: 'string', required: true, description: 'Shared name. This is what makes them exclusive.' },
      { name: 'options', type: 'Array<{value, label, description?, disabled?}>', required: true, description: 'The choices.' },
      { name: 'variant', type: "'stacked' | 'inline' | 'cards'", default: "'stacked'", description: 'Layout.' },
    ],
    tokensUsed: ['color-control-checked', 'color-border-strong', 'color-surface-selected', 'color-border-brand', 'color-focus-ring'],
    darkMode:
      'The selected radio is drawn as a thick border rather than a fill plus a separate dot — a border-only technique means the centre stays the page colour and the control reads correctly in both themes with one rule. Card variants add a brand border on selection, because on a dark page the selected tint alone (cobalt-950) is too close to the surface to be noticed at a glance.',
    accessibility: {
      role: 'Native <input type="radio"> inside a <fieldset> with a <legend>.',
      keyboard: [
        { keys: 'Tab', action: 'Moves into the group, landing on the selected radio — or the first one if none is selected. The group is a single tab stop.' },
        { keys: 'Arrow keys', action: 'Move between options and select as you go. This is native behaviour and is correct.' },
        { keys: 'Space', action: 'Selects the focused option when none was selected.' },
      ],
      aria: [
        '<fieldset> and <legend> are the mechanism. Do not substitute a <div role="radiogroup"> with a heading unless you also wire aria-labelledby.',
        'aria-describedby per option for description lines.',
        'The group error message is referenced from each input via aria-describedby, so it is heard regardless of which option has focus.',
        'Never disable the whole group to indicate "not applicable" — hide it or explain it.',
      ],
      wcag: ['1.3.1 Info and Relationships.', '2.1.1 Keyboard.', '2.4.3 Focus Order.', '3.3.1 Error Identification.', '4.1.2 Name, Role, Value.'],
      screenReader: 'Announced as "<legend>, <label>, radio button, N of M, selected".',
      targetSize: 'The label extends each option to at least 24px tall; card variants far exceed it.',
    },
    content: [
      'The legend is a question or a noun phrase: "Deployment strategy".',
      'Options are parallel in grammar and length.',
      'Describe consequences, not mechanisms: "Replaces all records at once — fastest, brief downtime".',
      'If one option is recommended, say so in its description rather than pre-selecting it silently.',
    ],
    dos: [
      'Always use fieldset and legend.',
      'Pre-select a safe default where one exists.',
      'Keep option order stable between visits.',
    ],
    donts: [
      'Do not use a single radio button — it cannot be unselected.',
      'Do not nest interactive controls inside a radio label.',
      'Do not use radios for more than about seven options.',
    ],
    html: `<fieldset class="sk-fieldset sk-radio-group">
  <legend class="sk-fieldset__legend">Deployment strategy</legend>
  <p class="sk-field__hint" id="strategy-hint">Applies to every environment in this project.</p>

  <label class="sk-radio">
    <input type="radio" class="sk-radio__input" name="strategy" value="rolling" checked
           aria-describedby="strategy-hint rolling-desc" />
    <span class="sk-radio__control" aria-hidden="true"></span>
    <span class="sk-radio__content">
      <span class="sk-radio__label">Rolling</span>
      <span class="sk-radio__description" id="rolling-desc">Replaces instances in batches. No downtime, slower to complete. Recommended.</span>
    </span>
  </label>

  <label class="sk-radio">
    <input type="radio" class="sk-radio__input" name="strategy" value="recreate"
           aria-describedby="strategy-hint recreate-desc" />
    <span class="sk-radio__control" aria-hidden="true"></span>
    <span class="sk-radio__content">
      <span class="sk-radio__label">Recreate</span>
      <span class="sk-radio__description" id="recreate-desc">Stops everything, then starts the new version. Fastest, with a short outage.</span>
    </span>
  </label>
</fieldset>`,
    css: `.sk-radio-group { display: flex; flex-direction: column; gap: var(--sk-space-8); }
.sk-radio-group--inline { flex-direction: row; flex-wrap: wrap; gap: var(--sk-space-16); }
.sk-radio-group--cards { gap: var(--sk-space-12); }

.sk-radio {
  display: flex;
  align-items: flex-start;
  gap: var(--sk-space-10);
  min-inline-size: 0;
  padding-block: var(--sk-space-4);
  cursor: pointer;
}

.sk-radio__input {
  position: absolute;
  inline-size: 1.25rem;
  block-size: 1.25rem;
  margin: 0;
  opacity: 0;
  cursor: pointer;
}

.sk-radio__control {
  flex: 0 0 auto;
  inline-size: 1.25rem;
  block-size: 1.25rem;
  margin-block-start: 0.125rem;
  border: var(--sk-border-width-thick) solid var(--sk-color-border-strong);
  border-radius: var(--sk-radius-full);
  background-color: var(--sk-color-surface-base);
  transition: border-color var(--sk-duration-fast) var(--sk-easing-standard),
              border-width var(--sk-duration-fast) var(--sk-easing-standard);
}

/* Selection is a thick ring, not a fill plus a dot: the centre stays the page
   colour, so one rule reads correctly in both light and dark. */
.sk-radio__input:checked + .sk-radio__control {
  border-color: var(--sk-color-control-checked);
  border-width: 0.375rem;
}

.sk-radio__input:hover:not(:disabled) + .sk-radio__control { border-color: var(--sk-color-border-interactive); }
.sk-radio__input:checked:hover + .sk-radio__control { border-color: var(--sk-color-control-checked); }

.sk-radio__input:focus-visible + .sk-radio__control {
  outline: var(--sk-focus-ring-width) solid var(--sk-color-focus-ring);
  outline-offset: var(--sk-focus-ring-offset);
}

.sk-radio__input:disabled + .sk-radio__control {
  border-color: var(--sk-color-border-disabled);
  background-color: var(--sk-color-surface-disabled);
}
.sk-radio:has(.sk-radio__input:disabled) { cursor: not-allowed; color: var(--sk-color-text-disabled); }

.sk-radio__content { flex: 1 1 auto; min-inline-size: 0; display: flex; flex-direction: column; gap: var(--sk-space-2); }
.sk-radio__label { font-size: var(--sk-font-size-body-md); line-height: var(--sk-line-height-body-md); color: var(--sk-color-text-primary); }
.sk-radio__description { font-size: var(--sk-font-size-body-sm); line-height: var(--sk-line-height-body-sm); color: var(--sk-color-text-secondary); }

/* Cards: flex-basis lets them share a row when there is room and stack when not. */
.sk-radio-group--cards { flex-direction: row; flex-wrap: wrap; }
.sk-radio-group--cards .sk-radio {
  flex: 1 1 16rem;
  padding: var(--sk-space-16);
  border: var(--sk-border-width-hairline) solid var(--sk-color-border-default);
  border-radius: var(--sk-radius-lg);
  background-color: var(--sk-color-surface-raised);
}
.sk-radio-group--cards .sk-radio:has(.sk-radio__input:checked) {
  border-color: var(--sk-color-border-brand);
  background-color: var(--sk-color-surface-selected);
  box-shadow: inset 0 0 0 1px var(--sk-color-border-brand);
}

@media (forced-colors: active) {
  .sk-radio__control { border-color: ButtonBorder; }
  .sk-radio__input:checked + .sk-radio__control { border-color: Highlight; }
}`,
    related: ['checkbox', 'select', 'fieldset', 'button-group'],
  },

  {
    id: 'switch',
    name: 'Switch',
    category: 'form',
    status: 'stable',
    summary:
      'Turns something on or off immediately. The distinction from a checkbox is not visual — it is that a switch takes effect the moment it moves, with no Save step.',
    whenToUse: [
      'A setting that applies instantly: enabling a feature, muting notifications, toggling dark mode.',
      'Anything the user would describe as "turning on".',
    ],
    whenNotToUse: [
      'Inside a form with a Save button — use a checkbox, or the user will not know whether their change was applied.',
      'Anything needing a third state. A switch is strictly binary.',
      'Choosing between two named alternatives — use a Segmented control, since "off" is not a good name for an option.',
    ],
    anatomy: [
      { part: 'Input', required: true, description: 'Native checkbox with role="switch".' },
      { part: 'Track', required: true, description: 'The pill. Held to 3:1 when off, because "off" must be visible, not merely absent.' },
      { part: 'Thumb', required: true, description: 'The sliding circle.' },
      { part: 'Label', required: true, description: 'Names the thing being switched, not its state.' },
      { part: 'Status text', required: false, description: 'Optional "On"/"Off" beside the control for users who find the pill ambiguous.' },
    ],
    variants: [
      { name: 'Default', className: 'sk-switch', description: 'Label on the leading side, switch trailing.', use: 'Settings lists, where the switches align in a column.' },
      { name: 'Leading', className: 'sk-switch--leading', description: 'Switch first, then the label.', use: 'Compact toolbars and filter rows.' },
    ],
    sizes: [
      { name: 'Small', className: 'sk-switch--sm', height: '1.25rem track', typeStyle: 'body-sm', description: 'Dense settings tables.' },
      { name: 'Medium', className: '', height: '1.5rem track', typeStyle: 'body-md', description: 'Default.' },
    ],
    states: [
      { name: 'Off', description: 'Neutral track, thumb at the start.', trigger: 'default' },
      { name: 'On', description: 'Brand track, thumb at the end.', trigger: ':checked' },
      { name: 'Focus visible', description: 'Ring around the track.', trigger: ':focus-visible' },
      { name: 'Pending', description: 'Server has not confirmed yet. The thumb shows a spinner and the control is aria-busy, because a switch that lies about state is worse than a slow one.', trigger: '[data-pending]' },
      { name: 'Disabled', description: 'Faded, not focusable.', trigger: ':disabled' },
    ],
    props: [
      { name: 'checked', type: 'boolean', required: true, description: 'Current state.' },
      { name: 'pending', type: 'boolean', default: 'false', description: 'Awaiting server confirmation.' },
      { name: 'showState', type: 'boolean', default: 'false', description: 'Render a visible "On"/"Off".' },
      { name: 'label', type: 'string', required: true, description: 'What is being switched.' },
    ],
    tokensUsed: ['color-control-checked', 'color-control-track', 'color-surface-base', 'color-focus-ring', 'radius-full'],
    darkMode:
      'The off-state track is the failure point: a light-grey track on a light page has enough contrast, but the same relative value on dark does not. control-track is therefore pinned at neutral-400 in light and neutral-500 in dark, both audited at 3:1 against their own page. The thumb stays the page-base colour in both themes so it always reads as a raised object rather than a hole.',
    accessibility: {
      role: 'input[type="checkbox"] with role="switch".',
      keyboard: [
        { keys: 'Tab', action: 'Focus.' },
        { keys: 'Space', action: 'Toggle.' },
        { keys: 'Enter', action: 'Also toggles, for users who expect it. This is a deliberate, documented addition to native checkbox behaviour.' },
      ],
      aria: [
        'role="switch" makes it announce "on"/"off" instead of "checked"/"unchecked".',
        'aria-checked is managed by the browser for a native checkbox with role="switch".',
        'aria-busy while a change is in flight; announce the confirmed result in a polite live region.',
        'Never rely on colour alone: role="switch" supplies the state to assistive technology, and the thumb position supplies it visually.',
      ],
      wcag: [
        '1.4.1 Use of Color — thumb position is the non-colour signal.',
        '1.4.11 Non-text Contrast — both track states clear 3:1.',
        '2.1.1 Keyboard.',
        '3.2.2 On Input — immediate effect is the point, and must be genuinely immediate and reversible.',
        '4.1.2 Name, Role, Value.',
      ],
      screenReader: 'Announced as "<label>, switch, on / off".',
      targetSize: 'The track is 40x24; the label extends the target further.',
    },
    content: [
      'Label the thing, not the state: "Audit logging", not "Enable audit logging" or "Audit logging on".',
      'If a visible state word is needed, use "On"/"Off".',
      'Explain consequences beneath the label when switching has a cost.',
    ],
    dos: [
      'Apply the change immediately and confirm it.',
      'Show a pending state rather than optimistically lying about the result.',
      'Offer undo for switches with meaningful consequences.',
    ],
    donts: [
      'Do not put a switch in a form with a Save button.',
      'Do not use a switch where the two states are not clearly on/off.',
      'Do not animate the thumb for longer than 200ms; it makes the whole product feel slow.',
    ],
    html: `<div class="sk-switch">
  <span class="sk-switch__content">
    <label class="sk-switch__label" for="audit">Audit logging</label>
    <span class="sk-switch__description" id="audit-desc">Records every change with the actor and a correlation ID.</span>
  </span>
  <input type="checkbox" role="switch" class="sk-switch__input" id="audit"
         checked aria-describedby="audit-desc" />
  <span class="sk-switch__track" aria-hidden="true"><span class="sk-switch__thumb"></span></span>
</div>`,
    css: `.sk-switch {
  display: flex;
  align-items: center;
  gap: var(--sk-space-16);
  min-inline-size: 0;
  position: relative;
  padding-block: var(--sk-space-4);
}

/* Label column absorbs the free space; the control never shrinks. */
.sk-switch__content { flex: 1 1 auto; min-inline-size: 0; display: flex; flex-direction: column; gap: var(--sk-space-2); }
.sk-switch__label { font-size: var(--sk-font-size-body-md); color: var(--sk-color-text-primary); cursor: pointer; }
.sk-switch__description { font-size: var(--sk-font-size-body-sm); line-height: var(--sk-line-height-body-sm); color: var(--sk-color-text-secondary); }

.sk-switch__input {
  position: absolute;
  inset-inline-end: 0;
  inline-size: 2.5rem;
  block-size: 1.5rem;
  margin: 0;
  opacity: 0;
  cursor: pointer;
  z-index: var(--sk-z-raised);
}

.sk-switch__track {
  flex: 0 0 auto;
  order: 2;
  display: inline-flex;
  align-items: center;
  inline-size: 2.5rem;
  block-size: 1.5rem;
  padding: 0.1875rem;
  border-radius: var(--sk-radius-full);
  /* Off is a state, not an absence: the track is held to 3:1 in both themes. */
  background-color: var(--sk-color-control-track);
  transition: background-color var(--sk-duration-normal) var(--sk-easing-standard);
}

.sk-switch__thumb {
  inline-size: 1.125rem;
  block-size: 1.125rem;
  border-radius: var(--sk-radius-full);
  background-color: var(--sk-color-surface-base);
  box-shadow: var(--sk-elevation-1);
  transition: translate var(--sk-duration-normal) var(--sk-easing-emphasised);
}

.sk-switch__input:checked ~ .sk-switch__track { background-color: var(--sk-color-control-checked); }
.sk-switch__input:checked ~ .sk-switch__track .sk-switch__thumb { translate: 1rem 0; }
[dir="rtl"] .sk-switch__input:checked ~ .sk-switch__track .sk-switch__thumb { translate: -1rem 0; }

.sk-switch__input:focus-visible ~ .sk-switch__track {
  outline: var(--sk-focus-ring-width) solid var(--sk-color-focus-ring);
  outline-offset: var(--sk-focus-ring-offset);
}

.sk-switch__input:disabled ~ .sk-switch__track { background-color: var(--sk-color-surface-disabled); cursor: not-allowed; }
.sk-switch__input:disabled ~ .sk-switch__track .sk-switch__thumb { box-shadow: none; }

.sk-switch[data-pending] .sk-switch__thumb {
  border: 2px solid var(--sk-color-control-checked);
  border-block-start-color: transparent;
  background-color: transparent;
  animation: sk-spin var(--sk-duration-deliberate) linear infinite;
}

.sk-switch--leading { flex-direction: row-reverse; justify-content: flex-end; }
.sk-switch--leading .sk-switch__track { order: 0; }

.sk-switch--sm .sk-switch__track { inline-size: 2rem; block-size: 1.25rem; }
.sk-switch--sm .sk-switch__thumb { inline-size: 0.875rem; block-size: 0.875rem; }
.sk-switch--sm .sk-switch__input:checked ~ .sk-switch__track .sk-switch__thumb { translate: 0.75rem 0; }

@media (prefers-reduced-motion: reduce) {
  .sk-switch__thumb, .sk-switch__track { transition-duration: var(--sk-duration-instant); }
}

@media (forced-colors: active) {
  .sk-switch__track { border: 1px solid ButtonBorder; background-color: ButtonFace; }
  .sk-switch__input:checked ~ .sk-switch__track { background-color: Highlight; }
  .sk-switch__thumb { background-color: ButtonText; }
}`,
    related: ['checkbox', 'form-field', 'theme-toggle'],
  },

  {
    id: 'combobox',
    name: 'Combobox',
    category: 'form',
    status: 'beta',
    summary:
      'A text input joined to a filtered list of suggestions. Use it when the list is too long to scroll but the values are still constrained.',
    whenToUse: [
      'More than about twenty options: users, timezones, regions, tags.',
      'Server-backed search where results arrive asynchronously.',
      'Multi-select with tokens, such as tag or recipient pickers.',
    ],
    whenNotToUse: [
      'Fewer than twenty options — a Select is simpler and better supported.',
      'Freeform text with no constraint — use a Text field.',
      'Navigation search — use the Command palette.',
    ],
    anatomy: [
      { part: 'Input', required: true, description: 'role="combobox", aria-expanded, aria-controls pointing at the listbox.' },
      { part: 'Listbox', required: true, description: 'role="listbox" containing role="option" items. Positioned with the CSS anchor API where available, with a JS fallback.' },
      { part: 'Options', required: true, description: 'Each with a stable id so aria-activedescendant can point at it.' },
      { part: 'Empty state', required: true, description: 'A message when nothing matches. Never an empty box.' },
      { part: 'Tokens', required: false, description: 'For multi-select: removable chips shown before the input.' },
      { part: 'Live region', required: true, description: 'Announces the result count as the user types.' },
    ],
    variants: [
      { name: 'Single', className: 'sk-combobox', description: 'One value.', use: 'Most cases.' },
      { name: 'Multi', className: 'sk-combobox--multi', description: 'Token list plus input.', use: 'Tags, recipients, filters.' },
      { name: 'Async', className: 'sk-combobox--async', description: 'Loads from the server as the user types, debounced.', use: 'Large or permission-scoped datasets.' },
    ],
    sizes: [
      { name: 'Small', className: 'sk-combobox--sm', height: '2rem', typeStyle: 'body-sm', description: 'Filter bars.' },
      { name: 'Medium', className: '', height: '2.5rem', typeStyle: 'body-md', description: 'Default.' },
    ],
    states: [
      { name: 'Collapsed', description: 'Input only.', trigger: 'default' },
      { name: 'Expanded', description: 'Listbox open, aria-expanded="true".', trigger: '[aria-expanded="true"]' },
      { name: 'Active option', description: 'Visually highlighted via aria-activedescendant. DOM focus stays in the input throughout.', trigger: '[data-active]' },
      { name: 'Loading', description: 'Spinner in the input, "Searching…" in the live region.', trigger: '[data-loading]' },
      { name: 'No results', description: 'Explanatory empty state offering a next step.', trigger: '[data-empty]' },
    ],
    props: [
      { name: 'options', type: 'Array<{value, label, description?}>', required: true, description: 'Current option list.' },
      { name: 'multiple', type: 'boolean', default: 'false', description: 'Token multi-select.' },
      { name: 'onSearch', type: '(query: string) => void', description: 'Async search callback. Debounce at 250ms.' },
      { name: 'allowCustom', type: 'boolean', default: 'false', description: 'Permit values not in the list.' },
    ],
    tokensUsed: ['color-surface-overlay', 'color-surface-selected', 'color-border-default', 'color-focus-ring', 'elevation-3', 'radius-md'],
    darkMode:
      'The listbox uses surface-overlay, which in dark mode is *lighter* than the page (neutral-850 against neutral-950). This is the core dark-mode elevation rule: a floating surface rises by getting lighter, because the drop shadow that carries elevation in light mode is nearly invisible against a dark page. The shadow is still applied, but it is doing much less work, and the surface delta is doing most of it.',
    accessibility: {
      role: 'ARIA 1.2 combobox pattern: input[role=combobox] plus a separate listbox.',
      keyboard: [
        { keys: 'Arrow Down', action: 'Open the list, or move to the next option.' },
        { keys: 'Arrow Up', action: 'Move to the previous option.' },
        { keys: 'Enter', action: 'Select the active option.' },
        { keys: 'Escape', action: 'Close the list, keeping the typed text. A second Escape clears the input.' },
        { keys: 'Home / End', action: 'Move to the first or last option.' },
        { keys: 'Backspace on an empty multi input', action: 'Removes the last token.' },
        { keys: 'Tab', action: 'Closes the list and moves on, committing the active option only if the design says so — and it should say so consistently.' },
      ],
      aria: [
        'role="combobox" with aria-expanded, aria-controls and aria-autocomplete="list".',
        'aria-activedescendant references the active option id. DOM focus never leaves the input — moving real focus into the list breaks typing.',
        'The listbox is role="listbox"; options are role="option" with aria-selected.',
        'A polite live region announces result counts: "8 results available".',
        'aria-busy while loading.',
        'Tokens in multi-select need individually labelled remove buttons: "Remove tag production".',
      ],
      wcag: ['1.3.1 Info and Relationships.', '2.1.1 Keyboard.', '2.1.2 No Keyboard Trap.', '2.4.11 Focus Not Obscured — the listbox must not cover the input.', '4.1.2 Name, Role, Value.', '4.1.3 Status Messages.'],
      screenReader: 'Announced as "<label>, combo box, expanded, <n> results available", then each option as it becomes active.',
      targetSize: 'Options are at least 32px tall. Token remove buttons carry a 24px hit area.',
    },
    content: [
      'The empty state suggests a next step: "No users match \\"ann\\". Try a different spelling, or invite a new user."',
      'The loading message is "Searching…", not a bare spinner.',
      'Announce counts, not just presence: "8 results available".',
    ],
    dos: [
      'Keep DOM focus in the input and use aria-activedescendant.',
      'Debounce async search and cancel superseded requests.',
      'Highlight the matched substring in each option, but do not rely on that alone to convey the match.',
    ],
    donts: [
      'Do not move focus into the listbox.',
      'Do not auto-select the first option on typing — Enter would then commit something the user never read.',
      'Do not clear typed text on Escape the first time; that loses work.',
    ],
    html: `<div class="sk-field">
  <label class="sk-field__label" for="owner">Owner</label>
  <div class="sk-combobox">
    <input class="sk-input" id="owner" role="combobox" type="text"
           aria-expanded="true" aria-controls="owner-list" aria-autocomplete="list"
           aria-activedescendant="owner-opt-1" autocomplete="off" />
    <ul class="sk-combobox__list" id="owner-list" role="listbox" aria-label="Owner suggestions">
      <li class="sk-combobox__option" id="owner-opt-0" role="option" aria-selected="false">
        <span class="sk-combobox__option-label">ana.silva@example.com</span>
        <span class="sk-combobox__option-meta">Platform team</span>
      </li>
      <li class="sk-combobox__option" id="owner-opt-1" role="option" aria-selected="true" data-active>
        <span class="sk-combobox__option-label">andre.kim@example.com</span>
        <span class="sk-combobox__option-meta">Networking team</span>
      </li>
    </ul>
  </div>
  <p class="sk-visually-hidden" role="status">2 results available.</p>
</div>`,
    css: `.sk-combobox { position: relative; display: flex; flex-direction: column; min-inline-size: 0; }

.sk-combobox__list {
  position: absolute;
  inset-block-start: calc(100% + var(--sk-space-4));
  inset-inline: 0;
  z-index: var(--sk-z-popover);
  margin: 0;
  padding: var(--sk-space-4);
  list-style: none;
  max-block-size: 18rem;
  overflow-y: auto;
  overscroll-behavior: contain;
  /* Lighter than the page in dark mode: elevation is carried by surface lightness,
     not by a shadow that a dark page swallows. */
  background-color: var(--sk-color-surface-overlay);
  border: var(--sk-border-width-hairline) solid var(--sk-color-border-default);
  border-radius: var(--sk-radius-md);
  box-shadow: var(--sk-elevation-3);
}

.sk-combobox__option {
  display: flex;
  flex-direction: column;
  gap: var(--sk-space-2);
  min-inline-size: 0;
  min-block-size: 2rem;
  padding: var(--sk-space-8) var(--sk-space-12);
  border-radius: var(--sk-radius-sm);
  cursor: pointer;
}

.sk-combobox__option-label {
  font-size: var(--sk-font-size-body-md);
  color: var(--sk-color-text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.sk-combobox__option-meta { font-size: var(--sk-font-size-body-xs); color: var(--sk-color-text-tertiary); }

.sk-combobox__option:hover,
.sk-combobox__option[data-active] {
  background-color: var(--sk-color-surface-selected);
}
/* Selection is not colour-only: the active option also gains a leading brand bar. */
.sk-combobox__option[data-active] { box-shadow: inset 3px 0 0 0 var(--sk-color-border-brand); }

.sk-combobox__empty {
  padding: var(--sk-space-16) var(--sk-space-12);
  font-size: var(--sk-font-size-body-sm);
  color: var(--sk-color-text-secondary);
}

/* --- Multi-select tokens --- */
.sk-combobox--multi .sk-combobox__field {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--sk-space-4);
  min-inline-size: 0;
  padding: var(--sk-space-4);
  background-color: var(--sk-color-field-bg);
  border: var(--sk-border-width-hairline) solid var(--sk-color-field-border);
  border-radius: var(--sk-radius-md);
}
.sk-combobox--multi .sk-combobox__field:focus-within {
  outline: var(--sk-focus-ring-width) solid var(--sk-color-focus-ring);
  outline-offset: var(--sk-focus-ring-offset);
}
/* The input takes at least 6rem but shares the row with tokens, wrapping as needed. */
.sk-combobox--multi .sk-input { flex: 1 1 6rem; min-inline-size: 0; border: none; background: transparent; }
.sk-combobox--multi .sk-input:focus-visible { outline: none; }

.sk-combobox__token {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  gap: var(--sk-space-4);
  padding-inline: var(--sk-space-8);
  padding-block: var(--sk-space-2);
  background-color: var(--sk-color-surface-selected);
  border: var(--sk-border-width-hairline) solid var(--sk-color-border-brand);
  border-radius: var(--sk-radius-sm);
  font-size: var(--sk-font-size-label-sm);
  color: var(--sk-color-text-brand);
}

@media (prefers-reduced-motion: no-preference) {
  .sk-combobox__list { animation: sk-fade-in var(--sk-duration-fast) var(--sk-easing-entrance); }
}
@keyframes sk-fade-in { from { opacity: 0; translate: 0 -4px; } }`,
    related: ['select', 'text-field', 'command-palette', 'badge'],
  },

  {
    id: 'search-field',
    name: 'Search field',
    category: 'form',
    status: 'stable',
    summary:
      'A text input specialised for querying. Distinguished from a plain text field by its submit affordance, clear button, and the live announcement of result counts.',
    whenToUse: ['Filtering a list or table.', 'Global product search.', 'Any query with a visible result count.'],
    whenNotToUse: ['Picking from a constrained list — use Combobox.', 'A form field that happens to be about searching — use Text field.'],
    anatomy: [
      { part: 'Search input', required: true, description: 'type="search" inside a <form role="search">.' },
      { part: 'Search icon', required: true, description: 'Leading, decorative.' },
      { part: 'Clear button', required: false, description: 'Appears once there is a value. Returns focus to the input.' },
      { part: 'Submit button', required: false, description: 'Explicit submit, for searches that are expensive or navigate.' },
      { part: 'Result live region', required: true, description: 'Polite announcement of the count after results settle.' },
    ],
    variants: [
      { name: 'Filter', className: 'sk-search', description: 'Filters as you type, debounced.', use: 'Client-side or cheap server-side filtering of a visible list.' },
      { name: 'Submit', className: 'sk-search--submit', description: 'Requires Enter or the button.', use: 'Expensive queries, wildcard searches, and searches that navigate.' },
      { name: 'Global', className: 'sk-search--global', description: 'Header-mounted, opens the Command palette on focus.', use: 'Application-wide search.' },
    ],
    sizes: [
      { name: 'Small', className: 'sk-search--sm', height: '2rem', typeStyle: 'body-sm', description: 'Table toolbars.' },
      { name: 'Medium', className: '', height: '2.5rem', typeStyle: 'body-md', description: 'Default.' },
    ],
    states: [
      { name: 'Empty', description: 'Placeholder shown, no clear button.', trigger: 'default' },
      { name: 'Has value', description: 'Clear button appears.', trigger: '[data-has-value]' },
      { name: 'Searching', description: 'Spinner replaces the search icon; live region says "Searching".', trigger: '[data-loading]' },
      { name: 'Results', description: 'Count announced politely once results settle.', trigger: '[data-results]' },
      { name: 'No results', description: 'Empty state with suggestions.', trigger: '[data-empty]' },
    ],
    props: [
      { name: 'mode', type: "'filter' | 'submit'", default: "'filter'", description: 'Whether results update as you type.' },
      { name: 'debounceMs', type: 'number', default: '250', description: 'Filter debounce.' },
      { name: 'resultCount', type: 'number', description: 'Drives the live announcement.' },
    ],
    tokensUsed: ['color-field-bg', 'color-field-border', 'color-text-placeholder', 'color-focus-ring', 'radius-md'],
    darkMode:
      'The search icon uses currentColor and inherits text-secondary, so it flips automatically. The one thing that does not flip automatically is the WebKit-injected clear button on type="search"; it is a dark glyph that becomes invisible on a dark field, so it is suppressed with ::-webkit-search-cancel-button and replaced with our own button.',
    accessibility: {
      role: '<form role="search"> wrapping <input type="search">.',
      keyboard: [
        { keys: 'Tab', action: 'Focus.' },
        { keys: 'Enter', action: 'Submit.' },
        { keys: 'Escape', action: 'Clear the field, keeping focus in it.' },
        { keys: '/ (slash)', action: 'Optional global shortcut to focus search. Must not fire while another text input has focus.' },
      ],
      aria: [
        'role="search" is a landmark — it is how screen reader users jump straight to search.',
        'A visible label, or a visually hidden one when the placeholder plus icon genuinely suffice.',
        'The result count lives in an aria-live="polite" region, announced after debounce settles rather than per keystroke.',
        'aria-controls linking the field to the results region.',
        'The clear button needs its own name: "Clear search".',
      ],
      wcag: ['1.3.1 Info and Relationships.', '2.4.1 Bypass Blocks — the search landmark.', '3.3.2 Labels or Instructions.', '4.1.3 Status Messages.'],
      screenReader: 'Announced as "<label>, search text field". After a search: "24 results".',
      targetSize: 'The clear and submit buttons each carry a 24px hit area.',
    },
    content: [
      'Placeholder shows what can be searched: "Search zones, records and tags".',
      'Announce counts with the query: "24 results for cdn".',
      'The empty state suggests broadening: "No zones match \\"cdnn\\". Check the spelling or clear the environment filter."',
    ],
    dos: [
      'Keep the query visible after searching.',
      'Preserve the query in the URL so results are shareable and survive a refresh.',
      'Debounce and cancel superseded requests.',
    ],
    donts: [
      'Do not clear the query when results return.',
      'Do not search on every keystroke without debouncing.',
      'Do not hide the search behind an icon on desktop where there is room for the field.',
    ],
    html: `<form class="sk-search" role="search" action="/zones">
  <label class="sk-visually-hidden" for="q">Search zones</label>
  <svg class="sk-search__icon" aria-hidden="true" focusable="false" width="16" height="16"><use href="#sk-icon-search" /></svg>
  <input class="sk-search__input" id="q" name="q" type="search"
         placeholder="Search zones, records and tags"
         autocomplete="off" aria-controls="zone-results" />
  <button type="button" class="sk-search__clear" hidden>
    <svg aria-hidden="true" focusable="false" width="16" height="16"><use href="#sk-icon-close" /></svg>
    <span class="sk-visually-hidden">Clear search</span>
  </button>
</form>
<p class="sk-visually-hidden" role="status" id="zone-results-status">24 results for cdn.</p>`,
    css: `.sk-search {
  display: flex;
  align-items: center;
  gap: var(--sk-space-8);
  /* Grows to fill a toolbar but never below 12rem, and never forces overflow. */
  flex: 1 1 20rem;
  min-inline-size: 0;
  max-inline-size: 32rem;
  min-block-size: var(--sk-control-height-md);
  padding-inline: var(--sk-space-12);
  background-color: var(--sk-color-field-bg);
  border: var(--sk-border-width-hairline) solid var(--sk-color-field-border);
  border-radius: var(--sk-radius-md);
}

.sk-search:focus-within {
  outline: var(--sk-focus-ring-width) solid var(--sk-color-focus-ring);
  outline-offset: var(--sk-focus-ring-offset);
  border-color: var(--sk-color-border-interactive);
}

.sk-search__icon { flex: 0 0 auto; fill: var(--sk-color-text-secondary); }

.sk-search__input {
  flex: 1 1 auto;
  min-inline-size: 0;
  border: none;
  background: transparent;
  color: var(--sk-color-text-primary);
  font-family: var(--sk-font-family-sans);
  font-size: var(--sk-font-size-body-md);
  padding-block: var(--sk-space-8);
}
.sk-search__input:focus-visible { outline: none; }
.sk-search__input::placeholder { color: var(--sk-color-text-placeholder); opacity: 1; }

/* WebKit injects a dark clear glyph that vanishes on a dark field. Suppress it
   and use our own button, which inherits currentColor. */
.sk-search__input::-webkit-search-cancel-button,
.sk-search__input::-webkit-search-decoration { appearance: none; display: none; }

.sk-search__clear {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  inline-size: 1.5rem;
  block-size: 1.5rem;
  padding: 0;
  border: none;
  border-radius: var(--sk-radius-full);
  background: transparent;
  color: var(--sk-color-text-secondary);
  cursor: pointer;
  position: relative;
}
.sk-search__clear::after { content: ""; position: absolute; inset: 50% 0 0 50%; translate: -50% -50%; min-inline-size: 24px; min-block-size: 24px; }
.sk-search__clear:hover { background-color: var(--sk-color-surface-hover); color: var(--sk-color-text-primary); }
.sk-search__clear > svg { fill: currentColor; }

.sk-search--sm { min-block-size: var(--sk-control-height-sm); flex-basis: 14rem; }
.sk-search--sm .sk-search__input { font-size: var(--sk-font-size-body-sm); }`,
    related: ['text-field', 'combobox', 'command-palette', 'empty-state'],
  },

  {
    id: 'slider',
    name: 'Slider',
    category: 'form',
    status: 'beta',
    summary:
      'Selects a value from a continuous or stepped range where the approximate position matters more than the exact number. Always paired with a numeric readout, because a slider alone cannot be set precisely.',
    whenToUse: [
      'Values where relative position is meaningful: thresholds, sampling rates, opacity.',
      'Ranges the user will adjust and observe repeatedly.',
    ],
    whenNotToUse: [
      'A precise value the user already knows — use a number field.',
      'More than about two decimal places of precision.',
      'Fewer than five discrete options — use a Radio group or Segmented control.',
    ],
    anatomy: [
      { part: 'Track', required: true, description: 'The full range. Held to 3:1 as a graphical object.' },
      { part: 'Fill', required: true, description: 'The portion from the minimum to the current value.' },
      { part: 'Thumb', required: true, description: 'The draggable handle, at least 20px so it can be grabbed.' },
      { part: 'Value readout', required: true, description: 'A live numeric display, editable where practical.' },
      { part: 'Tick marks', required: false, description: 'For stepped ranges with few steps.' },
    ],
    variants: [
      { name: 'Single', className: 'sk-slider', description: 'One thumb.', use: 'Most cases.' },
      { name: 'Range', className: 'sk-slider--range', description: 'Two thumbs bounding a span.', use: 'Date and numeric ranges. Needs careful thumb-crossing rules.' },
      { name: 'With input', className: 'sk-slider--with-input', description: 'Slider plus an editable number field.', use: 'When both approximate dragging and exact entry are needed. Preferred default.' },
    ],
    sizes: [
      { name: 'Medium', className: '', height: '1.5rem', typeStyle: 'body-sm readout', description: 'The only size. A smaller thumb is not reliably grabbable.' },
    ],
    states: [
      { name: 'Rest', description: 'Track, fill and thumb.', trigger: 'default' },
      { name: 'Hover', description: 'Thumb grows slightly.', trigger: ':hover' },
      { name: 'Focus visible', description: 'Ring around the thumb.', trigger: ':focus-visible' },
      { name: 'Dragging', description: 'Thumb enlarged; readout updates continuously but is announced only on release.', trigger: '[data-dragging]' },
      { name: 'Disabled', description: 'Grey throughout.', trigger: ':disabled' },
    ],
    props: [
      { name: 'min', type: 'number', required: true, description: 'Lower bound.' },
      { name: 'max', type: 'number', required: true, description: 'Upper bound.' },
      { name: 'step', type: 'number', default: '1', description: 'Increment.' },
      { name: 'value', type: 'number | [number, number]', required: true, description: 'Current value, or range bounds.' },
      { name: 'formatValue', type: '(n: number) => string', description: 'Formats the readout and aria-valuetext. Raw numbers rarely carry units.' },
    ],
    tokensUsed: ['color-control-track', 'color-control-checked', 'color-surface-base', 'color-focus-ring', 'radius-full'],
    darkMode:
      'Both the unfilled track and the filled portion must independently clear 3:1 against the page, and against each other, so the boundary between them is visible. In dark mode the unfilled track steps to neutral-500 and the fill to cobalt-400 — reusing the light-mode pair would leave the fill barely distinguishable from the track. The thumb keeps a surface-base fill plus a border so it stays a distinct object over both track segments.',
    accessibility: {
      role: 'Native <input type="range">, or role="slider" when a native input cannot express the interaction.',
      keyboard: [
        { keys: 'Arrow Left / Right / Up / Down', action: 'Change by one step.' },
        { keys: 'Page Up / Page Down', action: 'Change by a larger increment, typically ten steps.' },
        { keys: 'Home / End', action: 'Jump to minimum or maximum.' },
      ],
      aria: [
        'aria-valuenow, aria-valuemin and aria-valuemax are supplied by the native input.',
        'aria-valuetext is essential whenever the raw number is not self-explanatory: "3600 seconds (1 hour)", not "3600".',
        'Each thumb of a range slider needs its own accessible name: "Minimum TTL", "Maximum TTL".',
        'Announce on release, not during drag — continuous announcement floods the screen reader.',
      ],
      wcag: ['1.4.11 Non-text Contrast.', '2.1.1 Keyboard.', '2.5.1 Pointer Gestures — dragging must have a keyboard equivalent, which the native input provides.', '2.5.8 Target Size.', '4.1.2 Name, Role, Value.'],
      screenReader: 'Announced as "<label>, slider, <valuetext>, minimum <min>, maximum <max>".',
      targetSize: 'The thumb is 20px visually with a 24px hit area; 44px on coarse pointers.',
    },
    content: [
      'Always show the current value as text.',
      'Label the bounds when they are not obvious.',
      'Use aria-valuetext to give raw numbers meaning and units.',
    ],
    dos: [
      'Pair the slider with a number input for exact entry.',
      'Snap to sensible steps.',
      'Show the unit in the readout.',
    ],
    donts: [
      'Do not use a slider as the only way to set a precise value.',
      'Do not announce every intermediate value during a drag.',
      'Do not use a slider for fewer than five options.',
    ],
    html: `<div class="sk-field">
  <label class="sk-field__label" for="ttl-slider">Time to live</label>
  <div class="sk-slider sk-slider--with-input">
    <input class="sk-slider__input" id="ttl-slider" type="range"
           min="60" max="86400" step="60" value="3600"
           aria-valuetext="3600 seconds, 1 hour" />
    <output class="sk-slider__output" for="ttl-slider">1 hour</output>
  </div>
</div>`,
    css: `.sk-slider {
  display: flex;
  align-items: center;
  gap: var(--sk-space-16);
  min-inline-size: 0;
}

/* The track takes all available width; the readout keeps its intrinsic size. */
.sk-slider__input {
  flex: 1 1 auto;
  min-inline-size: 0;
  appearance: none;
  background: transparent;
  block-size: 1.5rem;
  margin: 0;
  cursor: pointer;
}

.sk-slider__input::-webkit-slider-runnable-track {
  block-size: 0.375rem;
  border-radius: var(--sk-radius-full);
  background: linear-gradient(
    to right,
    var(--sk-color-control-checked) 0 var(--sk-slider-progress, 50%),
    var(--sk-color-control-track) var(--sk-slider-progress, 50%) 100%
  );
}
.sk-slider__input::-moz-range-track {
  block-size: 0.375rem;
  border-radius: var(--sk-radius-full);
  background-color: var(--sk-color-control-track);
}
.sk-slider__input::-moz-range-progress {
  block-size: 0.375rem;
  border-radius: var(--sk-radius-full);
  background-color: var(--sk-color-control-checked);
}

/* Thumb keeps a page-coloured fill plus a brand border so it stays a distinct
   object over both the filled and unfilled parts of the track. */
.sk-slider__input::-webkit-slider-thumb {
  appearance: none;
  inline-size: 1.25rem;
  block-size: 1.25rem;
  margin-block-start: -0.4375rem;
  border: var(--sk-border-width-thick) solid var(--sk-color-control-checked);
  border-radius: var(--sk-radius-full);
  background-color: var(--sk-color-surface-base);
  box-shadow: var(--sk-elevation-1);
  transition: scale var(--sk-duration-fast) var(--sk-easing-standard);
}
.sk-slider__input::-moz-range-thumb {
  inline-size: 1.25rem;
  block-size: 1.25rem;
  border: var(--sk-border-width-thick) solid var(--sk-color-control-checked);
  border-radius: var(--sk-radius-full);
  background-color: var(--sk-color-surface-base);
}

.sk-slider__input:hover::-webkit-slider-thumb { scale: 1.1; }
.sk-slider__input:focus-visible { outline: none; }
.sk-slider__input:focus-visible::-webkit-slider-thumb {
  outline: var(--sk-focus-ring-width) solid var(--sk-color-focus-ring);
  outline-offset: var(--sk-focus-ring-offset);
}
.sk-slider__input:focus-visible::-moz-range-thumb {
  outline: var(--sk-focus-ring-width) solid var(--sk-color-focus-ring);
  outline-offset: var(--sk-focus-ring-offset);
}

.sk-slider__input:disabled { cursor: not-allowed; }
.sk-slider__input:disabled::-webkit-slider-thumb { border-color: var(--sk-color-border-disabled); }

.sk-slider__output {
  flex: 0 0 auto;
  min-inline-size: 5rem;
  text-align: end;
  font-size: var(--sk-font-size-body-sm);
  font-variant-numeric: tabular-nums;
  color: var(--sk-color-text-primary);
}

@media (pointer: coarse) {
  .sk-slider__input::-webkit-slider-thumb { inline-size: 1.75rem; block-size: 1.75rem; margin-block-start: -0.6875rem; }
}

@media (prefers-reduced-motion: reduce) {
  .sk-slider__input::-webkit-slider-thumb { transition: none; }
}`,
    related: ['text-field', 'form-field', 'progress'],
  },

  {
    id: 'file-upload',
    name: 'File upload',
    category: 'form',
    status: 'beta',
    summary:
      'Accepts one or more files by click or drag. The drop zone is a convenience; the button is the real control, because drag and drop is not keyboard-operable.',
    whenToUse: ['Importing zone files, certificates, CSVs.', 'Attaching evidence to a change request.'],
    whenNotToUse: ['Pasted text — offer a Textarea instead, which is faster for small content.', 'A single well-known file the system can fetch itself.'],
    anatomy: [
      { part: 'File input', required: true, description: 'A real <input type="file">, visually hidden but focusable and in the accessibility tree.' },
      { part: 'Drop zone', required: false, description: 'The dashed region. Purely a pointer enhancement.' },
      { part: 'Browse button', required: true, description: 'The keyboard and assistive-technology path. Never optional.' },
      { part: 'Constraints text', required: true, description: 'Accepted types and maximum size, stated before selection rather than as an error after.' },
      { part: 'File list', required: true, description: 'Selected files with size, progress and a remove button each.' },
    ],
    variants: [
      { name: 'Drop zone', className: 'sk-upload', description: 'Large dashed region.', use: 'Primary import screens.' },
      { name: 'Compact', className: 'sk-upload--compact', description: 'Button plus a file list.', use: 'Inside a form among other fields.' },
    ],
    sizes: [
      { name: 'Medium', className: '', height: 'auto', typeStyle: 'body-md', description: 'The only size.' },
    ],
    states: [
      { name: 'Empty', description: 'Prompt and constraints.', trigger: 'default' },
      { name: 'Drag over', description: 'Brand border and tint. Must not be the only indication a drop will work.', trigger: '[data-dragover]' },
      { name: 'Uploading', description: 'Per-file progress bar with a cancel button.', trigger: '[data-uploading]' },
      { name: 'Complete', description: 'Success icon per file.', trigger: '[data-complete]' },
      { name: 'Rejected', description: 'File listed with the specific reason it was refused.', trigger: '[data-rejected]' },
    ],
    props: [
      { name: 'accept', type: 'string', description: 'MIME types or extensions. Also state them in visible text — accept is a hint, not validation.' },
      { name: 'multiple', type: 'boolean', default: 'false', description: 'Allow several files.' },
      { name: 'maxSize', type: 'number', description: 'Bytes. Enforce on the server as well.' },
    ],
    tokensUsed: ['color-border-default', 'color-border-brand', 'color-surface-sunken', 'color-surface-selected', 'color-status-danger-text', 'radius-lg'],
    darkMode:
      'The dashed drop zone uses surface-sunken, which in dark mode is *darker* than the page — the opposite direction from floating surfaces. A recessed region reads as recessed by going darker, and this is the one place in dark mode where a surface should be darker than its parent. The drag-over tint uses surface-selected plus a 2px brand border, since the tint alone is imperceptible on dark.',
    accessibility: {
      role: 'Native <input type="file">.',
      keyboard: [
        { keys: 'Tab', action: 'Focus the input or its associated button.' },
        { keys: 'Enter / Space', action: 'Open the system file picker.' },
        { keys: 'Tab through the file list', action: 'Reach each remove button.' },
      ],
      aria: [
        'The input must be visually hidden with the clip technique, not display:none, so it remains focusable and announced.',
        'A <label> wraps or points at the input; the "Browse" button is that label styled as a button.',
        'Constraints are linked with aria-describedby so they are announced before the picker opens.',
        'Upload progress goes in an aria-live="polite" region, announced at milestones, not continuously.',
        'Each remove button names its file: "Remove zone-export.csv".',
        'Drag and drop must never be the only way to add a file (WCAG 2.5.7).',
      ],
      wcag: ['1.3.1 Info and Relationships.', '2.1.1 Keyboard.', '2.5.7 Dragging Movements — a single-pointer alternative is required.', '3.3.1 Error Identification.', '4.1.3 Status Messages.'],
      screenReader: 'Announced as "<label>, button" for the browse control, then the file list as a normal list with per-file status.',
      targetSize: 'The browse button and each remove button meet minimums; the drop zone is large by construction.',
    },
    content: [
      'State constraints up front: "CSV or zone file, up to 10 MB".',
      'Rejection messages name the file and the reason: "records.pdf was not added. Only CSV and zone files are accepted."',
      'Show file sizes in human units.',
    ],
    dos: [
      'Always provide the button path alongside drag and drop.',
      'Validate on the server regardless of the accept attribute.',
      'Allow cancelling an in-progress upload.',
    ],
    donts: [
      'Do not hide the input with display:none.',
      'Do not make drag and drop the only mechanism.',
      'Do not clear the whole list because one file was rejected.',
    ],
    html: `<div class="sk-upload">
  <input class="sk-upload__input sk-visually-hidden" id="import" type="file"
         accept=".csv,.zone" multiple aria-describedby="import-constraints" />
  <div class="sk-upload__zone">
    <svg class="sk-upload__icon" aria-hidden="true" focusable="false" width="32" height="32"><use href="#sk-icon-upload" /></svg>
    <p class="sk-upload__prompt">
      <label class="sk-button sk-button--secondary" for="import">Choose files</label>
      <span class="sk-upload__hint-drag">or drag them here</span>
    </p>
    <p class="sk-upload__constraints" id="import-constraints">CSV or zone file, up to 10 MB each.</p>
  </div>

  <ul class="sk-upload__list">
    <li class="sk-upload__file">
      <span class="sk-upload__file-name">zone-export.csv</span>
      <span class="sk-upload__file-meta">2.4 MB</span>
      <button type="button" class="sk-icon-button sk-icon-button--sm">
        <svg aria-hidden="true" focusable="false" width="16" height="16"><use href="#sk-icon-close" /></svg>
        <span class="sk-visually-hidden">Remove zone-export.csv</span>
      </button>
    </li>
  </ul>
  <p class="sk-visually-hidden" role="status">1 file selected.</p>
</div>`,
    css: `.sk-upload { display: flex; flex-direction: column; gap: var(--sk-space-12); min-inline-size: 0; }

.sk-upload__zone {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--sk-space-8);
  padding: var(--sk-space-32) var(--sk-space-16);
  text-align: center;
  /* Recessed regions go darker in dark mode — the opposite of floating surfaces. */
  background-color: var(--sk-color-surface-sunken);
  border: var(--sk-border-width-thick) dashed var(--sk-color-border-default);
  border-radius: var(--sk-radius-lg);
  transition: border-color var(--sk-duration-fast) var(--sk-easing-standard),
              background-color var(--sk-duration-fast) var(--sk-easing-standard);
}

.sk-upload__icon { fill: var(--sk-color-text-tertiary); }

.sk-upload__prompt {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: var(--sk-space-8);
  margin: 0;
}
.sk-upload__hint-drag { color: var(--sk-color-text-secondary); font-size: var(--sk-font-size-body-sm); }
.sk-upload__constraints { margin: 0; font-size: var(--sk-font-size-body-sm); color: var(--sk-color-text-secondary); }

.sk-upload[data-dragover] .sk-upload__zone {
  border-color: var(--sk-color-border-brand);
  background-color: var(--sk-color-surface-selected);
  border-style: solid;
}

/* Focusing the hidden input must still show a visible indicator on the zone. */
.sk-upload__input:focus-visible ~ .sk-upload__zone {
  outline: var(--sk-focus-ring-width) solid var(--sk-color-focus-ring);
  outline-offset: var(--sk-focus-ring-offset);
}

.sk-upload__list { display: flex; flex-direction: column; gap: var(--sk-space-4); margin: 0; padding: 0; list-style: none; }

.sk-upload__file {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--sk-space-8);
  min-inline-size: 0;
  padding: var(--sk-space-8) var(--sk-space-12);
  background-color: var(--sk-color-surface-raised);
  border: var(--sk-border-width-hairline) solid var(--sk-color-border-subtle);
  border-radius: var(--sk-radius-md);
}
/* Name absorbs slack and truncates; meta and the remove button never shrink. */
.sk-upload__file-name {
  flex: 1 1 auto;
  min-inline-size: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: var(--sk-font-size-body-sm);
  color: var(--sk-color-text-primary);
}
.sk-upload__file-meta { flex: 0 0 auto; font-size: var(--sk-font-size-body-xs); color: var(--sk-color-text-tertiary); font-variant-numeric: tabular-nums; }
.sk-upload__file[data-rejected] { border-color: var(--sk-color-field-border-error); }
.sk-upload__file-error { flex: 1 0 100%; font-size: var(--sk-font-size-body-xs); color: var(--sk-color-status-danger-text); }`,
    related: ['form-field', 'progress', 'alert'],
  },

  {
    id: 'fieldset',
    name: 'Fieldset',
    category: 'form',
    status: 'stable',
    summary:
      'Groups related fields under one heading, giving screen reader users the context sighted users get from visual proximity.',
    whenToUse: [
      'Any group of radios or checkboxes. Mandatory there, not optional.',
      'Sections of a long form: "Contact details", "Network settings".',
      'Composite values split across inputs, such as a date entered as three fields.',
    ],
    whenNotToUse: ['A single unrelated field.', 'Purely visual grouping with no shared meaning — use a Card.'],
    anatomy: [
      { part: 'Fieldset', required: true, description: 'The native element. Its default border and padding are reset.' },
      { part: 'Legend', required: true, description: 'The group name, announced before each contained control.' },
      { part: 'Description', required: false, description: 'Guidance for the group, referenced by aria-describedby from the fieldset.' },
      { part: 'Fields', required: true, description: 'The controls.' },
    ],
    variants: [
      { name: 'Plain', className: 'sk-fieldset', description: 'Legend and fields, no chrome.', use: 'Inside an already-sectioned form.' },
      { name: 'Bordered', className: 'sk-fieldset--bordered', description: 'Boxed with a visible boundary.', use: 'Visually separating an optional or advanced group.' },
      { name: 'Section', className: 'sk-fieldset--section', description: 'Legend styled as a section heading with a rule beneath.', use: 'Top-level sections of a long form.' },
    ],
    sizes: [{ name: 'Medium', className: '', height: 'auto', typeStyle: 'heading-sm legend', description: 'The only size.' }],
    states: [
      { name: 'Rest', description: 'Normal.', trigger: 'default' },
      { name: 'Disabled', description: 'The native disabled attribute cascades to every contained control — the only element in HTML that does this.', trigger: '[disabled]' },
      { name: 'Invalid', description: 'A group-level error under the legend.', trigger: '[data-invalid]' },
    ],
    props: [
      { name: 'legend', type: 'string', required: true, description: 'Group name.' },
      { name: 'description', type: 'string', description: 'Guidance for the whole group.' },
      { name: 'variant', type: "'plain' | 'bordered' | 'section'", default: "'plain'", description: 'Treatment.' },
    ],
    tokensUsed: ['color-text-primary', 'color-border-subtle', 'color-surface-raised', 'space-16', 'space-24'],
    darkMode:
      'The bordered variant relies on border-default, which steps from neutral-300 to neutral-700. A common mistake is reusing the light-mode border on dark, where it glares; the correct direction for a boundary on a dark surface is *darker* relative to white, i.e. lower in the ramp than the eye first expects.',
    accessibility: {
      role: 'Native <fieldset> and <legend>.',
      keyboard: [{ keys: 'Tab', action: 'Moves through contained fields. The fieldset is not a tab stop.' }],
      aria: [
        'The <legend> must be the first child of the <fieldset>. Out of order, browsers stop associating them.',
        'aria-describedby on the fieldset for group guidance.',
        'The disabled attribute on a fieldset disables all descendants natively — useful, and easy to forget you have applied.',
        'Do not replace a fieldset with a div plus a heading unless you also add role="group" and aria-labelledby.',
      ],
      wcag: ['1.3.1 Info and Relationships.', '2.4.6 Headings and Labels.', '3.3.2 Labels or Instructions.'],
      screenReader: 'The legend is announced when focus first enters the group, and often prepended to each control label.',
      targetSize: 'Not applicable.',
    },
    content: [
      'Legends are short noun phrases: "Network settings", not "Please enter your network settings".',
      'Do not repeat the legend inside each field label — screen readers would read it twice.',
    ],
    dos: [
      'Put the legend first.',
      'Use a fieldset for every radio and checkbox group.',
      'Keep groups to a coherent set of about seven fields.',
    ],
    donts: [
      'Do not nest fieldsets more than one level deep.',
      'Do not use a fieldset purely for visual boxing.',
      'Do not apply display:flex directly to a fieldset in older browsers — wrap the contents in a div instead, since legacy engines mishandle it.',
    ],
    html: `<fieldset class="sk-fieldset sk-fieldset--section" aria-describedby="net-desc">
  <legend class="sk-fieldset__legend">Network settings</legend>
  <p class="sk-fieldset__description" id="net-desc">Applies to every record in this zone.</p>
  <div class="sk-fieldset__body">
    <div class="sk-field"> ... </div>
    <div class="sk-field"> ... </div>
  </div>
</fieldset>`,
    css: `.sk-fieldset {
  min-inline-size: 0;
  margin: 0;
  padding: 0;
  border: none;
}

.sk-fieldset__legend {
  padding: 0;
  font-size: var(--sk-font-size-heading-sm);
  line-height: var(--sk-line-height-heading-sm);
  font-weight: var(--sk-font-weight-semibold);
  color: var(--sk-color-text-primary);
}

.sk-fieldset__description {
  margin-block: var(--sk-space-4) 0;
  font-size: var(--sk-font-size-body-sm);
  color: var(--sk-color-text-secondary);
}

/* Contents live in a flex column: legacy engines mishandle display:flex applied
   directly to a fieldset, so the body wrapper does the layout. */
.sk-fieldset__body {
  display: flex;
  flex-direction: column;
  gap: var(--sk-space-16);
  min-inline-size: 0;
  margin-block-start: var(--sk-space-16);
}

.sk-fieldset--bordered {
  padding: var(--sk-space-16);
  border: var(--sk-border-width-hairline) solid var(--sk-color-border-default);
  border-radius: var(--sk-radius-lg);
  background-color: var(--sk-color-surface-raised);
}
.sk-fieldset--bordered .sk-fieldset__legend { padding-inline: var(--sk-space-8); margin-inline-start: calc(var(--sk-space-8) * -1); }

.sk-fieldset--section .sk-fieldset__legend {
  inline-size: 100%;
  padding-block-end: var(--sk-space-8);
  border-block-end: var(--sk-border-width-hairline) solid var(--sk-color-border-subtle);
}

.sk-fieldset:disabled .sk-fieldset__legend,
.sk-fieldset:disabled .sk-fieldset__description { color: var(--sk-color-text-disabled); }`,
    related: ['form-field', 'checkbox', 'radio-group'],
  },
];
