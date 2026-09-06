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

/** Namespace reference markup once, including its local ARIA and behavior links. */
export function scopeIds(root: HTMLElement, prefix: string): void {
  if (root.hasAttribute('data-sk-id-scope')) return;
  root.setAttribute('data-sk-id-scope', prefix);
  const elements = Array.from(root.querySelectorAll<HTMLElement>('*'));
  const ids = new Map(elements.filter(el => el.id).map(el => [el.id, `${prefix}-${el.id}`]));
  const refs = new Set('for aria-controls aria-labelledby aria-describedby aria-activedescendant aria-owns headers data-sk-combobox data-sk-tag-input data-sk-menu-trigger data-sk-popover-trigger data-sk-tooltip-target data-sk-dialog-open data-sk-drawer-open data-sk-disclosure'.split(' '));
  for (const el of elements) for (const attr of Array.from(el.attributes)) {
    if (attr.name === 'id') el.id = ids.get(attr.value) ?? attr.value;
    else if (refs.has(attr.name)) el.setAttribute(attr.name, attr.value.split(/\s+/).map(id => ids.get(id) ?? id).join(' '));
    else if (attr.name === 'href' && attr.value.startsWith('#') && ids.has(attr.value.slice(1))) el.setAttribute('href', `#${ids.get(attr.value.slice(1))}`);
  }
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
