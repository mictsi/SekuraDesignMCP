import { combine, ensureId, emit, on, toggleAttr, type Cleanup } from '../core/dom.js';
import { dismissable } from '../core/dismiss.js';
import { position, type PositionOptions, type Positioner } from '../core/position.js';
import { announce } from '../core/live.js';

export interface ComboboxItem { value: string; label: string; description?: string; disabled?: boolean }
export interface ComboboxOptions extends PositionOptions {
  /** Legacy DOM-search callback. Prefer loadOptions for managed asynchronous results. */
  onSearch?: (query: string) => void;
  loadOptions?: (query: string, signal: AbortSignal) => Promise<ComboboxItem[]>;
  debounce?: number;
  onSelect?: (option: HTMLElement, value: string) => void;
  onChange?: (values: string[]) => void;
  onOpenChange?: (open: boolean) => void;
  announceCount?: boolean;
  selectOnTab?: boolean;
  multiple?: boolean;
  allowCustom?: boolean;
  values?: string[];
  /** Opt in to displaying labels; the default preserves the v2 input-value contract. */
  displayLabel?: boolean;
}
export interface Combobox {
  readonly open: boolean;
  readonly values: string[];
  openList(): void;
  closeList(): void;
  refresh(): void;
  destroy: Cleanup;
}

export function createCombobox(input: HTMLInputElement, listbox: HTMLElement, options: ComboboxOptions = {}): Combobox {
  const { debounce = 250, announceCount = true, selectOnTab = false } = options;
  const multiple = options.multiple ?? input.hasAttribute('data-sk-multiple');
  const allowCustom = options.allowCustom ?? input.hasAttribute('data-sk-allow-custom');
  const selected = new Map<string, string>((options.values ?? []).map(value => [value, value]));
  input.setAttribute('role', 'combobox'); input.setAttribute('aria-controls', ensureId(listbox, 'sk-listbox'));
  input.setAttribute('aria-expanded', 'false'); input.setAttribute('aria-autocomplete', 'list'); input.autocomplete = 'off';
  listbox.setAttribute('role', 'listbox'); listbox.hidden = true;
  // Keep status text outside the listbox's option-only accessibility structure.
  const popup = document.createElement('div'); popup.className = 'sk-combobox__popup'; popup.hidden = true;
  listbox.before(popup); popup.appendChild(listbox);
  const note = document.createElement('p'); note.className = 'sk-combobox__empty'; note.dataset.skComboboxMessage = ''; note.hidden = true; popup.appendChild(note);
  const anchor = input.closest<HTMLElement>('.sk-combobox__field') ?? input;
  if (multiple) listbox.setAttribute('aria-multiselectable', 'true');
  const tokens = multiple ? document.createElement('span') : null;
  if (tokens) { tokens.className = 'sk-combobox__tokens'; input.before(tokens); }
  let open = false, activeIndex = -1, destroyed = false, request: AbortController | null = null;
  let positioner: Positioner | null = null, undismiss: Cleanup | null = null, timer: ReturnType<typeof setTimeout> | undefined;
  const all = () => Array.from(listbox.querySelectorAll<HTMLElement>('[role="option"]'));
  const optionsOf = () => all().filter(el => !el.hidden && el.getAttribute('aria-disabled') !== 'true');
  const valueOf = (el: HTMLElement) => el.dataset.value ?? el.textContent?.trim() ?? '';
  const labelOf = (el: HTMLElement) => el.dataset.label ?? el.querySelector('.sk-combobox__option-label')?.textContent?.trim() ?? el.textContent?.trim() ?? '';
  function setActive(index: number): void {
    const list = optionsOf(); activeIndex = index < 0 || !list.length ? -1 : index % list.length;
    input.removeAttribute('aria-activedescendant');
    for (const opt of all()) {
      const active = list[activeIndex] === opt; toggleAttr(opt, 'data-active', active);
      opt.setAttribute('aria-selected', String(multiple ? selected.has(valueOf(opt)) : active));
      if (active) { input.setAttribute('aria-activedescendant', ensureId(opt, 'sk-option')); opt.scrollIntoView({ block: 'nearest' }); }
    }
  }
  function message(text: string): void {
    note.textContent = text; note.hidden = !text; positioner?.update();
  }
  function renderTokens(): void {
    if (!tokens) return;
    tokens.replaceChildren();
    selected.forEach((label, value) => {
      const token = document.createElement('span'); token.className = 'sk-combobox__token';
      const text = document.createElement('span'); text.textContent = label;
      const remove = document.createElement('button'); remove.type = 'button'; remove.className = 'sk-combobox__remove'; remove.textContent = '×'; remove.setAttribute('aria-label', `Remove ${label}`); remove.disabled = input.disabled || input.readOnly;
      remove.addEventListener('click', () => { if (input.disabled || input.readOnly) return; selected.delete(value); renderTokens(); changed(); input.focus(); });
      token.append(text, remove); tokens.appendChild(token);
    });
  }
  function changed(): void { options.onChange?.([...selected.keys()]); emit(input, 'sk:combobox:change', { values: [...selected.keys()] }); setActive(-1); }
  function cancel(): void { clearTimeout(timer); request?.abort(); request = null; input.removeAttribute('aria-busy'); listbox.removeAttribute('aria-busy'); }
  function openList(): void {
    if (open || destroyed || input.disabled || input.readOnly) return;
    open = true; popup.hidden = false; listbox.hidden = false; listbox.dataset.open = ''; input.setAttribute('aria-expanded', 'true');
    popup.style.inlineSize = `${anchor.getBoundingClientRect().width}px`;
    positioner = position(popup, anchor, { side: 'bottom', align: 'start', ...options });
    undismiss = dismissable(popup, { exclude: [input, ...(tokens ? [tokens] : [])], onDismiss: closeList });
    setActive(-1); options.onOpenChange?.(true); emit(input, 'sk:combobox:open');
  }
  function closeList(): void {
    cancel(); if (!open) return;
    open = false; positioner?.destroy(); positioner = null; undismiss?.(); undismiss = null;
    popup.hidden = true; listbox.hidden = true; listbox.removeAttribute('data-open'); input.setAttribute('aria-expanded', 'false'); setActive(-1);
    options.onOpenChange?.(false); emit(input, 'sk:combobox:close');
  }
  function commit(option: HTMLElement): void {
    if (destroyed || input.disabled || input.readOnly || option.hidden || option.getAttribute('aria-disabled') === 'true') return;
    const value = valueOf(option), label = labelOf(option);
    if (multiple) { selected.set(value, label); input.value = ''; renderTokens(); }
    else { selected.clear(); selected.set(value, label); input.value = options.displayLabel ? label : value; }
    options.onSelect?.(option, value); emit(input, 'sk:combobox:select', { value }); changed(); closeList();
  }
  function refresh(): void {
    if (destroyed) return;
    setActive(-1); if (!open) return;
    const n = optionsOf().length;
    message(n ? '' : allowCustom && input.value.trim() ? 'Press Enter to add this value.' : 'No results. Try another search.');
    positioner?.update(); if (announceCount) announce(n ? `${n} result${n === 1 ? '' : 's'} available.` : 'No results available.');
  }
  async function search(): Promise<void> {
    if (destroyed || !open) return;
    cancel();
    if (!options.loadOptions) {
      if (options.onSearch) options.onSearch(input.value);
      else for (const option of all()) option.hidden = !labelOf(option).toLowerCase().includes(input.value.trim().toLowerCase());
      refresh(); return;
    }
    const current = new AbortController(); request = current;
    input.setAttribute('aria-busy', 'true'); listbox.setAttribute('aria-busy', 'true'); setActive(-1);
    all().forEach(el => { el.hidden = true; }); message('Searching…'); announce('Searching…');
    try {
      const values = await options.loadOptions(input.value, current.signal);
      if (destroyed || current.signal.aborted || request !== current) return;
      listbox.replaceChildren();
      for (const value of values) {
        const node = document.createElement('li'); node.className = 'sk-combobox__option'; node.setAttribute('role', 'option'); node.dataset.value = value.value; node.dataset.label = value.label;
        node.textContent = value.description ? `${value.label} — ${value.description}` : value.label;
        if (value.disabled) node.setAttribute('aria-disabled', 'true'); listbox.appendChild(node);
      }
      refresh();
    } catch {
      if (!destroyed && !current.signal.aborted && request === current) { message('Search failed. Type to retry.'); announce('Search failed. Your text is preserved. Type to retry.'); }
    } finally { if (request === current) { request = null; input.removeAttribute('aria-busy'); listbox.removeAttribute('aria-busy'); } }
  }
  const offInput = on(input, 'input', () => {
    if (input.disabled || input.readOnly) return;
    cancel(); setActive(-1); openList();
    if (options.loadOptions || options.onSearch) { input.setAttribute('aria-busy', 'true'); listbox.setAttribute('aria-busy', 'true'); all().forEach(el => { el.hidden = true; }); message('Searching…'); }
    else { void search(); return; }
    timer = setTimeout(() => { void search(); }, debounce);
  });
  const offKey = on(input, 'keydown', (event: KeyboardEvent) => {
    if (event.isComposing || input.disabled || input.readOnly) return;
    const list = optionsOf();
    if (event.key === 'ArrowDown') { event.preventDefault(); if (!open) openList(); else setActive(activeIndex + 1); }
    else if (event.key === 'ArrowUp') { event.preventDefault(); if (!open) openList(); setActive(activeIndex <= 0 ? list.length - 1 : activeIndex - 1); }
    else if ((event.key === 'Home' || event.key === 'End') && open && list.length) { event.preventDefault(); setActive(event.key === 'Home' ? 0 : list.length - 1); }
    else if (event.key === 'Enter') {
      const active = list[activeIndex];
      if (open && active) { event.preventDefault(); commit(active); }
      else if (allowCustom && input.value.trim()) { event.preventDefault(); const node = document.createElement('div'); node.textContent = input.value.trim(); commit(node); }
    } else if (event.key === 'Escape') {
      if (open) { event.preventDefault(); closeList(); }
      else if (input.value) { event.preventDefault(); input.value = ''; if (!multiple) { selected.clear(); changed(); } emit(input, 'sk:combobox:clear'); }
    } else if (event.key === 'Backspace' && multiple && !input.value && selected.size) { selected.delete([...selected.keys()].at(-1)!); renderTokens(); changed(); }
    else if (event.key === 'Tab' && open) { if (selectOnTab && list[activeIndex]) commit(list[activeIndex]!); else closeList(); }
  });
  const offClick = on(listbox, 'click', (event: MouseEvent) => { const option = (event.target as Element).closest<HTMLElement>('[role="option"]'); if (option && listbox.contains(option)) commit(option); });
  const offPointer = on(listbox, 'pointerdown', (event: PointerEvent) => { if ((event.target as Element).closest('[role="option"]')) event.preventDefault(); });
  const offOver = on(listbox, 'pointermove', (event: PointerEvent) => { const index = optionsOf().indexOf((event.target as Element).closest<HTMLElement>('[role="option"]')!); if (index >= 0 && index !== activeIndex) setActive(index); });
  const offFocus = on(input, 'focus', () => { openList(); if (options.loadOptions) void search(); else refresh(); });
  const offReopen = on(input, 'click', () => { if (open || input.disabled || input.readOnly) return; openList(); if (options.loadOptions) void search(); else refresh(); });
  const offBlur = on(input, 'blur', (event: FocusEvent) => { if (!listbox.contains(event.relatedTarget as Node) && !tokens?.contains(event.relatedTarget as Node)) closeList(); });
  const observer = new MutationObserver(() => { renderTokens(); if (input.disabled || input.readOnly) closeList(); });
  observer.observe(input, { attributes: true, attributeFilter: ['disabled', 'readonly'] });
  const resize = new ResizeObserver(() => { if (open) { popup.style.inlineSize = `${anchor.getBoundingClientRect().width}px`; positioner?.update(); } }); resize.observe(anchor);
  const offReset = input.form ? on(input.form, 'reset', () => { closeList(); selected.clear(); for (const value of options.values ?? []) selected.set(value, value); renderTokens(); changed(); }) : undefined;
  for (const opt of all()) if (selected.has(valueOf(opt))) selected.set(valueOf(opt), labelOf(opt));
  renderTokens();
  return { get open() { return open; }, get values() { return [...selected.keys()]; }, openList, closeList, refresh,
    destroy: combine(() => { destroyed = true; closeList(); observer.disconnect(); resize.disconnect(); tokens?.remove(); popup.before(listbox); popup.remove(); }, offInput, offKey, offClick, offPointer, offOver, offFocus, offReopen, offBlur, offReset) };
}
