import type { ComponentSpec } from './types.js';

export const overlayComponents: ComponentSpec[] = [
  {
    id: 'dialog',
    name: 'Dialog',
    category: 'overlay',
    status: 'stable',
    summary:
      'A modal window that interrupts the user to get a decision or a short piece of input. Built on the native <dialog> element, which gives focus trapping, inertness and top-layer stacking for free.',
    whenToUse: [
      'Confirming a destructive or irreversible action.',
      'A short focused task that would lose context if it navigated away.',
      'Content that genuinely must be dealt with before continuing.',
    ],
    whenNotToUse: [
      'Long or multi-step forms — use a full page, where the user can scroll, save and come back.',
      'Non-critical information — use an Alert or Toast.',
      'Anything the user might want to reference while working elsewhere — use a Drawer or Popover.',
      'Stacking a second dialog on the first. If you need that, the flow is wrong.',
    ],
    anatomy: [
      { part: 'Backdrop', required: true, description: '::backdrop scrim dimming and inerting the page.' },
      { part: 'Container', required: true, description: 'The dialog surface, sized to content up to a maximum.' },
      { part: 'Header', required: true, description: 'A title that is the accessible name, plus a close button.' },
      { part: 'Body', required: true, description: 'Scrollable content region.' },
      { part: 'Footer', required: true, description: 'Actions, with the primary one last in reading order.' },
    ],
    variants: [
      { name: 'Standard', className: 'sk-dialog', description: 'Centred, medium width.', use: 'Most cases.' },
      { name: 'Confirmation', className: 'sk-dialog--confirm', description: 'Narrow, with an intent icon.', use: 'Yes/no decisions.' },
      { name: 'Destructive', className: 'sk-dialog--destructive', description: 'Danger-styled confirm button and, for high-impact actions, a typed confirmation.', use: 'Irreversible deletions.' },
      { name: 'Full screen', className: 'sk-dialog--full', description: 'Fills the viewport.', use: 'Narrow viewports, where a centred dialog is cramped.' },
    ],
    sizes: [
      { name: 'Small', className: 'sk-dialog--sm', height: 'auto', typeStyle: 'body-md', description: '24rem. Confirmations.' },
      { name: 'Medium', className: '', height: 'auto', typeStyle: 'body-md', description: '32rem. Default.' },
      { name: 'Large', className: 'sk-dialog--lg', height: 'auto', typeStyle: 'body-md', description: '48rem. Content-heavy dialogs.' },
    ],
    states: [
      { name: 'Closed', description: 'Not rendered in the top layer.', trigger: 'default' },
      { name: 'Open', description: 'Modal, page inert, focus moved inside.', trigger: '[open]' },
      { name: 'Body scrolling', description: 'Header and footer stay fixed while the body scrolls, with a visible boundary.', trigger: '[data-scrollable]' },
      { name: 'Submitting', description: 'Primary action busy; close is still available.', trigger: '[data-busy]' },
      { name: 'Dirty', description: 'Has unsaved changes; dismissal asks for confirmation.', trigger: '[data-dirty]' },
    ],
    props: [
      { name: 'title', type: 'string', required: true, description: 'The accessible name and the visible heading.' },
      { name: 'size', type: "'sm' | 'md' | 'lg' | 'full'", default: "'md'", description: 'Width.' },
      { name: 'dismissible', type: 'boolean', default: 'true', description: 'Whether Escape and the backdrop close it. Set false only for genuinely blocking decisions.' },
      { name: 'confirmPhrase', type: 'string', description: 'Requires the user to type this exact phrase before the destructive action enables.' },
    ],
    tokensUsed: ['color-surface-overlay', 'color-surface-scrim', 'color-border-default', 'elevation-4', 'z-dialog', 'radius-xl'],
    darkMode:
      'The scrim deepens from 48% to 64% black on dark. This is not cosmetic: the purpose of a scrim is to establish that the page behind is inactive, and a 48% scrim over an already-dark page produces almost no perceived change. The dialog surface uses surface-overlay (lighter than the page) plus a border, since elevation-4’s shadow contributes very little against a dark backdrop.',
    accessibility: {
      role: 'Native <dialog> opened with showModal(). Do not hand-roll role="dialog" on a div — you lose the top layer, inertness and the backdrop.',
      keyboard: [
        { keys: 'Escape', action: 'Closes. Native behaviour. For a dirty dialog, intercept the cancel event and confirm rather than blocking Escape entirely.' },
        { keys: 'Tab / Shift+Tab', action: 'Cycles within the dialog. The native modal traps focus.' },
        { keys: 'Enter', action: 'Submits the dialog form, when there is one.' },
      ],
      aria: [
        'aria-labelledby pointing at the title. A dialog with no accessible name is announced as just "dialog".',
        'aria-describedby pointing at the body when the body is a short explanation.',
        'showModal() makes the rest of the page inert automatically; open() does not.',
        'Move initial focus to the first interactive element, or the title if the content is long. For destructive dialogs, focus the *safe* option, never the destructive one.',
        'Restore focus to the invoking element on close — native <dialog> does this, but only if the invoker still exists.',
        'A dirty dialog must not silently discard work on Escape.',
      ],
      wcag: [
        '2.1.2 No Keyboard Trap — the trap is intentional and Escape always releases it.',
        '2.4.3 Focus Order.',
        '2.4.11 Focus Not Obscured.',
        '3.2.1 On Focus.',
        '4.1.2 Name, Role, Value.',
      ],
      screenReader: 'Announced as "<title>, dialog". Content outside is not reachable while modal.',
      targetSize: 'Actions and close meet minimums.',
    },
    content: [
      'The title states the decision as a question or a noun phrase: "Delete Website redesign?"',
      'The body states the consequence, including what cannot be undone and what else is affected.',
      'The confirm button repeats the specific action: "Delete project", never "OK" or "Yes".',
      'The cancel button is "Cancel". Do not get clever.',
      'Quantify the impact: "This will remove 128 records. This cannot be undone."',
    ],
    dos: [
      'Focus the safe option in a destructive dialog.',
      'Require a typed phrase for very high-impact deletions.',
      'Keep the dialog short enough that the footer is visible without scrolling.',
      'Confirm before discarding unsaved changes.',
    ],
    donts: [
      'Do not stack dialogs.',
      'Do not put a long form in a dialog.',
      'Do not block Escape outright.',
      'Do not use a dialog for something a Toast with Undo would handle better.',
    ],
    html: `<dialog class="sk-dialog sk-dialog--destructive sk-dialog--sm" id="delete-project" aria-labelledby="delete-project-title">
  <form method="dialog" class="sk-dialog__panel">
    <header class="sk-dialog__header">
      <h2 class="sk-dialog__title" id="delete-project-title">Delete Website redesign?</h2>
      <button type="button" class="sk-icon-button sk-icon-button--sm" data-sk-dialog-close>
        <svg aria-hidden="true" focusable="false" width="16" height="16"><use href="#sk-icon-close" /></svg>
        <span class="sk-visually-hidden">Close dialog</span>
      </button>
    </header>

    <div class="sk-dialog__body">
      <p>
        This removes <strong>128 records</strong> and cannot be undone. Any service
        everyone assigned to it will lose access immediately.
      </p>
      <div class="sk-field">
        <label class="sk-field__label" for="confirm-phrase">Type <code class="sk-code">Website redesign</code> to confirm</label>
        <input class="sk-input sk-input--mono" id="confirm-phrase" type="text" autocomplete="off" />
      </div>
    </div>

    <footer class="sk-dialog__footer">
      <!-- Safe option is focused first, and comes first in the DOM. -->
      <button type="submit" value="cancel" class="sk-button sk-button--secondary" autofocus>Cancel</button>
      <button type="submit" value="confirm" class="sk-button sk-button--danger" disabled>Delete project</button>
    </footer>
  </form>
</dialog>`,
    css: `.sk-dialog {
  /* Native <dialog> gives us the top layer, focus trapping and page inertness.
     Hand-rolling role="dialog" on a div loses all three. */
  padding: 0;
  border: none;
  background: transparent;
  max-inline-size: min(32rem, calc(100vw - var(--sk-space-32)));
  max-block-size: min(48rem, calc(100dvh - var(--sk-space-32)));
  inline-size: 100%;
  color: var(--sk-color-text-primary);
}

/* 64% on dark vs 48% on light: a 48% scrim over an already-dark page produces
   almost no perceived change, so the page would not read as inactive. */
.sk-dialog::backdrop { background-color: var(--sk-color-surface-scrim); }

.sk-dialog__panel {
  display: flex;
  flex-direction: column;
  min-inline-size: 0;
  max-block-size: inherit;
  background-color: var(--sk-color-surface-overlay);
  /* The border does the separating work on dark, where the shadow barely shows. */
  border: var(--sk-border-width-hairline) solid var(--sk-color-border-default);
  border-radius: var(--sk-radius-xl);
  box-shadow: var(--sk-elevation-4);
  overflow: hidden;
}

.sk-dialog__header {
  display: flex;
  align-items: flex-start;
  gap: var(--sk-space-12);
  flex: 0 0 auto;
  padding: var(--sk-space-20) var(--sk-space-20) var(--sk-space-12);
}

.sk-dialog__title {
  flex: 1 1 auto;
  min-inline-size: 0;
  margin: 0;
  font-size: var(--sk-font-size-heading-md);
  line-height: var(--sk-line-height-heading-md);
  font-weight: var(--sk-font-weight-semibold);
  text-wrap: balance;
}

/* Body scrolls; header and footer stay put, so the actions are always reachable. */
.sk-dialog__body {
  flex: 1 1 auto;
  min-block-size: 0;
  min-inline-size: 0;
  padding: 0 var(--sk-space-20) var(--sk-space-20);
  overflow-y: auto;
  overscroll-behavior: contain;
  display: flex;
  flex-direction: column;
  gap: var(--sk-space-16);
}
.sk-dialog__body > p { margin: 0; line-height: var(--sk-line-height-body-md); }

.sk-dialog__footer {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: var(--sk-space-8);
  flex: 0 0 auto;
  padding: var(--sk-space-16) var(--sk-space-20);
  border-block-start: var(--sk-border-width-hairline) solid var(--sk-color-border-subtle);
  background-color: var(--sk-color-surface-overlay);
}
.sk-dialog__footer > .sk-button { flex: 0 1 auto; }

.sk-dialog--sm { max-inline-size: min(24rem, calc(100vw - var(--sk-space-32))); }
.sk-dialog--lg { max-inline-size: min(48rem, calc(100vw - var(--sk-space-32))); }

/* Full-screen, either by request or because the viewport is too narrow for a
   centred dialog to have any margin left. */
.sk-dialog--full {
  max-inline-size: 100vw;
  max-block-size: 100dvh;
  block-size: 100dvh;
}
.sk-dialog--full .sk-dialog__panel {
  border-radius: 0;
  border: none;
  block-size: 100dvh;
}

@media (max-width: 30rem) {
  .sk-dialog {
    max-inline-size: 100vw;
    max-block-size: 100dvh;
    block-size: 100dvh;
  }
  .sk-dialog__panel { border-radius: 0; border: none; block-size: 100dvh; }
}

@media (prefers-reduced-motion: no-preference) {
  .sk-dialog[open] { animation: sk-dialog-in var(--sk-duration-normal) var(--sk-easing-entrance); }
  .sk-dialog[open]::backdrop { animation: sk-fade var(--sk-duration-normal) var(--sk-easing-entrance); }
}
@keyframes sk-dialog-in { from { opacity: 0; scale: 0.97; translate: 0 var(--sk-space-8); } }
@keyframes sk-fade { from { opacity: 0; } }`,
    related: ['drawer', 'alert', 'button', 'toast'],
  },

  {
    id: 'drawer',
    name: 'Drawer',
    category: 'overlay',
    status: 'stable',
    summary:
      'A panel sliding in from an edge. Comes in two genuinely different flavours: modal (blocks the page, like a dialog) and inline (sits beside the content and leaves it usable).',
    whenToUse: [
      'Inspecting a record without losing the list behind it.',
      'Filters and settings that are adjusted repeatedly.',
      'Navigation on narrow viewports.',
    ],
    whenNotToUse: [
      'A decision that must be made now — use a Dialog.',
      'Primary content. If a drawer holds the main work, it should be a page.',
      'Deeply nested drawers.',
    ],
    anatomy: [
      { part: 'Backdrop', required: false, description: 'Present for modal drawers only.' },
      { part: 'Panel', required: true, description: 'The sliding surface, anchored to an inline or block edge.' },
      { part: 'Header', required: true, description: 'Title and close button.' },
      { part: 'Body', required: true, description: 'Scrollable content.' },
      { part: 'Footer', required: false, description: 'Actions.' },
      { part: 'Resize handle', required: false, description: 'For inline drawers whose width the user may want to adjust.' },
    ],
    variants: [
      { name: 'Modal', className: 'sk-drawer--modal', description: 'Backdrop, focus trapped, page inert.', use: 'Narrow viewports, and content demanding full attention.' },
      { name: 'Inline', className: 'sk-drawer--inline', description: 'No backdrop, page stays interactive, focus not trapped.', use: 'Detail panels beside a list on wide screens. The default on desktop.' },
      { name: 'Bottom sheet', className: 'sk-drawer--bottom', description: 'Slides up from the block-end edge.', use: 'Touch-first surfaces.' },
    ],
    sizes: [
      { name: 'Small', className: 'sk-drawer--sm', height: '20rem wide', typeStyle: 'body-sm', description: 'Filters.' },
      { name: 'Medium', className: '', height: '28rem wide', typeStyle: 'body-md', description: 'Default.' },
      { name: 'Large', className: 'sk-drawer--lg', height: '40rem wide', typeStyle: 'body-md', description: 'Detail inspection.' },
    ],
    states: [
      { name: 'Closed', description: 'Translated off-screen and inert.', trigger: 'default' },
      { name: 'Open', description: 'Slid in.', trigger: '[data-open]' },
      { name: 'Modal open', description: 'Focus trapped, page inert.', trigger: '[data-modal][data-open]' },
    ],
    props: [
      { name: 'placement', type: "'inline-start' | 'inline-end' | 'block-end'", default: "'inline-end'", description: 'Edge. Logical, so it flips under RTL.' },
      { name: 'modal', type: 'boolean', default: 'false', description: 'Backdrop and focus trapping. Usually true below lg and false above.' },
      { name: 'title', type: 'string', required: true, description: 'Accessible name.' },
    ],
    tokensUsed: ['color-surface-overlay', 'color-surface-scrim', 'color-border-default', 'elevation-4', 'z-drawer', 'duration-slow'],
    darkMode:
      'An inline drawer sits directly beside content with no scrim, so its edge is the only thing separating the two regions. On dark that edge must be an explicit border at border-default — a shadow alone leaves the drawer and the page looking like one continuous surface. Modal drawers behave like dialogs and use the deeper dark-mode scrim.',
    accessibility: {
      role: 'Modal: role="dialog" aria-modal="true", or a native <dialog>. Inline: role="complementary" or a plain region with a heading — NOT aria-modal, which would lie about the page being blocked.',
      keyboard: [
        { keys: 'Escape', action: 'Closes a modal drawer. For an inline drawer, closing on Escape is optional and should be consistent.' },
        { keys: 'Tab', action: 'Trapped inside a modal drawer; flows normally through an inline one.' },
      ],
      aria: [
        'Never set aria-modal="true" on a non-modal drawer. It tells assistive technology the rest of the page is unavailable when it is not.',
        'A closed drawer must be inert or hidden — a visually off-screen drawer that is still focusable creates invisible tab stops, which is one of the most disorienting bugs possible.',
        'Move focus to the drawer heading when a modal drawer opens; leave focus alone when an inline one opens.',
        'Restore focus to the trigger on close.',
        'aria-expanded on the trigger.',
      ],
      wcag: ['2.1.2 No Keyboard Trap.', '2.4.3 Focus Order.', '1.3.1 Info and Relationships.', '4.1.2 Name, Role, Value.'],
      screenReader: 'Modal announces "<title>, dialog". Inline announces as a complementary landmark.',
      targetSize: 'Close and actions meet minimums.',
    },
    content: ['The title names the object being inspected.', 'Actions are specific to the drawer content.', 'Say whether changes apply immediately or on save.'],
    dos: [
      'Make the drawer modal below lg and inline above it.',
      'Set inert on a closed drawer.',
      'Use logical placement so RTL works without extra code.',
    ],
    donts: [
      'Do not trap focus in an inline drawer.',
      'Do not leave a closed drawer focusable.',
      'Do not nest drawers.',
      'Do not use aria-modal on an inline drawer.',
    ],
    html: `<!-- Inline: no backdrop, page stays usable, focus not trapped -->
<aside class="sk-drawer sk-drawer--inline" data-open aria-labelledby="detail-title">
  <header class="sk-drawer__header">
    <h2 class="sk-drawer__title" id="detail-title">Pricing table variants</h2>
    <button type="button" class="sk-icon-button sk-icon-button--sm">
      <svg aria-hidden="true" focusable="false" width="16" height="16"><use href="#sk-icon-close" /></svg>
      <span class="sk-visually-hidden">Close details panel</span>
    </button>
  </header>
  <div class="sk-drawer__body">
    <dl class="sk-dl"> ... </dl>
  </div>
  <footer class="sk-drawer__footer">
    <button type="button" class="sk-button sk-button--secondary">Edit record</button>
  </footer>
</aside>

<!-- Modal: closed drawers must be inert, or they leave invisible tab stops -->
<div class="sk-drawer sk-drawer--modal" role="dialog" aria-modal="true"
     aria-labelledby="filters-title" inert>
  <header class="sk-drawer__header">
    <h2 class="sk-drawer__title" id="filters-title">Filters</h2>
    <button type="button" class="sk-icon-button sk-icon-button--sm" data-sk-drawer-close>
      <svg aria-hidden="true" focusable="false" width="16" height="16"><use href="#sk-icon-close" /></svg>
      <span class="sk-visually-hidden">Close filters</span>
    </button>
  </header>
  <div class="sk-drawer__body"> ... </div>
</div>`,
    css: `.sk-drawer {
  display: flex;
  flex-direction: column;
  min-inline-size: 0;
  background-color: var(--sk-color-surface-overlay);
  /* Explicit edge: on dark, a shadow alone leaves the drawer and the page looking
     like one continuous surface. */
  border-inline-start: var(--sk-border-width-hairline) solid var(--sk-color-border-default);
}

.sk-drawer__header {
  display: flex;
  align-items: flex-start;
  gap: var(--sk-space-12);
  flex: 0 0 auto;
  padding: var(--sk-space-16);
  border-block-end: var(--sk-border-width-hairline) solid var(--sk-color-border-subtle);
}
.sk-drawer__title {
  flex: 1 1 auto;
  min-inline-size: 0;
  margin: 0;
  font-size: var(--sk-font-size-heading-sm);
  font-weight: var(--sk-font-weight-semibold);
  overflow-wrap: anywhere;
}

.sk-drawer__body {
  flex: 1 1 auto;
  min-block-size: 0;
  min-inline-size: 0;
  padding: var(--sk-space-16);
  overflow-y: auto;
  overscroll-behavior: contain;
}

.sk-drawer__footer {
  display: flex;
  flex-wrap: wrap;
  gap: var(--sk-space-8);
  flex: 0 0 auto;
  padding: var(--sk-space-12) var(--sk-space-16);
  border-block-start: var(--sk-border-width-hairline) solid var(--sk-color-border-subtle);
}

/* --- Inline: a flex sibling of the content, so the content simply gets narrower --- */
.sk-drawer--inline {
  flex: 0 0 28rem;
  max-inline-size: 100%;
  block-size: 100%;
}
.sk-drawer--inline[hidden], .sk-drawer--inline:not([data-open]) { display: none; }

/* --- Modal --- */
.sk-drawer--modal {
  position: fixed;
  inset-block: 0;
  inset-inline-end: 0;
  z-index: var(--sk-z-drawer);
  inline-size: min(28rem, 100vw);
  box-shadow: var(--sk-elevation-4);
  translate: 100% 0;
  transition: translate var(--sk-duration-slow) var(--sk-easing-entrance);
}
.sk-drawer--modal[data-open] { translate: 0 0; }
[dir="rtl"] .sk-drawer--modal { inset-inline-end: auto; inset-inline-start: 0; translate: -100% 0; }
[dir="rtl"] .sk-drawer--modal[data-open] { translate: 0 0; }

.sk-drawer__backdrop {
  position: fixed;
  inset: 0;
  z-index: calc(var(--sk-z-drawer) - 1);
  background-color: var(--sk-color-surface-scrim);
}

.sk-drawer--bottom {
  position: fixed;
  inset-inline: 0;
  inset-block-end: 0;
  z-index: var(--sk-z-drawer);
  max-block-size: 85dvh;
  border: none;
  border-block-start: var(--sk-border-width-hairline) solid var(--sk-color-border-default);
  border-radius: var(--sk-radius-xl) var(--sk-radius-xl) 0 0;
  translate: 0 100%;
}
.sk-drawer--bottom[data-open] { translate: 0 0; }

.sk-drawer--sm { flex-basis: 20rem; inline-size: min(20rem, 100vw); }
.sk-drawer--lg { flex-basis: 40rem; inline-size: min(40rem, 100vw); }

@media (prefers-reduced-motion: reduce) { .sk-drawer { transition: none; } }`,
    related: ['dialog', 'side-nav', 'popover'],
  },

  {
    id: 'popover',
    name: 'Popover',
    category: 'overlay',
    status: 'stable',
    summary:
      'Non-modal floating content anchored to a trigger. Unlike a Tooltip it can contain interactive elements; unlike a Dialog it does not block the page.',
    whenToUse: ['Filter panels, column pickers, date pickers.', 'Rich contextual help containing links.', 'Small forms attached to a control.'],
    whenNotToUse: [
      'A list of actions — use a Menu, which has the right keyboard model.',
      'A plain text hint — use a Tooltip.',
      'Anything requiring a decision before continuing — use a Dialog.',
    ],
    anatomy: [
      { part: 'Trigger', required: true, description: 'A button with aria-expanded.' },
      { part: 'Panel', required: true, description: 'The floating surface, positioned with the CSS anchor API where available.' },
      { part: 'Arrow', required: false, description: 'Points at the trigger. Decorative.' },
      { part: 'Header', required: false, description: 'Title and close.' },
      { part: 'Body', required: true, description: 'Content.' },
    ],
    variants: [
      { name: 'Default', className: 'sk-popover', description: 'Standard panel.', use: 'Most cases.' },
      { name: 'With arrow', className: 'sk-popover--arrow', description: 'Includes a pointer.', use: 'When the association with the trigger needs reinforcing.' },
      { name: 'Rich help', className: 'sk-popover--help', description: 'Wider, with prose formatting.', use: 'Explanations containing links.' },
    ],
    sizes: [
      { name: 'Small', className: 'sk-popover--sm', height: 'auto', typeStyle: 'body-sm', description: '16rem.' },
      { name: 'Medium', className: '', height: 'auto', typeStyle: 'body-md', description: '20rem. Default.' },
      { name: 'Large', className: 'sk-popover--lg', height: 'auto', typeStyle: 'body-md', description: '28rem.' },
    ],
    states: [
      { name: 'Closed', description: 'Hidden.', trigger: 'default' },
      { name: 'Open', description: 'aria-expanded="true".', trigger: '[aria-expanded="true"]' },
      { name: 'Flipped', description: 'Repositioned to stay in the viewport.', trigger: '[data-placement]' },
    ],
    props: [
      { name: 'placement', type: "'top' | 'bottom' | 'inline-start' | 'inline-end'", default: "'bottom'", description: 'Preferred side; flips as needed.' },
      { name: 'trapFocus', type: 'boolean', default: 'false', description: 'True only when the popover contains a small self-contained form.' },
      { name: 'closeOnOutsideClick', type: 'boolean', default: 'true', description: 'Light dismiss.' },
    ],
    tokensUsed: ['color-surface-overlay', 'color-border-default', 'elevation-3', 'z-popover', 'radius-lg'],
    darkMode:
      'The arrow is the awkward part: it is usually built from a rotated square that must match both the panel surface and its border. On dark, the two visible arrow edges need the border colour while the fill needs the overlay surface, so the arrow is drawn with a border on exactly two sides rather than as a solid triangle. A solid-fill arrow looks correct in light mode and shows a visible seam in dark mode.',
    accessibility: {
      role: 'A non-modal region. Use the native popover attribute where supported, or role="dialog" without aria-modal when it contains a form.',
      keyboard: [
        { keys: 'Enter / Space on trigger', action: 'Toggle.' },
        { keys: 'Escape', action: 'Close and return focus to the trigger.' },
        { keys: 'Tab', action: 'Moves into the popover content, then out of it and on through the page — a popover does not trap focus unless it is a form.' },
      ],
      aria: [
        'aria-expanded and aria-controls on the trigger.',
        'Do not use aria-modal on a non-modal popover.',
        'Focus moves into the popover on open only if it contains interactive content; otherwise leave focus on the trigger.',
        'Restore focus to the trigger on close.',
        'Rich help popovers should be reachable by keyboard from their trigger, not only on hover.',
      ],
      wcag: ['1.4.13 Content on Hover or Focus — dismissible, hoverable, persistent.', '2.1.1 Keyboard.', '2.4.11 Focus Not Obscured.', '4.1.2 Name, Role, Value.'],
      screenReader: 'Trigger announces "expanded"/"collapsed"; content is read in place.',
      targetSize: 'Trigger and interactive content meet minimums.',
    },
    content: ['Keep content short.', 'Give it a heading when it has more than a couple of lines.', 'Do not hide essential information in a popover.'],
    dos: ['Flip placement to stay in the viewport.', 'Support light dismiss.', 'Return focus to the trigger.'],
    donts: ['Do not trap focus unless it is a form.', 'Do not nest popovers.', 'Do not open a popover on hover if it contains interactive content.'],
    html: `<button type="button" class="sk-button sk-button--secondary"
        popovertarget="filters-popover" aria-expanded="false">
  <svg aria-hidden="true" focusable="false" width="16" height="16"><use href="#sk-icon-filter" /></svg>
  Filters
  <span class="sk-badge sk-badge--brand sk-badge--sm">2</span>
</button>

<div class="sk-popover sk-popover--arrow" id="filters-popover" popover>
  <header class="sk-popover__header">
    <h3 class="sk-popover__title">Filter projects</h3>
  </header>
  <div class="sk-popover__body">
    <fieldset class="sk-fieldset"> ... </fieldset>
  </div>
  <footer class="sk-popover__footer">
    <button type="button" class="sk-button sk-button--ghost sk-button--sm">Clear</button>
    <button type="button" class="sk-button sk-button--primary sk-button--sm">Apply</button>
  </footer>
</div>`,
    css: `.sk-popover {
  display: flex;
  flex-direction: column;
  inline-size: min(20rem, calc(100vw - var(--sk-space-32)));
  max-block-size: min(24rem, 80dvh);
  padding: 0;
  margin: 0;
  z-index: var(--sk-z-popover);
  background-color: var(--sk-color-surface-overlay);
  border: var(--sk-border-width-hairline) solid var(--sk-color-border-default);
  border-radius: var(--sk-radius-lg);
  box-shadow: var(--sk-elevation-3);
  color: var(--sk-color-text-primary);
  /* Anchor positioning where supported; a JS fallback handles older engines. */
  position-anchor: --sk-popover-anchor;
  inset-area: block-end;
  position-try-fallbacks: block-start, inline-end, inline-start;
}

.sk-popover:not(:popover-open):not([data-open]) { display: none; }

.sk-popover__header {
  flex: 0 0 auto;
  padding: var(--sk-space-12) var(--sk-space-16) var(--sk-space-8);
}
.sk-popover__title {
  margin: 0;
  font-size: var(--sk-font-size-heading-xs);
  font-weight: var(--sk-font-weight-semibold);
}

.sk-popover__body {
  flex: 1 1 auto;
  min-block-size: 0;
  min-inline-size: 0;
  padding: var(--sk-space-8) var(--sk-space-16) var(--sk-space-16);
  overflow-y: auto;
  overscroll-behavior: contain;
}

.sk-popover__footer {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: var(--sk-space-8);
  flex: 0 0 auto;
  padding: var(--sk-space-12) var(--sk-space-16);
  border-block-start: var(--sk-border-width-hairline) solid var(--sk-color-border-subtle);
}

/* Arrow: a rotated square with a border on exactly two sides. A solid-fill
   triangle looks fine in light mode and shows a seam on dark. */
.sk-popover--arrow::before {
  content: "";
  position: absolute;
  inline-size: 0.625rem;
  block-size: 0.625rem;
  background-color: var(--sk-color-surface-overlay);
  border-inline-start: var(--sk-border-width-hairline) solid var(--sk-color-border-default);
  border-block-start: var(--sk-border-width-hairline) solid var(--sk-color-border-default);
  rotate: 45deg;
  inset-block-start: -0.375rem;
  inset-inline-start: var(--sk-space-16);
}

.sk-popover--sm { inline-size: min(16rem, calc(100vw - var(--sk-space-32))); }
.sk-popover--lg { inline-size: min(28rem, calc(100vw - var(--sk-space-32))); }

@media (prefers-reduced-motion: no-preference) {
  .sk-popover:popover-open { animation: sk-menu-in var(--sk-duration-fast) var(--sk-easing-entrance); }
}`,
    related: ['menu', 'tooltip', 'dialog', 'combobox'],
  },

  {
    id: 'tooltip',
    name: 'Tooltip',
    category: 'overlay',
    status: 'stable',
    summary:
      'A short text label appearing on hover or focus. It may only ever contain plain text — the moment a tooltip contains a link, it becomes unreachable for most users.',
    whenToUse: ['Naming an icon-only control.', 'Showing a truncated value in full.', 'A brief clarification of a label.'],
    whenNotToUse: [
      'Anything interactive. A link inside a tooltip cannot be reached by hover users on touch devices.',
      'Essential information. Tooltips are invisible on touch and easy to miss.',
      'Long text — use a Popover.',
      'Error messages — put them in the form field.',
    ],
    anatomy: [
      { part: 'Trigger', required: true, description: 'The element being described. Must be focusable.' },
      { part: 'Bubble', required: true, description: 'Inverse surface with the text.' },
      { part: 'Arrow', required: false, description: 'Decorative pointer.' },
    ],
    variants: [
      { name: 'Default', className: 'sk-tooltip', description: 'Inverse bubble.', use: 'Standard.' },
      { name: 'Truncation', className: 'sk-tooltip--truncation', description: 'Shows a full value that is visually clipped.', use: 'Table cells and narrow columns.' },
    ],
    sizes: [{ name: 'Small', className: '', height: 'auto', typeStyle: 'body-xs', description: 'The only size.' }],
    states: [
      { name: 'Hidden', description: 'Default.', trigger: 'default' },
      { name: 'Visible', description: 'Shown after a short delay on hover, or immediately on focus.', trigger: '[data-visible]' },
    ],
    props: [
      { name: 'content', type: 'string', required: true, description: 'Plain text only.' },
      { name: 'delay', type: 'number', default: '400', description: 'Hover delay in ms. Focus shows immediately.' },
      { name: 'placement', type: "'top' | 'bottom' | 'inline-start' | 'inline-end'", default: "'top'", description: 'Preferred side.' },
    ],
    tokensUsed: ['color-surface-inverse', 'color-text-on-inverse', 'z-tooltip', 'radius-sm', 'elevation-3'],
    darkMode:
      'The tooltip is the one component that deliberately inverts relative to the page: surface-inverse is near-black in light mode and near-white in dark mode. This means it stands out against its surroundings in both themes rather than blending into the overlay stack — a tooltip using the normal overlay surface would be nearly invisible against a card in dark mode.',
    accessibility: {
      role: 'role="tooltip" on the bubble, referenced by aria-describedby from the trigger.',
      keyboard: [
        { keys: 'Tab', action: 'Focusing the trigger shows the tooltip immediately, with no delay.' },
        { keys: 'Escape', action: 'Dismisses it while leaving focus on the trigger. Required by WCAG 1.4.13.' },
      ],
      aria: [
        'aria-describedby, not aria-labelledby — a tooltip supplements the name, it does not replace it. An icon button still needs its own hidden label.',
        'The trigger must be focusable. A tooltip on a non-focusable span is invisible to keyboard users.',
        'WCAG 1.4.13 requires the content to be dismissible with Escape, hoverable without disappearing, and persistent until dismissed or focus moves.',
        'Never put interactive content inside a tooltip.',
        'Do not show a tooltip on hover alone without a focus equivalent.',
      ],
      wcag: ['1.4.13 Content on Hover or Focus.', '2.1.1 Keyboard.', '4.1.2 Name, Role, Value.'],
      screenReader: 'Read as the description after the trigger’s name and role.',
      targetSize: 'The bubble is not a target; the trigger owns target size.',
    },
    content: ['A few words maximum.', 'No full stop on a fragment.', 'Do not repeat the visible label verbatim — that is noise.'],
    dos: ['Show immediately on focus.', 'Keep the tooltip visible while the pointer is over it.', 'Dismiss on Escape.'],
    donts: ['Do not put links or buttons in a tooltip.', 'Do not use a tooltip as the accessible name.', 'Do not put critical information in a tooltip.'],
    html: `<button type="button" class="sk-icon-button" aria-describedby="tip-copy">
  <svg aria-hidden="true" focusable="false" width="20" height="20"><use href="#sk-icon-copy" /></svg>
  <!-- The accessible NAME lives here; the tooltip only describes. -->
  <span class="sk-visually-hidden">Copy record ID</span>
</button>
<span class="sk-tooltip" role="tooltip" id="tip-copy">Copy record ID</span>`,
    css: `.sk-tooltip {
  position: absolute;
  z-index: var(--sk-z-tooltip);
  max-inline-size: 18rem;
  padding: var(--sk-space-6) var(--sk-space-8);
  /* Deliberately inverted relative to the page in BOTH themes: near-black on
     light, near-white on dark. An overlay-surface tooltip would disappear
     against a card in dark mode. */
  background-color: var(--sk-color-surface-inverse);
  color: var(--sk-color-text-on-inverse);
  border-radius: var(--sk-radius-sm);
  box-shadow: var(--sk-elevation-3);
  font-size: var(--sk-font-size-body-xs);
  line-height: var(--sk-line-height-body-xs);
  text-align: start;
  pointer-events: none;
  opacity: 0;
  transition: opacity var(--sk-duration-fast) var(--sk-easing-standard);
}

/* pointer-events return when visible, so the tooltip is hoverable —
   required by WCAG 1.4.13. */
.sk-tooltip[data-visible] { opacity: 1; pointer-events: auto; }

.sk-tooltip::after {
  content: "";
  position: absolute;
  inline-size: 0.5rem;
  block-size: 0.5rem;
  background-color: var(--sk-color-surface-inverse);
  rotate: 45deg;
  inset-block-end: -0.1875rem;
  inset-inline-start: calc(50% - 0.25rem);
}

.sk-tooltip--truncation { font-family: var(--sk-font-family-mono); overflow-wrap: anywhere; }

@media (prefers-reduced-motion: reduce) { .sk-tooltip { transition: none; } }

@media (forced-colors: active) {
  .sk-tooltip { background-color: Canvas; color: CanvasText; border: 1px solid CanvasText; }
}`,
    related: ['icon-button', 'popover', 'inline-message'],
  },
];
