import { combine, emit, on, type Cleanup } from '../core/dom.js';

export interface SliderOptions {
  formatValue?: (value: number) => string;
  onChange?: (value: number) => void;
}

/** Native range input owns keyboard/touch semantics; this keeps its views in sync. */
export function createSlider(input: HTMLInputElement, options: SliderOptions = {}): {
  update(): void; setValue(value: number): void; destroy: Cleanup;
} {
  const output = input.closest('.sk-slider')?.querySelector('output');
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
  }
  const notify = (): void => { update(); options.onChange?.(input.valueAsNumber); emit(input, 'sk:slider:change', { value: input.valueAsNumber }); };
  const observer = new MutationObserver(update);
  observer.observe(input, { attributes: true, attributeFilter: ['min', 'max', 'step', 'value'] });
  update();
  return { update, setValue(value) { input.value = String(value); notify(); },
    destroy: combine(on(input, 'input', notify), on(input, 'change', update), () => observer.disconnect()) };
}

/** aria-busy and aria-disabled describe state; neither cancels activation. */
export function guardAction(button: HTMLElement): Cleanup {
  return on(button, 'click', (event: MouseEvent) => {
    if (button.getAttribute('aria-busy') === 'true' || button.getAttribute('aria-disabled') === 'true') {
      event.preventDefault(); event.stopImmediatePropagation();
    }
  }, true);
}
