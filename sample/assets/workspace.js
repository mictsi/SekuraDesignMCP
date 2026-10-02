/* Local demonstration state. No network save, publishing or authorization claims. */
(function () {
  'use strict';
  var form = document.querySelector('[data-sk-workspace-note]');
  if (!form) return;
  var note = form.querySelector('textarea');
  var status = form.querySelector('[data-sk-workspace-save]');
  var error = form.querySelector('[data-sk-workspace-error]');
  var star = document.querySelector('[data-sk-workspace-star]');
  var key = 'sk-demo-workspace-note';
  var details = document.getElementById('workspace-details');
  details.querySelectorAll('a[href^="#"]').forEach(function (link) {
    link.addEventListener('click', function (event) {
      var target = document.getElementById(link.hash.slice(1));
      if (!target || details.getAttribute('aria-modal') !== 'true') return;
      event.preventDefault();
      details.querySelector('[data-sk-drawer-close]').click();
      target.tabIndex = -1;
      target.focus();
      target.scrollIntoView({ block: 'start' });
    });
  });
  function state(value, message) { status.dataset.state = value; status.textContent = message; }
  try {
    var saved = localStorage.getItem(key);
    if (saved !== null) { note.value = saved; state('local', 'Saved on this device'); }
    var starred = localStorage.getItem('sk-demo-workspace-star') === 'true';
    star.setAttribute('aria-pressed', String(starred));
    star.textContent = starred ? 'Starred' : 'Star document';
  } catch (e) { state('error', 'Device storage is unavailable'); }
  note.addEventListener('input', function () { state('pending', 'Unsaved note'); });
  form.addEventListener('submit', function (event) {
    event.preventDefault();
    error.hidden = true;
    try { localStorage.setItem(key, note.value); state('local', 'Saved on this device'); }
    catch (e) { error.hidden = false; state('error', 'Note not saved'); }
  });
  star.addEventListener('click', function () {
    var next = star.getAttribute('aria-pressed') !== 'true';
    try {
      localStorage.setItem('sk-demo-workspace-star', String(next));
      star.setAttribute('aria-pressed', String(next));
      star.textContent = next ? 'Starred' : 'Star document';
      Sekura.announce(next ? 'Document starred on this device.' : 'Document removed from your stars.');
    } catch (e) { Sekura.announce('Could not save your star. Device storage is unavailable.'); }
  });
})();
