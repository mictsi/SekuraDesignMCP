/**
 * Menu.
 *
 * A menu moves **real DOM focus** between its items. This is the opposite of a
 * combobox, which keeps focus in its input and moves a virtual cursor with
 * `aria-activedescendant`. Mixing the two models breaks both: a menu with a
 * virtual cursor cannot be operated by users who navigate by focus, and a
 * combobox that moves real focus cannot be typed into.
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
import { saveFocus, type FocusRestore } from '../core/focus.js';
import { dismissable } from '../core/dismiss.js';
import { position, type PositionOptions, type Positioner } from '../core/position.js';
import { createTypeahead } from '../core/typeahead.js';

export interface MenuOptions extends PositionOptions {
  /** Close after activating an item. False for checkable menus. */
  closeOnSelect?: boolean;
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

const ITEM_SELECTOR = '[role="menuitem"],[role="menuitemcheckbox"],[role="menuitemradio"]';

export function createMenu(
  trigger: HTMLElement,
  menu: HTMLElement,
  options: MenuOptions = {}
): Menu {
  const { closeOnSelect = true } = options;

  const menuId = ensureId(menu, 'sk-menu');
  const triggerId = ensureId(trigger, 'sk-menu-trigger');

  trigger.setAttribute('aria-haspopup', 'menu');
  trigger.setAttribute('aria-controls', menuId);
  trigger.setAttribute('aria-expanded', 'false');
  if (trigger.tagName === 'BUTTON' && !trigger.hasAttribute('type')) {
    trigger.setAttribute('type', 'button');
  }
  menu.setAttribute('role', 'menu');
  if (!menu.hasAttribute('aria-labelledby')) menu.setAttribute('aria-labelledby', triggerId);
  menu.hidden = true;

  const typeahead = createTypeahead();
  let open = false;
  let restore: FocusRestore | null = null;
  let positioner: Positioner | null = null;
  let undismiss: Cleanup | null = null;

  const items = (): HTMLElement[] =>
    Array.from(menu.querySelectorAll<HTMLElement>(ITEM_SELECTOR)).filter(
      (el) => el.getAttribute('aria-disabled') !== 'true' && !(el as HTMLButtonElement).disabled
    );

  function focusItem(item: HTMLElement | undefined): void {
    if (!item) return;
    // Items are focusable only while the menu is open; -1 keeps them out of the
    // page tab order the rest of the time.
    for (const i of items()) i.tabIndex = i === item ? 0 : -1;
    item.focus();
  }

  function openMenu(focusLast = false): void {
    if (open) return;
    if (!emit(trigger, 'sk:menu:beforeopen')) return;

    restore = saveFocus();
    menu.hidden = false;
    toggleAttr(menu, 'data-open', true);
    trigger.setAttribute('aria-expanded', 'true');
    open = true;

    positioner = position(menu, trigger, options);

    undismiss = dismissable(menu, {
      exclude: [trigger],
      // Focus-out is not used: focus legitimately lives inside the menu, and
      // Tab is handled explicitly below.
      onDismiss: (reason) => closeMenu(reason === 'escape'),
    });

    const list = items();
    focusItem(focusLast ? list[list.length - 1] : list[0]);

    options.onOpenChange?.(true);
    emit(trigger, 'sk:menu:open');
  }

  function closeMenu(restoreFocus = true): void {
    if (!open) return;
    open = false;

    positioner?.destroy();
    positioner = null;
    undismiss?.();
    undismiss = null;

    menu.hidden = true;
    menu.removeAttribute('data-open');
    trigger.setAttribute('aria-expanded', 'false');
    typeahead.reset();

    // Focus must come back to the trigger, including when closing by choosing
    // an item — otherwise the user is dropped at the top of the document.
    if (restoreFocus) restore?.restore();
    else restore?.cancel();
    restore = null;

    options.onOpenChange?.(false);
    emit(trigger, 'sk:menu:close');
  }

  function activate(item: HTMLElement): void {
    if (item.getAttribute('aria-disabled') === 'true') return;

    const role = item.getAttribute('role');
    if (role === 'menuitemcheckbox') {
      item.setAttribute('aria-checked', String(item.getAttribute('aria-checked') !== 'true'));
    } else if (role === 'menuitemradio') {
      const group = item.closest('[role="group"]') ?? menu;
      for (const r of group.querySelectorAll('[role="menuitemradio"]')) {
        r.setAttribute('aria-checked', String(r === item));
      }
    }

    const value = item.dataset.value ?? null;
    options.onSelect?.(item, value);
    emit(item, 'sk:menu:select', { value });

    // Checkable menus stay open so several toggles can be made in one visit.
    if (closeOnSelect && role === 'menuitem') closeMenu(true);
  }

  const offTriggerClick = on(trigger, 'click', (event: MouseEvent) => {
    event.stopPropagation();
    open ? closeMenu(true) : openMenu(false);
  });

  const offTriggerKey = on(trigger, 'keydown', (event: KeyboardEvent) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      openMenu(false);
    } else if (event.key === 'ArrowUp') {
      // Opening upward lands on the last item, matching native menus.
      event.preventDefault();
      openMenu(true);
    }
  });

  const offMenuKey = on(menu, 'keydown', (event: KeyboardEvent) => {
    const list = items();
    if (list.length === 0) return;
    const index = list.indexOf(document.activeElement as HTMLElement);

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        focusItem(list[(index + 1) % list.length]);
        return;
      case 'ArrowUp':
        event.preventDefault();
        focusItem(list[(index - 1 + list.length) % list.length]);
        return;
      case 'Home':
        event.preventDefault();
        focusItem(list[0]);
        return;
      case 'End':
        event.preventDefault();
        focusItem(list[list.length - 1]);
        return;
      case 'Tab':
        // A menu never traps Tab. Close and let focus continue through the page.
        closeMenu(false);
        return;
      case 'Enter':
      case ' ': {
        const item = list[index];
        if (item) {
          event.preventDefault();
          activate(item);
        }
        return;
      }
      default: {
        const match = typeahead.handle(event.key, list, index);
        if (match) {
          event.preventDefault();
          focusItem(match);
        }
      }
    }
  });

  const offMenuClick = on(menu, 'click', (event: MouseEvent) => {
    const item = (event.target as Element).closest<HTMLElement>(ITEM_SELECTOR);
    if (item && menu.contains(item)) activate(item);
  });

  return {
    get open() {
      return open;
    },
    openMenu,
    closeMenu,
    toggle: () => (open ? closeMenu(true) : openMenu(false)),
    destroy: combine(
      () => closeMenu(false),
      offTriggerClick,
      offTriggerKey,
      offMenuKey,
      offMenuClick
    ),
  };
}
