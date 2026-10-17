/**
 * Action menus move DOM focus. Each submenu owns a separate item sequence;
 * ordinary application navigation should continue to use links/disclosures.
 */

import { combine, direction, ensureId, emit, isVisible, on, type Cleanup } from '../core/dom.js';
import { dismissable } from '../core/dismiss.js';
import { position, type PositionOptions, type Positioner } from '../core/position.js';
import { createTypeahead, type Typeahead } from '../core/typeahead.js';

export interface MenuOptions extends PositionOptions {
  /** Close after a command. Checkable items always stay open. */
  closeOnSelect?: boolean;
  /** Auto uses a single panel on narrow screens; flat menus are unaffected. */
  submenuMode?: 'auto' | 'cascade' | 'drilldown';
  submenuMediaQuery?: string;
  /** Runs after closing, so a command can safely focus a new dialog or page. */
  onSelect?: (item: HTMLElement, value: string | null) => void;
  onOpenChange?: (open: boolean) => void;
}

export interface Menu {
  readonly open: boolean;
  openMenu(focusLast?: boolean): void;
  closeMenu(restoreFocus?: boolean): void;
  toggle(): void;
  destroy: Cleanup;
}

interface Level {
  element: HTMLElement;
  trigger: HTMLElement;
  parent: Level | null;
  child: Level | null;
  open: boolean;
  typeahead: Typeahead;
  positioner: Positioner | null;
  undismiss: Cleanup | null;
  visibility: string;
  pointerEvents: string;
  direction: string;
  modeAttribute: string | null;
  backItems: Map<HTMLElement, HTMLElement['hidden']>;
}

const ITEM_SELECTOR = '[role="menuitem"],[role="menuitemcheckbox"],[role="menuitemradio"]';
const disabled = (item: HTMLElement): boolean =>
  item.getAttribute('aria-disabled') === 'true' || !!(item as HTMLButtonElement).disabled;

export function createMenu(
  trigger: HTMLElement,
  menu: HTMLElement,
  options: MenuOptions = {}
): Menu {
  const doc = menu.ownerDocument;
  const { closeOnSelect = true } = options;
  const mode = options.submenuMode ?? menu.dataset.skMenuMode ?? 'auto';
  const query = mode === 'auto'
    ? doc.defaultView?.matchMedia(options.submenuMediaQuery ?? '(max-width: 40rem)')
    : null;
  const drilldown = (): boolean => mode === 'drilldown' || (mode === 'auto' && !!query?.matches);
  const levels = new Map<HTMLElement, Level>();
  const submenus = new Map<HTMLElement, Level>();
  const invalid = new Map<HTMLElement, string | null>();
  const cleanups: Cleanup[] = [];
  let destroyed = false;

  function ownedItems(level: Level): HTMLElement[] {
    return Array.from(level.element.querySelectorAll<HTMLElement>(ITEM_SELECTOR))
      .filter(item => item.closest('[role="menu"]') === level.element);
  }

  function items(level: Level): HTMLElement[] {
    // aria-disabled items stay discoverable. Native disabled controls cannot
    // receive focus: authors should use aria-disabled for menu items.
    return ownedItems(level).filter(item => !(item as HTMLButtonElement).disabled &&
      !item.closest('[hidden],[inert]') && isVisible(item));
  }

  function register(owner: HTMLElement, element: HTMLElement, parent: Level | null): Level {
    const id = ensureId(element, 'sk-menu');
    owner.setAttribute('aria-haspopup', 'menu');
    owner.setAttribute('aria-controls', id);
    owner.setAttribute('aria-expanded', 'false');
    if (owner.tagName === 'BUTTON' && !owner.hasAttribute('type')) owner.setAttribute('type', 'button');
    element.setAttribute('role', 'menu');
    if (!element.hasAttribute('aria-labelledby')) {
      element.setAttribute('aria-labelledby', ensureId(owner, 'sk-menu-trigger'));
    }
    const level: Level = {
      element, trigger: owner, parent, child: null, open: false,
      typeahead: createTypeahead({
        textOf: item => (item.querySelector('.sk-menu__label')?.textContent ??
          item.getAttribute('aria-label') ?? item.textContent ?? '').trim().toLowerCase(),
      }),
      positioner: null, undismiss: null,
      visibility: element.style.visibility, pointerEvents: element.style.pointerEvents,
      direction: element.style.direction,
      modeAttribute: element.getAttribute('data-sk-menu-mode'), backItems: new Map(),
    };
    levels.set(element, level);
    element.hidden = true;
    for (const item of ownedItems(level)) {
      item.tabIndex = -1;
      if (item.hasAttribute('data-sk-menu-back')) {
        level.backItems.set(item, item.hidden);
        item.hidden = !parent || !drilldown();
      }
      if (!item.hasAttribute('data-sk-submenu')) continue;
      const targetId = item.getAttribute('aria-controls');
      const target = targetId ? doc.getElementById(targetId) : null;
      // Ignore malformed/cyclic markup without turning a broken submenu into
      // an executable command. A diagnostic names the control to repair.
      if (!(target instanceof HTMLElement) || target === element || levels.has(target) || target.contains(element) ||
          item.contains(target) || item.getAttribute('role') !== 'menuitem') {
        invalid.set(item, item.getAttribute('aria-disabled'));
        item.setAttribute('aria-disabled', 'true');
        item.setAttribute('aria-expanded', 'false');
        console.warn('Sekura menu: missing, duplicate or cyclic submenu target.', { trigger: item.id, target: targetId });
        continue;
      }
      submenus.set(item, register(item, target, level));
    }
    cleanups.push(
      on(element, 'keydown', (event: KeyboardEvent) => onMenuKey(level, event)),
      on(element, 'click', (event: MouseEvent) => {
        const item = eventItem(level, event);
        if (item && disabled(item)) {
          event.preventDefault();
          event.stopImmediatePropagation();
        }
      }, true),
      on(element, 'click', (event: MouseEvent) => {
        const item = eventItem(level, event);
        if (!item || !level.open) return;
        if (item.hasAttribute('data-sk-menu-back') && level.parent) {
          event.preventDefault(); closeLevel(level, true); return;
        }
        const child = submenus.get(item);
        if (child) {
          event.preventDefault();
          if (child.open) closeLevel(child, true);
          else openLevel(child);
        } else activate(level, item);
      }),
      on(element, 'focusin', (event: FocusEvent) => {
        const item = eventItem(level, event);
        if (!item || !level.open) return;
        // Pointer focus updates the roving stop and closes a sibling's submenu.
        if (level.child && level.child.trigger !== item) closeLevel(level.child, false);
        for (const candidate of ownedItems(level)) candidate.tabIndex = candidate === item ? 0 : -1;
      })
    );
    return level;
  }

  const root = register(trigger, menu, null);

  function eventItem(level: Level, event: Event): HTMLElement | null {
    const target = event.target instanceof Element ? event.target : null;
    if (target?.closest('[role="menu"]') !== level.element) return null;
    return target.closest<HTMLElement>(ITEM_SELECTOR);
  }

  function focusItem(level: Level, item: HTMLElement | undefined): void {
    if (!item) {
      level.element.tabIndex = -1;
      level.element.focus();
      return;
    }
    if (level.child && level.child.trigger !== item) closeLevel(level.child, false);
    for (const candidate of ownedItems(level)) candidate.tabIndex = candidate === item ? 0 : -1;
    item.focus();
  }

  function showLevel(level: Level): void {
    level.element.style.visibility = 'visible';
    level.element.style.pointerEvents = 'auto';
    level.element.removeAttribute('data-sk-menu-suspended');
  }

  function suspend(level: Level): void {
    // Visibility can be overridden by the child; hidden/inert on an ancestor
    // would also remove the active submenu. No framework-owned nodes are moved.
    level.element.style.visibility = 'hidden';
    level.element.style.pointerEvents = 'none';
    level.element.setAttribute('data-sk-menu-suspended', '');
  }

  function place(level: Level): void {
    level.positioner?.destroy();
    const single = drilldown();
    level.element.setAttribute('data-sk-menu-mode', single ? 'drilldown' : 'cascade');
    if (level.parent) level.element.style.direction = direction(level.trigger);
    for (const item of level.backItems.keys()) item.hidden = !level.parent || !single;
    showLevel(level);
    level.positioner = position(level.element,
      level.parent && !single ? level.trigger : root.trigger,
      level.parent && !single ? { ...options, side: 'inline-end', align: 'start' } : options
    );
    if (level.child && single) suspend(level);
  }

  function openLevel(level: Level, focusLast = false): void {
    if (destroyed || disabled(level.trigger)) return;
    if (level.open) {
      const list = items(level);
      focusItem(level, focusLast ? list[list.length - 1] : list[0]);
      return;
    }
    // A host beforeopen handler can synchronously unmount this controller.
    if (!emit(level.trigger, 'sk:menu:beforeopen') || destroyed) return;
    if (level.parent?.child) closeLevel(level.parent.child, false);
    level.open = true;
    if (level.parent) level.parent.child = level;
    level.element.hidden = false;
    level.element.setAttribute('data-open', '');
    level.trigger.setAttribute('aria-expanded', 'true');
    place(level);
    level.undismiss = dismissable(level.element, {
      exclude: [level.trigger],
      parent: level.parent?.element,
      onDismiss: reason => closeLevel(level, reason === 'escape'),
    });
    if (level.parent && drilldown()) suspend(level.parent);
    const list = items(level);
    focusItem(level, focusLast ? list[list.length - 1] : list[0]);
    if (!level.parent) options.onOpenChange?.(true);
    emit(level.trigger, 'sk:menu:open');
  }

  function closeLevel(level: Level, restoreFocus: boolean): void {
    if (!level.open) return;
    if (level.child) closeLevel(level.child, false);
    level.open = false;
    level.positioner?.destroy(); level.positioner = null;
    level.undismiss?.(); level.undismiss = null;
    level.typeahead.reset();
    level.element.hidden = true;
    level.element.removeAttribute('data-open');
    level.element.removeAttribute('data-sk-menu-suspended');
    level.element.style.visibility = level.visibility;
    level.element.style.pointerEvents = level.pointerEvents;
    level.element.style.direction = level.direction;
    if (level.modeAttribute === null) level.element.removeAttribute('data-sk-menu-mode');
    else level.element.setAttribute('data-sk-menu-mode', level.modeAttribute);
    level.trigger.setAttribute('aria-expanded', 'false');
    for (const item of ownedItems(level)) item.tabIndex = -1;
    if (level.parent) {
      level.parent.child = null;
      showLevel(level.parent);
    }
    if (restoreFocus && level.trigger.isConnected && isVisible(level.trigger) &&
        !level.trigger.closest('[inert]')) {
      if (level.parent) focusItem(level.parent, level.trigger);
      else level.trigger.focus();
    }
    if (!level.parent) options.onOpenChange?.(false);
    emit(level.trigger, 'sk:menu:close');
  }

  function openMenu(focusLast = false): void {
    // Preserve the original flat-menu no-op when it is already open.
    if (!root.open) openLevel(root, focusLast);
  }

  function closeMenu(restoreFocus = true): void { closeLevel(root, restoreFocus); }

  function activate(level: Level, item: HTMLElement): void {
    if (disabled(item) || item.hasAttribute('data-sk-submenu')) return;
    const role = item.getAttribute('role');
    if (role === 'menuitemcheckbox') {
      item.setAttribute('aria-checked', String(item.getAttribute('aria-checked') !== 'true'));
    } else if (role === 'menuitemradio') {
      const group = item.closest('[role="group"]') ?? level.element;
      for (const radio of ownedItems(level).filter(candidate =>
        candidate.getAttribute('role') === 'menuitemradio' &&
        (candidate.closest('[role="group"]') ?? level.element) === group
      )) radio.setAttribute('aria-checked', String(radio === item));
    }
    const value = item.dataset.value ?? null;
    if (closeOnSelect && role === 'menuitem') {
      const active = doc.activeElement;
      // A target click handler may already have focused the next context.
      const ownsFocus = active === doc.body || [...levels.values()].some(candidate =>
        candidate.open && candidate.element.contains(active));
      closeMenu(ownsFocus);
    }
    // Restore/close first. A callback that opens a dialog must keep that focus.
    options.onSelect?.(item, value);
    emit(item, 'sk:menu:select', { value });
  }

  function onMenuKey(level: Level, event: KeyboardEvent): void {
    if (!level.open || event.isComposing || event.altKey || event.ctrlKey || event.metaKey ||
        (event.target as Element).closest('[role="menu"]') !== level.element) return;
    if (event.key === 'Tab') {
      // Return the browser's sequential-focus starting point to the trigger.
      // Its native Tab/Shift+Tab then reaches the next/previous page control.
      closeMenu(true);
      return;
    }
    const list = items(level);
    const index = list.indexOf(doc.activeElement as HTMLElement);
    const item = list[index];
    const forward = direction(level.element) === 'rtl' ? 'ArrowLeft' : 'ArrowRight';
    const backward = direction(level.element) === 'rtl' ? 'ArrowRight' : 'ArrowLeft';
    if (event.key === forward) {
      const child = item && submenus.get(item);
      if (child && !disabled(item)) { event.preventDefault(); openLevel(child); }
      return;
    }
    if (event.key === backward) {
      if (level.parent) { event.preventDefault(); closeLevel(level, true); }
      return;
    }
    if (!list.length) return;
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault(); focusItem(level, list[(index + 1) % list.length]); return;
      case 'ArrowUp':
        event.preventDefault(); focusItem(level, list[(index - 1 + list.length) % list.length]); return;
      case 'Home':
        event.preventDefault(); focusItem(level, list[0]); return;
      case 'End':
        event.preventDefault(); focusItem(level, list[list.length - 1]); return;
      case 'Enter':
      case ' ':
        event.preventDefault();
        if (item && !disabled(item)) item.click();
        return;
      default: {
        const match = level.typeahead.handle(event.key, list, index);
        if (match) { event.preventDefault(); focusItem(level, match); }
      }
    }
  }

  cleanups.push(
    on(trigger, 'click', (event: MouseEvent) => {
      event.stopPropagation();
      if (disabled(trigger)) { event.preventDefault(); return; }
      root.open ? closeMenu(true) : openMenu();
    }),
    on(trigger, 'keydown', (event: KeyboardEvent) => {
      if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
      event.preventDefault();
      openMenu(event.key === 'ArrowUp');
    })
  );
  if (query) cleanups.push(on(query, 'change', () => {
    const active = doc.activeElement as HTMLElement | null;
    for (let level: Level | null = root; level?.open; level = level.child) place(level);
    // A Back item disappears when returning to desktop cascade mode.
    if (active?.hasAttribute('data-sk-menu-back') && active.hidden) {
      const level = levels.get(active.closest<HTMLElement>('[role="menu"]')!);
      if (level?.open) focusItem(level, items(level)[0]);
    }
  }));

  return {
    get open() { return root.open; },
    openMenu,
    closeMenu,
    toggle: () => root.open ? closeMenu(true) : openMenu(),
    destroy: () => {
      if (destroyed) return;
      destroyed = true;
      closeMenu(false);
      combine(...cleanups)();
      for (const level of levels.values()) {
        level.typeahead.reset();
        for (const [item, hidden] of level.backItems) item.hidden = hidden;
      }
      for (const [item, previous] of invalid) {
        if (previous === null) item.removeAttribute('aria-disabled');
        else item.setAttribute('aria-disabled', previous);
      }
    },
  };
}
