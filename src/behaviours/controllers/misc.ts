/**
 * Theme, toast, tri-state selection and async switch.
 *
 * Small controllers that nonetheless encode decisions the specification is
 * emphatic about: three theme options rather than two, auto-dismiss that pauses,
 * selection that scopes to the current page, and a switch that shows pending
 * rather than claiming a state it has not reached.
 */

import { combine, emit, focusable, isVisible, on, toggleAttr, type Cleanup } from '../core/dom.js';
import { announce } from '../core/live.js';

/* ================================================================== *
 * Theme
 * ================================================================== */

export type ThemePreference = 'system' | 'light' | 'dark';
export type ContrastPreference = 'system' | 'normal' | 'more';

export interface ThemeOptions {
  storageKey?: string;
  contrastKey?: string;
  /** Attribute on the root. */
  attribute?: string;
  onChange?: (resolved: string, preference: ThemePreference) => void;
}

export interface ThemeManager {
  get(): ThemePreference;
  set(value: ThemePreference): void;
  resolved(): string;
  destroy: Cleanup;
}

/**
 * Three options, not two.
 *
 * "System" must exist and must be the default: a two-state toggle silently
 * overrides the user's operating-system preference the first time they touch it,
 * and they can never get back without clearing storage.
 *
 * High contrast is a **separate axis** driven by prefers-contrast, producing
 * hc-light and hc-dark. Conflating it with light/dark loses a real user need.
 */
export function createThemeManager(options: ThemeOptions = {}): ThemeManager {
  const storageKey = options.storageKey ?? 'sk-theme';
  const contrastKey = options.contrastKey ?? 'sk-contrast';
  const attribute = options.attribute ?? 'data-sk-theme';
  const root = document.documentElement;

  const darkQuery = matchMedia('(prefers-color-scheme: dark)');
  const contrastQuery = matchMedia('(prefers-contrast: more)');

  function read(key: string, fallback: string): string {
    try {
      return localStorage.getItem(key) ?? fallback;
    } catch {
      // Private browsing can throw on access; system preference is the right
      // fallback rather than an error.
      return fallback;
    }
  }

  const validTheme = (value: string): ThemePreference =>
    value === 'light' || value === 'dark' ? value : 'system';
  let preference = validTheme(read(storageKey, 'system'));

  function resolved(): string {
    const pref = preference;
    const contrast = read(contrastKey, 'system') as ContrastPreference;
    const base = pref === 'system' ? (darkQuery.matches ? 'dark' : 'light') : pref;
    const hc = contrast === 'system' ? (contrastQuery.matches ? 'more' : 'normal') : contrast;
    return hc === 'more' ? `hc-${base}` : base;
  }

  function apply(): void {
    root.setAttribute(attribute, resolved());
  }

  function set(value: ThemePreference): void {
    preference = validTheme(value);
    let persisted = true;
    try {
      localStorage.setItem(storageKey, preference);
    } catch {
      persisted = false;
    }
    apply();
    options.onChange?.(resolved(), preference);
    announce(`Theme set to ${preference}.${persisted ? '' : ' This preference applies to this page only because storage is unavailable.'}`);
    emit(root, 'sk:theme:change', { preference, resolved: resolved(), persisted });
  }

  apply();

  const cleanups = [
    on(darkQuery, 'change', apply),
    on(contrastQuery, 'change', apply),
    on(window, 'storage', (nativeEvent: Event) => {
      const event = nativeEvent as StorageEvent;
      if (event.key === storageKey || event.key === null) preference = validTheme(read(storageKey, 'system'));
      if (event.key === storageKey || event.key === contrastKey || event.key === null) apply();
    }),
  ];

  return {
    get: () => preference,
    set,
    resolved,
    destroy: combine(...cleanups),
  };
}

/* ================================================================== *
 * Toast
 * ================================================================== */

export interface ToastAction {
  label: string;
  onAction: () => void;
}

export interface ToastOptions {
  intent?: 'success' | 'info' | 'danger' | 'warning';
  /** ms. Toasts carrying an action get longer, because the user must reach it. */
  duration?: number;
  action?: ToastAction;
  /** Rendered by the caller so the markup stays theirs. */
  render?: (message: string, opts: ToastOptions) => HTMLElement;
}

export interface Toaster {
  show(message: string, options?: ToastOptions): Cleanup;
  destroy: Cleanup;
}

/**
 * Auto-dismiss that pauses on hover and on focus-within, with a manual close
 * always available — WCAG 2.2.1. A toast that disappears on a timer with no way
 * to keep it is a failure, not a convenience.
 */
export function createToaster(region: HTMLElement, defaults: ToastOptions = {}): Toaster {
  // The region must already exist and be empty; creating it together with its
  // first message announces nothing.
  if (!region.hasAttribute('role')) region.setAttribute('role', 'status');
  if (!region.hasAttribute('aria-live')) region.setAttribute('aria-live', 'polite');

  interface ToastEntry { element: HTMLElement; mount: () => void; dismiss: Cleanup }
  const visible: ToastEntry[] = [];
  const pending: ToastEntry[] = [];
  const active = new Set<ToastEntry>();
  let destroyed = false;
  const initialTabindex = region.getAttribute('tabindex');

  function drain(): void {
    if (destroyed) return;
    while (visible.length < 3 && pending.length) {
      const entry = pending.shift()!;
      visible.push(entry);
      entry.mount();
    }
  }

  function show(message: string, options: ToastOptions = {}): Cleanup {
    if (destroyed) return () => {};
    const opts = { ...defaults, ...options };
    const duration = opts.duration ?? (opts.action ? 10_000 : 6000);
    const el = opts.render ? opts.render(message, opts) : defaultToast(message, opts);
    const doc = region.ownerDocument;
    let previousFocus = doc.activeElement instanceof HTMLElement && !region.contains(doc.activeElement)
      ? doc.activeElement : null;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let remaining = duration;
    let started = 0;
    let mounted = false;
    let dismissed = false;
    let hovered = false;

    function pause(): void {
      if (timer !== undefined) {
        remaining = Math.max(0, remaining - (performance.now() - started));
        clearTimeout(timer);
        timer = undefined;
      }
    }

    function resume(): void {
      if (dismissed || !mounted || hovered || el.contains(doc.activeElement) || duration <= 0 || timer !== undefined) return;
      started = performance.now();
      timer = setTimeout(() => { timer = undefined; dismiss(); }, remaining);
    }

    function restoreFocus(): void {
      if (previousFocus?.isConnected && isVisible(previousFocus) && !previousFocus.matches(':disabled') && !previousFocus.closest('[inert]')) {
        previousFocus.focus();
        if (doc.activeElement === previousFocus) return;
      }
      const target = visible.map(entry => focusable(entry.element)[0]).find(Boolean);
      if (target) { target.focus(); return; }
      if (region.isConnected && isVisible(region)) {
        if (!region.hasAttribute('tabindex')) region.tabIndex = -1;
        region.focus();
      }
    }

    function dismiss(): void {
      if (dismissed) return;
      dismissed = true;
      pause();
      const hadFocus = el.contains(doc.activeElement);
      cleanup();
      el.remove();
      active.delete(entry);
      for (const queue of [visible, pending]) {
        const index = queue.indexOf(entry);
        if (index >= 0) queue.splice(index, 1);
      }
      drain();
      if (hadFocus) restoreFocus();
    }

    const cleanup = combine(
      on(el, 'pointerenter', () => { hovered = true; pause(); }),
      on(el, 'pointerleave', () => { hovered = false; resume(); }),
      on(el, 'focusin', (event: FocusEvent) => {
        if (event.relatedTarget instanceof HTMLElement && !region.contains(event.relatedTarget)) previousFocus = event.relatedTarget;
        pause();
      }),
      on(el, 'focusout', () => queueMicrotask(resume)),
      on(el, 'keydown', (event: KeyboardEvent) => {
        if (event.key === 'Escape' && !event.isComposing) {
          event.preventDefault();
          event.stopPropagation();
          dismiss();
        }
      }),
      on(el, 'click', (event: MouseEvent) => {
        const target = event.target as Element;
        if (target.closest('[data-sk-toast-dismiss]')) dismiss();
        else if (target.closest('[data-sk-toast-action]')) {
          opts.action?.onAction();
          dismiss();
        }
      })
    );
    const entry: ToastEntry = {
      element: el,
      dismiss,
      mount() { mounted = true; region.appendChild(el); resume(); },
    };
    active.add(entry);
    pending.push(entry);
    drain();
    return dismiss;
  }

  function defaultToast(message: string, opts: ToastOptions): HTMLElement {
    const el = document.createElement('div');
    el.className = `sk-toast sk-toast--${opts.intent ?? 'success'}`;
    const p = document.createElement('p');
    p.className = 'sk-toast__message';
    p.textContent = message;
    el.appendChild(p);

    if (opts.action) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'sk-button sk-button--ghost sk-button--sm sk-toast__action';
      btn.textContent = opts.action.label;
      btn.setAttribute('data-sk-toast-action', '');
      el.appendChild(btn);
    }

    const close = document.createElement('button');
    close.type = 'button';
    close.className = 'sk-icon-button sk-icon-button--sm sk-toast__dismiss';
    close.setAttribute('data-sk-toast-dismiss', '');
    close.innerHTML = '<svg aria-hidden="true" focusable="false" width="16" height="16"><use href="#sk-icon-close"></use></svg><span class="sk-visually-hidden">Dismiss notification</span>';
    el.appendChild(close);

    return el;
  }

  return {
    show,
    destroy: () => {
      destroyed = true;
      for (const entry of [...active]) entry.dismiss();
      if (initialTabindex === null) region.removeAttribute('tabindex');
      else region.setAttribute('tabindex', initialTabindex);
    },
  };
}

/* ================================================================== *
 * Tri-state selection
 * ================================================================== */

export interface SelectionOptions {
  onChange?: (selected: HTMLInputElement[]) => void;
  /** Label for the announcement. Default "items". */
  noun?: string;
}

export interface Selection {
  readonly selected: HTMLInputElement[];
  clear(): void;
  destroy: Cleanup;
}

/**
 * Header checkbox scopes to the **current page** only.
 *
 * "Select all" meaning every row across every page is the ambiguity that makes
 * users act on the wrong scope. Escalating to everything matching the filter is
 * a separate, explicit action — never an implicit leap.
 */
export function createSelection(
  container: HTMLElement,
  options: SelectionOptions = {}
): Selection {
  const noun = options.noun ?? 'items';
  const all = () => container.querySelector<HTMLInputElement>('[data-sk-select-all]');
  const allRows = () => Array.from(container.querySelectorAll<HTMLInputElement>('[data-sk-select-row]'));
  const rows = () => allRows().filter(row => !row.disabled && !row.closest('[hidden]'));
  const selected = () => rows().filter((r) => r.checked);

  function sync(notify = true): void {
    const head = all();
    for (const row of allRows()) if (row.closest('[hidden]')) row.checked = false;
    const list = rows();
    const chosen = selected();

    if (head) {
      head.checked = chosen.length === list.length && list.length > 0;
      // Indeterminate is a DOM property with no HTML attribute. Announced as
      // "mixed".
      head.indeterminate = chosen.length > 0 && chosen.length < list.length;
    }
    for (const row of list) {
      row.closest('tr')?.setAttribute('aria-selected', String(row.checked));
    }
    const bulk = document.getElementById(container.dataset.skBulkBar ?? '');
    if (bulk) {
      if (bulk.hidden !== (chosen.length === 0)) bulk.hidden = chosen.length === 0;
      const count = bulk.querySelector('[data-sk-selection-count]');
      const message = `${chosen.length} ${chosen.length === 1 && noun.endsWith('s') ? noun.slice(0, -1) : noun} selected`;
      if (count && count.textContent !== message) count.textContent = message;
      for (const label of bulk.querySelectorAll<HTMLElement>('[data-sk-selection-label]')) {
        const text = label.dataset.skSelectionLabel!.replace('{n}', String(chosen.length));
        if (label.textContent !== text) label.textContent = text;
      }
    }
    if (notify) {
      options.onChange?.(chosen);
      emit(container, 'sk:selection:change', { count: chosen.length });
    }
  }

  const offAll = on(container, 'change', (event: Event) => {
    const target = event.target as HTMLInputElement;
    if (target.matches('[data-sk-select-all]')) {
      for (const row of rows()) row.checked = target.checked;
      sync();
      announce(
        target.checked
          ? `${rows().length} ${noun} on this page selected.`
          : 'Selection cleared.'
      );
    } else if (target.matches('[data-sk-select-row]')) {
      sync();
    }
  });

  sync(false);
  const observer = new MutationObserver(() => sync());
  observer.observe(container, { subtree: true, childList: true, attributes: true, attributeFilter: ['hidden', 'disabled'] });
  const bulk = document.getElementById(container.dataset.skBulkBar ?? '');
  const clearButton = bulk?.querySelector<HTMLElement>('[data-sk-clear-selection]');
  const clear = (): void => {
    for (const row of allRows()) row.checked = false;
    sync(); rows()[0]?.focus(); announce('Selection cleared.');
  };
  const offClear = clearButton ? on(clearButton, 'click', clear) : undefined;

  return {
    get selected() {
      return selected();
    },
    clear() {
      for (const row of rows()) row.checked = false;
      sync();
      announce('Selection cleared.');
    },
    destroy: combine(offAll, offClear, () => observer.disconnect()),
  };
}

/* ================================================================== *
 * Async switch
 * ================================================================== */

export interface AsyncSwitchOptions {
  /** Resolve true to keep the new state, false to revert. */
  onToggle: (next: boolean) => Promise<boolean>;
  /** Used in announcements. Falls back to the accessible name. */
  label?: string;
}

/**
 * A switch that shows pending until the server confirms.
 *
 * A switch that flips instantly and silently reverts on failure has lied to the
 * user. Showing pending is slower and honest.
 */
export function createAsyncSwitch(
  input: HTMLInputElement,
  options: AsyncSwitchOptions
): { destroy: Cleanup } {
  const wrapper = input.closest<HTMLElement>('.sk-switch') ?? input.parentElement ?? input;

  const off = on(input, 'change', async () => {
    const intended = input.checked;
    const label = options.label ?? input.getAttribute('aria-label') ?? 'Setting';

    // Revert until confirmed — do not claim a state we have not reached.
    input.checked = !intended;
    input.disabled = true;
    input.setAttribute('aria-busy', 'true');
    toggleAttr(wrapper, 'data-pending', true);
    announce(`${label}, saving.`);

    let ok = false;
    try {
      ok = await options.onToggle(intended);
    } catch {
      ok = false;
    }

    input.checked = ok ? intended : !intended;
    input.disabled = false;
    input.removeAttribute('aria-busy');
    wrapper.removeAttribute('data-pending');

    announce(
      ok
        ? `${label} turned ${intended ? 'on' : 'off'}.`
        : `${label} could not be changed. It is still ${intended ? 'off' : 'on'}.`,
      ok ? 'polite' : 'assertive'
    );
  });

  return { destroy: off };
}
