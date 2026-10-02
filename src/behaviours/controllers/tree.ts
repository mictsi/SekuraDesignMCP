import { combine, emit, on, type Cleanup } from '../core/dom.js';
import { announce } from '../core/live.js';

export interface TreeOptions {
  multiSelect?: boolean;
  /** Return rendered treeitems. The controller owns insertion and rejects stale results. */
  loadChildren?: (item: HTMLElement, signal: AbortSignal) => Promise<HTMLElement[]>;
}

export function createTree(root: HTMLElement, options: TreeOptions = {}): { refresh(): void; destroy: Cleanup } {
  const multi = options.multiSelect ?? root.classList.contains('sk-tree--multi');
  const all = () => Array.from(root.querySelectorAll<HTMLElement>('[role="treeitem"]'));
  const items = () => all().filter(el => !el.closest('[hidden]'));
  const group = (item: HTMLElement) => item.querySelector<HTMLElement>(':scope > [role="group"]');
  const label = (item: HTMLElement) => item.querySelector(':scope > .sk-tree__row .sk-tree__label')?.textContent?.trim() ?? '';
  const disabled = (item: HTMLElement) => item.getAttribute('aria-disabled') === 'true';
  const pending = new Map<HTMLElement, AbortController>();
  let destroyed = false, buffer = '', lastKey = 0;
  if (multi) root.setAttribute('aria-multiselectable', 'true');
  function focus(item: HTMLElement): void { for (const el of all()) el.tabIndex = el === item ? 0 : -1; item.focus(); }
  function reconcile(): void {
    if (!multi) return;
    for (const item of all().reverse()) {
      const descendants = Array.from(group(item)?.querySelectorAll<HTMLElement>('[role="treeitem"]') ?? []).filter(el => !group(el) && !disabled(el));
      if (!descendants.length) continue;
      const checked = descendants.filter(el => el.getAttribute('aria-checked') === 'true').length;
      item.setAttribute('aria-checked', checked === descendants.length ? 'true' : checked ? 'mixed' : 'false');
    }
  }
  function refresh(): void {
    for (const item of all()) {
      const children = group(item);
      if (children) children.hidden = item.getAttribute('aria-expanded') !== 'true';
      else if (!item.hasAttribute('data-sk-loadable')) item.removeAttribute('aria-expanded');
      if (multi && !item.hasAttribute('aria-checked')) item.setAttribute('aria-checked', 'false');
      if (multi) {
        item.removeAttribute('aria-selected');
        const row = item.querySelector(':scope > .sk-tree__row');
        if (row && !row.querySelector('.sk-tree__check')) { const check = document.createElement('span'); check.className = 'sk-tree__check'; check.setAttribute('aria-hidden', 'true'); row.prepend(check); }
      }
    }
    const visible = items();
    const initial = visible.find(el => el === document.activeElement) ?? visible.find(el => el.tabIndex === 0) ?? visible.find(el => el.getAttribute('aria-selected') === 'true') ?? visible[0];
    for (const item of all()) item.tabIndex = item === initial ? 0 : -1;
    reconcile();
  }
  async function expand(item: HTMLElement, open: boolean): Promise<void> {
    if (disabled(item)) return;
    if (!open) { pending.get(item)?.abort(); pending.delete(item); item.removeAttribute('aria-busy'); }
    let children = group(item);
    if (open && item.hasAttribute('data-sk-loadable') && !children && options.loadChildren) {
      if (pending.has(item)) return;
      const request = new AbortController(); pending.set(item, request);
      item.setAttribute('aria-busy', 'true'); item.removeAttribute('data-load-error');
      try {
        const nodes = await options.loadChildren(item, request.signal);
        if (destroyed || request.signal.aborted || pending.get(item) !== request) return;
        if (nodes.length) {
          children = document.createElement('ul'); children.setAttribute('role', 'group'); children.append(...nodes); item.appendChild(children);
          if (multi && item.getAttribute('aria-checked') === 'true') children.querySelectorAll('[role="treeitem"]:not([aria-disabled="true"])').forEach(el => el.setAttribute('aria-checked', 'true'));
        }
        item.removeAttribute('data-sk-loadable');
      } catch {
        if (destroyed || request.signal.aborted) return;
        item.setAttribute('data-load-error', ''); item.setAttribute('aria-expanded', 'false');
        announce(`Could not load ${label(item)}. Expand again to retry.`); return;
      } finally { if (pending.get(item) === request) { pending.delete(item); item.removeAttribute('aria-busy'); } }
    }
    if (!children) { if (!item.hasAttribute('data-sk-loadable')) item.removeAttribute('aria-expanded'); return; }
    item.setAttribute('aria-expanded', String(open)); children.hidden = !open;
    if (!open && children.contains(document.activeElement)) focus(item);
    refresh(); emit(root, 'sk:tree:expand', { item, expanded: open });
  }
  function select(item: HTMLElement): void {
    if (disabled(item)) return;
    if (multi) {
      const checked = item.getAttribute('aria-checked') !== 'true';
      for (const node of [item, ...Array.from(group(item)?.querySelectorAll<HTMLElement>('[role="treeitem"]') ?? [])]) if (!disabled(node)) node.setAttribute('aria-checked', String(checked));
      reconcile();
    } else for (const el of all()) el.setAttribute('aria-selected', String(el === item));
    emit(root, 'sk:tree:select', { item, value: item.dataset.value ?? label(item), checked: multi ? item.getAttribute('aria-checked') : undefined });
  }
  refresh();
  const click = on(root, 'click', (event: MouseEvent) => {
    const target = event.target as Element;
    const item = target.closest<HTMLElement>('[role="treeitem"]');
    if (!item || !root.contains(item) || disabled(item)) return;
    focus(item);
    if (!multi || !target.closest('.sk-tree__chevron')) select(item);
    if ((group(item) || item.hasAttribute('data-sk-loadable')) && (!multi || target.closest('.sk-tree__chevron'))) void expand(item, item.getAttribute('aria-expanded') !== 'true');
  });
  const key = on(root, 'keydown', (event: KeyboardEvent) => {
    if (event.isComposing) return;
    const item = (event.target as Element).closest<HTMLElement>('[role="treeitem"]'); if (!item || !root.contains(item)) return;
    const list = items(), index = list.indexOf(item), rtl = getComputedStyle(root).direction === 'rtl';
    let next: HTMLElement | undefined;
    if (event.key === 'ArrowDown') next = list[Math.min(index + 1, list.length - 1)];
    else if (event.key === 'ArrowUp') next = list[Math.max(0, index - 1)];
    else if (event.key === 'Home') next = list[0];
    else if (event.key === 'End') next = list[list.length - 1];
    else if (event.key === (rtl ? 'ArrowLeft' : 'ArrowRight')) {
      if ((group(item) || item.hasAttribute('data-sk-loadable')) && item.getAttribute('aria-expanded') !== 'true') void expand(item, true);
      else next = group(item)?.querySelector<HTMLElement>('[role="treeitem"]') ?? undefined;
    } else if (event.key === (rtl ? 'ArrowRight' : 'ArrowLeft')) {
      if (pending.has(item) || group(item) && item.getAttribute('aria-expanded') === 'true') void expand(item, false);
      else next = item.parentElement?.closest<HTMLElement>('[role="treeitem"]') ?? undefined;
    } else if (event.key === '*') {
      for (const sibling of Array.from(item.parentElement?.children ?? [])) if (sibling instanceof HTMLElement) void expand(sibling, true);
    } else if (event.key === 'Enter' || event.key === ' ') select(item);
    else if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
      const now = Date.now(); buffer = now - lastKey > 700 ? event.key : buffer + event.key; lastKey = now;
      const query = /^([\s\S])\1*$/.test(buffer) ? event.key : buffer;
      next = list.slice(index + 1).concat(list.slice(0, index + 1)).find(el => label(el).toLowerCase().startsWith(query.toLowerCase()));
    } else return;
    event.preventDefault(); if (next) focus(next);
  });
  return { refresh, destroy: combine(click, key, () => { destroyed = true; pending.forEach((request, item) => { request.abort(); item.removeAttribute('aria-busy'); }); pending.clear(); }) };
}
