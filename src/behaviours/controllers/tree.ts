import { combine, emit, on, type Cleanup } from '../core/dom.js';

/** Single-selection tree. Data loading and multi-selection are application-owned. */
export function createTree(root: HTMLElement): { destroy: Cleanup } {
  const items = () => Array.from(root.querySelectorAll<HTMLElement>('[role="treeitem"]')).filter(el => !el.closest('[hidden]'));
  const group = (item: HTMLElement) => item.querySelector<HTMLElement>(':scope > [role="group"]');
  function focus(item: HTMLElement): void { for (const el of items()) el.tabIndex = el === item ? 0 : -1; item.focus(); }
  function expand(item: HTMLElement, open: boolean): void {
    const children = group(item); if (!children) return;
    item.setAttribute('aria-expanded', String(open)); children.hidden = !open;
  }
  for (const item of items()) if (group(item)) expand(item, item.getAttribute('aria-expanded') === 'true');
  const initial = items().find(el => el.getAttribute('aria-selected') === 'true') ?? items()[0];
  for (const item of items()) item.tabIndex = item === initial ? 0 : -1;
  function select(item: HTMLElement): void {
    for (const el of root.querySelectorAll('[role="treeitem"]')) el.setAttribute('aria-selected', String(el === item));
    emit(root, 'sk:tree:select', { item, value: item.dataset.value ?? item.querySelector('.sk-tree__label')?.textContent });
  }
  const click = on(root, 'click', (event: MouseEvent) => {
    const item = (event.target as Element).closest<HTMLElement>('[role="treeitem"]');
    if (!item || !root.contains(item)) return;
    focus(item); select(item);
    if (group(item)) expand(item, item.getAttribute('aria-expanded') !== 'true');
  });
  const key = on(root, 'keydown', (event: KeyboardEvent) => {
    const item = (event.target as Element).closest<HTMLElement>('[role="treeitem"]'); if (!item) return;
    const list = items(), index = list.indexOf(item), rtl = getComputedStyle(root).direction === 'rtl';
    let next: HTMLElement | undefined;
    if (event.key === 'ArrowDown') next = list[Math.min(index + 1, list.length - 1)];
    else if (event.key === 'ArrowUp') next = list[Math.max(0, index - 1)];
    else if (event.key === 'Home') next = list[0];
    else if (event.key === 'End') next = list[list.length - 1];
    else if (event.key === (rtl ? 'ArrowLeft' : 'ArrowRight')) {
      if (group(item) && item.getAttribute('aria-expanded') !== 'true') expand(item, true);
      else next = group(item)?.querySelector<HTMLElement>('[role="treeitem"]') ?? undefined;
    } else if (event.key === (rtl ? 'ArrowRight' : 'ArrowLeft')) {
      if (group(item) && item.getAttribute('aria-expanded') === 'true') expand(item, false);
      else next = item.parentElement?.closest<HTMLElement>('[role="treeitem"]') ?? undefined;
    } else if (event.key === 'Enter' || event.key === ' ') select(item);
    else if (event.key.length === 1 && !event.ctrlKey && !event.metaKey) {
      const ordered = list.slice(index + 1).concat(list.slice(0, index + 1));
      next = ordered.find(el => (el.querySelector('.sk-tree__label')?.textContent ?? '').toLowerCase().startsWith(event.key.toLowerCase()));
    } else return;
    event.preventDefault(); if (next) focus(next);
  });
  return { destroy: combine(click, key) };
}
