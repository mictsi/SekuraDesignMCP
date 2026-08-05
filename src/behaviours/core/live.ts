/**
 * Live region announcer.
 *
 * One pair of regions is created on first use and reused forever. This exists
 * because the most common live-region bug is creating the region and its message
 * in the same tick: assistive technology only announces *changes* to a region it
 * was already observing, so a region inserted together with its text announces
 * nothing at all.
 */

import { prefersReducedMotion } from './dom.js';

let polite: HTMLElement | null = null;
let assertive: HTMLElement | null = null;

function region(kind: 'polite' | 'assertive'): HTMLElement {
  const existing = kind === 'polite' ? polite : assertive;
  if (existing && document.contains(existing)) return existing;

  const el = document.createElement('p');
  el.setAttribute('role', kind === 'polite' ? 'status' : 'alert');
  el.setAttribute('aria-live', kind);
  el.setAttribute('aria-atomic', 'true');
  el.dataset.skLiveRegion = kind;
  // Visually hidden without being removed from the accessibility tree.
  el.style.cssText =
    'position:absolute;width:1px;height:1px;margin:-1px;padding:0;' +
    'overflow:hidden;clip-path:inset(50%);white-space:nowrap;border:0';
  document.body.appendChild(el);

  if (kind === 'polite') polite = el;
  else assertive = el;
  return el;
}

let timer: ReturnType<typeof setTimeout> | undefined;

/**
 * Announce a message.
 *
 * Polite by default. Reserve assertive for genuine failures — it interrupts
 * whatever the user is currently hearing, and overusing it makes a product
 * hostile to screen reader users.
 */
export function announce(message: string, urgency: 'polite' | 'assertive' = 'polite'): void {
  if (!message) return;
  const el = region(urgency);

  // Clearing first forces a re-announcement when the same string repeats — for
  // example "3 results" twice in a row after two different filters.
  el.textContent = '';
  clearTimeout(timer);
  timer = setTimeout(() => {
    el.textContent = message;
  }, 60);
}

/**
 * Pre-create the regions.
 *
 * Call once at start-up. Not strictly required — `announce` creates them lazily
 * and waits a tick — but creating them early removes any doubt.
 */
export function initAnnouncer(): void {
  region('polite');
  region('assertive');
}

/** Milliseconds a transient message should stay, adjusted for reduced motion. */
export function readingTime(message: string, minimum = 4000): number {
  // Roughly 200 wpm, floored, and extended when the user has asked for less
  // motion since they are also likely to want more time.
  const words = message.trim().split(/\s+/).length;
  const base = Math.max(minimum, (words / 200) * 60_000);
  return prefersReducedMotion() ? base * 1.5 : base;
}
