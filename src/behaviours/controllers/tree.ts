import { combine, emit, on, type Cleanup } from '../core/dom.js';
import { announce } from '../core/live.js';

export interface TreeOptions {
  multiSelect?: boolean;
  /** Opt in to route activation. Cannot be combined with checkbox selection. */
  navigation?: boolean;
  /** The host owns navigation and calls setCurrent() after a successful route change. */
  onActivate?: (item: HTMLElement, id: string) => void;
  /** Return rendered treeitems. The controller owns insertion and rejects stale results. */
  loadChildren?: (item: HTMLElement, signal: AbortSignal) => Promise<HTMLElement[]>;
}

export interface TreeFilterResult {
  query: string;
  /** Matching loaded nodes, excluding author-hidden nodes and their descendants. */
  matched: number;
  total: number;
}

export interface TreeRevealOptions { focus?: boolean; scroll?: boolean; }

export interface TreeController {
  readonly current: string | null;
  readonly query: string;
  refresh(): void;
  /** Filter loaded labels only; clearing restores expansion and author-hidden state. */
  filter(query: string): TreeFilterResult;
  /** Navigation mode only. Unknown IDs leave the current route unchanged. */
  setCurrent(id: string | null): boolean;
  /** Clear filtering and reveal a loaded current item. Focus defaults to false; scroll defaults to true. */
  revealCurrent(options?: TreeRevealOptions): boolean;
  destroy: Cleanup;
}

export class TreeConfigurationError extends Error {
  constructor(
    readonly code: 'invalid-mode' | 'missing-node-id' | 'duplicate-node-id' | 'invalid-children' | 'invalid-current',
    message: string,
    readonly nodeId?: string,
  ) { super(message); this.name = 'TreeConfigurationError'; }
}

interface NodeView { hidden: HTMLElement['hidden']; expanded: string | null; }

export function createTree(root: HTMLElement, options: TreeOptions = {}): TreeController {
  const multi = options.multiSelect ?? root.classList.contains('sk-tree--multi');
  const navigation = options.navigation ?? root.hasAttribute('data-sk-tree-navigation');
  if (navigation && (multi || root.getAttribute('aria-multiselectable') === 'true')) {
    throw new TreeConfigurationError('invalid-mode', 'Tree navigation and multiSelect are separate interaction modes.');
  }
  const all = () => Array.from(root.querySelectorAll<HTMLElement>('[role="treeitem"]')).filter(item => item.closest('[role="tree"]') === root);
  // The tree can initialize inside a closed drawer; only its own branches
  // determine the roving tab stop, independently of ancestor visibility.
  const items = () => all().filter(item => {
    for (let node: HTMLElement | null = item; node && node !== root; node = node.parentElement) if (node.hidden) return false;
    return true;
  });
  const group = (item: HTMLElement) => item.querySelector<HTMLElement>(':scope > [role="group"]');
  const row = (item: HTMLElement) => item.querySelector<HTMLElement>(':scope > .sk-tree__row');
  const label = (item: HTMLElement) => row(item)?.querySelector('.sk-tree__label')?.textContent?.trim() ?? '';
  const disabled = (item: HTMLElement) => item.getAttribute('aria-disabled') === 'true';
  const parent = (item: HTMLElement): HTMLElement | null => {
    const candidate = item.parentElement?.closest<HTMLElement>('[role="treeitem"]');
    return candidate && root.contains(candidate) ? candidate : null;
  };
  const currentItem = () => navigation ? all().find(item => item.getAttribute('aria-current') === 'page') : undefined;
  const pending = new Map<HTMLElement, AbortController>();
  const titles = new Map<HTMLElement, { original: string | null; owned: string }>();
  let destroyed = false, initialized = false, buffer = '', lastKey = 0, query = '';
  let filterResult: TreeFilterResult = { query: '', matched: 0, total: 0 };
  let beforeFilter: Map<HTMLElement, NodeView> | null = null;
  const filterCollapsed = new Set<HTMLElement>();

  function validateIds(nodes: HTMLElement[]): void {
    if (!navigation) return;
    const seen = new Set<string>();
    for (const item of nodes) {
      const id = item.dataset.value;
      if (!id?.trim()) throw new TreeConfigurationError('missing-node-id', 'Navigation treeitems require a nonempty, stable data-value.');
      if (seen.has(id)) throw new TreeConfigurationError('duplicate-node-id', `Duplicate navigation tree data-value: ${id}.`, id);
      seen.add(id);
    }
    if (nodes.filter(item => item.getAttribute('aria-current') === 'page').length > 1) {
      throw new TreeConfigurationError('invalid-current', 'A navigation tree can have only one aria-current="page" item.');
    }
  }
  // Reject invalid initialization before installing handlers or changing the DOM.
  validateIds(all());

  function tabStop(item: HTMLElement | undefined): void {
    for (const node of all()) node.tabIndex = node === item ? 0 : -1;
    root.tabIndex = item ? -1 : 0;
  }
  function focus(item: HTMLElement): void { tabStop(item); item.focus(); }
  function preferred(): HTMLElement | undefined {
    return currentItem() ?? all().find(item => item.getAttribute(multi ? 'aria-checked' : 'aria-selected') === 'true');
  }
  function openAncestors(item: HTMLElement): void {
    for (let ancestor = parent(item); ancestor; ancestor = parent(ancestor)) {
      if (disabled(ancestor)) break;
      ancestor.setAttribute('aria-expanded', 'true');
      const children = group(ancestor); if (children) children.hidden = false;
    }
  }
  function reconcile(): void {
    if (!multi) return;
    for (const item of all().reverse()) {
      const descendants = Array.from(group(item)?.querySelectorAll<HTMLElement>('[role="treeitem"]') ?? []).filter(node => !group(node) && !disabled(node));
      if (!descendants.length) continue;
      const checked = descendants.filter(node => node.getAttribute('aria-checked') === 'true').length;
      item.setAttribute('aria-checked', checked === descendants.length ? 'true' : checked ? 'mixed' : 'false');
    }
  }
  function authorHidden(item: HTMLElement): boolean {
    for (let node: HTMLElement | null = item; node; node = parent(node)) {
      if (beforeFilter?.get(node)?.hidden ?? node.hidden) return true;
    }
    return false;
  }
  function applyFilter(): TreeFilterResult {
    const nodes = all();
    if (beforeFilter) for (const item of nodes) {
      if (!beforeFilter.has(item)) beforeFilter.set(item, { hidden: item.hidden, expanded: item.getAttribute('aria-expanded') });
    }
    const eligible = nodes.filter(item => !authorHidden(item));
    const matches = eligible.filter(item => !query || label(item).toLowerCase().includes(query.toLowerCase()));
    if (query) {
      const included = new Set(matches), ancestors = new Set<HTMLElement>();
      for (const item of matches) for (let ancestor = parent(item); ancestor; ancestor = parent(ancestor)) {
        included.add(ancestor); ancestors.add(ancestor);
      }
      for (const item of nodes) {
        item.hidden = !included.has(item);
        item.toggleAttribute('data-sk-tree-match', matches.includes(item));
        if (group(item) && ancestors.has(item)) item.setAttribute('aria-expanded', String(!filterCollapsed.has(item)));
      }
    }
    return { query, matched: matches.length, total: eligible.length };
  }
  function syncGroups(): void {
    for (const item of all()) {
      const children = group(item);
      if (children) children.hidden = item.getAttribute('aria-expanded') !== 'true';
      else if (!item.hasAttribute('data-sk-loadable')) item.removeAttribute('aria-expanded');
    }
  }
  function abort(item: HTMLElement): void {
    for (const [node, request] of pending) if (node === item || item.contains(node)) {
      request.abort(); pending.delete(node); node.removeAttribute('aria-busy');
      if (!group(node)) node.setAttribute('aria-expanded', 'false');
    }
  }
  function refresh(notifyFilter = true): void {
    if (destroyed) return;
    // Hiding a focused item can synchronously reset activeElement to body.
    // Capture it before changing filter visibility so focus can be recovered.
    const nodes = all(), active = document.activeElement;
    validateIds(nodes);
    for (const item of pending.keys()) if (!root.contains(item)) abort(item);
    for (const item of nodes) {
      if (navigation) { item.removeAttribute('aria-selected'); item.removeAttribute('aria-checked'); }
      if (multi && !item.hasAttribute('aria-checked')) item.setAttribute('aria-checked', 'false');
      if (multi) {
        item.removeAttribute('aria-selected');
        const target = row(item);
        if (target && !target.querySelector('.sk-tree__check')) {
          const check = document.createElement('span'); check.className = 'sk-tree__check'; check.setAttribute('aria-hidden', 'true'); target.prepend(check);
        }
      }
      const text = row(item)?.querySelector<HTMLElement>('.sk-tree__label');
      if (text && (!text.hasAttribute('title') || titles.get(text)?.owned === text.title)) {
        const full = label(item); const previous = titles.get(text);
        titles.set(text, { original: previous ? previous.original : text.getAttribute('title'), owned: full }); text.title = full;
      }
    }
    if (multi) root.setAttribute('aria-multiselectable', 'true');
    reconcile();
    if (!initialized && preferred()) openAncestors(preferred()!);
    const previousFilter = filterResult;
    filterResult = applyFilter(); syncGroups();
    const visible = items();
    const initial = visible.find(item => item === active)
      ?? (!initialized ? visible.find(item => item === preferred()) : undefined)
      ?? visible.find(item => item.tabIndex === 0)
      ?? visible.find(item => item === preferred()) ?? visible[0];
    tabStop(initial);
    // Filtering/removal must not leave focus on an invisible treeitem.
    const activeItem = active instanceof Element ? active.closest<HTMLElement>('[role="treeitem"]') : null;
    if (activeItem && root.contains(activeItem) && !visible.includes(activeItem)) {
      if (initial) initial.focus(); else root.focus();
    }
    initialized = true;
    if (notifyFilter && query && (filterResult.matched !== previousFilter.matched || filterResult.total !== previousFilter.total)) {
      emit(root, 'sk:tree:filter', { ...filterResult });
    }
  }
  async function expand(item: HTMLElement, open: boolean): Promise<void> {
    if (destroyed || disabled(item)) return;
    let children = group(item);
    if (!children && !item.hasAttribute('data-sk-loadable')) return;
    if (query) { if (open) filterCollapsed.delete(item); else filterCollapsed.add(item); }
    if (!open) {
      abort(item); item.setAttribute('aria-expanded', 'false');
      if (children?.contains(document.activeElement)) focus(item);
      refresh(); emit(root, 'sk:tree:expand', { item, id: item.dataset.value, expanded: false }); return;
    }
    if (!children && options.loadChildren) {
      if (pending.has(item)) return;
      const request = new AbortController(); pending.set(item, request);
      // Requested expansion is visible immediately, so a second click can cancel.
      item.setAttribute('aria-expanded', 'true'); item.setAttribute('aria-busy', 'true'); item.removeAttribute('data-load-error');
      try {
        const nodes = await options.loadChildren(item, request.signal);
        if (destroyed || request.signal.aborted || pending.get(item) !== request || !root.contains(item)) return;
        if (!Array.isArray(nodes) || new Set(nodes).size !== nodes.length || nodes.some(node => !(node instanceof HTMLElement) || node.getAttribute('role') !== 'treeitem' || root.contains(node) || node.isConnected)) {
          throw new TreeConfigurationError('invalid-children', 'loadChildren must return distinct, detached HTMLElement treeitems.');
        }
        validateIds([...all(), ...nodes.flatMap(node => [node, ...Array.from(node.querySelectorAll<HTMLElement>('[role="treeitem"]'))])]);
        if (nodes.length) {
          children = document.createElement('ul'); children.setAttribute('role', 'group'); children.append(...nodes); item.appendChild(children);
          if (multi && item.getAttribute('aria-checked') === 'true') children.querySelectorAll('[role="treeitem"]:not([aria-disabled="true"])').forEach(node => node.setAttribute('aria-checked', 'true'));
        }
        item.removeAttribute('data-sk-loadable');
      } catch (error) {
        if (destroyed || request.signal.aborted || !root.contains(item)) return;
        item.setAttribute('data-load-error', ''); item.setAttribute('aria-expanded', 'false');
        const detail = error instanceof TreeConfigurationError ? { code: error.code, message: error.message } : { code: 'load-failed', message: 'Could not load children.' };
        emit(root, 'sk:tree:error', { item, id: item.dataset.value, error: detail });
        announce(`Could not load ${label(item)}. Expand again to retry.`); return;
      } finally {
        if (pending.get(item) === request) { pending.delete(item); item.removeAttribute('aria-busy'); }
      }
    }
    if (!children) { refresh(); return; }
    item.setAttribute('aria-expanded', 'true'); refresh();
    emit(root, 'sk:tree:expand', { item, id: item.dataset.value, expanded: true });
  }
  function select(item: HTMLElement): void {
    if (disabled(item)) return;
    if (multi) {
      const checked = item.getAttribute('aria-checked') !== 'true';
      for (const node of [item, ...Array.from(group(item)?.querySelectorAll<HTMLElement>('[role="treeitem"]') ?? [])]) if (!disabled(node)) node.setAttribute('aria-checked', String(checked));
      reconcile();
    } else for (const node of all()) node.setAttribute('aria-selected', String(node === item));
    emit(root, 'sk:tree:select', { item, id: item.dataset.value, value: item.dataset.value ?? label(item), checked: multi ? item.getAttribute('aria-checked') : undefined });
  }
  function activate(item: HTMLElement): void {
    if (disabled(item)) return;
    if (!navigation) { select(item); return; }
    const id = item.dataset.value!;
    if (emit(root, 'sk:tree:activate', { item, id, value: id })) options.onActivate?.(item, id);
  }
  function filter(value: string): TreeFilterResult {
    if (destroyed) return { query, matched: 0, total: 0 };
    const next = value.trim();
    if (next && !beforeFilter) beforeFilter = new Map(all().map(item => [item, { hidden: item.hidden, expanded: item.getAttribute('aria-expanded') }]));
    if (query !== next) filterCollapsed.clear();
    query = next;
    if (!query && beforeFilter) {
      for (const [item, state] of beforeFilter) {
        if (state.expanded !== 'true' && pending.has(item)) abort(item);
        item.hidden = state.hidden;
        if (state.expanded === null) item.removeAttribute('aria-expanded'); else item.setAttribute('aria-expanded', state.expanded);
        item.removeAttribute('data-sk-tree-match');
      }
      beforeFilter = null;
    }
    root.toggleAttribute('data-sk-tree-filtered', !!query);
    refresh(false); const result = { ...filterResult };
    emit(root, 'sk:tree:filter', result); return result;
  }
  function setCurrent(id: string | null): boolean {
    if (destroyed || !navigation) return false;
    const target = id === null ? undefined : all().find(item => item.dataset.value === id);
    if (id !== null && !target) return false;
    for (const item of all()) { if (item === target) item.setAttribute('aria-current', 'page'); else item.removeAttribute('aria-current'); }
    if (target && !query) openAncestors(target);
    refresh();
    if (target && !root.contains(document.activeElement) && items().includes(target)) tabStop(target);
    return true;
  }
  function revealCurrent(reveal: TreeRevealOptions = {}): boolean {
    if (destroyed || !navigation) return false;
    const item = currentItem(); if (!item || authorHidden(item)) return false;
    if (query) filter('');
    openAncestors(item); refresh();
    if (!items().includes(item)) return false;
    if (reveal.focus ?? false) focus(item);
    if (reveal.scroll ?? true) item.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    return true;
  }

  refresh();
  const click = on(root, 'click', (event: MouseEvent) => {
    const target = event.target as Element;
    const item = target.closest<HTMLElement>('[role="treeitem"]');
    if (!item || item.closest('[role="tree"]') !== root || disabled(item) || !row(item)?.contains(target)) return;
    // Optional host actions inside a row must not also activate its destination.
    if (target.closest('[data-sk-tree-action]')) return;
    focus(item);
    const toggle = !!target.closest('.sk-tree__toggle, .sk-tree__chevron');
    if (navigation) { if (!toggle) activate(item); }
    else if (!multi || !toggle) select(item);
    if ((group(item) || item.hasAttribute('data-sk-loadable')) && (navigation || multi ? toggle : true)) {
      void expand(item, !(pending.has(item) || item.getAttribute('aria-expanded') === 'true'));
    }
  });
  const key = on(root, 'keydown', (event: KeyboardEvent) => {
    if (event.isComposing || (event.target as Element).closest('[data-sk-tree-action]')) return;
    const item = (event.target as Element).closest<HTMLElement>('[role="treeitem"]');
    if (!item || item.closest('[role="tree"]') !== root) return;
    const list = items(), index = list.indexOf(item), rtl = getComputedStyle(root).direction === 'rtl';
    let next: HTMLElement | undefined;
    if (event.key === 'ArrowDown') next = list[Math.min(index + 1, list.length - 1)];
    else if (event.key === 'ArrowUp') next = list[Math.max(0, index - 1)];
    else if (event.key === 'Home') next = list[0];
    else if (event.key === 'End') next = list[list.length - 1];
    else if (event.key === (rtl ? 'ArrowLeft' : 'ArrowRight')) {
      if ((group(item) || item.hasAttribute('data-sk-loadable')) && item.getAttribute('aria-expanded') !== 'true') void expand(item, true);
      else next = Array.from(group(item)?.children ?? []).find((node): node is HTMLElement => node instanceof HTMLElement && list.includes(node));
    } else if (event.key === (rtl ? 'ArrowRight' : 'ArrowLeft')) {
      if (pending.has(item) || group(item) && item.getAttribute('aria-expanded') === 'true') void expand(item, false);
      else next = parent(item) ?? undefined;
    } else if (event.key === '*') {
      for (const sibling of Array.from(item.parentElement?.children ?? [])) if (sibling instanceof HTMLElement && !sibling.hidden) void expand(sibling, true);
    } else if (event.key === 'Enter' || event.key === ' ') activate(item);
    else if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
      const now = Date.now(); buffer = now - lastKey > 700 ? event.key : buffer + event.key; lastKey = now;
      const needle = /^([\s\S])\1*$/.test(buffer) ? event.key : buffer;
      next = list.slice(index + 1).concat(list.slice(0, index + 1)).find(node => label(node).toLowerCase().startsWith(needle.toLowerCase()));
    } else return;
    event.preventDefault(); if (next) focus(next);
  });
  const leave = on(root, 'focusout', (event: FocusEvent) => {
    if (event.relatedTarget instanceof Node && root.contains(event.relatedTarget)) return;
    const item = preferred();
    if (!query && item) { openAncestors(item); syncGroups(); }
    const visible = items(); tabStop(visible.find(node => node === item) ?? visible[0]);
  });
  return {
    get current() { return currentItem()?.dataset.value ?? null; }, get query() { return query; },
    refresh: () => refresh(), filter, setCurrent, revealCurrent,
    destroy: combine(click, key, leave, () => {
      if (destroyed) return;
      if (query) filter('');
      destroyed = true;
      for (const item of pending.keys()) abort(item);
      for (const [text, title] of titles) if (text.title === title.owned) {
        if (title.original === null) text.removeAttribute('title'); else text.title = title.original;
      }
      titles.clear(); beforeFilter = null; filterCollapsed.clear();
    }),
  };
}
