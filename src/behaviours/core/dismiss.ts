/**
 * Light dismiss: Escape, outside pointer, and focus leaving.
 *
 * Shared by every transient surface so the rules are identical everywhere — a
 * user who learns that Escape closes a menu should find it closes a popover too.
 */

import { combine, on, type Cleanup } from './dom.js';

export interface DismissOptions {
  /** Elements that must NOT count as "outside" — typically the trigger. */
  exclude?: Array<Element | null | undefined>;
  /** Escape key. Default true. */
  escape?: boolean;
  /** Pointer press outside the surface. Default true. */
  outsidePointer?: boolean;
  /** Focus moving outside the surface. Default false — noisy for menus. */
  focusOut?: boolean;
  /** Reason is passed through so callers can treat Escape differently. */
  onDismiss: (reason: 'escape' | 'pointer' | 'focus') => void;
}

export function dismissable(surface: Element, options: DismissOptions): Cleanup {
  const { escape = true, outsidePointer = true, focusOut = false } = options;

  const isInside = (node: Node | null): boolean => {
    if (!node) return false;
    if (surface.contains(node)) return true;
    return (options.exclude ?? []).some((el) => el?.contains(node));
  };

  const cleanups: Cleanup[] = [];

  if (escape) {
    // Capture phase, so a surface closes before an ancestor handler sees the
    // key — nested overlays then dismiss innermost-first, which is what users
    // expect.
    cleanups.push(
      on(
        document,
        'keydown',
        (event: KeyboardEvent) => {
          if (event.key !== 'Escape') return;
          event.stopPropagation();
          options.onDismiss('escape');
        },
        true
      )
    );
  }

  if (outsidePointer) {
    // pointerdown rather than click: a click fires after mouseup, by which time
    // the user may have dragged from inside the surface to outside, which should
    // not dismiss.
    cleanups.push(
      on(document, 'pointerdown', (event: PointerEvent) => {
        if (isInside(event.target as Node)) return;
        options.onDismiss('pointer');
      })
    );
  }

  if (focusOut) {
    cleanups.push(
      on(document, 'focusin', (event: FocusEvent) => {
        if (isInside(event.target as Node)) return;
        options.onDismiss('focus');
      })
    );
  }

  return combine(...cleanups);
}
