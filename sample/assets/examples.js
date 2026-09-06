/* Deterministic local application state for the worked examples. No remote writes. */
(function () {
  'use strict';
  var $ = function (s, root) { return (root || document).querySelector(s); };
  var $$ = function (s, root) { return Array.from((root || document).querySelectorAll(s)); };
  function tell(message, undo) { window.sekuraToast({ message: message, intent: 'success', action: undo ? { label: 'Undo', onClick: undo } : null }); }
  function readProjects() { try { return JSON.parse(sessionStorage.getItem('sk-demo-projects') || '[]'); } catch (_) { return []; } }
  function storeProjects(projects) { try { sessionStorage.setItem('sk-demo-projects', JSON.stringify(projects)); return true; } catch (_) { return false; } }

  function list() {
    var table = $('#project-table');
    if (!table) return;
    var tbody = $('tbody', table), search = $('#project-q'), filters = $('#project-filters');
    var teams = ['Platform', 'Product', 'Product', 'Research', 'Product', 'Marketing', 'Platform', 'Product'];
    var rows = $$('tr', tbody).map(function (node, index) {
      return { node: node, name: $('th', node).textContent.trim(), team: teams[index], due: $('time', node).dateTime, portfolio: false };
    });
    readProjects().forEach(function (project) {
      var existing = rows.find(function (row) { return row.name === (project.originalName || project.name); });
      if (existing) {
        existing.name = project.name; existing.team = project.team || existing.team;
        $('th a', existing.node).textContent = project.name;
        return;
      }
      var node = rows[0].node.cloneNode(true);
      $('th a', node).textContent = project.name;
      var menu = $('[aria-haspopup="menu"]', node); menu.removeAttribute('aria-controls'); menu.removeAttribute('aria-haspopup'); menu.removeAttribute('data-sk-menu-trigger');
      menu.setAttribute('data-sk-local-row-delete', ''); menu.setAttribute('aria-label', 'Delete ' + project.name);
      $$('[data-sk-enhanced]', node).forEach(function (el) { delete el.dataset.skEnhanced; });
      $('[data-sk-select-row]', node).checked = false;
      $('label .sk-visually-hidden', node).textContent = 'Select ' + project.name;
      tbody.appendChild(node);
      rows.push({ node: node, name: project.name, team: project.team || 'Product', due: project.startDate || '2026-08-21', portfolio: false });
    });
    rows.forEach(function (row) { $('th a', row.node).href = 'example-detail.html?project=' + encodeURIComponent(row.name); });
    var page = 0, pageSize = 4, selectedTeams = [], selectedRow = null;
    var from = $('#due-from'), to = $('#due-to');
    function matching() {
      var q = search.value.trim().toLowerCase();
      return rows.filter(function (row) {
        var searchable = [row.name, row.team, $('td', row.node)?.textContent || ''].join(' ').toLowerCase();
        return (!q || searchable.includes(q)) && (!selectedTeams.length || selectedTeams.includes(row.team)) && (!from.value || row.due >= from.value) && (!to.value || row.due <= to.value);
      });
    }
    function update() {
      var matches = matching(), pages = Math.max(1, Math.ceil(matches.length / pageSize));
      page = Math.max(0, Math.min(page, pages - 1));
      var visible = matches.slice(page * pageSize, (page + 1) * pageSize);
      rows.forEach(function (row) { row.node.hidden = !visible.includes(row); if (row.node.hidden) $('[data-sk-select-row]', row.node).checked = false; });
      $('[data-sk-filter-status]').textContent = matches.length ? 'Showing ' + (page * pageSize + 1) + '–' + Math.min((page + 1) * pageSize, matches.length) + ' of ' + matches.length + ' projects' : 'No matching projects';
      $('[data-sk-page-label]').textContent = 'Page ' + (page + 1) + ' of ' + pages;
      $('[data-sk-page-prev]').disabled = page === 0;
      $('[data-sk-page-next]').disabled = page === pages - 1;
      $('[data-sk-filter-count]').textContent = String(selectedTeams.length + Number(!!from.value) + Number(!!to.value));
      var empty = $('[data-sk-filter-empty]'); if (empty) empty.hidden = matches.length !== 0;
      var term = $('[data-sk-filter-term]'); if (term) term.textContent = search.value || 'the active filters';
      $('.sk-page-header__description').textContent = rows.length + ' projects across ' + new Set(rows.map(function (row) { return row.team; })).size + ' teams.';
      $('.sk-table__caption-detail', table).textContent = $('[data-sk-filter-status]').textContent + '. Use column headings to sort.';
      var chips = $('[data-sk-filter-chips]'); chips.replaceChildren();
      selectedTeams.forEach(function (team) {
        var button = document.createElement('button'); button.type = 'button'; button.className = 'sk-button sk-button--secondary sk-button--sm'; button.textContent = team + ' ×'; button.setAttribute('aria-label', 'Remove team filter ' + team);
        button.onclick = function () { selectedTeams = selectedTeams.filter(function (t) { return t !== team; }); syncFilters(); page = 0; update(); search.focus(); };
        chips.appendChild(button);
      });
      table.dispatchEvent(new Event('change', { bubbles: true }));
    }
    function syncFilters() { $$('input[type=checkbox]', filters).forEach(function (input) { input.checked = selectedTeams.includes(input.closest('label').textContent.trim()); }); }
    function clear() { selectedTeams = []; search.value = ''; from.value = ''; to.value = ''; page = 0; syncFilters(); update(); }
    search.addEventListener('input', function () { page = 0; update(); });
    search.addEventListener('keydown', function (event) { if (event.key === 'Escape') { search.value = ''; page = 0; update(); } });
    [from, to].forEach(function (input) { input.addEventListener('change', function () { from.max = to.value; to.min = from.value; page = 0; update(); }); });
    $('[data-sk-filter-apply]').onclick = function () { selectedTeams = $$('input:checked', filters).map(function (input) { return input.closest('label').textContent.trim(); }); page = 0; update(); Sekura.announce('Project filters applied.'); };
    $('[data-sk-filter-clear]').onclick = clear;
    $('[data-sk-page-prev]').onclick = function () { page--; update(); };
    $('[data-sk-page-next]').onclick = function () { page++; update(); };
    var emptyClear = $('[data-sk-filter-empty] button'); if (emptyClear) { emptyClear.removeAttribute('onclick'); emptyClear.onclick = clear; }
    function chooseRow(event) { var node = event.target.closest('tbody tr'); if (node) selectedRow = rows.find(function (row) { return row.node === node; }); }
    table.addEventListener('click', chooseRow, true);
    table.addEventListener('focusin', chooseRow);
    table.addEventListener('sk:table:sort', function () { rows.sort(function (a, b) { return Array.from(tbody.children).indexOf(a.node) - Array.from(tbody.children).indexOf(b.node); }); page = 0; update(); });
    function remove(targets) {
      if (!targets.length) return;
      var previous = rows.slice();
      rows = rows.filter(function (row) { return !targets.includes(row); });
      targets.forEach(function (row) { row.node.remove(); });
      update(); search.focus();
      tell(targets.length + ' projects deleted in this demo.', function () { rows = previous; rows.forEach(function (row) { tbody.appendChild(row.node); }); update(); Sekura.announce('Projects restored.'); });
    }
    document.addEventListener('sk:demo:confirm', function (event) {
      if (event.target.id === 'bulk-delete-dialog') remove(rows.filter(function (row) { return $('[data-sk-select-row]', row.node).checked && !row.node.hidden; }));
      else if (event.target.id === 'delete-project-dialog') remove(selectedRow ? [selectedRow] : rows.filter(function (row) { return row.name === 'Website redesign'; }));
    });
    document.addEventListener('sk:menu:select', function (event) {
      if (!selectedRow || !event.target.closest('.sk-menu')) return;
      var label = event.target.textContent.trim().toLowerCase();
      if (event.target.tagName === 'A') { event.target.href = 'example-form.html?project=' + encodeURIComponent(selectedRow.name); return; }
      if (event.target.hasAttribute('data-sk-dialog-open')) {
        var dialog = $('#delete-project-dialog'); $('#dp-title').textContent = 'Delete ' + selectedRow.name + '?';
        $('label code', dialog).textContent = selectedRow.name;
        $('#dp-confirm').dataset.skConfirmPhrase = selectedRow.name; $('#dp-confirm').value = ''; $('#dp-confirm').dispatchEvent(new Event('input'));
        return;
      }
      if (/delete|archive/.test(label)) remove([selectedRow]);
      else if (/duplicate/.test(label)) {
        var copies = readProjects(); copies.push({ name: selectedRow.name + ' copy', team: selectedRow.team });
        if (storeProjects(copies)) location.reload(); else tell('Could not save the demo copy.');
      } else if (/complete/.test(label)) {
        var status = $('.sk-status__label', selectedRow.node); if (status) status.textContent = 'Complete'; tell('Project marked complete locally.');
      } else if (/export/.test(label)) {
        var url = URL.createObjectURL(new Blob(['name,team\n' + [selectedRow.name, selectedRow.team].map(function (value) { return '"' + value.replace(/"/g, '""') + '"'; }).join(',')], { type: 'text/csv' }));
        var link = document.createElement('a'); link.href = url; link.download = 'project.csv'; link.click(); setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
      } else tell('Demo action: ' + event.target.textContent.trim());
    });
    table.addEventListener('click', function (event) { if (event.target.closest('[data-sk-local-row-delete]') && selectedRow) remove([selectedRow]); });
    $('[data-sk-portfolio]').onclick = function () {
      var chosen = rows.filter(function (row) { return !row.node.hidden && $('[data-sk-select-row]', row.node).checked; });
      var previous = chosen.map(function (row) { return row.portfolio; });
      chosen.forEach(function (row) { row.portfolio = true; row.node.dataset.portfolio = 'Q3'; $('th a', row.node).textContent = row.name + ' · Q3 portfolio'; });
      tell(chosen.length + ' projects added to Q3 portfolio.', function () { chosen.forEach(function (row, i) { row.portfolio = previous[i]; $('th a', row.node).textContent = row.name + (row.portfolio ? ' · Q3 portfolio' : ''); }); });
    };
    $('[data-sk-export]').onclick = function () {
      var data = matching().map(function (row) { return { name: row.name, team: row.team, due: row.due }; });
      var url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
      var link = document.createElement('a'); link.href = url; link.download = 'projects.json'; link.click(); setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
      tell(data.length + ' matching projects exported.');
    };
    update();
  }

  function forms() {
    if (location.pathname.endsWith('example-onboarding.html')) return;
    var form = $('form[data-sk-validate]');
    if (!form) return;
    var name = $('#project-name'), original = new URLSearchParams(location.search).get('project');
    if (original && name) { name.value = original; $('.sk-page-header__title').textContent = 'Edit project'; }
    form.addEventListener('sk:demo:submit', function () {
      if (!name) { tell('Setup saved for this demonstration.'); return; }
      var projects = readProjects(); var data = Object.fromEntries(new FormData(form));
      var team = $('#team');
      var item = { name: name.value.trim(), originalName: original || undefined, team: team ? team.selectedOptions[0].textContent.trim() : 'Product', startDate: data.startDate || '' };
      var at = projects.findIndex(function (p) { return p.name === original; });
      if (at >= 0) projects[at] = item; else projects.push(item);
      if (storeProjects(projects)) location.href = 'example-list.html';
      else tell('Could not save on this device. Your form values are still here.');
    });
    var dirty = false;
    form.addEventListener('input', function () { dirty = true; });
    form.addEventListener('sk:demo:submit', function () { dirty = false; });
    window.addEventListener('beforeunload', function (event) { if (dirty) { event.preventDefault(); event.returnValue = ''; } });
  }
  function account() {
    var open = $('[data-sk-reset-open]');
    if (open) {
      open.dataset.skDialogOpen = 'password-reset';
      $('[data-sk-reset-form]').onsubmit = function (event) { event.preventDefault(); $('[data-sk-reset-status]').textContent = 'If an account exists, reset instructions would be sent. This demo sends no email.'; };
    }
    var photo = $('[data-sk-photo-open]');
    if (photo) {
      var input = $('#profile-photo'), url;
      photo.onclick = function () { input.click(); };
      input.onchange = function () {
        var file = input.files[0]; if (!file) return;
        if (!file.type.startsWith('image/') || file.size > 5 * 1024 * 1024) { $('[data-sk-photo-status]').textContent = 'Choose an image smaller than 5 MB.'; return; }
        if (url) URL.revokeObjectURL(url); url = URL.createObjectURL(file);
        var avatar = $('#profile .sk-avatar'); avatar.replaceChildren(); var img = document.createElement('img'); img.src = url; img.alt = ''; avatar.appendChild(img);
        $('[data-sk-photo-status]').textContent = 'Photo preview updated for this session.';
      };
      window.addEventListener('pagehide', function () { if (url) URL.revokeObjectURL(url); });
    }
    var project = new URLSearchParams(location.search).get('project');
    if (project && location.pathname.endsWith('example-detail.html')) {
      $('.sk-page-header__title').textContent = project; document.title = project + ' · Sekura';
      $$('a').filter(function (a) { return a.getAttribute('href') === 'example-form.html'; }).forEach(function (a) { a.href = 'example-form.html?project=' + encodeURIComponent(project); });
    }
  }
  function workbench() {
    var preview = $('[data-sk-bench-preview]');
    if (!preview) return;
    $('[data-sk-bench-theme]').onchange = function (event) { preview.dataset.skTheme = event.target.value; };
    $('[data-sk-bench-density]').onchange = function (event) { preview.dataset.skDensity = event.target.value; };
    $('[data-sk-bench-long]').onchange = function (event) { $$('[data-sk-bench-button]').forEach(function (button) { button.textContent = event.target.checked ? 'Save all changes to this project and notify the assigned team' : 'Save changes'; }); };
    $('[data-sk-bench-state]').onchange = function (event) {
      var state = event.target.value;
      $$('input, select, button', preview).forEach(function (control) {
        control.disabled = state === 'disabled' || (state === 'readonly' && (control.tagName === 'SELECT' || control.tagName === 'BUTTON')); control.readOnly = state === 'readonly';
        control.removeAttribute('aria-busy'); control.removeAttribute('aria-invalid');
        if (state === 'busy' && control.tagName === 'BUTTON') control.setAttribute('aria-busy', 'true');
        if (state === 'invalid' && control.tagName !== 'BUTTON') control.setAttribute('aria-invalid', 'true');
      });
      $$('[data-sk-state-help]', preview).forEach(function (help) { help.textContent = state === 'disabled' ? 'Unavailable: your role cannot edit this project.' : state === 'invalid' ? 'Enter a valid project value before continuing.' : state === 'busy' ? 'Saving. Activation is temporarily blocked.' : state === 'readonly' ? 'Read only: review these saved values.' : 'Use Tab to inspect focus. Controls share the same target height.'; });
    };
    var save = $('[data-sk-action-save]'), cancel = $('[data-sk-action-cancel]'), retry = $('[data-sk-action-retry]'), status = $('[data-sk-action-status]');
    var version = 0, operation = null;
    function run() {
      if (operation) return;
      var controller = new AbortController(); operation = controller;
      save.setAttribute('aria-busy', 'true'); cancel.disabled = false; retry.hidden = true; status.textContent = 'Saving version ' + (version + 1) + '…';
      var timer = setTimeout(function () {
        if (controller.signal.aborted) return;
        operation = null; save.removeAttribute('aria-busy'); cancel.disabled = true;
        if ($('[data-sk-fail-next]').checked) {
          $('[data-sk-fail-next]').checked = false; retry.hidden = false;
          status.textContent = 'Save failed. Version ' + version + ' is unchanged. Retry when ready.';
        } else {
          var previous = version; version++; status.textContent = 'Saved version ' + version + '.';
          tell('Changes saved.', function () { version = previous; status.textContent = 'Restored version ' + version + '.'; });
        }
      }, 900);
      controller.signal.addEventListener('abort', function () { clearTimeout(timer); operation = null; save.removeAttribute('aria-busy'); cancel.disabled = true; status.textContent = 'Saving cancelled. Version ' + version + ' is unchanged.'; save.focus(); });
    }
    save.onclick = run; retry.onclick = run; cancel.onclick = function () { if (operation) operation.abort(); };
    var upload = $('[data-sk-custom-upload]');
    if (upload) Sekura.createUpload(upload, { upload: function (file, signal, progress) {
      return new Promise(function (resolve, reject) {
        var percent = 0;
        var timer = setInterval(function () {
          percent += 20; progress(percent);
          if (percent >= 100) { clearInterval(timer); $('[data-sk-upload-fail]').checked ? reject(new Error('Demo failure')) : resolve(); }
        }, 180);
        signal.addEventListener('abort', function () { clearInterval(timer); reject(new DOMException('Cancelled', 'AbortError')); }, { once: true });
      });
    } });
  }

  function setup() {
    if (!location.pathname.endsWith('example-onboarding.html')) return;
    var form = $('form[data-sk-validate]'), host = form.parentElement;
    var steps = $$('.sk-stepper__step'), progress = $('[role=status]', host);
    var workspace = document.createElement('section'); workspace.id = 'step-workspace'; workspace.className = 'sk-stack sk-stack--gap-16';
    workspace.innerHTML = '<h2 tabindex="-1">Name your workspace</h2><div class="sk-field"><label class="sk-field__label" for="setup-name">Workspace name</label><input class="sk-input" id="setup-name" value="Product team" required /></div><button class="sk-button sk-button--primary" type="button">Continue to invitations</button>';
    var review = document.createElement('section'); review.id = 'step-review'; review.className = 'sk-stack sk-stack--gap-16';
    review.innerHTML = '<h2 tabindex="-1">Review your workspace</h2><p data-sk-setup-summary></p><p>This demo stores your choices on this device. No emails are sent.</p><div class="sk-cluster sk-cluster--gap-8"><a class="sk-button sk-button--secondary" href="#step-invites">Back to invitations</a><button class="sk-button sk-button--primary" type="button" data-sk-setup-confirm>Create workspace</button></div><p role="status" data-sk-setup-result></p>';
    host.insertBefore(workspace, form); form.id = 'step-invites'; form.after(review);
    var name = $('#setup-name'), emails = $('#invite-emails'), skipped = false;
    workspace.querySelector('button').onclick = function () { if (name.reportValidity()) location.hash = 'step-invites'; };
    function render() {
      var index = ['#step-workspace', '#step-invites', '#step-review'].indexOf(location.hash); if (index < 0) index = 0;
      [workspace, form, review].forEach(function (section, i) { section.hidden = i !== index; });
      steps.forEach(function (step, i) { step.toggleAttribute('data-complete', i < index); if (i === index) step.setAttribute('aria-current', 'step'); else step.removeAttribute('aria-current'); $('.sk-stepper__indicator', step).textContent = i < index ? '✓' : String(i + 1); var extra = $('.sk-visually-hidden', step); if (extra) extra.textContent = i < index ? ', completed' : i === index ? ', current step' : ', not started'; });
      progress.textContent = 'Step ' + (index + 1) + ' of 3 — ' + ['Workspace', 'Invite people', 'Review'][index];
      $('[data-sk-setup-summary]').textContent = 'Workspace: ' + name.value + '. Invitations: ' + (skipped || !emails.value.trim() ? 'none' : emails.value.trim()) + '.';
      var target = index === 1 ? emails : $('h2', index === 0 ? workspace : review); target.focus();
    }
    form.addEventListener('sk:demo:submit', function () { skipped = false; location.hash = 'step-review'; });
    $('[data-sk-setup-skip]').onclick = function () { skipped = true; location.hash = 'step-review'; };
    $('[data-sk-setup-confirm]').onclick = function () {
      if (!name.value.trim()) { location.hash = 'step-workspace'; return; }
      try { localStorage.setItem('sk-demo-workspace', JSON.stringify({ name: name.value, invitations: skipped ? '' : emails.value })); $('[data-sk-setup-result]').textContent = 'Workspace saved on this device. No invitations were sent.'; }
      catch (_) { $('[data-sk-setup-result]').textContent = 'Could not save on this device. Your choices are preserved; try again.'; }
    };
    window.addEventListener('hashchange', render); render();
  }

  function taskDetails() {
    var drawer = $('#task-drawer'); if (!drawer) return;
    var table = $('[data-sk-table]'), selected = null, template = $('tbody tr', table).cloneNode(true);
    var status = document.createElement('p'); status.setAttribute('role', 'status'); status.className = 'sk-field__hint';
    $('.sk-page-header').after(status);
    function summary() {
      var count = $$('tbody tr', table).length;
      $('.sk-table__caption-detail', table).textContent = count + ' tasks in this local example';
      $('.sk-page-header__description').textContent = count + ' local tasks. Inspect a task to edit it or delete it with undo.';
    }
    summary();
    var modal = document.createElement('dialog'); modal.className = 'sk-dialog'; modal.setAttribute('aria-labelledby', 'task-editor-title');
    modal.innerHTML = '<form class="sk-dialog__panel"><header class="sk-dialog__header"><h2 class="sk-dialog__title" id="task-editor-title">Edit task</h2></header><div class="sk-dialog__body sk-field"><label class="sk-field__label" for="task-editor-name">Task name</label><input class="sk-input" id="task-editor-name" required maxlength="200" /></div><footer class="sk-dialog__footer"><button class="sk-button sk-button--secondary" type="button">Cancel</button><button class="sk-button sk-button--primary" type="submit">Save task</button></footer></form>';
    document.body.appendChild(modal); var controller = Sekura.createDialog(modal), editing = false;
    var input = $('#task-editor-name'); $('button[type=button]', modal).onclick = function () { controller.close(); };
    function edit(existing) { editing = existing; $('#task-editor-title').textContent = existing ? 'Edit task' : 'Add task'; input.value = existing && selected ? $('th', selected).textContent.trim() : ''; controller.show(); input.focus(); }
    table.addEventListener('click', function (event) {
      var trigger = event.target.closest('[data-sk-drawer-open]'); if (!trigger) return;
      selected = trigger.closest('tr'); $('#task-drawer-title').textContent = $('th', selected).textContent.trim();
      var details = $$('.sk-dl__detail', drawer), cells = $$('td', selected);
      if (details.length >= 4) { details[0].textContent = cells[2].textContent.trim(); details[1].textContent = 'Not specified'; details[2].textContent = cells[0].textContent.trim(); details[3].textContent = cells[1].textContent.trim(); }
    });
    $('[data-sk-task-add]').onclick = function () { edit(false); };
    $('[data-sk-task-edit]').onclick = function () { if (selected) edit(true); };
    $('[data-sk-task-delete]').onclick = function () {
      if (!selected) return; var row = selected, next = row.nextSibling, name = $('th', row).textContent.trim();
      $('[data-sk-drawer-close]', drawer).click(); row.remove(); summary(); $('[data-sk-task-add]').focus();
      tell(name + ' deleted locally.', function () { $('tbody', table).insertBefore(row, next?.parentNode ? next : null); summary(); }); selected = null;
    };
    $('form', modal).onsubmit = function (event) {
      event.preventDefault(); var row = editing ? selected : template.cloneNode(true);
      $('th', row).textContent = input.value.trim(); var inspect = $('[data-sk-drawer-open]', row); inspect.textContent = 'Inspect'; inspect.setAttribute('aria-label', 'Inspect ' + input.value.trim());
      if (!editing) $('tbody', table).appendChild(row); else $('#task-drawer-title').textContent = input.value.trim();
      controller.close(); summary(); status.textContent = 'Task saved locally.';
    };
    async function copyLink() {
      try { await navigator.clipboard.writeText(location.href); tell('Link copied to the clipboard.'); }
      catch (_) { Sekura.announce('Could not copy. Select and copy the address from your browser.'); }
    }
    $('[data-sk-copy-link]').onclick = copyLink;
    $('#share-menu').addEventListener('sk:menu:select', function (event) {
      var label = event.target.textContent.trim();
      if (label === 'Copy link') { void copyLink(); return; }
      if (label === 'Invite by email') { tell('Demo only: no invitations are sent. Use the onboarding example to review invitation choices.'); return; }
      var lines = $$('tr', table).map(function (row) { return $$('th,td', row).slice(0, 4).map(function (cell) { return '"' + cell.textContent.trim().replace(/\s+/g, ' ').replace(/"/g, '""') + '"'; }).join(','); });
      var url = URL.createObjectURL(new Blob([lines.join('\n')], { type: 'text/csv' })); var link = document.createElement('a'); link.href = url; link.download = 'tasks.csv'; link.click(); setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    });
  }

  function init() { list(); forms(); account(); workbench(); setup(); taskDetails(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
