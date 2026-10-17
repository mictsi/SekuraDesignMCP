import { requestJSON, RequestError } from './request.js';

const form = document.querySelector('#form-lab');
if (form) {
  const el = id => document.getElementById(`lab-${id}`);
  const teams = { design: ['Alex', 'Sam'], engineering: ['Jordan', 'Taylor'] };
  const fields = { name: 'Project name', team: 'Team', owner: 'Project owner', notes: 'Notes' };
  const emptyProject = () => ({ name: '', team: 'design', owner: 'Alex', notes: '' });
  const local = { version: 1, project: null, pending: 0 };
  let validation, saving, timer, sequence = 0, version = 1;
  let dirty = false, needsRefresh = false, comparison = null, submitted = null;
  let phase = 'idle';

  const draft = () => ({ name: el('name').value.trim(), team: el('team').value, owner: el('owner').value, notes: el('notes').value });
  const sameProject = (left, right) => Object.keys(fields).every(key => (left ?? emptyProject())[key] === (right ?? emptyProject())[key]);
  const delay = signal => new Promise((resolve, reject) => {
    signal.throwIfAborted();
    const abort = () => { clearTimeout(id); reject(signal.reason); };
    const id = setTimeout(() => { signal.removeEventListener('abort', abort); resolve(); }, 350);
    signal.addEventListener('abort', abort, { once: true });
  });
  function waitForResponse(work, signal) {
    return new Promise((resolve, reject) => {
      const abort = () => reject(signal.reason);
      signal.addEventListener('abort', abort, { once: true });
      if (signal.aborted) abort();
      work.then(resolve, reject).finally(() => signal.removeEventListener('abort', abort));
    });
  }
  async function transport(path, body, signal) {
    if (el('transport').value === 'http') return requestJSON('/demo-api/' + path, {
      method: body ? 'POST' : 'GET', body: body ? JSON.stringify(body) : undefined, signal,
    });
    if (!body) {
      await delay(signal);
      if (path.startsWith('name?')) return { available: new URLSearchParams(path.split('?')[1]).get('value').toLowerCase() !== 'taken' };
      return { version: local.version, project: local.project ? { ...local.project } : null, pending: local.pending };
    }
    // The server simulation keeps processing a dispatched write after the
    // client stops waiting, just as a canceled HTTP request can still commit.
    local.pending++;
    const response = new Promise((resolve, reject) => setTimeout(() => {
      try {
        if (body.outcome === 'failure') throw new RequestError('The service is unavailable. Your draft is retained; try saving again.', 503, { committed: false });
        if (body.outcome === 'conflict') {
          local.project = { ...(local.project ?? body), notes: 'Updated by another editor.' };
          local.version++;
        }
        if (body.version !== local.version) throw new RequestError('Another editor changed this project. Check the latest saved values before retrying.', 409, { committed: false });
        local.project = Object.fromEntries(Object.keys(fields).map(key => [key, body[key]]));
        local.version++;
        if (body.outcome === 'uncertain') throw new RequestError('The save response was lost. The outcome must be checked before retrying.');
        resolve({ version: local.version, project: { ...local.project } });
      } catch (error) { reject(error); }
      finally { local.pending--; }
    }, 350));
    return waitForResponse(response, signal);
  }

  function busy(active) {
    el('fields').disabled = active || !el('permission').checked;
    el('save').disabled = active || !el('permission').checked || needsRefresh;
    el('reload').disabled = active;
    el('keep-draft').disabled = active || !el('permission').checked;
    el('use-latest').disabled = active;
    el('cancel').hidden = !active;
    if (active) el('save').setAttribute('aria-busy', 'true');
    else el('save').removeAttribute('aria-busy');
  }
  function summary(message, target = 'lab-save', title = 'Project could not be saved') {
    const link = document.createElement('a'); link.href = '#' + target; link.textContent = message;
    link.addEventListener('click', event => { event.preventDefault(); document.getElementById(target).focus(); });
    const li = document.createElement('li'); li.append(link); el('errors').replaceChildren(li);
    el('summary-title').textContent = title;
    el('summary').hidden = false; el('summary').focus();
  }
  function requireLatest() {
    needsRefresh = true;
    comparison = null;
    el('comparison').hidden = true;
    el('reload').hidden = false;
  }
  function finishReview(latest) {
    version = latest.version;
    needsRefresh = false; comparison = null; submitted = null;
    el('comparison').hidden = true; el('reload').hidden = true;
    el('summary').hidden = true; el('outcome').value = 'success';
    busy(false);
  }
  function setProject(project) {
    const values = project ?? emptyProject();
    el('name').value = values.name; el('team').value = values.team;
    el('owner').replaceChildren(...teams[values.team].map(name => new Option(name, name)));
    el('owner').value = values.owner; el('notes').value = values.notes;
    validation?.abort(); sequence++; clearTimeout(timer);
    el('name').removeAttribute('aria-invalid'); el('name-status').textContent = '';
  }
  function validSnapshot(snapshot) {
    if (!Number.isInteger(snapshot?.version) || snapshot.version < 1 || !Number.isInteger(snapshot.pending) || snapshot.pending < 0) return false;
    return snapshot.project === null || (snapshot.project && Object.keys(fields).every(key => typeof snapshot.project[key] === 'string') && teams[snapshot.project.team]?.includes(snapshot.project.owner));
  }
  function renderComparison() {
    const mine = draft(), latest = comparison.project ?? emptyProject();
    const rows = Object.entries(fields).map(([key, label]) => {
      const row = document.createElement('tr');
      const heading = document.createElement('th'); heading.scope = 'row';
      heading.textContent = label + (mine[key] === latest[key] ? '' : ' (different)');
      row.append(heading);
      for (const value of [mine[key], latest[key]]) {
        const cell = document.createElement('td'); cell.textContent = value || 'Not set';
        cell.style.whiteSpace = 'pre-wrap'; cell.style.overflowWrap = 'anywhere';
        row.append(cell);
      }
      return row;
    });
    el('comparison-rows').replaceChildren(...rows);
    el('comparison-status').textContent = `Version ${comparison.version} is the latest saved version. Compare all fields before choosing what to keep.`;
    el('comparison').hidden = false;
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
      console.warn('Form demo name validation failed', { name: error.name, status: error.status ?? 0 });
      el('name-status').textContent = 'Availability could not be checked. Try again.'; return false;
    }
  }
  function edited() { dirty = true; if (comparison) renderComparison(); }
  el('fields').addEventListener('input', edited);
  el('fields').addEventListener('change', edited);
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
  function cancel(message, refresh = Boolean(saving)) {
    clearTimeout(timer); sequence++; validation?.abort(); saving?.abort(); saving = null; phase = 'idle';
    if (refresh) requireLatest();
    busy(false); el('summary').hidden = true; el('name-status').textContent = ''; el('result').textContent = message;
  }
  el('permission').addEventListener('change', () => {
    cancel('Your draft is retained.'); el('permission-status').textContent = el('permission').checked ? 'Editing permission restored.' : 'Editing permission removed. Ask your administrator for access.';
  });
  el('transport').addEventListener('change', () => {
    submitted = null;
    cancel('Transport changed. Draft retained; the latest saved values must be checked before saving.', true);
  });
  el('cancel').addEventListener('click', () => {
    cancel('Request canceled. Your draft is retained. Check the latest saved values before retrying; a dispatched write may still finish.', true);
    el('reload').focus();
  });
  el('reload').addEventListener('click', async () => {
    if (saving) return;
    const controller = new AbortController(); saving = controller; phase = 'checking';
    requireLatest(); el('summary').hidden = true; busy(true);
    el('result').textContent = 'Checking the latest saved values…';
    try {
      const latest = await transport('version', null, controller.signal); controller.signal.throwIfAborted();
      if (!validSnapshot(latest)) throw new Error('Unexpected latest-version response.');
      if (latest.pending > 0) {
        requireLatest();
        el('result').textContent = 'A save is still processing. Your draft is retained. Check the latest saved values again before retrying.';
        return;
      }
      el('summary').hidden = true;
      if ((!dirty && !submitted) || sameProject(draft(), latest.project)) {
        const confirmed = submitted && sameProject(submitted, latest.project);
        if (!dirty && !submitted) setProject(latest.project);
        dirty = false;
        finishReview(latest);
        el('result').textContent = confirmed
          ? `Saved values confirmed. Version ${version} loaded and matches your submitted draft. No retry was sent.`
          : `Version ${version} loaded. The form matches the latest saved values.`;
      } else {
        comparison = latest;
        renderComparison();
        el('result').textContent = `Version ${latest.version} loaded. Your draft is retained. Choose what to keep before saving again.`;
      }
    } catch (error) {
      if (!controller.signal.aborted) {
        console.warn('Form demo latest-version check failed', { name: error.name, status: error.status ?? 0 });
        summary('Latest saved values could not be checked. Your draft is retained; try checking again.', 'lab-reload', 'Latest version could not be checked');
      }
    } finally {
      if (saving === controller) {
        saving = null; phase = 'idle'; busy(false);
        if (comparison) el('comparison').focus();
        else if (!needsRefresh) el('save').focus();
      }
    }
  });
  el('keep-draft').addEventListener('click', () => {
    if (!comparison || saving || !el('permission').checked) return;
    const latest = comparison;
    finishReview(latest);
    dirty = true;
    el('result').textContent = `Version ${version} reviewed. Your draft is retained and has not been saved. Review it, then save to replace the compared values.`;
    el('name').focus();
  });
  el('use-latest').addEventListener('click', () => {
    if (!comparison || saving) return;
    const latest = comparison;
    setProject(latest.project); dirty = false; finishReview(latest);
    el('result').textContent = `Version ${version} loaded into the form. No write was sent.`;
    (el('permission').checked ? el('name') : el('permission')).focus();
  });

  form.addEventListener('submit', async event => {
    event.preventDefault(); if (saving || !el('permission').checked || needsRefresh) return;
    clearTimeout(timer); const controller = new AbortController(); saving = controller; phase = 'validating'; busy(true); el('summary').hidden = true;
    try {
      const available = await checkName(); controller.signal.throwIfAborted();
      if (!available) { busy(false); summary('Enter an available project name.', 'lab-name', 'Review project details'); return; }
      const values = draft(); submitted = { ...values };
      phase = 'saving'; el('result').textContent = 'Saving project…';
      const result = await transport('projects', { ...values, version, outcome: el('outcome').value }, controller.signal);
      controller.signal.throwIfAborted();
      if (!Number.isInteger(result.version) || !sameProject(result.project, values)) throw new Error('Unexpected save response.');
      version = result.version; submitted = null; dirty = false;
      el('result').textContent = `Project saved. Version ${version}.`;
    } catch (error) {
      if (!controller.signal.aborted) {
        console.warn('Form demo save failed', { phase, name: error.name, status: error.status ?? 0 });
        const conflict = error.status === 409;
        const uncertain = phase === 'saving' && !conflict && error.body?.committed !== false;
        if (conflict || uncertain) requireLatest();
        else submitted = null;
        busy(false);
        summary(uncertain ? 'The save outcome is unknown. Your draft is retained. Check the latest saved values before retrying.'
          : error.message || 'Save failed. Your draft is retained.', conflict || uncertain ? 'lab-reload' : 'lab-save', uncertain ? 'Save outcome unknown' : 'Project could not be saved');
        el('result').textContent = uncertain ? 'Save outcome unknown. Your draft is retained.' : 'Your draft is retained.';
      }
    } finally { if (saving === controller) { saving = null; phase = 'idle'; busy(false); } }
  });
}
