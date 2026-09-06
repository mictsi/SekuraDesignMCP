import { requestJSON, RequestError } from './request.js';
const form = document.querySelector('#form-lab');
if (form) {
  const el = id => document.getElementById(`lab-${id}`);
  const teams = { design: ['Alex', 'Sam'], engineering: ['Jordan', 'Taylor'] };
  let validation, saving, version = 1, timer, sequence = 0;
  const delay = signal => new Promise((resolve, reject) => {
    signal.throwIfAborted();
    const abort = () => { clearTimeout(id); reject(signal.reason); };
    const id = setTimeout(() => { signal.removeEventListener('abort', abort); resolve(); }, 350);
    signal.addEventListener('abort', abort, { once: true });
  });
  async function transport(path, body, signal) {
    if (el('transport').value === 'http') return requestJSON('/demo-api/' + path, { method: body ? 'POST' : 'GET', body: body ? JSON.stringify(body) : undefined, signal });
    await delay(signal);
    if (path.startsWith('name?')) return { available: new URLSearchParams(path.split('?')[1]).get('value').toLowerCase() !== 'taken' };
    if (path === 'version') return { version };
    if (body.outcome === 'failure') throw new RequestError('The service is unavailable. Your draft is retained; try saving again.', 503);
    if (body.outcome === 'conflict') { version++; throw new RequestError('Another editor changed this project. Load its latest version before retrying.', 409); }
    return { version: ++version };
  }
  function busy(active) {
    el('fields').disabled = active || !el('permission').checked;
    el('save').disabled = active || !el('permission').checked || !el('reload').hidden;
    el('save').setAttribute('aria-busy', String(active)); el('cancel').hidden = !active;
    if (!active) el('save').removeAttribute('aria-busy');
  }
  function summary(message, target = 'lab-save') {
    const link = document.createElement('a'); link.href = '#' + target; link.textContent = message;
    link.addEventListener('click', event => { event.preventDefault(); document.getElementById(target).focus(); });
    const li = document.createElement('li'); li.append(link); el('errors').replaceChildren(li);
    el('summary').hidden = false; el('summary').focus();
  }
  async function checkName() {
    validation?.abort(); const current = ++sequence; validation = new AbortController();
    const value = el('name').value.trim();
    if (!value) { el('name-status').textContent = 'Enter a project name.'; el('name').setAttribute('aria-invalid', 'true'); return false; }
    el('name-status').textContent = 'Checking availability…';
    try {
      const result = await transport('name?value=' + encodeURIComponent(value), null, validation.signal);
      if (current !== sequence) return false;
      if (typeof result.available !== 'boolean') throw new Error('Unexpected name response.');
      el('name-status').textContent = result.available ? 'Name is available.' : 'This name is already in use.';
      el('name').setAttribute('aria-invalid', String(!result.available)); return result.available;
    } catch (error) {
      if (current !== sequence || validation.signal.aborted) return false;
      el('name-status').textContent = 'Availability could not be checked. Try again.'; return false;
    }
  }
  el('name').addEventListener('input', () => {
    validation?.abort(); sequence++; clearTimeout(timer); el('name').removeAttribute('aria-invalid');
    el('name-status').textContent = 'Waiting to check…'; timer = setTimeout(checkName, 250);
  });
  el('team').addEventListener('change', () => {
    el('owner').replaceChildren(...teams[el('team').value].map(name => new Option(name, name)));
    el('result').textContent = `Owner choices updated. ${el('owner').value} is selected.`;
  });
  el('language').addEventListener('change', () => {
    const german = el('language').value === 'de'; el('name-label').lang = german ? 'de' : 'en';
    el('name-label').textContent = german ? 'Vollständiger Name des gemeinsam verwalteten Projekts (Pflichtfeld)' : 'Project name (required)';
  });
  function cancel(message) {
    clearTimeout(timer); sequence++; validation?.abort(); saving?.abort(); saving = null; busy(false);
    el('name-status').textContent = ''; el('result').textContent = message;
  }
  el('permission').addEventListener('change', () => {
    cancel('Your draft is retained.'); el('permission-status').textContent = el('permission').checked ? 'Editing permission restored.' : 'Editing permission removed. Ask your administrator for access.';
  });
  el('transport').addEventListener('change', () => { cancel('Transport changed. Draft retained; version must be refreshed before saving.'); el('reload').hidden = false; busy(false); });
  el('cancel').addEventListener('click', () => { cancel('Request canceled. Check the current version before retrying; the server may have accepted the write.'); el('reload').hidden = false; busy(false); el('reload').focus(); });
  el('reload').addEventListener('click', async () => {
    if (saving) return; const controller = new AbortController(); saving = controller; busy(true);
    try {
      const latest = await transport('version', null, controller.signal); controller.signal.throwIfAborted();
      if (!Number.isInteger(latest.version)) throw new Error('Unexpected version response.');
      version = latest.version; el('reload').hidden = true; el('outcome').value = 'success'; el('summary').hidden = true;
      el('result').textContent = `Version ${version} loaded. Your edits are retained; review and save again.`;
    } catch (error) { if (!controller.signal.aborted) summary('Latest version could not be loaded. Try again.', 'lab-reload'); }
    finally { if (saving === controller) { saving = null; busy(false); if (el('reload').hidden) el('save').focus(); } }
  });
  form.addEventListener('submit', async event => {
    event.preventDefault(); if (saving || !el('permission').checked || !el('reload').hidden) return;
    clearTimeout(timer); const controller = new AbortController(); saving = controller; busy(true); el('summary').hidden = true;
    try {
      const available = await checkName(); controller.signal.throwIfAborted();
      if (!available) { busy(false); summary('Enter an available project name.', 'lab-name'); return; }
      const draft = { name: el('name').value.trim(), team: el('team').value, owner: el('owner').value, notes: el('notes').value, version, outcome: el('outcome').value };
      el('result').textContent = 'Saving project…';
      const result = await transport('projects', draft, controller.signal); controller.signal.throwIfAborted();
      if (!Number.isInteger(result.version)) throw new Error('Unexpected save response.');
      version = result.version; el('result').textContent = `Project saved. Version ${version}.`;
    } catch (error) {
      if (!controller.signal.aborted) {
        if (error.status === 409) el('reload').hidden = false;
        busy(false); summary(error.message || 'Save failed. Your draft is retained.', error.status === 409 ? 'lab-reload' : 'lab-save');
        el('result').textContent = 'Your draft is retained.';
      }
    } finally { if (saving === controller) { saving = null; busy(false); } }
  });
}
