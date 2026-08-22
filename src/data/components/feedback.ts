import type { ComponentSpec } from './types.js';

export const feedbackComponents: ComponentSpec[] = [
  {
    id: 'alert',
    name: 'Alert',
    category: 'feedback',
    status: 'stable',
    summary:
      'A persistent, in-page message about the state of the page or a region of it. It stays until the condition changes, which is what separates it from a Toast.',
    whenToUse: [
      'Conditions the user needs to know about while working: a degraded backend, a pending approval, a validation summary.',
      'The result of a submission that keeps the user on the page.',
      'Warnings before a consequential action.',
    ],
    whenNotToUse: [
      'Transient confirmation of a completed action — use Toast.',
      'A single field error — use the Form field error.',
      'Blocking a decision — use a Dialog.',
      'Marketing. An alert that is not about system state teaches users to ignore alerts.',
    ],
    anatomy: [
      { part: 'Container', required: true, description: 'Tinted surface with a 4px leading accent bar.' },
      { part: 'Icon', required: true, description: 'Intent-specific. Decorative, because the intent is also in the text.' },
      { part: 'Title', required: false, description: 'A short summary. Omit for one-line alerts.' },
      { part: 'Body', required: true, description: 'What happened and what to do about it.' },
      { part: 'Actions', required: false, description: 'Up to two. Ghost or secondary buttons only — never primary.' },
      { part: 'Dismiss', required: false, description: 'Only for alerts the user may reasonably ignore.' },
    ],
    variants: [
      { name: 'Info', className: 'sk-alert--info', description: 'Azure.', use: 'Neutral context the user should know.' },
      { name: 'Success', className: 'sk-alert--success', description: 'Jade.', use: 'A completed operation whose result persists on the page.' },
      { name: 'Warning', className: 'sk-alert--warning', description: 'Amber.', use: 'Something is degraded or will cause a problem soon.' },
      { name: 'Danger', className: 'sk-alert--danger', description: 'Crimson.', use: 'Something has failed and needs attention.' },
      { name: 'AI', className: 'sk-alert--ai', description: 'Violet.', use: 'Machine-generated content or suggestions, marked so they are never mistaken for confirmed fact.' },
    ],
    sizes: [
      { name: 'Compact', className: 'sk-alert--compact', height: 'auto', typeStyle: 'body-sm', description: 'Inside cards and panels.' },
      { name: 'Medium', className: '', height: 'auto', typeStyle: 'body-md', description: 'Default, page level.' },
    ],
    states: [
      { name: 'Static', description: 'Present on load. Not announced, because it was there before the user arrived.', trigger: 'default' },
      { name: 'Dynamic', description: 'Inserted after load. Announced via role="alert" or role="status" depending on urgency.', trigger: '[role="alert"]' },
      { name: 'Dismissed', description: 'Removed. Focus moves to a sensible neighbour, never nowhere.', trigger: 'removed' },
    ],
    props: [
      { name: 'intent', type: "'info' | 'success' | 'warning' | 'danger' | 'ai'", default: "'info'", description: 'Meaning.' },
      { name: 'title', type: 'string', description: 'Optional heading.' },
      { name: 'dismissible', type: 'boolean', default: 'false', description: 'Show a close button.' },
      { name: 'live', type: "'off' | 'polite' | 'assertive'", default: "'off'", description: 'Announcement urgency. Use assertive only for genuine failures.' },
    ],
    tokensUsed: [
      'color-status-info-surface', 'color-status-info-border', 'color-status-info-text',
      'color-status-success-surface', 'color-status-warning-surface', 'color-status-danger-surface',
      'color-ai-surface', 'color-ai-border', 'color-ai-text', 'radius-md', 'space-12',
    ],
    darkMode:
      'Tinted status surfaces are the hardest thing to get right in dark mode. A light-mode alert uses a pale 50-step tint; naively darkening it produces a muddy wash that is neither clearly tinted nor clearly neutral. Sekura instead uses the 950 step — a deep, saturated, nearly-black version of the hue — paired with 200-step text. The result reads as unambiguously coloured while keeping text contrast above 7:1. The 4px accent bar uses the 400 step so the intent is identifiable from peripheral vision, which is what an alert is for.',
    accessibility: {
      role: 'role="alert" for assertive messages, role="status" for polite ones, and no role at all for alerts present on page load.',
      keyboard: [
        { keys: 'Tab', action: 'Reaches the actions and the dismiss button.' },
        { keys: 'Escape', action: 'Does not dismiss. An alert is not a dialog, and Escape should not destroy information.' },
      ],
      aria: [
        'role="alert" interrupts the user immediately. Reserve it for failures — overusing it makes the product hostile with a screen reader.',
        'An alert already on the page at load must NOT have role="alert"; it would be announced out of context.',
        'The icon is aria-hidden. The intent must be carried by the text.',
        'The dismiss button needs a specific name: "Dismiss backend degradation warning".',
        'The live region container must exist in the DOM before the message is inserted, or nothing is announced.',
      ],
      wcag: [
        '1.4.1 Use of Color — icon and text carry the intent, not colour.',
        '1.4.3 Contrast — every status text/surface pair is audited in all four themes.',
        '3.3.1 Error Identification.',
        '4.1.3 Status Messages — this is the criterion alerts exist to satisfy.',
      ],
      screenReader: 'A dynamic alert is announced immediately (assertive) or at the next pause (polite). Static alerts are read in document order.',
      targetSize: 'Actions and dismiss meet minimums.',
    },
    content: [
      'Lead with what happened, then what to do: "Two records failed to apply. Retry, or open the change to see which."',
      'Be specific about scope: "3 of 12 records" beats "some records".',
      'Never blame the user. "That address is not valid" rather than "You entered an invalid address".',
      'Include a correlation ID in technical failures, and never a raw provider error.',
    ],
    dos: [
      'Put remediation next to the problem.',
      'Use polite announcements unless something has actually failed.',
      'Keep alerts on the page while the condition persists.',
    ],
    donts: [
      'Do not use role="alert" for success messages.',
      'Do not put a primary button in an alert; it competes with the page action.',
      'Do not stack more than two alerts — summarise instead.',
      'Do not auto-dismiss an alert.',
    ],
    html: `<!-- Static, present on load: no role, not announced -->
<div class="sk-alert sk-alert--warning">
  <svg class="sk-alert__icon" aria-hidden="true" focusable="false" width="20" height="20"><use href="#sk-icon-warning" /></svg>
  <div class="sk-alert__content">
    <h2 class="sk-alert__title">Invitations not yet accepted</h2>
    <p class="sk-alert__body">
      Two members have not accepted their invitation yet. They cannot be assigned work
      inconsistent for up to 24 hours.
    </p>
    <div class="sk-alert__actions">
      <button type="button" class="sk-button sk-button--secondary sk-button--sm">Check again</button>
      <a class="sk-link" href="/docs/invitations">How invitations work</a>
    </div>
  </div>
</div>

<!-- Dynamic failure: assertive -->
<div class="sk-alert sk-alert--danger" role="alert">
  <svg class="sk-alert__icon" aria-hidden="true" focusable="false" width="20" height="20"><use href="#sk-icon-error" /></svg>
  <div class="sk-alert__content">
    <p class="sk-alert__body">
      2 of 12 records failed to apply. The other 10 were applied successfully.
      Correlation ID <code class="sk-code">7f3a-91bc</code>.
    </p>
  </div>
  <button type="button" class="sk-icon-button sk-icon-button--sm sk-alert__dismiss">
    <svg aria-hidden="true" focusable="false" width="16" height="16"><use href="#sk-icon-close" /></svg>
    <span class="sk-visually-hidden">Dismiss record failure message</span>
  </button>
</div>`,
    css: `.sk-alert {
  display: flex;
  align-items: flex-start;
  gap: var(--sk-space-12);
  min-inline-size: 0;
  padding: var(--sk-space-12) var(--sk-space-16);
  border-radius: var(--sk-radius-md);
  /* 4px leading bar so the intent is identifiable from peripheral vision. */
  border-inline-start: var(--sk-border-width-accent) solid;
  font-size: var(--sk-font-size-body-md);
}

.sk-alert__icon { flex: 0 0 auto; margin-block-start: 0.125rem; fill: currentColor; }

/* Content column absorbs the slack and wraps; icons and dismiss never shrink. */
.sk-alert__content { flex: 1 1 auto; min-inline-size: 0; display: flex; flex-direction: column; gap: var(--sk-space-6); }

.sk-alert__title {
  margin: 0;
  font-size: var(--sk-font-size-body-md);
  line-height: var(--sk-line-height-body-md);
  font-weight: var(--sk-font-weight-semibold);
}
.sk-alert__body { margin: 0; line-height: var(--sk-line-height-body-md); }

.sk-alert__actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--sk-space-12);
  margin-block-start: var(--sk-space-4);
}

.sk-alert__dismiss { flex: 0 0 auto; margin-inline-start: auto; color: inherit; }

/* Dark mode uses the 950 step, not a darkened 50: a naively darkened pale tint
   reads as muddy grey, whereas the 950 step stays unmistakably coloured. */
.sk-alert--info    { background-color: var(--sk-color-status-info-surface);    border-inline-start-color: var(--sk-color-status-info-border);    color: var(--sk-color-status-info-text); }
.sk-alert--success { background-color: var(--sk-color-status-success-surface); border-inline-start-color: var(--sk-color-status-success-border); color: var(--sk-color-status-success-text); }
.sk-alert--warning { background-color: var(--sk-color-status-warning-surface); border-inline-start-color: var(--sk-color-status-warning-border); color: var(--sk-color-status-warning-text); }
.sk-alert--danger  { background-color: var(--sk-color-status-danger-surface);  border-inline-start-color: var(--sk-color-status-danger-border);  color: var(--sk-color-status-danger-text); }
.sk-alert--ai      { background-color: var(--sk-color-ai-surface);             border-inline-start-color: var(--sk-color-ai-border);             color: var(--sk-color-ai-text); }

.sk-alert--compact { padding: var(--sk-space-8) var(--sk-space-12); font-size: var(--sk-font-size-body-sm); gap: var(--sk-space-8); }

/* Links inside an alert inherit the status colour, or they would clash with it. */
.sk-alert .sk-link { color: inherit; text-decoration-thickness: 1.5px; }

@media (forced-colors: active) {
  .sk-alert { border: 1px solid CanvasText; border-inline-start-width: 4px; }
}`,
    related: ['toast', 'inline-message', 'empty-state', 'dialog'],
  },

  {
    id: 'toast',
    name: 'Toast',
    category: 'feedback',
    status: 'stable',
    summary:
      'A transient confirmation that an action succeeded, shown away from the point of interaction. It disappears on its own, so it must never carry information the user needs later.',
    whenToUse: [
      'Confirming a completed action when the result is not otherwise visible.',
      'Offering undo immediately after a reversible action.',
      'Background job completion.',
    ],
    whenNotToUse: [
      'Errors the user must act on — use an Alert, which persists.',
      'Anything the user may need to read twice.',
      'Confirming something already obvious on screen. A toast saying "Saved" beside a list that visibly updated is noise.',
    ],
    anatomy: [
      { part: 'Region', required: true, description: 'A persistent live region that exists before any toast is added.' },
      { part: 'Toast', required: true, description: 'Elevated surface with an icon, message and optional action.' },
      { part: 'Action', required: false, description: 'One action, almost always Undo.' },
      { part: 'Dismiss', required: true, description: 'A close button, because auto-dismiss alone fails WCAG 2.2.1 for users who need more time.' },
      { part: 'Progress', required: false, description: 'A subtle bar showing the remaining time before auto-dismiss.' },
    ],
    variants: [
      { name: 'Success', className: 'sk-toast--success', description: 'Jade icon.', use: 'Completed actions.' },
      { name: 'Info', className: 'sk-toast--info', description: 'Azure icon.', use: 'Background events.' },
      { name: 'Danger', className: 'sk-toast--danger', description: 'Crimson icon.', use: 'Failures that need no action — anything actionable belongs in an Alert.' },
      { name: 'Loading', className: 'sk-toast--loading', description: 'Spinner, no auto-dismiss.', use: 'A long operation, replaced in place by its result.' },
    ],
    sizes: [{ name: 'Medium', className: '', height: 'auto', typeStyle: 'body-sm', description: 'The only size.' }],
    states: [
      { name: 'Entering', description: 'Slides and fades in from the edge.', trigger: '[data-state="entering"]' },
      { name: 'Visible', description: 'Timer running.', trigger: '[data-state="visible"]' },
      { name: 'Paused', description: 'Timer paused on hover or focus within — required, so a user reaching for Undo does not lose it.', trigger: '[data-paused]' },
      { name: 'Leaving', description: 'Fades out.', trigger: '[data-state="leaving"]' },
    ],
    props: [
      { name: 'intent', type: "'success' | 'info' | 'danger' | 'loading'", default: "'success'", description: 'Meaning.' },
      { name: 'duration', type: 'number', default: '6000', description: 'Milliseconds before auto-dismiss. Toasts with actions get at least 10000.' },
      { name: 'action', type: '{label, onClick}', description: 'Single action, usually Undo.' },
    ],
    tokensUsed: ['color-surface-overlay', 'color-border-default', 'color-status-success-solid', 'elevation-5', 'z-toast', 'radius-lg'],
    darkMode:
      'The toast uses surface-overlay with elevation-5 and a border. Because it floats over arbitrary content, its own surface must be fully opaque in both themes — a translucent toast over a dark page can composite into anything. The intent is carried by a coloured icon rather than a coloured surface, so the same surface token works for every intent in both themes.',
    accessibility: {
      role: 'The container is role="status" aria-live="polite". Never role="alert".',
      keyboard: [
        { keys: 'Tab', action: 'Reaches the action and dismiss buttons. Toasts must be in the tab order — an Undo nobody can reach by keyboard is not an Undo.' },
        { keys: 'Escape', action: 'Dismisses the focused toast.' },
        { keys: 'F6', action: 'Optional shortcut to jump to the toast region from anywhere.' },
      ],
      aria: [
        'The live region must exist in the DOM before toasts are inserted; adding the region and the message together announces nothing.',
        'Polite, not assertive: a toast confirms, it does not interrupt.',
        'Auto-dismiss must pause on hover and on focus within (WCAG 2.2.1).',
        'A manual dismiss control is mandatory regardless of auto-dismiss.',
        'Never put the only copy of important information in a toast.',
      ],
      wcag: [
        '2.2.1 Timing Adjustable — this is the criterion auto-dismiss most often fails.',
        '2.1.1 Keyboard.',
        '4.1.3 Status Messages.',
        '1.4.13 Content on Hover or Focus — dismissible, hoverable, persistent.',
      ],
      screenReader: 'Announced politely at the next pause. The message must be complete on its own: "Project Website redesign deleted. Undo available."',
      targetSize: 'Action and dismiss buttons meet minimums.',
    },
    content: [
      'State the outcome in the past tense with the specific object: "Project Website redesign deleted".',
      'Keep it to one line where possible.',
      'Pair destructive actions with Undo rather than a confirmation dialog wherever the action is genuinely reversible — it is faster and less annoying.',
    ],
    dos: [
      'Give toasts with actions at least 10 seconds.',
      'Pause the timer on hover and focus.',
      'Stack newest at the bottom and cap the visible count at three.',
    ],
    donts: [
      'Do not use a toast for an error the user must fix.',
      'Do not auto-dismiss without a manual close button.',
      'Do not show more than three at once.',
      'Do not place toasts where they cover the primary action.',
    ],
    html: `<!-- The region exists on page load, empty. Toasts are appended into it. -->
<div class="sk-toast-region" role="status" aria-live="polite" aria-label="Notifications">
  <div class="sk-toast sk-toast--success" data-state="visible">
    <svg class="sk-toast__icon" aria-hidden="true" focusable="false" width="20" height="20"><use href="#sk-icon-check-circle" /></svg>
    <p class="sk-toast__message">Project Website redesign deleted.</p>
    <button type="button" class="sk-button sk-button--ghost sk-button--sm sk-toast__action">Undo</button>
    <button type="button" class="sk-icon-button sk-icon-button--sm sk-toast__dismiss">
      <svg aria-hidden="true" focusable="false" width="16" height="16"><use href="#sk-icon-close" /></svg>
      <span class="sk-visually-hidden">Dismiss notification</span>
    </button>
  </div>
</div>`,
    css: `.sk-toast-region {
  position: fixed;
  inset-block-end: var(--sk-space-16);
  inset-inline-end: var(--sk-space-16);
  z-index: var(--sk-z-toast);
  display: flex;
  flex-direction: column;
  gap: var(--sk-space-8);
  /* Never wider than the viewport, never wider than comfortable. */
  inline-size: min(24rem, calc(100vw - var(--sk-space-32)));
  /* The region itself must not intercept clicks on the page beneath. */
  pointer-events: none;
}

.sk-toast {
  pointer-events: auto;
  display: flex;
  align-items: center;
  gap: var(--sk-space-10);
  min-inline-size: 0;
  padding: var(--sk-space-12);
  /* Fully opaque: a translucent toast over unknown content has unpredictable contrast. */
  background-color: var(--sk-color-surface-overlay);
  border: var(--sk-border-width-hairline) solid var(--sk-color-border-default);
  border-radius: var(--sk-radius-lg);
  box-shadow: var(--sk-elevation-5);
  color: var(--sk-color-text-primary);
  font-size: var(--sk-font-size-body-sm);
}

.sk-toast__icon { flex: 0 0 auto; }
.sk-toast__message { flex: 1 1 auto; min-inline-size: 0; margin: 0; line-height: var(--sk-line-height-body-sm); }
.sk-toast__action { flex: 0 0 auto; }
.sk-toast__dismiss { flex: 0 0 auto; }

/* Intent is carried by the icon, so one surface token serves every intent in
   both themes. */
.sk-toast--success .sk-toast__icon { fill: var(--sk-color-status-success-solid); }
.sk-toast--info    .sk-toast__icon { fill: var(--sk-color-status-info-solid); }
.sk-toast--danger  .sk-toast__icon { fill: var(--sk-color-status-danger-solid); }

.sk-toast--loading .sk-toast__icon {
  inline-size: 1.25rem;
  block-size: 1.25rem;
  border: 2px solid var(--sk-color-border-default);
  border-block-start-color: var(--sk-color-text-brand);
  border-radius: var(--sk-radius-full);
  animation: sk-spin var(--sk-duration-deliberate) linear infinite;
}

.sk-toast[data-state="entering"] { animation: sk-toast-in var(--sk-duration-normal) var(--sk-easing-entrance); }
.sk-toast[data-state="leaving"]  { animation: sk-toast-out var(--sk-duration-fast) var(--sk-easing-exit) forwards; }

@keyframes sk-toast-in  { from { opacity: 0; translate: 0 var(--sk-space-16); } }
@keyframes sk-toast-out { to   { opacity: 0; scale: 0.96; } }

@media (max-width: 30rem) {
  /* Full width at the bottom on phones, where a corner toast is easy to miss. */
  .sk-toast-region { inset-inline: var(--sk-space-8); inline-size: auto; }
}

@media (prefers-reduced-motion: reduce) {
  .sk-toast[data-state="entering"], .sk-toast[data-state="leaving"] { animation: none; }
  .sk-toast--loading .sk-toast__icon { animation-duration: 2s; }
}

/* A toast is a floating surface whose intent is carried by colour. HCM removes
   both, which is survivable only because the icon and the text still say what
   happened — but the toast still needs an edge to read as one object. */
@media (forced-colors: active) {
  .sk-toast { border: 1px solid CanvasText; }
}
`,
    related: ['alert', 'inline-message', 'button'],
  },

  {
    id: 'inline-message',
    name: 'Inline message',
    category: 'feedback',
    status: 'stable',
    summary:
      'A small status note attached to a specific element rather than the page. Quieter than an Alert, and always adjacent to the thing it describes.',
    whenToUse: ['Explaining why a control is disabled.', 'A per-row status note in a table.', 'A short note under a section heading.'],
    whenNotToUse: ['Page-level conditions — use Alert.', 'Field validation — use the Form field error.'],
    anatomy: [
      { part: 'Icon', required: true, description: 'Small intent glyph.' },
      { part: 'Text', required: true, description: 'One or two lines.' },
    ],
    variants: [
      { name: 'Info', className: 'sk-inline-message--info', description: 'Azure.', use: 'Explanatory notes.' },
      { name: 'Success', className: 'sk-inline-message--success', description: 'Jade.', use: 'Confirmed state.' },
      { name: 'Warning', className: 'sk-inline-message--warning', description: 'Amber.', use: 'Caveats.' },
      { name: 'Danger', className: 'sk-inline-message--danger', description: 'Crimson.', use: 'Local failures.' },
    ],
    sizes: [{ name: 'Small', className: '', height: 'auto', typeStyle: 'body-sm', description: 'The only size.' }],
    states: [
      { name: 'Static', description: 'Present on load.', trigger: 'default' },
      { name: 'Dynamic', description: 'Inserted later, announced politely.', trigger: '[role="status"]' },
    ],
    props: [
      { name: 'intent', type: "'info' | 'success' | 'warning' | 'danger'", default: "'info'", description: 'Meaning.' },
    ],
    tokensUsed: ['color-status-info-text', 'color-status-warning-text', 'color-status-danger-text', 'space-6'],
    darkMode:
      'Inline messages have no surface — only coloured text and an icon on the page background. This makes them the strictest contrast case in the system: the status *text* token must clear 4.5:1 against surface-base, surface-subtle and surface-raised in every theme, which is exactly what the audit enforces. It is also why status text uses the 800 step in light and the 200 step in dark rather than the same mid-step in both.',
    accessibility: {
      role: 'No role when static; role="status" when inserted dynamically.',
      keyboard: [{ keys: 'n/a', action: 'Not interactive.' }],
      aria: [
        'Reference it from the control it describes with aria-describedby, so the message is announced with the control rather than stranded.',
        'The icon is aria-hidden.',
        'Do not use role="alert" — an inline message is not urgent.',
      ],
      wcag: ['1.4.1 Use of Color.', '1.4.3 Contrast.', '3.3.1 Error Identification.', '4.1.3 Status Messages.'],
      screenReader: 'Read with the control it describes, via aria-describedby.',
      targetSize: 'Not interactive.',
    },
    content: ['One sentence.', 'Explain the cause, not just the state: "Read-only because you have Viewer access on this project."'],
    dos: ['Attach it with aria-describedby.', 'Keep it adjacent to what it describes.'],
    donts: ['Do not use it for page-level status.', 'Do not stack several in a row — that is an Alert.'],
    html: `<button type="button" class="sk-button sk-button--primary" aria-disabled="true" aria-describedby="publish-why">
  Publish project
</button>
<p class="sk-inline-message sk-inline-message--info" id="publish-why">
  <svg aria-hidden="true" focusable="false" width="16" height="16"><use href="#sk-icon-info" /></svg>
  <span>Add at least one record before publishing.</span>
</p>`,
    css: `.sk-inline-message {
  display: flex;
  align-items: flex-start;
  gap: var(--sk-space-6);
  min-inline-size: 0;
  margin: 0;
  font-size: var(--sk-font-size-body-sm);
  line-height: var(--sk-line-height-body-sm);
}

.sk-inline-message > svg { flex: 0 0 auto; margin-block-start: 0.15em; fill: currentColor; }
.sk-inline-message > span { flex: 1 1 auto; min-inline-size: 0; }

/* No surface of its own, so these text tokens are audited against every surface
   the message can appear on. */
.sk-inline-message--info    { color: var(--sk-color-status-info-text); }
.sk-inline-message--success { color: var(--sk-color-status-success-text); }
.sk-inline-message--warning { color: var(--sk-color-status-warning-text); }
.sk-inline-message--danger  { color: var(--sk-color-status-danger-text); }
/* Intent is carried by colour and an icon. HCM removes the colour, so the icon
   must still render — and the message text always states the problem, which is
   why losing the tint is survivable here. */
@media (forced-colors: active) {
  .sk-inline-message > svg { fill: CanvasText; }
}
`,
    related: ['alert', 'form-field', 'tooltip'],
  },

  {
    id: 'progress',
    name: 'Progress',
    category: 'feedback',
    status: 'stable',
    summary:
      'Shows how far along a determinate operation is. Use it only when you genuinely know the proportion — a fake progress bar is worse than a spinner.',
    whenToUse: ['Uploads and downloads.', 'Batch operations with a known item count.', 'Multi-step completion.'],
    whenNotToUse: ['Unknown duration — use a Spinner.', 'Operations under about one second — show nothing.'],
    anatomy: [
      { part: 'Track', required: true, description: 'The full extent. Held to 3:1 because it defines the scale.' },
      { part: 'Fill', required: true, description: 'The completed portion.' },
      { part: 'Label', required: true, description: 'What is happening.' },
      { part: 'Value', required: false, description: 'Percentage or a count, in tabular figures so it does not jitter.' },
    ],
    variants: [
      { name: 'Linear', className: 'sk-progress', description: 'Horizontal bar.', use: 'Default.' },
      { name: 'Circular', className: 'sk-progress--circular', description: 'Ring.', use: 'Compact spaces and inside avatars.' },
      { name: 'Segmented', className: 'sk-progress--segmented', description: 'Discrete blocks.', use: 'Small known counts, such as 3 of 8 records.' },
    ],
    sizes: [
      { name: 'Small', className: 'sk-progress--sm', height: '0.25rem', typeStyle: 'body-xs', description: 'Inline, inside rows.' },
      { name: 'Medium', className: '', height: '0.5rem', typeStyle: 'body-sm', description: 'Default.' },
    ],
    states: [
      { name: 'Determinate', description: 'Known percentage.', trigger: '[aria-valuenow]' },
      { name: 'Indeterminate', description: 'Animated sweep, no aria-valuenow. Prefer a Spinner unless the operation is genuinely page-blocking.', trigger: '[data-indeterminate]' },
      { name: 'Error', description: 'Fill turns crimson and stops.', trigger: '[data-error]' },
      { name: 'Complete', description: 'Fill turns jade at 100%.', trigger: '[data-complete]' },
    ],
    props: [
      { name: 'value', type: 'number', description: 'Current value. Omit for indeterminate.' },
      { name: 'max', type: 'number', default: '100', description: 'Maximum.' },
      { name: 'label', type: 'string', required: true, description: 'What is progressing.' },
    ],
    tokensUsed: ['color-control-track', 'color-control-checked', 'color-status-success-solid', 'color-status-danger-solid', 'radius-full'],
    darkMode:
      'Track and fill must clear 3:1 against the page *and* be distinguishable from each other. In dark mode the track steps to neutral-500 and the fill to cobalt-400. A track that is merely "a bit lighter than the background" disappears entirely on dark, and the bar then appears to float with no scale — which removes the only information a progress bar carries.',
    accessibility: {
      role: 'Native <progress>, or role="progressbar".',
      keyboard: [{ keys: 'n/a', action: 'Not interactive.' }],
      aria: [
        'aria-valuenow, aria-valuemin, aria-valuemax for determinate progress.',
        'Omit aria-valuenow entirely for indeterminate — do not set it to 0.',
        'aria-valuetext when a percentage is less meaningful than a count: "3 of 8 records applied".',
        'Announce at milestones (25, 50, 75, 100) in a polite live region, not continuously.',
        'aria-labelledby pointing at the visible label.',
      ],
      wcag: ['1.4.11 Non-text Contrast.', '2.2.2 Pause, Stop, Hide — an indeterminate animation must respect reduced motion.', '4.1.2 Name, Role, Value.', '4.1.3 Status Messages.'],
      screenReader: 'Announced as "<label>, progress bar, 45 percent" or the aria-valuetext.',
      targetSize: 'Not interactive.',
    },
    content: [
      'Label the operation, not the widget: "Importing records", not "Progress".',
      'Prefer counts to percentages when the count is what the user cares about.',
      'On completion, say so in text as well as colour.',
    ],
    dos: ['Announce at milestones only.', 'Show a count when it is more meaningful than a percentage.', 'Allow cancellation of long operations.'],
    donts: ['Do not fake progress.', 'Do not animate indeterminate progress when reduced motion is requested.', 'Do not announce every percent.'],
    html: `<div class="sk-progress">
  <div class="sk-progress__header">
    <span class="sk-progress__label" id="import-label">Importing records</span>
    <span class="sk-progress__value">3 of 8</span>
  </div>
  <div class="sk-progress__track" role="progressbar"
       aria-labelledby="import-label"
       aria-valuenow="3" aria-valuemin="0" aria-valuemax="8"
       aria-valuetext="3 of 8 records imported">
    <div class="sk-progress__fill" style="inline-size: 37.5%"></div>
  </div>
</div>`,
    css: `.sk-progress { display: flex; flex-direction: column; gap: var(--sk-space-6); min-inline-size: 0; }

.sk-progress__header {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--sk-space-8);
  font-size: var(--sk-font-size-body-sm);
}
.sk-progress__label { flex: 1 1 auto; min-inline-size: 0; color: var(--sk-color-text-primary); }
.sk-progress__value { flex: 0 0 auto; color: var(--sk-color-text-secondary); font-variant-numeric: tabular-nums; }

.sk-progress__track {
  inline-size: 100%;
  block-size: 0.5rem;
  border-radius: var(--sk-radius-full);
  /* Must be visible in its own right: a track that is only slightly lighter than
     the page vanishes on dark and the bar loses its scale. */
  background-color: var(--sk-color-control-track);
  overflow: hidden;
}

.sk-progress__fill {
  block-size: 100%;
  border-radius: var(--sk-radius-full);
  background-color: var(--sk-color-control-checked);
  transition: inline-size var(--sk-duration-normal) var(--sk-easing-standard);
}

.sk-progress[data-complete] .sk-progress__fill { background-color: var(--sk-color-status-success-solid); }
.sk-progress[data-error]    .sk-progress__fill { background-color: var(--sk-color-status-danger-solid); }

.sk-progress[data-indeterminate] .sk-progress__fill {
  inline-size: 40%;
  animation: sk-progress-sweep 1.4s var(--sk-easing-standard) infinite;
}
@keyframes sk-progress-sweep {
  0%   { translate: -100% 0; }
  100% { translate: 250% 0; }
}

.sk-progress--sm .sk-progress__track { block-size: 0.25rem; }

.sk-progress--segmented .sk-progress__track { display: flex; gap: var(--sk-space-2); background: transparent; }
.sk-progress--segmented .sk-progress__segment {
  flex: 1 1 0;
  block-size: 0.5rem;
  border-radius: var(--sk-radius-xs);
  background-color: var(--sk-color-control-track);
}
.sk-progress--segmented .sk-progress__segment[data-filled] { background-color: var(--sk-color-control-checked); }

@media (prefers-reduced-motion: reduce) {
  .sk-progress__fill { transition: none; }
  .sk-progress[data-indeterminate] .sk-progress__fill { animation: none; inline-size: 100%; opacity: 0.5; }
}
/* The fill IS the information. A background-only bar reads as 0% at every
   value once HCM discards it, so the track gets an outline and the fill a
   system colour. */
@media (forced-colors: active) {
  .sk-progress__track { outline: 1px solid CanvasText; }
  .sk-progress__fill { background-color: Highlight; }
  .sk-progress[data-error] .sk-progress__fill { background-color: CanvasText; }
}
`,
    related: ['spinner', 'skeleton', 'file-upload', 'stepper'],
  },

  {
    id: 'spinner',
    name: 'Spinner',
    category: 'feedback',
    status: 'stable',
    summary:
      'Indicates that something is happening for an unknown duration. Deliberately plain — a spinner communicates only "wait", and dressing it up does not make waiting shorter.',
    whenToUse: ['Operations of unknown length that take longer than about 400ms.', 'Inside buttons during submission.', 'Loading a small region.'],
    whenNotToUse: [
      'Loading a whole page or list of content — use Skeleton, which also communicates the shape of what is coming.',
      'Operations under 400ms; a flash of spinner is worse than a brief pause.',
      'Known progress — use Progress.',
    ],
    anatomy: [
      { part: 'Ring', required: true, description: 'A rotating arc.' },
      { part: 'Label', required: true, description: 'Visible or visually hidden, but always present.' },
    ],
    variants: [
      { name: 'Default', className: 'sk-spinner', description: 'Neutral ring with a brand arc.', use: 'Standard.' },
      { name: 'On brand', className: 'sk-spinner--on-brand', description: 'Uses currentColor.', use: 'Inside filled buttons.' },
      { name: 'Centred', className: 'sk-spinner--centred', description: 'Centred in its container with a visible label beneath.', use: 'Loading a panel or region.' },
    ],
    sizes: [
      { name: 'Small', className: 'sk-spinner--sm', height: '1rem', typeStyle: 'n/a', description: 'Inline and inside buttons.' },
      { name: 'Medium', className: '', height: '1.5rem', typeStyle: 'n/a', description: 'Default.' },
      { name: 'Large', className: 'sk-spinner--lg', height: '2.5rem', typeStyle: 'n/a', description: 'Region loading.' },
    ],
    states: [
      { name: 'Spinning', description: 'The only state.', trigger: 'default' },
      { name: 'Reduced motion', description: 'Slows to 2s rather than stopping — it is the only signal that anything is happening.', trigger: 'prefers-reduced-motion' },
    ],
    props: [
      { name: 'label', type: 'string', default: "'Loading'", description: 'Accessible name.' },
      { name: 'size', type: "'sm' | 'md' | 'lg'", default: "'md'", description: 'Diameter.' },
      { name: 'delay', type: 'number', default: '400', description: 'Milliseconds before appearing, to avoid a flash on fast responses.' },
    ],
    tokensUsed: ['color-border-default', 'color-text-brand', 'duration-deliberate', 'radius-full'],
    darkMode:
      'The ring is border-default with a brand-coloured leading arc. Both step appropriately, but the important detail is that the ring must not simply be "the fill at low opacity" — opacity-based rings lose almost all definition on dark surfaces, so the ring uses its own token.',
    accessibility: {
      role: 'role="status" on the container, or aria-busy on the region being loaded.',
      keyboard: [{ keys: 'n/a', action: 'Not interactive.' }],
      aria: [
        'A visually hidden label is required. A bare spinner is announced as nothing at all.',
        'role="status" announces politely once.',
        'Set aria-busy="true" on the region being replaced, so assistive technology knows the content is in flux.',
        'Do not announce repeatedly; announce on start and on completion.',
      ],
      wcag: ['2.2.2 Pause, Stop, Hide.', '4.1.3 Status Messages.', '1.4.11 Non-text Contrast — the arc must be perceivable.'],
      screenReader: 'Announced once as "Loading" when it appears, and the result is announced when it resolves.',
      targetSize: 'Not interactive.',
    },
    content: ['Say what is loading where you can: "Loading projects", not just "Loading".', 'Announce the result, not just the start.'],
    dos: ['Delay appearance by ~400ms.', 'Always include a label.', 'Announce completion.'],
    donts: ['Do not use a spinner for content whose shape you know — use a skeleton.', 'Do not stop the animation entirely for reduced motion.', 'Do not stack multiple spinners in one view.'],
    html: `<span class="sk-spinner" role="status">
  <span class="sk-visually-hidden">Loading projects</span>
</span>

<div class="sk-spinner-region sk-spinner--centred" aria-busy="true">
  <span class="sk-spinner sk-spinner--lg" role="status"></span>
  <p class="sk-spinner__label">Loading projects…</p>
</div>`,
    css: `.sk-spinner {
  display: inline-block;
  inline-size: 1.5rem;
  block-size: 1.5rem;
  /* The ring gets its own token rather than being the fill at low opacity —
     opacity-based rings lose nearly all definition on dark surfaces. */
  border: 2px solid var(--sk-color-border-default);
  border-block-start-color: var(--sk-color-text-brand);
  border-radius: var(--sk-radius-full);
  animation: sk-spin var(--sk-duration-deliberate) linear infinite;
}

.sk-spinner--sm { inline-size: 1rem; block-size: 1rem; border-width: 1.5px; }
.sk-spinner--lg { inline-size: 2.5rem; block-size: 2.5rem; border-width: 3px; }

.sk-spinner--on-brand { border-color: currentColor; border-block-start-color: transparent; opacity: 0.9; }

.sk-spinner-region {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--sk-space-12);
  min-block-size: 12rem;
  padding: var(--sk-space-32);
}
.sk-spinner__label { margin: 0; color: var(--sk-color-text-secondary); font-size: var(--sk-font-size-body-sm); }

@media (prefers-reduced-motion: reduce) {
  /* Slowed, not stopped: it is the only signal that work is in progress. */
  .sk-spinner { animation-duration: 2s; }
}
/* The spinner is a partly-transparent border ring. HCM forces every border to
   one colour, which turns the ring into a solid circle that does not appear to
   move. Forcing only the leading edge keeps the rotation legible. */
@media (forced-colors: active) {
  .sk-spinner { border-color: CanvasText; border-block-start-color: Highlight; }
  .sk-spinner__label { color: CanvasText; }
}
`,
    related: ['progress', 'skeleton', 'button'],
  },

  {
    id: 'skeleton',
    name: 'Skeleton',
    category: 'feedback',
    status: 'stable',
    summary:
      'Placeholder shapes matching the layout of content that is loading. Better than a spinner for lists and pages because it prevents layout shift and tells the user what is coming.',
    whenToUse: ['Initial load of a list, table or card grid.', 'Any content whose shape is known in advance.'],
    whenNotToUse: [
      'Loads under about 300ms — the flash is worse than the wait.',
      'Unknown-shape content — use a Spinner.',
      'Re-loading content already on screen; keep the old content and dim it instead.',
    ],
    anatomy: [
      { part: 'Blocks', required: true, description: 'Rectangles matching the real content’s dimensions.' },
      { part: 'Shimmer', required: false, description: 'A subtle sweep signalling activity. Suppressed under reduced motion.' },
      { part: 'Live region', required: true, description: 'Announces "Loading" once, so screen reader users are not left in silence.' },
    ],
    variants: [
      { name: 'Text', className: 'sk-skeleton--text', description: 'Lines at text height, last line shorter.', use: 'Paragraphs and labels.' },
      { name: 'Block', className: 'sk-skeleton--block', description: 'Rectangle.', use: 'Cards, images, charts.' },
      { name: 'Circle', className: 'sk-skeleton--circle', description: 'Round.', use: 'Avatars.' },
      { name: 'Table', className: 'sk-skeleton--table', description: 'Repeated rows.', use: 'Data tables.' },
    ],
    sizes: [{ name: 'Intrinsic', className: '', height: 'matches real content', typeStyle: 'n/a', description: 'A skeleton has no size of its own; it must match what it replaces or it causes the layout shift it exists to prevent.' }],
    states: [
      { name: 'Loading', description: 'Shimmering.', trigger: 'default' },
      { name: 'Reduced motion', description: 'Static, with a slow opacity pulse instead of a sweep.', trigger: 'prefers-reduced-motion' },
    ],
    props: [
      { name: 'lines', type: 'number', default: '3', description: 'Text lines to render.' },
      { name: 'variant', type: "'text' | 'block' | 'circle' | 'table'", default: "'text'", description: 'Shape.' },
    ],
    tokensUsed: ['color-surface-sunken', 'color-surface-hover', 'radius-sm', 'duration-deliberate'],
    darkMode:
      'The shimmer is a gradient between surface-sunken and a slightly lighter stop. In light mode the sweep goes lighter-than-base; in dark mode it must also go *lighter*, not darker, because a darker sweep on a dark page reads as a hole rather than a highlight. The gradient stops are therefore defined against surface tokens rather than as fixed white/black overlays.',
    accessibility: {
      role: 'aria-hidden on the shapes; a separate role="status" announces the load.',
      keyboard: [{ keys: 'n/a', action: 'Not interactive.' }],
      aria: [
        'The skeleton shapes are aria-hidden — they are meaningless to a screen reader.',
        'A single visually hidden role="status" saying "Loading projects" carries the meaning.',
        'aria-busy="true" on the container until content arrives.',
        'Announce completion, or the user is left wondering.',
      ],
      wcag: ['2.2.2 Pause, Stop, Hide.', '4.1.3 Status Messages.', '2.3.3 Animation from Interactions.'],
      screenReader: 'Hears "Loading projects" once, then the real content when it arrives.',
      targetSize: 'Not interactive.',
    },
    content: ['The hidden status names what is loading.', 'Do not put placeholder text like "Lorem ipsum" in a skeleton.'],
    dos: ['Match the real content’s dimensions exactly.', 'Show the same number of rows you expect to render.', 'Announce loading once and completion once.'],
    donts: ['Do not shimmer under reduced motion.', 'Do not use skeletons for loads under 300ms.', 'Do not let the skeleton differ in size from the real content.'],
    html: `<div class="sk-skeleton-group" aria-busy="true">
  <p class="sk-visually-hidden" role="status">Loading projects</p>
  <div class="sk-skeleton sk-skeleton--text" aria-hidden="true"></div>
  <div class="sk-skeleton sk-skeleton--text" aria-hidden="true"></div>
  <div class="sk-skeleton sk-skeleton--text sk-skeleton--short" aria-hidden="true"></div>
</div>`,
    css: `.sk-skeleton-group { display: flex; flex-direction: column; gap: var(--sk-space-8); min-inline-size: 0; }

.sk-skeleton {
  background-color: var(--sk-color-surface-sunken);
  border-radius: var(--sk-radius-sm);
  /* The sweep is built from surface tokens, so in dark mode it goes lighter —
     a darker sweep on a dark page reads as a hole, not a highlight. */
  background-image: linear-gradient(
    90deg,
    var(--sk-color-surface-sunken) 0%,
    var(--sk-color-surface-hover) 50%,
    var(--sk-color-surface-sunken) 100%
  );
  background-size: 200% 100%;
  animation: sk-shimmer 1.6s var(--sk-easing-standard) infinite;
}

@keyframes sk-shimmer {
  from { background-position: 200% 0; }
  to   { background-position: -200% 0; }
}

.sk-skeleton--text   { block-size: 1rem; inline-size: 100%; }
.sk-skeleton--short  { inline-size: 60%; }
.sk-skeleton--block  { block-size: 8rem; inline-size: 100%; border-radius: var(--sk-radius-lg); }
.sk-skeleton--circle { inline-size: 2.5rem; block-size: 2.5rem; border-radius: var(--sk-radius-full); flex: 0 0 auto; }

.sk-skeleton--table { display: flex; flex-direction: column; gap: var(--sk-space-2); background: none; animation: none; }
.sk-skeleton--table > .sk-skeleton { block-size: 2.75rem; border-radius: var(--sk-radius-xs); }

@media (prefers-reduced-motion: reduce) {
  .sk-skeleton {
    animation: sk-skeleton-pulse 2.4s ease-in-out infinite;
    background-image: none;
  }
}
@keyframes sk-skeleton-pulse { 50% { opacity: 0.6; } }
/* Skeletons are pure background. In HCM they vanish, so a loading region looks
   simply empty — indistinguishable from "there is nothing here". An outline
   keeps the reserved space visible. */
@media (forced-colors: active) {
  .sk-skeleton { outline: 1px solid GrayText; background-color: Canvas; }
}
`,
    related: ['spinner', 'progress', 'table', 'card'],
  },

  {
    id: 'empty-state',
    name: 'Empty state',
    category: 'feedback',
    status: 'stable',
    summary:
      'What a user sees when there is nothing to show. The most under-designed screen in most products, and often the first one a new user meets.',
    whenToUse: [
      'A list or table with no items.',
      'A search or filter returning nothing.',
      'A feature the user has not started using.',
      'A region the user cannot access.',
    ],
    whenNotToUse: ['While loading — use Skeleton.', 'After an error — use an error state that explains the failure and offers retry.'],
    anatomy: [
      { part: 'Illustration or icon', required: false, description: 'Decorative and aria-hidden. Optional; never load-bearing.' },
      { part: 'Heading', required: true, description: 'States the situation in plain words.' },
      { part: 'Body', required: true, description: 'Explains why it is empty and what to do next.' },
      { part: 'Primary action', required: false, description: 'The one obvious next step.' },
      { part: 'Secondary action', required: false, description: 'Learn more, or import.' },
    ],
    variants: [
      { name: 'First use', className: 'sk-empty-state--first-use', description: 'Nothing created yet.', use: 'Onboarding. This is the one place a primary action and a friendly tone are welcome.' },
      { name: 'No results', className: 'sk-empty-state--no-results', description: 'Filters or search excluded everything.', use: 'Offers clearing the filters — which is almost always what the user wants.' },
      { name: 'No access', className: 'sk-empty-state--no-access', description: 'The user lacks permission.', use: 'Says how to request access. Never enumerates what exists.' },
      { name: 'Error', className: 'sk-empty-state--error', description: 'Loading failed.', use: 'Offers retry and a correlation ID.' },
    ],
    sizes: [
      { name: 'Compact', className: 'sk-empty-state--compact', height: 'auto', typeStyle: 'body-sm', description: 'Inside a card or panel.' },
      { name: 'Medium', className: '', height: 'auto', typeStyle: 'body-md', description: 'Full region or page.' },
    ],
    states: [
      { name: 'Static', description: 'The only state.', trigger: 'default' },
    ],
    props: [
      { name: 'variant', type: "'first-use' | 'no-results' | 'no-access' | 'error'", default: "'first-use'", description: 'Which empty this is. They are genuinely different situations and need different copy.' },
      { name: 'heading', type: 'string', required: true, description: 'The situation.' },
      { name: 'body', type: 'string', required: true, description: 'Why, and what next.' },
    ],
    tokensUsed: ['color-text-primary', 'color-text-secondary', 'color-surface-sunken', 'space-32', 'space-48'],
    darkMode:
      'Illustrations are the risk here. Any illustration shipped as a flat PNG will look wrong in one of the two themes. Sekura requires empty-state art to be inline SVG using currentColor and semantic tokens for fills, or to ship two files selected by a `<picture>` with a prefers-color-scheme media query. A single raster asset is not acceptable.',
    accessibility: {
      role: 'A region with a heading. No special role.',
      keyboard: [{ keys: 'Tab', action: 'Reaches the actions.' }],
      aria: [
        'The heading is a real heading element at the right level for the page outline.',
        'Illustrations are aria-hidden.',
        'When an empty state replaces content after a filter change, announce the result count in a polite live region — the visual change alone is invisible to a screen reader user.',
        'Never enumerate resources the user cannot access in a no-access message.',
      ],
      wcag: ['1.3.1 Info and Relationships.', '2.4.6 Headings and Labels.', '4.1.3 Status Messages.'],
      screenReader: 'Read as a normal heading and paragraph. Filter-driven emptiness is announced.',
      targetSize: 'Actions meet minimums.',
    },
    content: [
      'The heading states the situation, not the feeling: "No projects yet", not "Nothing to see here".',
      'The body says why and what next: "Projects group the tasks for one piece of work. Create your first project to get started."',
      'No-results copy names the filters that caused it and offers to clear them.',
      'No-access copy says how to get access without revealing what exists.',
      'Avoid jokes. A user who hits an empty state repeatedly stops finding them funny.',
    ],
    dos: [
      'Distinguish first-use, no-results, no-access and error — they need different copy and different actions.',
      'Offer to clear filters in a no-results state.',
      'Use theme-aware illustrations.',
    ],
    donts: [
      'Do not show a bare "No data".',
      'Do not use the same copy for first-use and no-results.',
      'Do not reveal the existence of resources in a no-access state.',
      'Do not ship a single raster illustration for both themes.',
    ],
    html: `<div class="sk-empty-state sk-empty-state--no-results">
  <svg class="sk-empty-state__icon" aria-hidden="true" focusable="false" width="48" height="48"><use href="#sk-illus-search" /></svg>
  <h2 class="sk-empty-state__heading">No projects match your filters</h2>
  <p class="sk-empty-state__body">
    No projects match <strong>“roadmap”</strong> in the <strong>Product</strong> team.
    Try a different search term, or clear the environment filter.
  </p>
  <div class="sk-empty-state__actions">
    <button type="button" class="sk-button sk-button--secondary">Clear all filters</button>
  </div>
</div>
<p class="sk-visually-hidden" role="status">0 results for cdn.</p>`,
    css: `.sk-empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--sk-space-12);
  min-inline-size: 0;
  padding: var(--sk-space-48) var(--sk-space-24);
  text-align: center;
}

.sk-empty-state__icon {
  /* currentColor keeps illustration art correct in both themes without a
     second asset. Flat raster art is not permitted here. */
  color: var(--sk-color-text-tertiary);
  fill: currentColor;
}

.sk-empty-state__heading {
  margin: 0;
  font-size: var(--sk-font-size-heading-md);
  line-height: var(--sk-line-height-heading-md);
  font-weight: var(--sk-font-weight-semibold);
  color: var(--sk-color-text-primary);
  text-wrap: balance;
}

.sk-empty-state__body {
  margin: 0;
  /* Capped for readability; the flex column keeps it centred at any width. */
  max-inline-size: 42ch;
  color: var(--sk-color-text-secondary);
  line-height: var(--sk-line-height-body-md);
  text-wrap: pretty;
}

.sk-empty-state__actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: var(--sk-space-12);
  margin-block-start: var(--sk-space-8);
}

.sk-empty-state--compact { padding: var(--sk-space-24) var(--sk-space-16); gap: var(--sk-space-8); }
.sk-empty-state--compact .sk-empty-state__heading { font-size: var(--sk-font-size-heading-sm); }

.sk-empty-state--error .sk-empty-state__icon { color: var(--sk-color-status-danger-text); }
.sk-empty-state--no-access .sk-empty-state__icon { color: var(--sk-color-text-tertiary); }
@media (forced-colors: active) {
  .sk-empty-state__icon { color: CanvasText; }
}
`,
    related: ['skeleton', 'alert', 'search-field', 'table'],
  },

  {
    id: 'status-indicator',
    name: 'Status indicator',
    category: 'feedback',
    status: 'stable',
    summary:
      'A compact dot-and-label pair showing the state of a resource. The label is not optional — a bare coloured dot is the canonical example of conveying meaning by colour alone.',
    whenToUse: ['Resource state in a table row or detail header.', 'Health of a service or connection.', 'Anything with a small vocabulary of states.'],
    whenNotToUse: ['A message about an event — use Alert or Toast.', 'A count or category — use Badge.'],
    anatomy: [
      { part: 'Dot', required: true, description: 'A filled circle, or a ring for pending states.' },
      { part: 'Label', required: true, description: 'The state, in words. Mandatory.' },
      { part: 'Detail', required: false, description: 'A timestamp or a reason.' },
    ],
    variants: [
      { name: 'Healthy', className: 'sk-status--success', description: 'Jade.', use: 'Applied, running, verified.' },
      { name: 'Warning', className: 'sk-status--warning', description: 'Amber.', use: 'Degraded, partial, expiring.' },
      { name: 'Danger', className: 'sk-status--danger', description: 'Crimson.', use: 'Failed, blocked, expired.' },
      { name: 'Pending', className: 'sk-status--pending', description: 'Azure, animated ring.', use: 'Queued, running, awaiting confirmation.' },
      { name: 'Neutral', className: 'sk-status--neutral', description: 'Grey.', use: 'Draft, archived, disabled, unknown.' },
    ],
    sizes: [
      { name: 'Small', className: 'sk-status--sm', height: '0.5rem dot', typeStyle: 'body-xs', description: 'Table rows.' },
      { name: 'Medium', className: '', height: '0.625rem dot', typeStyle: 'body-sm', description: 'Default.' },
    ],
    states: [
      { name: 'Static', description: 'Current state.', trigger: 'default' },
      { name: 'Changing', description: 'Change announced politely, not by the dot alone.', trigger: '[data-changed]' },
    ],
    props: [
      { name: 'status', type: "'success' | 'warning' | 'danger' | 'pending' | 'neutral'", required: true, description: 'Intent.' },
      { name: 'label', type: 'string', required: true, description: 'The state in words.' },
      { name: 'detail', type: 'string', description: 'Timestamp or reason.' },
    ],
    tokensUsed: ['color-status-success-solid', 'color-status-warning-solid', 'color-status-danger-solid', 'color-status-info-solid', 'color-status-neutral-solid', 'color-text-primary'],
    darkMode:
      'Status dots are graphical objects carrying meaning, so each solid token is audited at 3:1 against surface-base in every theme — including the neutral one, which is the easiest to get wrong because a mid-grey dot sits near the middle of both a light and a dark page. That is why status-neutral-solid uses neutral-600 in light and neutral-400 in dark rather than a single mid value.',
    accessibility: {
      role: 'Plain text with a decorative dot.',
      keyboard: [{ keys: 'n/a', action: 'Not interactive.' }],
      aria: [
        'The dot is aria-hidden. All meaning lives in the label.',
        'Announce state changes in a polite live region — a dot changing colour is silent.',
        'Use shape as well as colour where states are frequently compared: a ring for pending, a solid fill for settled states.',
      ],
      wcag: ['1.4.1 Use of Color — this component exists because of this criterion.', '1.4.11 Non-text Contrast.', '4.1.3 Status Messages.'],
      screenReader: 'Reads the label text: "Applied", "Failed, 2 minutes ago".',
      targetSize: 'Not interactive. When placed inside a link or button, that control owns the target size.',
    },
    content: [
      'One or two words in sentence case: "Applied", "Awaiting approval".',
      'Use a consistent vocabulary across the product; do not say "Running" in one place and "In progress" in another.',
      'Add a timestamp for states that change.',
    ],
    dos: ['Always show the label.', 'Announce changes politely.', 'Keep the state vocabulary small and documented.'],
    donts: ['Do not ship a dot without a label.', 'Do not use colour alone.', 'Do not invent new states per screen.'],
    html: `<span class="sk-status sk-status--success">
  <span class="sk-status__dot" aria-hidden="true"></span>
  <span class="sk-status__label">Applied</span>
  <span class="sk-status__detail">2 minutes ago</span>
</span>

<span class="sk-status sk-status--pending">
  <span class="sk-status__dot" aria-hidden="true"></span>
  <span class="sk-status__label">Awaiting approval</span>
</span>`,
    css: `.sk-status {
  display: inline-flex;
  align-items: baseline;
  gap: var(--sk-space-6);
  min-inline-size: 0;
  font-size: var(--sk-font-size-body-sm);
  color: var(--sk-color-text-primary);
}

.sk-status__dot {
  flex: 0 0 auto;
  inline-size: 0.625rem;
  block-size: 0.625rem;
  border-radius: var(--sk-radius-full);
  /* Translated down so it optically aligns with the text baseline. */
  translate: 0 -0.05em;
}

.sk-status__label { min-inline-size: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.sk-status__detail { flex: 0 0 auto; color: var(--sk-color-text-tertiary); font-size: var(--sk-font-size-body-xs); }

.sk-status--success .sk-status__dot { background-color: var(--sk-color-status-success-solid); }
.sk-status--warning .sk-status__dot { background-color: var(--sk-color-status-warning-solid); }
.sk-status--danger  .sk-status__dot { background-color: var(--sk-color-status-danger-solid); }
.sk-status--neutral .sk-status__dot { background-color: var(--sk-color-status-neutral-solid); }

/* Pending is a ring, not a fill: shape distinguishes it from settled states even
   for users who cannot separate the hues. */
.sk-status--pending .sk-status__dot {
  background-color: transparent;
  border: 2px solid var(--sk-color-status-info-solid);
  animation: sk-status-pulse 1.8s var(--sk-easing-standard) infinite;
}
@keyframes sk-status-pulse { 50% { opacity: 0.4; } }

.sk-status--sm { font-size: var(--sk-font-size-body-xs); }
.sk-status--sm .sk-status__dot { inline-size: 0.5rem; block-size: 0.5rem; }

@media (prefers-reduced-motion: reduce) {
  .sk-status--pending .sk-status__dot { animation: none; }
}

@media (forced-colors: active) {
  .sk-status__dot { forced-color-adjust: none; }
}`,
    related: ['badge', 'alert', 'table'],
  },

  /* ------------------------------------------------------------------ *
   * Meter
   * ------------------------------------------------------------------ */
  {
    id: 'meter',
    name: 'Meter',
    category: 'feedback',
    status: 'stable',
    summary:
      'A measurement within a known range: storage used, seats taken, budget spent. Not a progress bar — nothing is happening.',
    whenToUse: [
      'A quantity out of a capacity: 7.2 GB of 10 GB, 18 of 25 seats.',
      'A score or rating on a fixed scale.',
      'Anything with a threshold where crossing it matters.',
    ],
    whenNotToUse: [
      'A task in flight — that is a Progress bar. The distinction is real: progress always ends, a meter just is. Announcing a meter as progress makes a screen reader user wait for something to finish.',
      'A value with no meaningful maximum. Without a ceiling the bar length means nothing.',
      'A single figure with no range — use a Stat tile.',
    ],
    anatomy: [
      { part: 'Label', required: true, description: 'What is being measured.' },
      { part: 'Value text', required: true, description: 'The figure in words: "7.2 GB of 10 GB". The bar is the illustration, not the data.' },
      { part: 'Track', required: true, description: 'role="meter" with aria-valuenow, min, max.' },
      { part: 'Fill', required: true, description: 'The measured portion.' },
      { part: 'Threshold marker', required: false, description: 'A tick where a limit sits.' },
    ],
    variants: [
      { name: 'Default', className: 'sk-meter', description: 'Neutral fill.', use: 'A measurement with no judgement attached.' },
      { name: 'Graded', className: 'sk-meter--graded', description: 'Fill takes a status colour past each threshold.', use: 'Capacity, where nearly full is a warning and full is a problem.' },
      { name: 'Segmented', className: 'sk-meter--segmented', description: 'Discrete blocks rather than a continuous bar.', use: 'Small whole counts — 4 of 5 licences.' },
    ],
    sizes: [
      { name: 'Small', className: 'sk-meter--sm', height: '0.25rem', typeStyle: 'body-xs', description: 'In a table row or a list.' },
      { name: 'Medium', className: '', height: '0.5rem', typeStyle: 'body-sm', description: 'Default.' },
    ],
    states: [
      { name: 'Normal', description: 'Below every threshold.', trigger: 'default' },
      { name: 'Warning', description: 'Past the first threshold.', trigger: '[data-level="warning"]' },
      { name: 'Critical', description: 'Past the second, or at capacity.', trigger: '[data-level="critical"]' },
      { name: 'Empty', description: 'Zero. The track still shows, so the control does not vanish.', trigger: '[aria-valuenow="0"]' },
      { name: 'Over', description: 'Above the maximum. The bar clamps and the text tells the truth.', trigger: '[data-over]' },
    ],
    props: [
      { name: 'value', type: 'number', required: true, description: 'Current measurement.' },
      { name: 'min', type: 'number', default: '0', description: 'Range floor.' },
      { name: 'max', type: 'number', required: true, description: 'Range ceiling.' },
      { name: 'valueText', type: 'string', required: true, description: 'Human reading: "7.2 GB of 10 GB". Not a percentage on its own.' },
      { name: 'thresholds', type: '{ warning?: number; critical?: number }', description: 'Where the graded variant changes colour.' },
    ],
    tokensUsed: ['color-surface-sunken', 'color-action-primary-bg', 'color-status-warning-solid', 'color-status-danger-solid', 'color-text-primary', 'color-text-secondary'],
    darkMode:
      'The track is surface-sunken, which goes *darker* than the page on dark — a meter is a recess, and treating it as a raised element makes an empty meter look like a filled one. The status fills use the solid steps, which move up their ramps on dark so they stay at 3:1 against the darker track.',
    accessibility: {
      role: 'role="meter". Deliberately not role="progressbar" — progress implies a task that will finish, and assistive technology treats them differently.',
      keyboard: [
        { keys: 'None', action: 'A meter is not interactive and takes no focus. If a user can change it, it is a Slider.' },
      ],
      aria: [
        'aria-valuenow, aria-valuemin and aria-valuemax define the range.',
        'aria-valuetext carries the human reading. Without it a screen reader announces a bare number with no unit, which for "7.2 of 10" is nearly useless.',
        'aria-labelledby points at the visible label rather than duplicating it in aria-label.',
        'The graded variant sets a data attribute as well as a colour, so the level is not conveyed by hue alone.',
        'A meter that changes rarely is not a live region. Announcing every storage tick would be noise.',
      ],
      wcag: [
        '1.4.1 Use of Colour — the level must be readable from the text, not only from the fill colour.',
        '1.4.11 Non-text Contrast — the fill holds 3:1 against the track.',
        '4.1.2 Name, Role, Value',
      ],
      screenReader:
        'Announced as "Storage, meter, 7.2 GB of 10 GB". The valueText is what makes that a sentence rather than "72".',
      targetSize: 'Not interactive, so no target applies.',
    },
    content: [
      'Give both numbers: "18 of 25 seats", not "72%". A percentage hides the scale, and the scale is usually what the reader needs.',
      'Name the unit every time.',
      'Say what happens at the limit before it is reached: "2 seats left" beats a red bar with no explanation.',
    ],
    dos: [
      'Use role="meter", not progressbar.',
      'Always set aria-valuetext.',
      'Show the figures as text beside the bar.',
      'Pair the graded colour with a data attribute.',
    ],
    donts: [
      'Never use a meter for a running task.',
      'Never show only a percentage.',
      'Never rely on fill colour alone to say "nearly full".',
      'Never animate a meter as though it were filling up.',
    ],
    html: `<div class="sk-meter sk-meter--graded" data-level="warning">
  <div class="sk-meter__header">
    <span class="sk-meter__label" id="storage-label">Storage</span>
    <span class="sk-meter__value">7.2 GB of 10 GB</span>
  </div>
  <div class="sk-meter__track" role="meter"
       aria-labelledby="storage-label"
       aria-valuenow="7.2" aria-valuemin="0" aria-valuemax="10"
       aria-valuetext="7.2 gigabytes of 10 gigabytes used">
    <div class="sk-meter__fill" style="inline-size: 72%"></div>
  </div>
  <p class="sk-meter__note">2.8 GB left. Uploads stop at the limit.</p>
</div>`,
    css: `.sk-meter { display: flex; flex-direction: column; gap: var(--sk-space-4); }

.sk-meter__header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--sk-space-8);
  flex-wrap: wrap;
}
.sk-meter__label { font-size: var(--sk-font-size-body-sm); font-weight: var(--sk-font-weight-medium); color: var(--sk-color-text-primary); }
.sk-meter__value { font-size: var(--sk-font-size-body-sm); color: var(--sk-color-text-secondary); font-variant-numeric: tabular-nums; }

/* Sunken, not raised. An empty meter must read as an empty channel. */
.sk-meter__track {
  block-size: 0.5rem;
  background-color: var(--sk-color-surface-sunken);
  border-radius: var(--sk-radius-full);
  overflow: hidden;
}
.sk-meter__fill {
  block-size: 100%;
  background-color: var(--sk-color-action-primary-bg);
  border-radius: inherit;
}

.sk-meter--graded[data-level="warning"] .sk-meter__fill { background-color: var(--sk-color-status-warning-solid); }
.sk-meter--graded[data-level="critical"] .sk-meter__fill { background-color: var(--sk-color-status-danger-solid); }

.sk-meter__note { margin: 0; font-size: var(--sk-font-size-body-xs); color: var(--sk-color-text-secondary); }

.sk-meter--segmented .sk-meter__track { display: flex; gap: var(--sk-space-2); background: none; overflow: visible; }
.sk-meter__segment { flex: 1 1 0; block-size: 0.5rem; background-color: var(--sk-color-surface-sunken); border-radius: var(--sk-radius-sm); }
.sk-meter__segment[data-filled] { background-color: var(--sk-color-action-primary-bg); }

.sk-meter--sm .sk-meter__track { block-size: 0.25rem; }

@media (forced-colors: active) {
  /* Backgrounds are discarded, so the track needs an outline or the meter
     disappears entirely, and the fill needs a system colour to stay visible. */
  .sk-meter__track { outline: 1px solid CanvasText; }
  .sk-meter__fill { background-color: Highlight; }
  .sk-meter__segment { outline: 1px solid CanvasText; }
  .sk-meter__segment[data-filled] { background-color: Highlight; }
}`,
    related: ['progress', 'stat-tile', 'slider'],
  },

  /* ------------------------------------------------------------------ *
   * Loading screen
   * ------------------------------------------------------------------ */
  {
    id: 'loading-screen',
    name: 'Loading screen',
    category: 'feedback',
    status: 'stable',
    summary:
      'A whole page or region that has nothing to show yet. The only loading treatment that takes over the viewport, and the one most often reached for too early.',
    whenToUse: [
      'First paint of an application shell, before any route has resolved.',
      'A blocking operation the user must not interrupt — a payment being taken, a migration running.',
      'A region whose entire contents are pending and whose shape is unknown.',
    ],
    whenNotToUse: [
      'A route change where the shell is already correct. Replacing a working page with a spinner throws away context the user still needs, and makes a fast navigation feel slower than leaving the old content up.',
      'Anything whose shape you know — use a Skeleton, which reserves the space so nothing jumps.',
      'A single control acting — use a busy button.',
      'Waits under about 300ms. A flash of spinner reads as a fault, not as progress.',
    ],
    anatomy: [
      { part: 'Region', required: true, description: 'aria-busy="true" on the container being replaced.' },
      { part: 'Indicator', required: true, description: 'A spinner, or a progress bar when the total is known.' },
      { part: 'Message', required: true, description: 'What is loading. "Loading" alone tells nobody anything.' },
      { part: 'Slow notice', required: false, description: 'Appears after several seconds, acknowledging the wait and offering a way out.' },
      { part: 'Cancel', required: false, description: 'Wherever the operation can be abandoned safely.' },
    ],
    variants: [
      { name: 'Region', className: 'sk-loading', description: 'Fills its container.', use: 'A panel or a card whose content is pending.' },
      { name: 'Page', className: 'sk-loading--page', description: 'Fills the viewport.', use: 'Application boot only.' },
      { name: 'Blocking', className: 'sk-loading--blocking', description: 'Over a scrim, with focus held.', use: 'An operation that must not be interrupted. Rare, and worth resisting.' },
    ],
    sizes: [
      { name: 'Small', className: 'sk-loading--sm', height: 'auto', typeStyle: 'body-sm', description: 'Inside a card.' },
      { name: 'Medium', className: '', height: 'auto', typeStyle: 'body-md', description: 'Default.' },
    ],
    states: [
      { name: 'Loading', description: 'Indicator turning, message shown.', trigger: '[aria-busy="true"]' },
      { name: 'Slow', description: 'After ~5s an acknowledgement appears. Silence past that point reads as a hang.', trigger: '[data-slow]' },
      { name: 'Failed', description: 'Replaced by an error state, never left spinning. A spinner that never resolves is the worst outcome of all.', trigger: 'replaced' },
    ],
    props: [
      { name: 'label', type: 'string', required: true, description: 'What is loading. Specific.' },
      { name: 'progress', type: 'number', description: 'Where the total is known, renders a determinate bar instead of a spinner.' },
      { name: 'slowAfter', type: 'number', default: '5000', description: 'Milliseconds before the slow notice.' },
      { name: 'onCancel', type: '() => void', description: 'Shows a cancel control.' },
    ],
    tokensUsed: ['color-surface-base', 'color-surface-scrim', 'color-text-primary', 'color-text-secondary', 'color-action-primary-bg'],
    darkMode:
      'The page variant uses surface-base rather than a darker "loading" shade, so first paint matches the app that replaces it — a loading screen a shade off from the real page produces a visible flash at the exact moment the user is judging speed. The blocking scrim is surface-scrim, which on dark is a heavier alpha, because a light-mode scrim over a dark page barely reads.',
    accessibility: {
      role: 'aria-busy on the region, plus one polite status message. Not an alert: loading is not an emergency.',
      keyboard: [
        { keys: 'Tab', action: 'Blocking variant only: focus is held inside, so Tab cannot reach the frozen page behind.' },
        { keys: 'Escape', action: 'Cancels, where cancelling is safe.' },
      ],
      aria: [
        'aria-busy="true" on the container, removed when content arrives.',
        'One visually hidden role="status" carrying the message. The spinner itself is aria-hidden — announcing a rotating shape adds nothing.',
        'The message is announced once, not on every frame.',
        'Arrival is announced too. A screen reader user who hears "Loading projects" and then silence has no way to know it finished.',
        'The blocking variant traps focus; the others do not, because the rest of the page still works.',
      ],
      wcag: [
        '4.1.3 Status Messages — both the start and the end of the wait.',
        '2.2.1 Timing Adjustable — nothing may time out silently.',
        '2.3.1 Three Flashes — spinners never exceed 3Hz.',
        '1.4.13 Content on Hover or Focus',
      ],
      screenReader:
        'Hears "Loading projects" once, then the content when it arrives. Not a per-frame percentage: a determinate bar updates aria-valuenow but only announces at meaningful intervals.',
      targetSize: 'A cancel control is 24x24 CSS px minimum.',
    },
    content: [
      'Name what is loading: "Loading your projects", not "Loading" and never "Please wait".',
      'The slow notice acknowledges rather than apologises: "Still working — larger workspaces take longer." A cheerful message on a long wait reads as mockery.',
      'Never promise a time you cannot keep. "Almost done" that lasts a minute destroys trust in every later estimate.',
    ],
    dos: [
      'Prefer a Skeleton wherever the shape is known.',
      'Announce arrival as well as departure.',
      'Show something different after several seconds.',
      'Always have a failure path — never leave a spinner running forever.',
    ],
    donts: [
      'Never replace a working page on a route change.',
      'Never show one for a wait under about 300ms.',
      'Never use role="alert".',
      'Never block the whole viewport for something that could load in place.',
    ],
    html: `<div class="sk-loading" aria-busy="true">
  <span class="sk-spinner sk-spinner--lg" aria-hidden="true"></span>
  <p class="sk-loading__label">Loading your projects…</p>
  <!-- One polite announcement, not one per frame. -->
  <p class="sk-visually-hidden" role="status">Loading your projects</p>

  <!-- Appears after ~5s. Silence past that point reads as a hang. -->
  <div class="sk-loading__slow" hidden data-slow-notice>
    <p class="sk-loading__slow-text">Still working — larger workspaces take longer.</p>
    <button type="button" class="sk-button sk-button--secondary sk-button--sm">Cancel</button>
  </div>
</div>`,
    css: `.sk-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--sk-space-12);
  padding: var(--sk-space-48) var(--sk-space-16);
  min-block-size: 12rem;
  text-align: center;
}
.sk-loading__label { margin: 0; color: var(--sk-color-text-secondary); }

.sk-loading__slow {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--sk-space-8);
}
.sk-loading__slow-text { margin: 0; font-size: var(--sk-font-size-body-sm); color: var(--sk-color-text-tertiary); }

/* Page variant uses surface-base, not a dimmer "loading" shade: a loading
   screen a shade off from the real page flashes at exactly the moment the
   user is judging how fast the app is. */
.sk-loading--page {
  position: fixed;
  inset: 0;
  z-index: var(--sk-z-modal);
  background-color: var(--sk-color-surface-base);
  min-block-size: 100dvh;
}

.sk-loading--blocking {
  position: fixed;
  inset: 0;
  z-index: var(--sk-z-modal);
  background-color: var(--sk-color-surface-scrim);
}
.sk-loading--blocking .sk-loading__label { color: var(--sk-color-text-on-inverse); }

.sk-loading--sm { min-block-size: 6rem; padding: var(--sk-space-24) var(--sk-space-16); }

@media (forced-colors: active) {
  .sk-loading--page,
  .sk-loading--blocking { background-color: Canvas; }
  .sk-loading--blocking .sk-loading__label { color: CanvasText; }
}`,
    related: ['spinner', 'skeleton', 'progress', 'empty-state'],
  },

  /* ------------------------------------------------------------------ *
   * Error page
   * ------------------------------------------------------------------ */
  {
    id: 'error-page',
    name: 'Error page',
    category: 'feedback',
    status: 'stable',
    summary:
      'A whole page that could not be produced: 404, 403, 500. The last thing between a user and the back button, so it has to offer a route forward.',
    whenToUse: [
      'A URL that does not resolve.',
      'A page the user is not permitted to see.',
      'A server failure that prevented the page being rendered at all.',
      'A maintenance window.',
    ],
    whenNotToUse: [
      'A failure confined to one region — use an Error boundary, so everything that did load stays usable.',
      'A form that failed validation — use the error summary. Replacing a filled-in form with an error page destroys the work.',
      'A search returning nothing — that is an Empty state, and nothing went wrong.',
      'A permission problem that is expected. If most users hit it, it is a normal state and belongs in the flow.',
    ],
    anatomy: [
      { part: 'Heading', required: true, description: 'What happened, in the user\'s terms. The status code is not the heading.' },
      { part: 'Explanation', required: true, description: 'Why, and whether it is likely to be their doing or ours.' },
      { part: 'Actions', required: true, description: 'At least one route forward. A dead end is what generates support tickets.' },
      { part: 'Reference', required: false, description: 'A correlation ID for support. Selectable text, never an image.' },
      { part: 'Status code', required: false, description: 'Secondary, for the people who find it useful.' },
    ],
    variants: [
      { name: 'Not found', className: 'sk-error-page--not-found', description: '404.', use: 'A URL that does not resolve.' },
      { name: 'Forbidden', className: 'sk-error-page--forbidden', description: '403.', use: 'Signed in, but not permitted. Say who can grant access.' },
      { name: 'Server', className: 'sk-error-page--server', description: '500.', use: 'Our fault. Say so, and give a reference.' },
      { name: 'Offline', className: 'sk-error-page--offline', description: 'No connection.', use: 'Say what still works offline, if anything does.' },
    ],
    sizes: [
      { name: 'Medium', className: '', height: 'auto', typeStyle: 'body-md', description: 'The only size. An error page is not a component to tune.' },
    ],
    states: [
      { name: 'Static', description: 'Present on load. No role="alert" — the user navigated here, so announcing it is redundant.', trigger: 'default' },
      { name: 'Retrying', description: 'The retry control shows a busy state rather than appearing to do nothing.', trigger: '[aria-busy="true"]' },
    ],
    props: [
      { name: 'kind', type: "'not-found' | 'forbidden' | 'server' | 'offline'", required: true, description: 'Which failure.' },
      { name: 'heading', type: 'string', required: true, description: 'Plain-language summary.' },
      { name: 'body', type: 'string', required: true, description: 'Why, and what it means for them.' },
      { name: 'reference', type: 'string', description: 'Correlation ID.' },
      { name: 'actions', type: 'Array<{label, href, primary?}>', required: true, description: 'At least one.' },
    ],
    tokensUsed: ['color-surface-base', 'color-text-primary', 'color-text-secondary', 'color-text-tertiary', 'color-status-danger-text'],
    darkMode:
      'The illustration and icon use text-tertiary rather than a status colour: a full page of danger red is alarming out of proportion to a mistyped URL. Only the server-failure variant tints its icon, and it uses status-danger-text, which steps lighter on dark to hold 4.5:1.',
    accessibility: {
      role: 'A normal page with a single h1. Deliberately not role="alert" — the user navigated here deliberately, and an alert would interrupt a screen reader mid-announcement to say what the heading already says.',
      keyboard: [
        { keys: 'Tab', action: 'Reaches every action. The primary action is first in DOM order.' },
      ],
      aria: [
        'The heading is the page h1 and the document title, so a screen reader user knows where they are from the title alone.',
        'The status code is supplementary, not the accessible name.',
        'A correlation ID is real selectable text so it can be copied. An image of an ID cannot be read out or pasted.',
        'The icon is decorative and aria-hidden.',
      ],
      wcag: [
        '2.4.2 Page Titled — the title says what went wrong, not just the product name.',
        '1.3.1 Info and Relationships',
        '2.4.4 Link Purpose — "Back to projects", not "click here".',
        '3.3.1 Error Identification',
      ],
      screenReader:
        'The document title announces the failure on arrival. The heading repeats it, the body explains it, and the actions are reachable in one Tab.',
      targetSize: 'Actions are full-size buttons.',
    },
    content: [
      'The heading is what happened, not the code: "We cannot find that page", not "404 Not Found".',
      'Say whose fault it is. For a 500, "Something went wrong at our end" is honest and stops the user re-checking their own input.',
      'Never blame the user for a URL they followed from inside the product.',
      'Give a real route forward, and make it specific — "Back to projects" beats "Go home".',
      'Skip the joke. Someone reading this is already blocked.',
    ],
    dos: [
      'Offer at least one route forward.',
      'Give a correlation ID for server failures.',
      'Set the document title to the failure.',
      'Say who can grant access on a 403.',
    ],
    donts: [
      'Never use role="alert" on a page the user navigated to.',
      'Never show a stack trace or an internal identifier.',
      'Never make the status code the heading.',
      'Never leave the user with no link at all.',
    ],
    html: `<main class="sk-error-page" id="main">
  <svg class="sk-error-page__icon" aria-hidden="true" focusable="false" width="48" height="48"><use href="#sk-icon-search" /></svg>

  <!-- What happened, not the status code. -->
  <h1 class="sk-error-page__heading">We cannot find that page</h1>
  <p class="sk-error-page__body">
    The link may be out of date, or the project may have been deleted. Your other
    projects are unaffected.
  </p>

  <div class="sk-error-page__actions">
    <a class="sk-button sk-button--primary" href="/projects">Back to projects</a>
    <a class="sk-link" href="/search">Search instead</a>
  </div>

  <!-- Real, selectable text. An image of a reference cannot be copied or read out. -->
  <p class="sk-error-page__reference">
    Reference <code class="sk-code">7f3a-91bc</code> · Status 404
  </p>
</main>`,
    css: `.sk-error-page {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--sk-space-16);
  min-block-size: 60dvh;
  padding: var(--sk-space-48) var(--sk-space-16);
  text-align: center;
}

/* Tertiary, not a status colour. A full page of danger red is out of all
   proportion to a mistyped URL. */
.sk-error-page__icon { color: var(--sk-color-text-tertiary); fill: currentColor; }
.sk-error-page--server .sk-error-page__icon { color: var(--sk-color-status-danger-text); }

.sk-error-page__heading {
  margin: 0;
  font-size: var(--sk-font-size-heading-xl);
  line-height: var(--sk-line-height-heading-xl);
  font-weight: var(--sk-font-weight-bold);
  color: var(--sk-color-text-primary);
  max-inline-size: var(--sk-container-prose);
}
.sk-error-page__body {
  margin: 0;
  color: var(--sk-color-text-secondary);
  max-inline-size: var(--sk-container-prose);
}
.sk-error-page__actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: var(--sk-space-12);
}
.sk-error-page__reference {
  margin: 0;
  font-size: var(--sk-font-size-body-xs);
  color: var(--sk-color-text-tertiary);
}

@media (forced-colors: active) {
  .sk-error-page__icon { color: CanvasText; }
}`,
    related: ['empty-state', 'error-boundary', 'alert'],
  },

  /* ------------------------------------------------------------------ *
   * Error boundary
   * ------------------------------------------------------------------ */
  {
    id: 'error-boundary',
    name: 'Error boundary',
    category: 'feedback',
    status: 'stable',
    summary:
      'One region that failed inside a page that did not. Contains the damage, so everything that loaded correctly stays usable.',
    whenToUse: [
      'A widget, panel or card whose data failed to load.',
      'A component that threw while rendering.',
      'A third-party embed that did not come back.',
      'Any part of a dashboard that can fail independently of the rest.',
    ],
    whenNotToUse: [
      'A failure that makes the whole page meaningless — use an Error page.',
      'An expected empty result — that is an Empty state.',
      'A form validation failure — that is the error summary.',
      'Around every component indiscriminately. A page of eight identical "Something went wrong" boxes tells the user nothing about what is actually broken.',
    ],
    anatomy: [
      { part: 'Container', required: true, description: 'Replaces the failed region and keeps its footprint, so the layout does not jump.' },
      { part: 'Heading', required: true, description: 'Names the region that failed — "Activity could not be loaded", not "Error".' },
      { part: 'Explanation', required: true, description: 'What is unaffected. This is what stops the user distrusting the whole page.' },
      { part: 'Retry', required: true, description: 'Retries this region alone, not the page.' },
      { part: 'Reference', required: false, description: 'Correlation ID.' },
    ],
    variants: [
      { name: 'Inline', className: 'sk-error-boundary', description: 'Fills the failed region.', use: 'Default.' },
      { name: 'Compact', className: 'sk-error-boundary--compact', description: 'One line with a retry.', use: 'A small widget where a full block would dominate.' },
      { name: 'Degraded', className: 'sk-error-boundary--degraded', description: 'Stale content kept, with a notice above it.', use: 'A refresh failed but the previous data is still worth showing. Say how old it is.' },
    ],
    sizes: [
      { name: 'Small', className: 'sk-error-boundary--sm', height: 'auto', typeStyle: 'body-sm', description: 'Inside a card.' },
      { name: 'Medium', className: '', height: 'auto', typeStyle: 'body-md', description: 'Default.' },
    ],
    states: [
      { name: 'Failed', description: 'Replaces the region.', trigger: 'default' },
      { name: 'Retrying', description: 'The retry control is busy; the message stays so the user knows what is being retried.', trigger: '[aria-busy="true"]' },
      { name: 'Failed again', description: 'Says the retry did not work rather than silently resetting, and offers a different route.', trigger: '[data-retries]' },
      { name: 'Degraded', description: 'Stale content shown with its age stated.', trigger: '[data-stale]' },
    ],
    props: [
      { name: 'region', type: 'string', required: true, description: 'What failed, in the user\'s words.' },
      { name: 'onRetry', type: '() => void', description: 'Retries this region only.' },
      { name: 'reference', type: 'string', description: 'Correlation ID.' },
      { name: 'stale', type: 'boolean', default: 'false', description: 'Keep the previous content below the notice.' },
    ],
    tokensUsed: ['color-status-danger-surface', 'color-status-danger-border', 'color-status-danger-text', 'color-text-secondary', 'color-surface-base'],
    darkMode:
      'The tinted surface is status-danger-surface, the 950 step on dark rather than a darkened 50 — a darkened light tint reads as brown and stops looking like a warning. The border is what defines the box on dark, where a 950 tint on a 900 surface has almost no edge.',
    accessibility: {
      role: 'role="alert" when the failure happens after load, because the user did something and this is the answer. Plain markup when it is present on first paint — announcing a failure the user did not cause interrupts them to report something they were not waiting for.',
      keyboard: [
        { keys: 'Tab', action: 'Reaches the retry control. Focus is not moved automatically — a region failing elsewhere on the page must not steal focus from what the user is doing.' },
      ],
      aria: [
        'role="alert" only for a failure that follows a user action.',
        'The heading names the region, so several boundaries on one page are distinguishable by ear.',
        'aria-busy on the container while retrying.',
        'A second failure changes the message. Resetting to the identical text makes the retry look like it did nothing.',
        'The degraded variant states the age of what is shown, so nobody acts on stale data believing it current.',
      ],
      wcag: [
        '4.1.3 Status Messages',
        '3.3.1 Error Identification',
        '2.4.3 Focus Order — the boundary must not take focus from elsewhere.',
        '1.4.1 Use of Colour — the failure is stated in text, not implied by a red border.',
      ],
      screenReader:
        'Announced as "Activity could not be loaded. The activity service did not respond. Everything else on this page is up to date." Naming the region is what makes several failures on one page distinguishable.',
      targetSize: 'The retry control is a full-size button.',
    },
    content: [
      'Name the region: "Activity could not be loaded", never a bare "Something went wrong".',
      'Say what still works. "Everything else on this page is up to date" is the sentence that stops the user reloading and losing their place.',
      'On a second failure, say so and offer something else — reloading, or support with the reference.',
      'Never expose the exception. "Cannot read property of undefined" helps nobody who is reading it.',
    ],
    dos: [
      'Keep the failed region\'s footprint so the layout does not jump.',
      'Retry the region, not the page.',
      'Name what failed and what did not.',
      'Change the message when a retry fails.',
    ],
    donts: [
      'Never wrap every component in one indiscriminately.',
      'Never move focus into a boundary the user did not trigger.',
      'Never show a stack trace.',
      'Never leave stale content on screen without saying how old it is.',
    ],
    html: `<!-- role="alert" because this failure followed a user action. A boundary
     present on first paint uses plain markup instead. -->
<div class="sk-error-boundary" role="alert">
  <svg class="sk-error-boundary__icon" aria-hidden="true" focusable="false" width="20" height="20"><use href="#sk-icon-warning" /></svg>
  <div class="sk-error-boundary__content">
    <h3 class="sk-error-boundary__heading">Activity could not be loaded</h3>
    <p class="sk-error-boundary__body">
      The activity service did not respond within 10 seconds.
      Everything else on this page is up to date.
    </p>
    <div class="sk-error-boundary__actions">
      <button type="button" class="sk-button sk-button--secondary sk-button--sm">
        <svg class="sk-button__icon" aria-hidden="true" focusable="false" width="16" height="16"><use href="#sk-icon-refresh" /></svg>
        <span class="sk-button__label">Try again</span>
      </button>
      <span class="sk-error-boundary__reference">Reference <code class="sk-code">7f3a-91bc</code></span>
    </div>
  </div>
</div>`,
    css: `.sk-error-boundary {
  display: flex;
  align-items: flex-start;
  gap: var(--sk-space-12);
  padding: var(--sk-space-16);
  background-color: var(--sk-color-status-danger-surface);
  /* The border is what defines the box on dark, where a 950 tint sits on a
     900 surface and has almost no edge of its own. */
  border: var(--sk-border-width-hairline) solid var(--sk-color-status-danger-border);
  border-radius: var(--sk-radius-md);
}
.sk-error-boundary__icon { flex: 0 0 auto; color: var(--sk-color-status-danger-text); fill: currentColor; }
.sk-error-boundary__content { flex: 1 1 auto; min-inline-size: 0; display: flex; flex-direction: column; gap: var(--sk-space-8); }

.sk-error-boundary__heading {
  margin: 0;
  font-size: var(--sk-font-size-body-md);
  font-weight: var(--sk-font-weight-semibold);
  color: var(--sk-color-status-danger-text);
}
.sk-error-boundary__body { margin: 0; color: var(--sk-color-text-secondary); font-size: var(--sk-font-size-body-sm); }

.sk-error-boundary__actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--sk-space-12);
}
.sk-error-boundary__reference { font-size: var(--sk-font-size-body-xs); color: var(--sk-color-text-tertiary); }

.sk-error-boundary--compact { padding: var(--sk-space-8) var(--sk-space-12); align-items: center; }
.sk-error-boundary--compact .sk-error-boundary__content { flex-direction: row; align-items: center; }

/* Degraded keeps the stale content below the notice, so the failure is a
   band rather than a replacement. */
.sk-error-boundary--degraded {
  background-color: var(--sk-color-surface-base);
  border-color: var(--sk-color-border-default);
}
.sk-error-boundary--degraded .sk-error-boundary__icon { color: var(--sk-color-status-warning-text); }
.sk-error-boundary--degraded .sk-error-boundary__heading { color: var(--sk-color-text-primary); }

.sk-error-boundary--sm { padding: var(--sk-space-12); }

@media (forced-colors: active) {
  .sk-error-boundary { border-color: CanvasText; }
  .sk-error-boundary__icon,
  .sk-error-boundary__heading { color: CanvasText; }
}`,
    related: ['alert', 'empty-state', 'error-page', 'loading-screen'],
  },
];
