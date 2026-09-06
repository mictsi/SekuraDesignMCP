/**
 * Dialog, drawer, popover and tooltip.
 *
 * The distinction that matters throughout: **modal** surfaces block the page and
 * trap focus; **non-modal** surfaces do not. Claiming `aria-modal="true"` on a
 * panel that leaves the page usable tells assistive technology the rest of the
 * document is unavailable when it plainly is not.
 */

import {
  combine,
  ensureId,
  emit,
  focusable,
  on,
  toggleAttr,
  type Cleanup,
} from '../core/dom.js';
import { saveFocus, trapFocus, type FocusRestore } from '../core/focus.js';
import { dismissable } from '../core/dismiss.js';
import { position, type PositionOptions, type Positioner } from '../core/position.js';

/* ================================================================== *
 * Dialog
 * ================================================================== */

export interface DialogOptions {
  /** Escape and backdrop close it. False only for genuinely blocking decisions. */
  dismissible?: boolean;
  /**
   * Called before closing when the dialog holds unsaved work. Return false to
   * keep it open. A dirty dialog must not silently discard input on Escape.
   */
  onBeforeClose?: (reason: 'escape' | 'backdrop' | 'programmatic') => boolean;
  onOpenChange?: (open: boolean) => void;
  /** Element to focus on open. Defaults to [autofocus], then the first control. */
  initialFocus?: () => HTMLElement | null;
}

export interface Dialog {
  readonly open: boolean;
  show(): void;
  close(returnValue?: string): void;
  destroy: Cleanup;
}

/**
 * Built on native `<dialog>` + `showModal()` where available, which supplies the
 * top layer, page inertness, the backdrop and focus trapping for free.
 * Hand-rolling `role="dialog"` on a div loses all four.
 */
export function createDialog(dialog: HTMLElement, options: DialogOptions = {}): Dialog {
  const { dismissible = true } = options;
  const native = dialog instanceof HTMLDialogElement && typeof dialog.showModal === 'function';

  let restore: FocusRestore | null = null;
  let untrap: Cleanup | null = null;
  let undismiss: Cleanup | null = null;
  let notifiedOpen = native && (dialog as HTMLDialogElement).open;

  if (!native) {
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');
    dialog.hidden = true;
  }

  function initialTarget(): HTMLElement | null {
    const explicit = options.initialFocus?.();
    if (explicit) return explicit;
    const autofocus = dialog.querySelector<HTMLElement>('[autofocus]');
    if (autofocus) return autofocus;
    return focusable(dialog)[0] ?? null;
  }

  function show(): void {
    if (isOpen()) return;
    restore = saveFocus();

    if (native) {
      (dialog as HTMLDialogElement).showModal();
    } else {
      dialog.hidden = false;
      toggleAttr(dialog, 'data-open', true);
      untrap = trapFocus(dialog, {
        initial: initialTarget(),
        onEscape: (event) => {
          if (!dismissible) {
            event.preventDefault();
            return;
          }
          if (options.onBeforeClose?.('escape') === false) {
            event.preventDefault();
            return;
          }
          close();
        },
      });
      undismiss = dismissable(dialog, {
        escape: false, // handled by the trap so it can be vetoed
        outsidePointer: dismissible,
        onDismiss: () => {
          if (options.onBeforeClose?.('backdrop') === false) return;
          close();
        },
      });
    }

    const target = initialTarget();
    if (native && target) target.focus();

    options.onOpenChange?.(true);
    notifiedOpen = true;
    emit(dialog, 'sk:dialog:open');
  }

  function finishClose(returnValue?: string): void {
    if (!notifiedOpen) return;
    notifiedOpen = false;
    restore?.restore();
    restore = null;
    options.onOpenChange?.(false);
    emit(dialog, 'sk:dialog:close', { returnValue });
  }

  function close(returnValue?: string): void {
    if (!isOpen()) return;
    if (native) {
      (dialog as HTMLDialogElement).close(returnValue);
    } else {
      untrap?.();
      untrap = null;
      undismiss?.();
      undismiss = null;
      dialog.hidden = true;
      dialog.removeAttribute('data-open');
    }
    finishClose(returnValue);
  }

  function isOpen(): boolean {
    return native ? (dialog as HTMLDialogElement).open : !dialog.hidden;
  }

  const cleanups: Cleanup[] = [];
  const phrase = dialog.querySelector<HTMLInputElement>('[data-sk-confirm-phrase]');
  const confirm = dialog.querySelector<HTMLButtonElement>('[data-sk-confirm-button]');
  if (phrase && confirm) {
    const sync = (): void => { confirm.disabled = phrase.value.trim() !== phrase.dataset.skConfirmPhrase; };
    sync();
    cleanups.push(on(phrase, 'input', sync), on(dialog, 'close', () => { phrase.value = ''; sync(); }));
  }


  if (native) {
    // The native cancel event fires for Escape; intercepting it is how a dirty
    // dialog confirms rather than discarding work.
    cleanups.push(
      on(dialog, 'cancel', (event: Event) => {
        if (!dismissible || options.onBeforeClose?.('escape') === false) {
          event.preventDefault();
        }
      })
    );
    cleanups.push(
      on(dialog, 'close', () => {
        if (!isOpen()) finishClose((dialog as HTMLDialogElement).returnValue);
      })
    );
    if (dismissible) {
      // Clicking the backdrop: the event target is the dialog itself when the
      // press lands outside the panel.
      cleanups.push(
        on(dialog, 'click', (event: MouseEvent) => {
          if (event.target !== dialog) return;
          if (options.onBeforeClose?.('backdrop') === false) return;
          close('dismiss');
        })
      );
    }
  }

  return {
    get open() {
      return isOpen();
    },
    show,
    close,
    destroy: combine(() => close(), ...cleanups),
  };
}

/* ================================================================== *
 * Drawer
 * ================================================================== */

export interface DrawerOptions {
  /**
   * Modal drawers block the page and trap focus. Inline drawers sit beside the
   * content and do neither.
   *
   * Pass a media query to switch automatically — the usual case is modal on
   * narrow viewports and inline on wide ones. Shipping only the CSS half of that
   * switch, and leaving aria-modal set, is a real accessibility bug.
   */
  modal?: boolean | string;
  onOpenChange?: (open: boolean) => void;
}

export interface Drawer {
  readonly open: boolean;
  readonly modal: boolean;
  show(): void;
  close(): void;
  destroy: Cleanup;
}

export function createDrawer(drawer: HTMLElement, options: DrawerOptions = {}): Drawer {
  const query =
    typeof options.modal === 'string' ? matchMedia(options.modal) : null;
  const isModal = (): boolean =>
    query ? query.matches : options.modal === true;

  let open = false;
  let restore: FocusRestore | null = null;
  let untrap: Cleanup | null = null;
  let undismiss: Cleanup | null = null;

  // Closed drawers must be inert. A visually off-screen drawer that is still
  // focusable creates invisible tab stops, which is one of the most
  // disorienting bugs a keyboard user can hit.
  function setClosedState(): void {
    drawer.hidden = true;
    drawer.setAttribute('inert', '');
    drawer.removeAttribute('data-open');
  }
  const initiallyOpen = !drawer.hidden && drawer.hasAttribute('data-open');
  setClosedState();

  function show(): void {
    if (open) return;
    open = true;
    const modal = isModal();

    drawer.hidden = false;
    drawer.removeAttribute('inert');
    toggleAttr(drawer, 'data-open', true);

    if (modal) {
      drawer.setAttribute('role', 'dialog');
      drawer.setAttribute('aria-modal', 'true');
      restore = saveFocus();
      const heading = drawer.querySelector<HTMLElement>('h1,h2,h3,[data-sk-drawer-title]');
      if (heading && !heading.hasAttribute('tabindex')) heading.tabIndex = -1;
      untrap = trapFocus(drawer, { initial: heading, onEscape: () => close() });
      undismiss = dismissable(drawer, { escape: false, onDismiss: () => close() });
    } else {
      // Non-modal: the page stays usable, so say so. No trap, and focus is left
      // where the user put it.
      drawer.setAttribute('role', 'complementary');
      drawer.removeAttribute('aria-modal');
    }

    options.onOpenChange?.(true);
    emit(drawer, 'sk:drawer:open', { modal });
  }

  function close(): void {
    if (!open) return;
    open = false;
    untrap?.();
    untrap = null;
    undismiss?.();
    undismiss = null;
    setClosedState();
    restore?.restore();
    restore = null;
    options.onOpenChange?.(false);
    emit(drawer, 'sk:drawer:close');
  }

  // If the viewport crosses the breakpoint while open, the modality must change
  // with it — otherwise a now-inline panel still claims to be modal.
  const offQuery = query
    ? on(query, 'change', () => {
        if (!open) return;
        close();
        show();
      })
    : undefined;

  if (initiallyOpen) show();

  return {
    get open() {
      return open;
    },
    get modal() {
      return isModal();
    },
    show,
    close,
    destroy: combine(() => close(), offQuery),
  };
}

/* ================================================================== *
 * Popover
 * ================================================================== */

export interface PopoverOptions extends PositionOptions {
  /** Trap focus. Only for a popover containing a small self-contained form. */
  trap?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export interface Popover {
  readonly open: boolean;
  show(): void;
  close(restoreFocus?: boolean): void;
  toggle(): void;
  destroy: Cleanup;
}

export function createPopover(
  trigger: HTMLElement,
  panel: HTMLElement,
  options: PopoverOptions = {}
): Popover {
  const panelId = ensureId(panel, 'sk-popover');
  trigger.setAttribute('aria-controls', panelId);
  trigger.setAttribute('aria-expanded', 'false');
  if (trigger.tagName === 'BUTTON' && !trigger.hasAttribute('type')) {
    trigger.setAttribute('type', 'button');
  }
  panel.hidden = true;

  let open = false;
  let restore: FocusRestore | null = null;
  let positioner: Positioner | null = null;
  let undismiss: Cleanup | null = null;
  let untrap: Cleanup | null = null;

  function show(): void {
    if (open) return;
    open = true;
    restore = saveFocus();
    panel.hidden = false;
    toggleAttr(panel, 'data-open', true);
    trigger.setAttribute('aria-expanded', 'true');

    positioner = position(panel, trigger, options);
    undismiss = dismissable(panel, {
      exclude: [trigger],
      onDismiss: (reason) => close(reason === 'escape'),
    });

    if (options.trap) {
      // Non-modal even when trapped — aria-modal is deliberately not set.
      untrap = trapFocus(panel, { onEscape: () => close(true) });
    } else {
      focusable(panel)[0]?.focus();
    }

    options.onOpenChange?.(true);
    emit(trigger, 'sk:popover:open');
  }

  function close(restoreFocus = true): void {
    if (!open) return;
    open = false;
    untrap?.();
    untrap = null;
    positioner?.destroy();
    positioner = null;
    undismiss?.();
    undismiss = null;
    panel.hidden = true;
    panel.removeAttribute('data-open');
    trigger.setAttribute('aria-expanded', 'false');
    if (restoreFocus) restore?.restore();
    else restore?.cancel();
    restore = null;
    options.onOpenChange?.(false);
    emit(trigger, 'sk:popover:close');
  }

  const offClick = on(trigger, 'click', (event: MouseEvent) => {
    event.stopPropagation();
    open ? close(true) : show();
  });

  return {
    get open() {
      return open;
    },
    show,
    close,
    toggle: () => (open ? close(true) : show()),
    destroy: combine(() => close(false), offClick),
  };
}

/* ================================================================== *
 * Tooltip
 * ================================================================== */

export interface TooltipOptions extends PositionOptions {
  /** Hover delay, ms. Focus is always immediate — the user has committed. */
  delay?: number;
  /** Plain text only. A link inside a tooltip is unreachable on touch. */
  text?: string;
}

export interface Tooltip {
  destroy: Cleanup;
}

/**
 * WCAG 1.4.13 requires hover/focus content to be **dismissible** (Escape),
 * **hoverable** (the pointer can move onto it without it vanishing) and
 * **persistent** (it stays until dismissed or focus moves). All three are
 * implemented here; most tooltip implementations satisfy none of them.
 *
 * The tooltip describes; it does not name. The trigger still needs its own
 * accessible name.
 */
export function createTooltip(
  trigger: HTMLElement,
  tip: HTMLElement,
  options: TooltipOptions = {}
): Tooltip {
  const { delay = 400 } = options;
  const tipId = ensureId(tip, 'sk-tooltip');

  tip.setAttribute('role', 'tooltip');
  tip.hidden = true;
  if (options.text) tip.textContent = options.text;

  // describedby, not labelledby: a tooltip supplements the name.
  const described = (trigger.getAttribute('aria-describedby') ?? '').split(/\s+/).filter(Boolean);
  if (!described.includes(tipId)) {
    trigger.setAttribute('aria-describedby', [...described, tipId].join(' '));
  }

  let timer: ReturnType<typeof setTimeout> | undefined;
  let hideTimer: ReturnType<typeof setTimeout> | undefined;
  let positioner: Positioner | null = null;
  let visible = false;

  function show(): void {
    if (visible) return;
    visible = true;
    tip.hidden = false;
    toggleAttr(tip, 'data-visible', true);
    positioner = position(tip, trigger, { side: 'top', align: 'center', ...options });
  }

  function hide(): void {
    clearTimeout(hideTimer);
    clearTimeout(timer);
    if (!visible) return;
    visible = false;
    positioner?.destroy();
    positioner = null;
    tip.hidden = true;
    tip.removeAttribute('data-visible');
  }

  function scheduleShow(immediate: boolean): void {
    clearTimeout(timer);
    if (immediate) show();
    else timer = setTimeout(show, delay);
  }

  function scheduleHide(): void {
    clearTimeout(hideTimer);
    hideTimer = setTimeout(() => {
      if (!trigger.matches(':focus, :hover') && !tip.matches(':hover')) hide();
    }, 150);
  }
  const cleanups = [
    on(tip, 'pointerenter', () => clearTimeout(hideTimer)),
    on(trigger, 'pointerenter', () => scheduleShow(false)),
    // Hoverable: moving onto the tooltip itself must not dismiss it.
    on(trigger, 'pointerleave', (event: PointerEvent) => {
      if (tip.contains(event.relatedTarget as Node)) return;
      scheduleHide();
    }),
    on(tip, 'pointerleave', scheduleHide),
    on(trigger, 'focus', () => scheduleShow(true)),
    on(trigger, 'blur', scheduleHide),
    // Dismissible without moving focus.
    on(document, 'keydown', (event: KeyboardEvent) => {
      if (event.key === 'Escape' && visible) hide();
    }),
  ];

  return { destroy: combine(hide, ...cleanups, () => {
    const remaining = (trigger.getAttribute('aria-describedby') ?? '').split(/\s+/).filter(id => id && id !== tipId);
    if (remaining.length) trigger.setAttribute('aria-describedby', remaining.join(' '));
    else trigger.removeAttribute('aria-describedby');
  }) };
}
