import { combine, emit, ensureId, on, type Cleanup } from '../core/dom.js';
import { createDialog } from './overlays.js';

export interface CommandItem { id: string; label: string; context?: string; group?: string; disabled?: boolean }
export interface CommandPaletteOptions {
  sources?: Array<(query: string, signal: AbortSignal) => Promise<CommandItem[]>>;
  shortcut?: string | false;
  recentLimit?: number;
  onSelect?: (item: HTMLElement, id: string) => void;
}
/** Owns search and keyboard state. The host owns navigation and command execution. */
export function createCommandPalette(root: HTMLElement, options: CommandPaletteOptions = {}): { show(): void; close(): void; refresh(): void; destroy: Cleanup } {
  const input = root.querySelector<HTMLInputElement>('.sk-command-palette__input');
  const results = root.querySelector<HTMLElement>('.sk-command-palette__results');
  if (!input || !results) throw new Error('Command palette needs its search input and result list.');
  let status = root.querySelector<HTMLElement>('[role="status"]'); const ownsStatus = !status;
  if (!status) { status = document.createElement('p'); status.className = 'sk-visually-hidden'; status.setAttribute('role', 'status'); root.appendChild(status); }
  let empty = root.querySelector<HTMLElement>('[data-sk-palette-empty]'); const ownsEmpty = !empty;
  if (!empty) { empty = document.createElement('p'); empty.className = 'sk-command-palette__empty'; empty.dataset.skPaletteEmpty = ''; empty.hidden = true; results.after(empty); }
  let active = -1, request: AbortController | null = null, destroyed = false;
  let changed: HTMLElement[] = [];
  const recent: string[] = [];
  const all = () => Array.from(results.querySelectorAll<HTMLElement>('[role="option"]'));
  const visible = () => all().filter(el => !el.hidden && !el.closest('[hidden]') && el.getAttribute('aria-disabled') !== 'true');
  const idOf = (el: HTMLElement) => el.dataset.value ?? el.dataset.href ?? ensureId(el, 'sk-command');
  input.setAttribute('role', 'combobox'); input.setAttribute('aria-controls', ensureId(results, 'sk-commands'));
  input.setAttribute('aria-autocomplete', 'list'); input.setAttribute('aria-expanded', 'false');
  results.setAttribute('role', 'listbox');
  function setActive(index: number): void {
    const list = visible(); active = list.length && index >= 0 ? Math.min(index, list.length - 1) : -1;
    input!.removeAttribute('aria-activedescendant');
    all().forEach(el => { const selected = list[active] === el; el.toggleAttribute('data-active', selected); el.setAttribute('aria-selected', String(selected)); });
    const item = list[active]; if (item) { input!.setAttribute('aria-activedescendant', ensureId(item, 'sk-command')); item.scrollIntoView({ block: 'nearest' }); }
  }
  function cancel(): void { request?.abort(); request = null; results!.removeAttribute('aria-busy'); root.removeAttribute('data-loading'); }
  function feedback(message: string, show = false): void { status!.textContent = message; empty!.textContent = message; empty!.hidden = !show; }
  function rankRecent(): void {
    results!.querySelector('[data-sk-recent]')?.remove();
    if (input!.value.trim() || !recent.length) return;
    const group = document.createElement('div'); group.setAttribute('role', 'group'); group.setAttribute('aria-label', 'Recent commands'); group.dataset.skRecent = '';
    const heading = document.createElement('p'); heading.className = 'sk-command-palette__group-label'; heading.setAttribute('aria-hidden', 'true'); heading.textContent = 'Recent'; group.appendChild(heading);
    for (const id of recent) { const item = all().find(el => idOf(el) === id && el.getAttribute('aria-disabled') !== 'true'); if (!item) continue; const copy = item.cloneNode(true) as HTMLElement; copy.removeAttribute('id'); copy.dataset.value = id; copy.hidden = false; group.appendChild(copy); item.hidden = true; }
    if (group.children.length > 1) results!.prepend(group);
  }
  const dialog = createDialog(root, { initialFocus: () => input, onBeforeClose() { changed.forEach(el => { el.inert = false; }); changed = []; return true; }, onOpenChange(open) {
    input!.setAttribute('aria-expanded', String(open));
    if (open) {
      let ancestor = root;
      while (ancestor.parentElement) {
        for (const sibling of ancestor.parentElement.children) if (sibling instanceof HTMLElement && sibling !== ancestor && !sibling.inert) { sibling.inert = true; changed.push(sibling); }
        ancestor = ancestor.parentElement; if (ancestor === document.body) break;
      }
    } else { cancel(); changed.forEach(el => { el.inert = false; }); changed = []; setActive(-1); ['data-empty-query', 'data-results', 'data-no-results', 'data-error'].forEach(name => root.removeAttribute(name)); }
    emit(root, open ? 'sk:command-palette:open' : 'sk:command-palette:close');
  } });
  function refresh(): void {
    results!.querySelector('[data-sk-recent]')?.remove();
    const query = input!.value.trim().toLowerCase();
    for (const item of all()) item.hidden = !!query && !(item.textContent ?? '').toLowerCase().includes(query);
    rankRecent();
    for (const group of results!.querySelectorAll<HTMLElement>('[role="group"]')) group.hidden = !group.querySelector('[role="option"]:not([hidden])');
    const list = visible(); root.toggleAttribute('data-empty-query', !query); root.toggleAttribute('data-results', !!list.length); root.toggleAttribute('data-no-results', !list.length);
    feedback(list.length ? `${list.length} result${list.length === 1 ? '' : 's'}.` : 'No results. Try another search.', !list.length);
    setActive(0);
  }
  async function search(): Promise<void> {
    cancel(); root.removeAttribute('data-error'); root.toggleAttribute('data-empty-query', !input!.value.trim());
    if (!options.sources) { refresh(); return; }
    root.setAttribute('data-loading', ''); root.removeAttribute('data-results'); root.removeAttribute('data-no-results');
    const current = new AbortController(); request = current; const query = input!.value;
    // Keep an authored empty state out of replaceChildren's removal path.
    if (results!.contains(empty!)) results!.after(empty!);
    results!.replaceChildren(); results!.setAttribute('aria-busy', 'true'); setActive(-1); feedback('Searching…', true);
    try {
      const batches = await Promise.all(options.sources.map(source => source(query, current.signal)));
      if (destroyed || current.signal.aborted || request !== current) return;
      const seen = new Set<string>(); const groups = new Map<string, HTMLElement>();
      for (const command of batches.flat()) {
        if (seen.has(command.id)) continue; seen.add(command.id);
        let parent: HTMLElement = results!;
        if (command.group) {
          if (!groups.has(command.group)) { const group = document.createElement('div'); group.setAttribute('role', 'group'); group.setAttribute('aria-label', command.group); const label = document.createElement('p'); label.className = 'sk-command-palette__group-label'; label.setAttribute('aria-hidden', 'true'); label.textContent = command.group; group.appendChild(label); results!.appendChild(group); groups.set(command.group, group); }
          parent = groups.get(command.group)!;
        }
        const node = document.createElement('div'); node.className = 'sk-command-palette__item'; node.setAttribute('role', 'option'); node.dataset.value = command.id;
        if (command.disabled) node.setAttribute('aria-disabled', 'true');
        const label = document.createElement('span'); label.className = 'sk-command-palette__label'; label.textContent = command.label; node.appendChild(label);
        if (command.context || command.disabled) { const context = document.createElement('span'); context.className = 'sk-command-palette__context'; context.textContent = command.context ?? 'Unavailable'; node.appendChild(context); }
        parent.appendChild(node);
      }
      // Providers own relevance; do not filter server-ranked results a second time.
      rankRecent(); const count = visible().length; root.toggleAttribute('data-results', !!count); root.toggleAttribute('data-no-results', !count); feedback(count ? `${count} results.` : 'No results. Try another search.', !count); setActive(0);
    } catch {
      if (!destroyed && !current.signal.aborted) { root.setAttribute('data-error', ''); feedback('Search failed. Your query is preserved. Type to retry.', true); }
    } finally { if (request === current) { request = null; results!.removeAttribute('aria-busy'); root.removeAttribute('data-loading'); } }
  }
  function show(): void { if (destroyed || dialog.open) return; input!.value = ''; dialog.show(); void search(); }
  function close(): void {
    // Restore background before createDialog restores focus to the opener.
    changed.forEach(el => { el.inert = false; }); changed = []; dialog.close();
  }
  function select(item?: HTMLElement): void {
    if (!item || item.hidden || item.getAttribute('aria-disabled') === 'true') return;
    const id = idOf(item); const existing = recent.indexOf(id); if (existing >= 0) recent.splice(existing, 1); recent.unshift(id); recent.splice(Math.max(0, options.recentLimit ?? 5));
    close(); options.onSelect?.(item, id); emit(root, 'sk:command-palette:select', { id });
  }
  const offKey = on(input, 'keydown', (event: KeyboardEvent) => {
    if (event.isComposing) return;
    if (event.key === 'ArrowDown') { event.preventDefault(); setActive(active + 1); }
    else if (event.key === 'ArrowUp') { event.preventDefault(); setActive(Math.max(0, active - 1)); }
    else if (event.key === 'Home' || event.key === 'End') { event.preventDefault(); setActive(event.key === 'Home' ? 0 : visible().length - 1); }
    else if (event.key === 'Enter') { event.preventDefault(); select(visible()[active]); }
    else if (event.key === 'Escape') { event.preventDefault(); event.stopImmediatePropagation(); close(); }
  });
  const shortcut = options.shortcut === undefined ? 'Mod+K' : options.shortcut;
  const offShortcut = on(document, 'keydown', (event: KeyboardEvent) => {
    if (!shortcut || event.isComposing || event.repeat) return;
    const parts = shortcut.toLowerCase().split('+'); const key = parts.pop();
    const matches = event.key.toLowerCase() === key && !!(event.metaKey || event.ctrlKey) === parts.includes('mod') && event.shiftKey === parts.includes('shift') && event.altKey === parts.includes('alt');
    const editable = (event.target as Element).closest?.('input, textarea, select, [contenteditable="true"]');
    if (!matches || root.closest('[inert]') || !dialog.open && editable || !parts.some(part => ['mod', 'alt'].includes(part))) return;
    event.preventDefault(); dialog.open ? close() : show();
  });
  return { show, close, refresh, destroy: combine(() => { destroyed = true; close(); cancel(); dialog.destroy(); results!.querySelector('[data-sk-recent]')?.remove(); if (ownsStatus) status!.remove(); if (ownsEmpty) empty!.remove(); }, offKey, offShortcut,
    on(input, 'input', () => { void search(); }),
    on(results, 'pointermove', (event: PointerEvent) => { const index = visible().indexOf((event.target as Element).closest<HTMLElement>('[role="option"]')!); if (index >= 0 && index !== active) setActive(index); }),
    on(root, 'click', (event: MouseEvent) => { if (event.target === root || (event.target as Element).closest('[data-sk-palette-close]')) close(); else { const item = (event.target as Element).closest<HTMLElement>('[role="option"]'); if (item && results!.contains(item)) select(item); } })) };
}
