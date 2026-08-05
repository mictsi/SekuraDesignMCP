/**
 * DOM helpers.
 *
 * Deliberately small and dependency-free. Everything in this package operates on
 * real DOM elements rather than on framework state, which is what makes it
 * usable from React, Vue, Svelte, Angular, Blazor, htmx or plain HTML without a
 * per-framework reimplementation.
 */

/** Elements that can receive focus, excluding those made inert or hidden. */
const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'details > summary:first-of-type',
  'iframe',
  'audio[controls]',
  'video[controls]',
  '[contenteditable]:not([contenteditable="false"])',
  '[tabindex]:not([tabindex^="-"])',
].join(',');

export function isVisible(el: Element): boolean {
  const he = el as HTMLElement;
  if (he.hidden) return false;
  // offsetParent is null for display:none, but also for position:fixed — hence
  // the client-rect fallback.
  if (he.offsetParent === null) {
    const rect = he.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) return false;
  }
  const style = getComputedStyle(he);
  return style.visibility !== 'hidden' && style.display !== 'none';
}

/** Focusable descendants in DOM order, skipping anything hidden or inert. */
export function focusable(root: ParentNode): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (el) => isVisible(el) && !el.closest('[inert]')
  );
}

let idCounter = 0;
/** Stable unique id, for wiring aria-controls / aria-activedescendant. */
export function uid(prefix = 'sk'): string {
  idCounter += 1;
  return `${prefix}-${idCounter}`;
}

/** Ensure an element has an id, creating one only if needed. */
export function ensureId(el: Element, prefix = 'sk'): string {
  if (!el.id) el.id = uid(prefix);
  return el.id;
}

export type Cleanup = () => void;

/** addEventListener that returns its own remover, so teardown cannot drift. */
export function on<K extends keyof HTMLElementEventMap>(
  target: EventTarget,
  type: K | string,
  handler: (event: HTMLElementEventMap[K]) => void,
  options?: AddEventListenerOptions | boolean
): Cleanup {
  target.addEventListener(type, handler as EventListener, options);
  return () => target.removeEventListener(type, handler as EventListener, options);
}

/** Compose cleanups into one. */
export function combine(...cleanups: Array<Cleanup | undefined>): Cleanup {
  return () => {
    for (const c of cleanups) c?.();
  };
}

/** True when the user has asked for reduced motion. */
export function prefersReducedMotion(): boolean {
  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Writing direction of an element's nearest ancestor that declares one. */
export function direction(el: Element): 'ltr' | 'rtl' {
  return getComputedStyle(el).direction === 'rtl' ? 'rtl' : 'ltr';
}

/**
 * Arrow-key direction, corrected for writing mode.
 *
 * CSS mirrors a layout under dir="rtl" automatically; a key handler does not.
 * Every roving-tabindex widget in this package routes through here so RTL users
 * get the movement they expect rather than the movement the DOM order implies.
 */
export function arrowDelta(event: KeyboardEvent, el: Element, orientation: 'horizontal' | 'vertical' | 'both' = 'both'): -1 | 0 | 1 {
  const rtl = direction(el) === 'rtl';
  const horizontal = orientation !== 'vertical';
  const vertical = orientation !== 'horizontal';

  switch (event.key) {
    case 'ArrowRight':
      return horizontal ? ((rtl ? -1 : 1) as -1 | 1) : 0;
    case 'ArrowLeft':
      return horizontal ? ((rtl ? 1 : -1) as -1 | 1) : 0;
    case 'ArrowDown':
      return vertical ? 1 : 0;
    case 'ArrowUp':
      return vertical ? -1 : 0;
    default:
      return 0;
  }
}

/** Dispatch a cancelable custom event; returns false when prevented. */
export function emit<T>(el: Element, type: string, detail?: T): boolean {
  return el.dispatchEvent(
    new CustomEvent(type, { detail, bubbles: true, cancelable: true })
  );
}

/** Set or remove an attribute from a boolean, so callers never pass "false". */
export function toggleAttr(el: Element, name: string, present: boolean, value = ''): void {
  if (present) el.setAttribute(name, value);
  else el.removeAttribute(name);
}
