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
}`,
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
.sk-inline-message--danger  { color: var(--sk-color-status-danger-text); }`,
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
}`,
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
}`,
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
@keyframes sk-skeleton-pulse { 50% { opacity: 0.6; } }`,
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
.sk-empty-state--no-access .sk-empty-state__icon { color: var(--sk-color-text-tertiary); }`,
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
];
