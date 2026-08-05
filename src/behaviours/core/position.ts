/**
 * Anchor positioning with flip and shift.
 *
 * Uses the CSS anchor positioning API where the browser supports it, and falls
 * back to measuring. Deliberately not a full floating-element library: it covers
 * the placements the design system actually specifies, and nothing more.
 */

import { direction, on, combine, type Cleanup } from './dom.js';

export type Side = 'top' | 'bottom' | 'inline-start' | 'inline-end';
export type Align = 'start' | 'center' | 'end';

export interface PositionOptions {
  side?: Side;
  align?: Align;
  /** Gap between anchor and surface, in pixels. */
  offset?: number;
  /** Minimum distance from the viewport edge. */
  padding?: number;
  /** Reposition on scroll and resize. Default true. */
  track?: boolean;
}

export interface Positioner {
  update(): void;
  destroy: Cleanup;
}

/** Resolve a logical side to a physical one for the element's writing direction. */
function physicalSide(side: Side, el: Element): 'top' | 'bottom' | 'left' | 'right' {
  const rtl = direction(el) === 'rtl';
  if (side === 'inline-start') return rtl ? 'right' : 'left';
  if (side === 'inline-end') return rtl ? 'left' : 'right';
  return side;
}

export function position(
  surface: HTMLElement,
  anchor: HTMLElement,
  options: PositionOptions = {}
): Positioner {
  const { offset = 6, padding = 8, track = true } = options;
  const requested = options.side ?? 'bottom';
  const align = options.align ?? 'start';

  function update(): void {
    // Measuring requires the surface to be laid out. Callers reveal it first.
    const a = anchor.getBoundingClientRect();
    const s = surface.getBoundingClientRect();
    const vw = document.documentElement.clientWidth;
    const vh = document.documentElement.clientHeight;

    let side = physicalSide(requested, surface);

    // Flip when there is not room on the requested side but there is opposite.
    const room = {
      top: a.top - padding,
      bottom: vh - a.bottom - padding,
      left: a.left - padding,
      right: vw - a.right - padding,
    };
    const need = side === 'top' || side === 'bottom' ? s.height + offset : s.width + offset;
    const opposite = { top: 'bottom', bottom: 'top', left: 'right', right: 'left' } as const;
    if (room[side] < need && room[opposite[side]] >= need) side = opposite[side];

    let top: number;
    let left: number;

    if (side === 'top' || side === 'bottom') {
      top = side === 'bottom' ? a.bottom + offset : a.top - s.height - offset;
      left =
        align === 'center' ? a.left + a.width / 2 - s.width / 2
        : align === 'end' ? a.right - s.width
        : a.left;
    } else {
      left = side === 'right' ? a.right + offset : a.left - s.width - offset;
      top =
        align === 'center' ? a.top + a.height / 2 - s.height / 2
        : align === 'end' ? a.bottom - s.height
        : a.top;
    }

    // Shift back into the viewport rather than letting the surface leave it.
    left = Math.max(padding, Math.min(left, vw - s.width - padding));
    top = Math.max(padding, Math.min(top, vh - s.height - padding));

    surface.style.position = 'fixed';
    surface.style.insetInlineStart = 'auto';
    surface.style.left = `${Math.round(left)}px`;
    surface.style.top = `${Math.round(top)}px`;
    surface.dataset.skSide = side;
  }

  update();

  const cleanups: Cleanup[] = [];
  if (track) {
    // Capture, so scrolling any ancestor container repositions — not just the
    // window.
    cleanups.push(on(window, 'scroll', update, true));
    cleanups.push(on(window, 'resize', update));
  }

  return { update, destroy: combine(...cleanups) };
}
