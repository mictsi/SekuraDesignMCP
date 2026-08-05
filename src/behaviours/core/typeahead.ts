/**
 * Type-to-select.
 *
 * Native `<select>` has this; every custom listbox, menu and tree is expected to
 * reproduce it, and most do not. Typing "de" in a country list should jump to
 * Denmark, and typing the same letter repeatedly should cycle through items
 * beginning with it.
 */

export interface TypeaheadOptions {
  /** Milliseconds before the buffer resets. 500–1000 is the usual range. */
  timeout?: number;
  /** Text used for matching. Defaults to the element's trimmed text content. */
  textOf?: (item: HTMLElement) => string;
}

export interface Typeahead {
  /**
   * Feed a keypress. Returns the item to move to, or null when the key was not
   * a printable character or nothing matched.
   */
  handle(key: string, items: HTMLElement[], currentIndex: number): HTMLElement | null;
  reset(): void;
}

export function createTypeahead(options: TypeaheadOptions = {}): Typeahead {
  const timeout = options.timeout ?? 600;
  const textOf = options.textOf ?? ((el: HTMLElement) => (el.textContent ?? '').trim().toLowerCase());

  let buffer = '';
  let timer: ReturnType<typeof setTimeout> | undefined;

  function reset(): void {
    buffer = '';
    clearTimeout(timer);
  }

  return {
    reset,
    handle(key, items, currentIndex) {
      // Single printable characters only. Modifier combinations and named keys
      // belong to the widget's own handler.
      if (key.length !== 1 || !/\S/.test(key)) return null;

      const char = key.toLowerCase();
      // Repeating one character cycles through items starting with it, which is
      // the native behaviour and how users scan a long list.
      const cycling = buffer.length > 0 && buffer.split('').every((c) => c === char);
      buffer = cycling ? char : buffer + char;

      clearTimeout(timer);
      timer = setTimeout(reset, timeout);

      // Start searching just after the current item, wrapping, so repeated
      // presses advance rather than sticking on the first match.
      const start = cycling ? currentIndex + 1 : currentIndex;
      const count = items.length;
      for (let i = 0; i < count; i += 1) {
        const item = items[(start + i + count) % count];
        if (item && textOf(item).startsWith(buffer)) return item;
      }
      return null;
    },
  };
}
