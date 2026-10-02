import { combine, emit, on, type Cleanup } from '../core/dom.js';

export interface SliderOptions {
  formatValue?: (value: number) => string;
  onChange?: (value: number) => void;
  numberInput?: HTMLInputElement;
}

/** Native range input owns keyboard/touch semantics; this keeps its views in sync. */
export function createSlider(input: HTMLInputElement, options: SliderOptions = {}): {
  update(): void; setValue(value: number): void; destroy: Cleanup;
} {
  const root = input.closest('.sk-slider');
  const output = Array.from(root?.querySelectorAll('output') ?? []).find(el => el.htmlFor.contains(input.id)) ?? (root?.querySelectorAll('input[type=range]').length === 1 ? root.querySelector('output') : null);
  const number = options.numberInput ?? Array.from(root?.querySelectorAll<HTMLInputElement>('[data-sk-slider-value]') ?? []).find(el => el.dataset.skSliderValue === input.id);
  output?.setAttribute('aria-live', 'off');
  const format = options.formatValue ?? ((value: number) => {
    if (input.dataset.skUnit === 'seconds') {
      const hours = value / 3600;
      return `${value} seconds (${Number(hours.toFixed(2))} ${hours === 1 ? 'hour' : 'hours'})`;
    }
    return `${value}${input.dataset.skUnit ? ` ${input.dataset.skUnit}` : ''}`;
  });
  function update(): void {
    const value = input.valueAsNumber;
    const min = Number(input.min || 0), max = Number(input.max || 100);
    const progress = max > min ? Math.max(0, Math.min(100, (value - min) / (max - min) * 100)) : 0;
    input.style.setProperty('--sk-slider-progress', `${progress}%`);
    const label = format(value);
    input.setAttribute('aria-valuetext', label);
    if (output) output.textContent = label;
    if (number) { number.min = input.min; number.max = input.max; number.step = input.step; number.disabled = input.disabled; number.value = input.value; }
  }
  const notify = (): void => { update(); options.onChange?.(input.valueAsNumber); emit(input, 'sk:slider:change', { value: input.valueAsNumber }); };
  const observer = new MutationObserver(update);
  observer.observe(input, { attributes: true, attributeFilter: ['min', 'max', 'step', 'value', 'disabled'] });
  update();
  const offNumber = number ? on(number, 'change', () => { if (input.disabled) return; if (Number.isFinite(number.valueAsNumber)) { input.value = number.value; notify(); } else update(); }) : undefined;
  const offReset = input.form ? on(input.form, 'reset', () => queueMicrotask(update)) : undefined;
  const offPage = on(input, 'keydown', (event: KeyboardEvent) => {
    if (input.disabled || !['PageUp', 'PageDown'].includes(event.key)) return;
    event.preventDefault(); const step = Number(input.step) || 1; input.value = String(input.valueAsNumber + (event.key === 'PageUp' ? 10 : -10) * step); notify();
  });
  return { update, setValue(value) { if (!Number.isFinite(value)) return; input.value = String(value); notify(); },
    destroy: combine(offNumber, offReset, offPage, on(input, 'input', notify), on(input, 'change', update), () => observer.disconnect()) };
}

export interface RangeSliderOptions { formatValue?: (value: number) => string; onChange?: (values: [number, number]) => void }
/** Two native thumbs retain independent names and enforce a non-crossing span. */
export function createRangeSlider(root: HTMLElement, options: RangeSliderOptions = {}): { setValue(values: [number, number]): void; readonly values: [number, number]; destroy: Cleanup } {
  const inputs = root.querySelectorAll<HTMLInputElement>('input[type="range"]');
  if (inputs.length !== 2) throw new Error('A range slider requires two native range inputs.');
  const lower = inputs[0]!, upper = inputs[1]!;
  const min = Number(lower.min || 0), max = Number(upper.max || 100);
  lower.min = String(min); upper.max = String(max);
  if (lower.valueAsNumber > upper.valueAsNumber) lower.value = upper.value;
  const values = (): [number, number] => [lower.valueAsNumber, upper.valueAsNumber];
  const a = createSlider(lower, { formatValue: options.formatValue });
  const b = createSlider(upper, { formatValue: options.formatValue });
  function sync(notify = true): void {
    lower.max = upper.value; upper.min = lower.value; a.update(); b.update();
    if (notify) { options.onChange?.(values()); emit(root, 'sk:slider:range-change', { values: values() }); }
  }
  sync(false);
  const cleanups = [on(root, 'sk:slider:change', () => sync())];
  if (lower.form) cleanups.push(on(lower.form, 'reset', () => {
    lower.max = String(max); upper.min = String(min);
    queueMicrotask(() => { if (lower.valueAsNumber > upper.valueAsNumber) lower.value = upper.value; sync(false); });
  }));
  return { get values() { return values(); }, setValue(value) {
    if (!value.every(Number.isFinite)) return;
    lower.max = String(max); upper.min = String(min);
    lower.value = String(Math.min(...value)); upper.value = String(Math.max(...value)); sync();
  }, destroy: combine(a.destroy, b.destroy, ...cleanups) };
}

/** aria-busy and aria-disabled describe state; neither cancels activation. */
export function guardAction(button: HTMLElement): Cleanup {
  return on(button, 'click', (event: MouseEvent) => {
    if (button.getAttribute('aria-busy') === 'true' || button.getAttribute('aria-disabled') === 'true') {
      event.preventDefault(); event.stopImmediatePropagation();
    }
  }, true);
}
