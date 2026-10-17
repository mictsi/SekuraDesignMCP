/** Validation owned by an enhanced input, without overwriting host errors. */
import { uid, type Cleanup } from './dom.js';

export interface InputValidation {
  setError(message: string | null): void;
  destroy: Cleanup;
}

export function inputValidation(input: HTMLInputElement): InputValidation {
  const error = input.ownerDocument.createElement('p');
  error.id = uid('sk-input-error');
  error.className = 'sk-field__error';
  error.setAttribute('aria-live', 'polite');
  error.hidden = true;
  let ownMessage = '';
  let hostMessage = '';
  let hostInvalid: string | null = null;
  let ownsInvalid = false;
  let mounted = false;
  // Attribute writes can be meaningful even when the value stays "true".
  // Observe only while an error is owned and drain our own synchronous writes.
  const ariaObserver = new MutationObserver(() => { ownsInvalid = false; });

  function readHostAria(): void {
    if (ariaObserver.takeRecords().length) ownsInvalid = false;
  }

  function describe(include: boolean): void {
    const ids = new Set((input.getAttribute('aria-describedby') ?? '').split(/\s+/).filter(Boolean));
    if (include) ids.add(error.id);
    else ids.delete(error.id);
    if (ids.size) input.setAttribute('aria-describedby', [...ids].join(' '));
    else input.removeAttribute('aria-describedby');
  }

  function clear(): void {
    readHostAria();
    ariaObserver.disconnect();
    if (ownMessage && input.validity.customError && input.validationMessage === ownMessage) {
      input.setCustomValidity(hostMessage);
    }
    if (ownsInvalid) {
      if (hostInvalid === null) input.removeAttribute('aria-invalid');
      else input.setAttribute('aria-invalid', hostInvalid);
    }
    ownsInvalid = false;
    ownMessage = '';
    error.textContent = '';
    error.hidden = true;
    describe(false);
  }

  return {
    setError(message) {
      if (!message) { clear(); return; }
      // A host may set, replace or clear a business error after construction or
      // while this controller is reporting an invalid draft. Save the current
      // non-owned value each time we take ownership, rather than an old snapshot.
      const currentMessage = input.validity.customError ? input.validationMessage : '';
      if (!ownMessage || currentMessage !== ownMessage) hostMessage = currentMessage;
      readHostAria();
      if (!ownsInvalid) hostInvalid = input.getAttribute('aria-invalid');
      if (!mounted) {
        const anchor = input.closest('.sk-field__control, .sk-number-input, .sk-date-input') ?? input;
        anchor.insertAdjacentElement('afterend', error);
        mounted = true;
      }
      ownMessage = message;
      input.setCustomValidity(message);
      ariaObserver.observe(input, { attributes: true, attributeFilter: ['aria-invalid'] });
      input.setAttribute('aria-invalid', 'true');
      ariaObserver.takeRecords();
      ownsInvalid = true;
      if (error.textContent !== message) error.textContent = message;
      error.hidden = false;
      describe(true);
    },
    destroy() {
      clear();
      error.remove();
    },
  };
}
