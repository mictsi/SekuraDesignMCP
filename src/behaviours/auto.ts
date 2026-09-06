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
import { createDatePicker, createDateRange, fromISO } from './controllers/datefield.js';
import { createNumberInput, createTagInput, createToolbar } from './controllers/inputs.js';
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
import { createTree } from './controllers/tree.js';
import { createUpload } from './controllers/upload.js';
import { createSlider, guardAction } from './controllers/slider.js';

const MARK = 'skEnhanced';
const registry = new WeakMap<Element, Map<string, Cleanup>>();

/** Dispose owned handlers before removing or replacing a subtree. */
export function dispose(root: ParentNode): void {
  const elements = [...(root instanceof Element ? [root] : []), ...root.querySelectorAll('*')];
  for (const el of elements) for (const cleanup of [...(registry.get(el)?.values() ?? [])]) cleanup();
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
    const elements = Array.from(root.querySelectorAll<T>(selector));
    if (root instanceof HTMLElement && root.matches(selector)) elements.unshift(root as T);
    for (const el of elements) {
      const entries = registry.get(el) ?? new Map<string, Cleanup>();
      if (entries.has(kind)) continue;
      const cleanup = fn(el);
      if (cleanup) {
        let active = true;
        const destroy = (): void => {
          if (!active) return;
          active = false;
          cleanup(); entries.delete(kind);
          if (entries.size) el.dataset[MARK] = [...entries.keys()].join(',');
          else { delete el.dataset[MARK]; registry.delete(el); }
        };
        entries.set(kind, destroy); registry.set(el, entries);
        el.dataset[MARK] = [...entries.keys()].join(',');
        cleanups.push(destroy); count += 1;
      }
    }
  };

  each<HTMLElement>('.sk-button, .sk-icon-button, [data-sk-action]', guardAction, 'action');
  each<HTMLFormElement>('form', (form) => {
    const handler = (event: SubmitEvent): void => {
      const button = event.submitter ?? form.querySelector('[type="submit"][aria-busy="true"]');
      if (button?.matches('[aria-busy="true"], [aria-disabled="true"]')) {
        event.preventDefault(); event.stopImmediatePropagation();
      }
    };
    form.addEventListener('submit', handler, true);
    return () => form.removeEventListener('submit', handler, true);
  }, 'submit-guard');
  each<HTMLElement>('.sk-tree[role=tree]', el => createTree(el).destroy, 'tree');
  each<HTMLElement>('.sk-upload:not([data-sk-custom-upload])', el => createUpload(el).destroy, 'upload');
  each<HTMLInputElement>('.sk-slider__input', input => createSlider(input).destroy, 'slider');

  /* ---- Disclosure ---- */
  each<HTMLElement>('[data-sk-disclosure]', (trigger) => {
    const panel = resolve(trigger.getAttribute('aria-controls') ?? trigger.dataset.skDisclosure ?? null, trigger);
    if (!panel) return;
    return createDisclosure(trigger, panel, { findable: panel.hasAttribute('data-sk-findable') || panel.getAttribute('hidden') === 'until-found' || undefined }).destroy;
  }, 'disclosure');

  /* ---- Accordion ---- */
  each<HTMLElement>('[data-sk-accordion]', (container) => {
    return createAccordion(container, {
      single: container.dataset.skAccordion === 'single',
    }).destroy;
  }, 'accordion');

  /* ---- Tabs ---- */
  each<HTMLInputElement>('[data-sk-number]', (input) => {
    const read = (name: string, fallback?: number) => {
      const raw = input.getAttribute(name);
      return raw === null ? fallback : Number(raw);
    };
    return createNumberInput(input, {
      min: read('min'),
      max: read('max'),
      step: read('step', 1),
      format: input.hasAttribute('data-sk-group'),
    }).destroy;
  }, 'number');

  each<HTMLInputElement>('[data-sk-tag-input]', (input) => {
    const list = resolve(input.getAttribute('data-sk-tag-input'), input) ?? input.nextElementSibling;
    if (!(list instanceof HTMLElement)) return;
    const raw = input.getAttribute('data-sk-tags');
    const opts = input.getAttribute('data-sk-options');
    return createTagInput(input, list, {
      value: raw ? raw.split(',').map((s) => s.trim()).filter(Boolean) : [],
      options: opts ? opts.split(',').map((s) => s.trim()).filter(Boolean) : [],
      strict: input.hasAttribute('data-sk-strict'),
    }).destroy;
  }, 'tagInput');

  each<HTMLElement>('[data-sk-toolbar]', (el) =>
    createToolbar(el, {
      orientation: el.getAttribute('aria-orientation') === 'vertical' ? 'vertical' : 'horizontal',
    }).destroy, 'toolbar');

  each<HTMLElement>('[data-sk-datepicker]', (wrapper) => {
    const input = wrapper.querySelector<HTMLInputElement>('input');
    const trigger = wrapper.querySelector<HTMLElement>('[data-sk-datepicker-trigger]');
    const panel = wrapper.querySelector<HTMLElement>('[data-sk-datepicker-panel]');
    if (!input || !trigger || !panel) return;
    return createDatePicker(input, trigger, panel, {
      min: fromISO(input.getAttribute('min') ?? ''),
      max: fromISO(input.getAttribute('max') ?? ''),
    }).destroy;
  }, 'datepicker');

  each<HTMLElement>('[data-sk-daterange]', (wrapper) => {
    const inputs = wrapper.querySelectorAll<HTMLInputElement>('input');
    const grid = wrapper.querySelector<HTMLElement>('[data-sk-calendar]');
    if (inputs.length < 2 || !grid) return;
    return createDateRange(inputs[0]!, inputs[1]!, grid).destroy;
  }, 'daterange');

  each<HTMLElement>('[data-sk-tabs]', (tablist) => {
    return createTabs(tablist, {
      activation: tablist.dataset.skActivation === 'manual' ? 'manual' : 'automatic',
      orientation: tablist.getAttribute('aria-orientation') === 'vertical' ? 'vertical' : 'horizontal',
    }).destroy;
  }, 'tabs');

  /* ---- Segmented ---- */
  each<HTMLElement>('[data-sk-segmented]:not([data-sk-theme-control])', (group) => createSegmented(group).destroy, 'segmented');

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
    return bindSurface(dialog, 'dialog', () => controller.show(), () => controller.close('cancel'), controller.destroy);
  }, 'dialog');

  /* ---- Drawer ---- */
  each<HTMLElement>('[data-sk-drawer]', (drawer) => {
    const modalAttr = drawer.dataset.skModal;
    const controller = createDrawer(drawer, {
      // A media query switches modality with the viewport, and switches the
      // ARIA along with it.
      modal: modalAttr === 'true' ? true : modalAttr === 'false' ? false : modalAttr,
    });
    return bindSurface(drawer, 'drawer', () => controller.show(), () => controller.close(), controller.destroy);
  }, 'drawer');

  /* ---- Popover ---- */
  each<HTMLElement>('[data-sk-popover-trigger]', (trigger) => {
    const panel = resolve(
      trigger.dataset.skPopoverTrigger || trigger.getAttribute('aria-controls'),
      trigger
    );
    if (!panel) return;
    const controller = createPopover(trigger, panel, { trap: trigger.dataset.skTrap === 'true' });
    const close = (event: MouseEvent): void => {
      if ((event.target as Element).closest('[data-sk-popover-close]')) controller.close();
    };
    panel.addEventListener('click', close);
    return () => { panel.removeEventListener('click', close); controller.destroy(); };
  }, 'popover');

  /* ---- Tooltip ---- */
  each<HTMLElement>('[data-sk-tooltip-target]', trigger => {
    const tip = resolve(trigger.dataset.skTooltipTarget ?? null, trigger);
    if (tip) return createTooltip(trigger, tip).destroy;
  }, 'tooltip-target');
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
      ? createSegmented(group, { onChange: () => {
          const chosen = buttons.find(button => button.getAttribute('aria-checked') === 'true');
          if (chosen) manager.set(chosen.dataset.skThemeOption as 'system' | 'light' | 'dark');
          syncButtons();
        } }).destroy
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
  let stopped = false;
  const removed = new Set<Element>();
  const observer = new MutationObserver(records => {
    for (const record of records) for (const node of record.removedNodes) {
      if (node instanceof Element) removed.add(node);
    }
    if (queued) return;
    queued = true;
    queueMicrotask(() => {
      queued = false;
      if (stopped) return;
      for (const node of removed) if (!root.contains(node)) dispose(node);
      removed.clear();
      enhance(root);
    });
  });
  observer.observe(root, { childList: true, subtree: true });
  return () => {
    stopped = true; observer.disconnect();
    for (const node of removed) if (!root.contains(node)) dispose(node);
    removed.clear(); dispose(root);
  };
}

function bindSurface(surface: HTMLElement, kind: string, show: () => void, close: () => void, destroy: Cleanup): Cleanup {
  // Delegation also covers openers inserted after an already-enhanced surface.
  const click = (event: MouseEvent): void => {
    const target = event.target as Element;
    const opener = target.closest<HTMLElement>(`[data-sk-${kind}-open]`);
    if (opener?.getAttribute(`data-sk-${kind}-open`) === surface.id) {
      event.preventDefault(); show();
    }
    if (surface.contains(target) && target.closest(`[data-sk-${kind}-close]`)) {
      event.preventDefault(); close();
    }
  };
  surface.ownerDocument.addEventListener('click', click);
  return () => { surface.ownerDocument.removeEventListener('click', click); destroy(); };
}
