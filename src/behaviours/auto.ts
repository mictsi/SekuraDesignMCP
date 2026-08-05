/**
 * Data-attribute auto-initialisation.
 *
 * `enhance()` scans for markers and wires the matching controller. It is
 * **idempotent** — every enhanced element is tagged, so calling it again after a
 * partial page update only wires what is new.
 *
 * That property is what makes this usable from server-rendered stacks that swap
 * HTML in at runtime: htmx, Turbo, Blazor Server, Livewire, HTMX-style Rails.
 * Those have no component lifecycle to hook, so they call `enhance()` after a
 * swap and everything works.
 */

import { type Cleanup } from './core/dom.js';
import { createAccordion, createDisclosure } from './controllers/disclosure.js';
import { createSegmented, createTabs } from './controllers/tabs.js';
import { createMenu } from './controllers/menu.js';
import { createCombobox } from './controllers/combobox.js';
import {
  createDialog,
  createDrawer,
  createPopover,
  createTooltip,
} from './controllers/overlays.js';
import { createSelection, createThemeManager } from './controllers/misc.js';

const MARK = 'skEnhanced';
const registry = new WeakMap<Element, Cleanup[]>();

function claim(el: HTMLElement, kind: string): boolean {
  const marks = (el.dataset[MARK] ?? '').split(',').filter(Boolean);
  if (marks.includes(kind)) return false;
  marks.push(kind);
  el.dataset[MARK] = marks.join(',');
  return true;
}

function track(el: Element, cleanup: Cleanup): void {
  const list = registry.get(el) ?? [];
  list.push(cleanup);
  registry.set(el, list);
}

/** Resolve a reference that may be an id or a selector. */
function resolve(value: string | null, from: Element): HTMLElement | null {
  if (!value) return null;
  if (value.startsWith('#') || value.startsWith('.') || value.startsWith('[')) {
    return document.querySelector<HTMLElement>(value);
  }
  return (
    document.getElementById(value) ??
    from.parentElement?.querySelector<HTMLElement>(`[data-sk-target="${value}"]`) ??
    null
  );
}

export interface EnhanceResult {
  /** How many elements were newly wired. */
  count: number;
  /** Tear down everything wired by this call. */
  destroy: Cleanup;
}

/**
 * Wire every recognised element inside `root`.
 *
 * Safe to call repeatedly. Elements already wired are skipped.
 */
export function enhance(root: ParentNode = document): EnhanceResult {
  const cleanups: Cleanup[] = [];
  let count = 0;

  const each = <T extends HTMLElement>(selector: string, fn: (el: T) => Cleanup | void, kind: string) => {
    for (const el of Array.from(root.querySelectorAll<T>(selector))) {
      if (!claim(el, kind)) continue;
      const cleanup = fn(el);
      if (cleanup) {
        track(el, cleanup);
        cleanups.push(cleanup);
      }
      count += 1;
    }
  };

  /* ---- Disclosure ---- */
  each<HTMLElement>('[data-sk-disclosure]', (trigger) => {
    const panel = resolve(trigger.getAttribute('aria-controls') ?? trigger.dataset.skDisclosure ?? null, trigger);
    if (!panel) return;
    return createDisclosure(trigger, panel).destroy;
  }, 'disclosure');

  /* ---- Accordion ---- */
  each<HTMLElement>('[data-sk-accordion]', (container) => {
    return createAccordion(container, {
      single: container.dataset.skAccordion === 'single',
    }).destroy;
  }, 'accordion');

  /* ---- Tabs ---- */
  each<HTMLElement>('[data-sk-tabs]', (tablist) => {
    return createTabs(tablist, {
      activation: tablist.dataset.skActivation === 'manual' ? 'manual' : 'automatic',
      orientation: tablist.getAttribute('aria-orientation') === 'vertical' ? 'vertical' : 'horizontal',
    }).destroy;
  }, 'tabs');

  /* ---- Segmented ---- */
  each<HTMLElement>('[data-sk-segmented]', (group) => createSegmented(group).destroy, 'segmented');

  /* ---- Menu ---- */
  each<HTMLElement>('[data-sk-menu-trigger]', (trigger) => {
    const menu = resolve(
      trigger.dataset.skMenuTrigger || trigger.getAttribute('aria-controls'),
      trigger
    );
    if (!menu) return;
    return createMenu(trigger, menu, {
      closeOnSelect: trigger.dataset.skCloseOnSelect !== 'false',
    }).destroy;
  }, 'menu');

  /* ---- Combobox ---- */
  each<HTMLInputElement>('[data-sk-combobox]', (input) => {
    const listbox = resolve(
      input.dataset.skCombobox || input.getAttribute('aria-controls'),
      input
    );
    if (!listbox) return;
    return createCombobox(input, listbox).destroy;
  }, 'combobox');

  /* ---- Dialog ---- */
  each<HTMLElement>('[data-sk-dialog]', (dialog) => {
    const controller = createDialog(dialog, {
      dismissible: dialog.dataset.skDismissible !== 'false',
    });
    // Openers live outside the dialog, so they are wired here rather than in the
    // controller.
    const openers = Array.from(
      document.querySelectorAll<HTMLElement>(`[data-sk-dialog-open="${dialog.id}"]`)
    );
    const offs = openers.map((btn) => {
      const handler = () => controller.show();
      btn.addEventListener('click', handler);
      return () => btn.removeEventListener('click', handler);
    });
    const closers = Array.from(dialog.querySelectorAll<HTMLElement>('[data-sk-dialog-close]'));
    const closeOffs = closers.map((btn) => {
      const handler = () => controller.close('cancel');
      btn.addEventListener('click', handler);
      return () => btn.removeEventListener('click', handler);
    });
    return () => {
      controller.destroy();
      for (const off of [...offs, ...closeOffs]) off();
    };
  }, 'dialog');

  /* ---- Drawer ---- */
  each<HTMLElement>('[data-sk-drawer]', (drawer) => {
    const modalAttr = drawer.dataset.skModal;
    const controller = createDrawer(drawer, {
      // A media query switches modality with the viewport, and switches the
      // ARIA along with it.
      modal: modalAttr === 'true' ? true : modalAttr === 'false' ? false : modalAttr,
    });
    const openers = Array.from(
      document.querySelectorAll<HTMLElement>(`[data-sk-drawer-open="${drawer.id}"]`)
    );
    const offs = openers.map((btn) => {
      const handler = () => controller.show();
      btn.addEventListener('click', handler);
      return () => btn.removeEventListener('click', handler);
    });
    const closers = Array.from(drawer.querySelectorAll<HTMLElement>('[data-sk-drawer-close]'));
    const closeOffs = closers.map((btn) => {
      const handler = () => controller.close();
      btn.addEventListener('click', handler);
      return () => btn.removeEventListener('click', handler);
    });
    return () => {
      controller.destroy();
      for (const off of [...offs, ...closeOffs]) off();
    };
  }, 'drawer');

  /* ---- Popover ---- */
  each<HTMLElement>('[data-sk-popover-trigger]', (trigger) => {
    const panel = resolve(
      trigger.dataset.skPopoverTrigger || trigger.getAttribute('aria-controls'),
      trigger
    );
    if (!panel) return;
    return createPopover(trigger, panel, { trap: trigger.dataset.skTrap === 'true' }).destroy;
  }, 'popover');

  /* ---- Tooltip ---- */
  each<HTMLElement>('[data-sk-tooltip]', (trigger) => {
    const text = trigger.dataset.skTooltip ?? '';
    if (!text) return;
    // One tip element per trigger, created lazily so markup stays clean.
    const tip = document.createElement('span');
    tip.className = 'sk-tooltip';
    document.body.appendChild(tip);
    const controller = createTooltip(trigger, tip, { text });
    return () => {
      controller.destroy();
      tip.remove();
    };
  }, 'tooltip');

  /* ---- Table selection ---- */
  each<HTMLElement>('[data-sk-selection]', (container) => {
    return createSelection(container, { noun: container.dataset.skSelection || 'items' }).destroy;
  }, 'selection');

  /* ---- Theme controls ---- */
  each<HTMLElement>('[data-sk-theme-control]', (group) => {
    const manager = getTheme();
    const buttons = Array.from(group.querySelectorAll<HTMLElement>('[data-sk-theme-option]'));

    const syncButtons = (): void => {
      const current = manager.get();
      for (const btn of buttons) {
        const on_ = btn.dataset.skThemeOption === current;
        btn.setAttribute('aria-checked', String(on_));
        btn.tabIndex = on_ ? 0 : -1;
      }
    };

    const offs = buttons.map((btn) => {
      const handler = (): void => {
        manager.set(btn.dataset.skThemeOption as 'system' | 'light' | 'dark');
        syncButtons();
      };
      btn.addEventListener('click', handler);
      return () => btn.removeEventListener('click', handler);
    });

    // Arrow-key movement comes from the segmented controller when the group also
    // carries role="radiogroup".
    const segmented = group.getAttribute('role') === 'radiogroup'
      ? createSegmented(group, {}).destroy
      : undefined;

    syncButtons();
    return () => {
      for (const off of offs) off();
      segmented?.();
    };
  }, 'theme-control');

  return {
    count,
    destroy: () => {
      for (const c of cleanups) c();
    },
  };
}

/* ------------------------------------------------------------------ *
 * Singletons
 * ------------------------------------------------------------------ */

let themeManager: ReturnType<typeof createThemeManager> | null = null;

/** The shared theme manager. Created on first use. */
export function getTheme(): ReturnType<typeof createThemeManager> {
  themeManager ??= createThemeManager();
  return themeManager;
}

/**
 * Enhance now, and again whenever the DOM changes.
 *
 * Useful for stacks that swap markup without a lifecycle hook. The observer is
 * debounced to a microtask so a burst of mutations costs one pass.
 */
export function autoEnhance(root: HTMLElement = document.body): Cleanup {
  enhance(root);

  let queued = false;
  const observer = new MutationObserver(() => {
    if (queued) return;
    queued = true;
    queueMicrotask(() => {
      queued = false;
      enhance(root);
    });
  });
  observer.observe(root, { childList: true, subtree: true });

  return () => observer.disconnect();
}
