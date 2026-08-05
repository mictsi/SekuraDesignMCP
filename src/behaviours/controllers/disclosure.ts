/**
 * Disclosure and accordion.
 *
 * The simplest interactive pattern, and the one most often built wrong: a
 * `<div>` with a click handler, no `aria-expanded`, and content hidden with
 * `visibility` so it stays in the tab order while invisible.
 */

import { combine, ensureId, emit, on, toggleAttr, type Cleanup } from '../core/dom.js';
import { rovingTabindex } from '../core/focus.js';

export interface DisclosureOptions {
  /** Start expanded. Read from aria-expanded when omitted. */
  expanded?: boolean;
  onToggle?: (expanded: boolean) => void;
}

export interface Disclosure {
  readonly expanded: boolean;
  open(): void;
  close(): void;
  toggle(): void;
  destroy: Cleanup;
}

export function createDisclosure(
  trigger: HTMLElement,
  panel: HTMLElement,
  options: DisclosureOptions = {}
): Disclosure {
  const panelId = ensureId(panel, 'sk-disclosure-panel');
  const triggerId = ensureId(trigger, 'sk-disclosure-trigger');

  trigger.setAttribute('aria-controls', panelId);
  // The panel is labelled by its own trigger, so a screen reader user landing in
  // the content knows which disclosure they are inside.
  if (!panel.hasAttribute('aria-labelledby')) panel.setAttribute('aria-labelledby', triggerId);

  // A native <button> is required: a div with a handler is not focusable, is not
  // announced as a control, and does not respond to Enter or Space.
  if (trigger.tagName !== 'BUTTON' && !trigger.hasAttribute('role')) {
    trigger.setAttribute('role', 'button');
    if (!trigger.hasAttribute('tabindex')) trigger.tabIndex = 0;
  }
  if (trigger.tagName === 'BUTTON' && !trigger.hasAttribute('type')) {
    // An untyped button inside a form submits it.
    trigger.setAttribute('type', 'button');
  }

  let expanded = options.expanded ?? trigger.getAttribute('aria-expanded') === 'true';

  function apply(next: boolean, notify: boolean): void {
    expanded = next;
    trigger.setAttribute('aria-expanded', String(next));
    // `hidden` rather than a visibility/height trick: collapsed content must
    // leave the accessibility tree and the tab order, not merely become
    // invisible.
    panel.hidden = !next;
    toggleAttr(panel, 'data-open', next);
    if (notify) {
      options.onToggle?.(next);
      emit(trigger, next ? 'sk:disclosure:open' : 'sk:disclosure:close');
    }
  }

  apply(expanded, false);

  const off = on(trigger, 'click', () => apply(!expanded, true));
  const offKey = on(trigger, 'keydown', (event: KeyboardEvent) => {
    // Only needed for the non-button fallback; a real button already does this.
    if (trigger.tagName === 'BUTTON') return;
    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      apply(!expanded, true);
    }
  });

  return {
    get expanded() {
      return expanded;
    },
    open: () => apply(true, true),
    close: () => apply(false, true),
    toggle: () => apply(!expanded, true),
    destroy: combine(off, offKey),
  };
}

/* ------------------------------------------------------------------ *
 * Accordion
 * ------------------------------------------------------------------ */

export interface AccordionOptions {
  /** Only one panel open at a time. Default false — multiple is friendlier. */
  single?: boolean;
  /** Prevent closing the last open panel. Only meaningful with single. */
  collapsible?: boolean;
  onChange?: (openIds: string[]) => void;
}

export interface Accordion {
  readonly open: string[];
  openItem(id: string): void;
  closeItem(id: string): void;
  destroy: Cleanup;
}

/**
 * A group of disclosures with arrow-key navigation between their headers.
 *
 * Headers form one tab stop; Tab moves out of the accordion, not to the next
 * header. That is the ARIA authoring practice, and it is what stops a ten-item
 * accordion from being ten tab stops.
 */
export function createAccordion(
  container: HTMLElement,
  options: AccordionOptions = {}
): Accordion {
  const { single = false, collapsible = true } = options;

  const pairs = Array.from(
    container.querySelectorAll<HTMLElement>('[data-sk-accordion-trigger]')
  ).map((trigger) => {
    const panelId = trigger.getAttribute('aria-controls');
    const panel = panelId
      ? document.getElementById(panelId)
      : (trigger.nextElementSibling as HTMLElement | null);
    return { trigger, panel };
  }).filter((p): p is { trigger: HTMLElement; panel: HTMLElement } => Boolean(p.panel));

  const disclosures = new Map<string, Disclosure>();
  const cleanups: Cleanup[] = [];

  for (const { trigger, panel } of pairs) {
    const id = ensureId(trigger, 'sk-accordion');
    const d = createDisclosure(trigger, panel, {
      onToggle(next) {
        if (next && single) {
          for (const [otherId, other] of disclosures) {
            if (otherId !== id && other.expanded) other.close();
          }
        }
        if (!next && single && !collapsible) {
          const anyOpen = [...disclosures.values()].some((x) => x.expanded);
          if (!anyOpen) d.open();
        }
        options.onChange?.(
          [...disclosures.entries()].filter(([, x]) => x.expanded).map(([k]) => k)
        );
      },
    });
    disclosures.set(id, d);
    cleanups.push(d.destroy);
  }

  const roving = rovingTabindex(container, {
    orientation: 'vertical',
    items: () => pairs.map((p) => p.trigger),
  });
  cleanups.push(roving.destroy);

  return {
    get open() {
      return [...disclosures.entries()].filter(([, d]) => d.expanded).map(([id]) => id);
    },
    openItem: (id) => disclosures.get(id)?.open(),
    closeItem: (id) => disclosures.get(id)?.close(),
    destroy: combine(...cleanups),
  };
}
