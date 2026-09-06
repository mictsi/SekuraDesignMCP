/**
 * Sekura sample — interaction layer.
 *
 * Implements the keyboard and ARIA contracts the component specifications
 * require. The specs describe these in prose; this is what they look like in
 * code. Notable ones:
 *
 *   - Menus move real focus; comboboxes do not (aria-activedescendant instead).
 *   - Segmented controls are ONE tab stop with a roving tabindex.
 *   - Every overlay returns focus to whatever opened it.
 *   - The toast region exists in the DOM at load; content is inserted into it.
 *   - Auto-dismiss pauses on hover and focus (WCAG 2.2.1).
 *
 * No framework, deliberately: it should be obvious that the design system does
 * not depend on one.
 */
(function () {
  'use strict';

  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(sel));
  };

  /* ================================================================== *
   * Live region
   *
   * Created once, at load, empty. Creating the region and its message in the
   * same tick announces nothing — the most common live-region bug.
   * ================================================================== */

  function announce(message) { Sekura.announce(message); }

  /* ================================================================== *
   * Theme and density
   *
   * The theme is applied pre-paint by the inline script in <head>. This only
   * wires the controls and keeps them in sync.
   * ================================================================== */

  function syncThemeControls() {
    var current = window.sekuraTheme ? window.sekuraTheme.get() : 'system';
    $$('[data-sk-theme-option]').forEach(function (btn) {
      var on = btn.dataset.skThemeOption === current;
      btn.setAttribute('aria-checked', String(on));
      btn.tabIndex = on ? 0 : -1;
    });
  }

  function initTheme() {
    document.addEventListener('sk:segmented:change', function (event) {
      var btn = $('[data-sk-theme-option][aria-checked="true"]', event.target);
      if (!btn) return;
      window.sekuraTheme.set(btn.dataset.skThemeOption);
      syncThemeControls();
      announce('Theme set to ' + btn.textContent.trim() + '.');
    });

    // The header button cycles; the settings page offers all three explicitly.
    $$('[data-sk-theme-cycle]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var order = ['system', 'light', 'dark'];
        var next = order[(order.indexOf(window.sekuraTheme.get()) + 1) % order.length];
        window.sekuraTheme.set(next);
        syncThemeControls();
        announce('Theme set to ' + next + '. Currently showing ' + window.sekuraTheme.resolved() + '.');
      });
    });

    syncThemeControls();
  }

  function initDensity() {
    var stored;
    try { stored = localStorage.getItem('sk-density'); } catch (e) { stored = null; }
    var current = stored || 'comfortable';
    document.documentElement.setAttribute('data-sk-density', current);

    $$('[data-sk-density-option]').forEach(function (btn) {
      var on = btn.dataset.skDensityOption === current;
      btn.setAttribute('aria-checked', String(on));
      btn.tabIndex = on ? 0 : -1;

    });
    document.addEventListener('sk:segmented:change', function (event) {
      var btn = $('[data-sk-density-option][aria-checked="true"]', event.target);
      if (!btn) return;
      var value = btn.dataset.skDensityOption;
      document.documentElement.setAttribute('data-sk-density', value);
      try { localStorage.setItem('sk-density', value); } catch (e) { announce('Density applied for this page; storage is unavailable.'); return; }
      announce('Density set to ' + value + '.');
    });
  }

  /* ================================================================== *
   * Segmented controls
   *
   * role="radiogroup" with a roving tabindex: the whole group is one tab stop,
   * and arrows move between segments. Direction is mirrored under RTL, which
   * CSS does automatically but a key handler does not.
   * ================================================================== */

  function initShared() {
    $$('[role="tablist"]').forEach(function (el) { el.setAttribute('data-sk-tabs', ''); });
    $$('.sk-button-group--segmented[role="radiogroup"], .sk-segmented').forEach(function (el) { el.setAttribute('data-sk-segmented', ''); });
    $$('[aria-haspopup="menu"][aria-controls]').forEach(function (el) { el.dataset.skMenuTrigger = el.getAttribute('aria-controls'); });
    $$('[data-sk-popover-target]').forEach(function (el) { el.dataset.skPopoverTrigger = el.dataset.skPopoverTarget; });
    $$('dialog.sk-dialog').forEach(function (el) { el.setAttribute('data-sk-dialog', ''); });
    $$('.sk-drawer').forEach(function (el) { el.setAttribute('data-sk-drawer', ''); if (!el.hasAttribute('data-sk-modal')) el.dataset.skModal = '(max-width: 63.999rem)'; });
    $$('[data-sk-table]').forEach(function (el) { el.dataset.skSelection = el.id === 'project-table' ? 'projects' : 'items'; });
    Sekura.autoEnhance(document.body);
  }

  function initDialogs() {
    $$('dialog.sk-dialog').forEach(function (dialog) {
      dialog.addEventListener('close', function () {
        if (dialog.returnValue === 'confirm') {
          dialog.dispatchEvent(new CustomEvent('sk:demo:confirm', { bubbles: true }));
          if (!dialog.hasAttribute('data-sk-local-delete')) toast({ intent: 'info', message: dialog.dataset.skConfirmMessage || 'Demonstration complete. No remote changes were made.' });
        }
      });
    });
  }

  function initDrawers() {
    var trigger = $('.sk-top-bar__nav-trigger');
    var nav = $('#primary-nav');
    if (!trigger || !nav) return;
    var query = matchMedia('(max-width: 63.999rem)');
    var controller = Sekura.createDrawer(nav, { modal: '(max-width: 63.999rem)', onOpenChange: function (open) { trigger.setAttribute('aria-expanded', String(open)); } });
    function sync() {
      if (query.matches) controller.close();
      else { controller.show(); nav.setAttribute('role', 'navigation'); }
    }
    query.addEventListener('change', sync);
    trigger.addEventListener('click', function () { controller.open ? controller.close() : controller.show(); });
    sync();
  }

  /* ================================================================== *
   * Toasts
   *
   * Polite, never assertive. Auto-dismiss pauses on hover and on focus-within,
   * and a manual close is always available (WCAG 2.2.1).
   * ================================================================== */

  function toast(opts) {
    var region = $('.sk-toast-region');
    if (!region) return;

    var intent = opts.intent || 'success';
    var el = document.createElement('div');
    el.className = 'sk-toast sk-toast--' + intent;
    el.dataset.state = 'entering';

    var icons = { success: 'check-circle', info: 'info', danger: 'error' };
    el.innerHTML =
      '<svg class="sk-toast__icon" aria-hidden="true" focusable="false" width="20" height="20">' +
        '<use href="#sk-icon-' + (icons[intent] || 'info') + '"></use></svg>' +
      '<p class="sk-toast__message"></p>' +
      (opts.action
        ? '<button type="button" class="sk-button sk-button--ghost sk-button--sm sk-toast__action"></button>'
        : '') +
      '<button type="button" class="sk-icon-button sk-icon-button--sm sk-toast__dismiss">' +
        '<svg aria-hidden="true" focusable="false" width="16" height="16"><use href="#sk-icon-close"></use></svg>' +
        '<span class="sk-visually-hidden">Dismiss notification</span></button>';

    $('.sk-toast__message', el).textContent = opts.message;

    if (opts.action) {
      var actionBtn = $('.sk-toast__action', el);
      actionBtn.textContent = opts.action.label;
      actionBtn.addEventListener('click', function () {
        opts.action.onClick();
        dismiss();
      });
    }

    // Toasts carrying an action get longer, because the user has to reach it.
    var duration = opts.duration || (opts.action ? 10000 : 6000);
    var timer;
    var dismissed = false;

    function dismiss() {
      if (dismissed) return;
      dismissed = true;
      clearTimeout(timer);
      el.dataset.state = 'leaving';
      setTimeout(function () { el.remove(); }, 200);
    }
    function start() { timer = setTimeout(dismiss, duration); }
    function pause() { clearTimeout(timer); }

    $('.sk-toast__dismiss', el).addEventListener('click', dismiss);
    el.addEventListener('mouseenter', pause);
    el.addEventListener('mouseleave', start);
    el.addEventListener('focusin', pause);
    el.addEventListener('focusout', start);
    el.addEventListener('keydown', function (e) { if (e.key === 'Escape') dismiss(); });

    region.appendChild(el);
    requestAnimationFrame(function () { el.dataset.state = 'visible'; });
    start();

    // Cap at three. More than that and none of them get read.
    var all = $$('.sk-toast', region);
    if (all.length > 3) all[0].remove();
  }
  window.sekuraToast = toast;

  /* ================================================================== *
   * Tabs (roving tabindex, automatic activation)
   * ================================================================== */

  /* ================================================================== *
   * Tables: tri-state selection, sorting, bulk bar
   * ================================================================== */

  function initTables() {
    $$('[data-sk-table]').forEach(function (table) {
      // Sorting.
      $$('[data-sk-sort]', table).forEach(function (button) {
        button.addEventListener('click', function () {
          var th = button.closest('th');
          var currentSort = th.getAttribute('aria-sort');
          var next = currentSort === 'ascending' ? 'descending' : 'ascending';

          $$('th[aria-sort]', table).forEach(function (other) {
            other.setAttribute('aria-sort', 'none');
            var icon = $('use', other);
            if (icon) icon.setAttribute('href', '#sk-icon-sort-unsorted');
          });

          th.setAttribute('aria-sort', next);
          var useEl = $('use', th);
          if (useEl) useEl.setAttribute('href', '#sk-icon-sort-' + (next === 'ascending' ? 'asc' : 'desc'));

          var tbody = $('tbody', table);
          var rows = $$('tr', tbody);
          var colIndex = Array.prototype.indexOf.call(th.parentNode.children, th);

          rows.sort(function (a, b) {
            var av = (a.children[colIndex].textContent || '').trim();
            var bv = (b.children[colIndex].textContent || '').trim();
            var an = parseFloat(av.replace(/[^0-9.-]/g, ''));
            var bn = parseFloat(bv.replace(/[^0-9.-]/g, ''));
            var cmp = (!isNaN(an) && !isNaN(bn)) ? an - bn : av.localeCompare(bv);
            return next === 'ascending' ? cmp : -cmp;
          });
          rows.forEach(function (r) { tbody.appendChild(r); });
          table.dispatchEvent(new Event('sk:table:sort'));

          // The visual reorder is completely silent without this.
          announce('Sorted by ' + button.textContent.trim() + ', ' + next + '.');
        });
      });

    });
  }

  /* ================================================================== *
   * Search filter
   *
   * Debounced at 250ms, with the result count announced after the debounce
   * settles rather than on every keystroke.
   * ================================================================== */

  function initSearch() {
    $$('[data-sk-filter-input]').forEach(function (input) {
      if (input.dataset.skFilterInput === '#project-table') return;
      var targetSel = input.dataset.skFilterInput;
      var timer;

      input.addEventListener('input', function () {
        clearTimeout(timer);
        timer = setTimeout(function () {
          var q = input.value.trim().toLowerCase();
          var rows = $$(targetSel + ' tbody tr');
          var shown = 0;

          rows.forEach(function (row) {
            var match = !q || row.textContent.toLowerCase().indexOf(q) !== -1;
            row.hidden = !match;
            if (match) shown++;
          });

          var status = $('[data-sk-filter-status]');
          if (status) {
            status.textContent = q
              ? 'Showing ' + shown + ' of ' + rows.length + ' items matching "' + input.value.trim() + '".'
              : 'Showing all ' + rows.length + ' items.';
          }

          var empty = $('[data-sk-filter-empty]');
          if (empty) {
            empty.hidden = shown !== 0;
            var term = $('[data-sk-filter-term]', empty);
            if (term) term.textContent = input.value.trim();
          }

          announce(shown === 0
            ? 'No zones match ' + input.value.trim() + '.'
            : shown + (shown === 1 ? ' item' : ' items') + ' found.');
        }, 250);
      });

      // Escape clears, keeping focus in the field.
      input.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && input.value) {
          input.value = '';
          input.dispatchEvent(new Event('input'));
        }
      });
    });
  }

  /* ================================================================== *
   * Form validation
   *
   * Format on blur, everything on submit. Focus moves to the error summary,
   * which links to each bad field. Input is never cleared.
   * ================================================================== */

  function initForms() {
    $$('[data-sk-validate]').forEach(function (form) {
      var summary = $('[data-sk-error-summary]', form) || $('[data-sk-error-summary]');
      var summaryList = summary ? $('ul', summary) : null;

      function validateField(field) {
        var wrapper = field.closest('.sk-field');
        if (!wrapper) return null;

        var value = field.value.trim();
        var message = null;

        if (field.required && !value) {
          message = field.dataset.skRequiredMessage || 'Enter ' + labelFor(field).toLowerCase() + '.';
        } else if (value && field.dataset.skPattern) {
          if (!new RegExp(field.dataset.skPattern).test(value)) {
            message = field.dataset.skPatternMessage || 'That value is not in the expected format.';
          }
        } else if (value && field.type === 'number') {
          var n = Number(value);
          var min = field.min !== '' ? Number(field.min) : -Infinity;
          var max = field.max !== '' ? Number(field.max) : Infinity;
          if (isNaN(n) || n < min || n > max) {
            message = 'Enter a value between ' + field.min + ' and ' + field.max + '.';
          }
        }

        applyFieldState(field, wrapper, message);
        return message;
      }

      function labelFor(field) {
        var label = form.querySelector('label[for="' + field.id + '"]');
        return label ? label.childNodes[0].textContent.trim() : 'a value';
      }

      function applyFieldState(field, wrapper, message) {
        var errorId = field.id + '-error';
        var existing = document.getElementById(errorId);

        if (message) {
          wrapper.setAttribute('data-invalid', '');
          field.setAttribute('aria-invalid', 'true');

          if (!existing) {
            existing = document.createElement('p');
            existing.className = 'sk-field__error';
            existing.id = errorId;
            existing.innerHTML =
              '<svg aria-hidden="true" focusable="false" width="16" height="16">' +
              '<use href="#sk-icon-warning"></use></svg><span></span>';
            wrapper.appendChild(existing);
          }
          $('span', existing).textContent = message;

          var described = (field.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean);
          if (described.indexOf(errorId) === -1) {
            described.push(errorId);
            field.setAttribute('aria-describedby', described.join(' '));
          }
        } else {
          wrapper.removeAttribute('data-invalid');
          // A stale aria-invalid is worse than none.
          field.removeAttribute('aria-invalid');
          if (existing) existing.remove();
          var d = (field.getAttribute('aria-describedby') || '')
            .split(/\s+/).filter(function (id) { return id && id !== errorId; });
          if (d.length) field.setAttribute('aria-describedby', d.join(' '));
          else field.removeAttribute('aria-describedby');
        }
      }

      $$('input, select, textarea', form).forEach(function (field) {
        // Format on blur. Never on keystroke.
        field.addEventListener('blur', function () {
          if (field.dataset.skTouched) validateField(field);
        });
        field.addEventListener('input', function () {
          field.dataset.skTouched = 'true';
          // Do clear an existing error as soon as it is resolved.
          if (field.getAttribute('aria-invalid') === 'true') validateField(field);
        });
      });

      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var errors = [];

        $$('input, select, textarea', form).forEach(function (field) {
          field.dataset.skTouched = 'true';
          var message = validateField(field);
          if (message) errors.push({ id: field.id, message: message, label: labelFor(field) });
        });

        if (errors.length && summary) {
          summaryList.innerHTML = '';
          errors.forEach(function (err) {
            var li = document.createElement('li');
            var a = document.createElement('a');
            a.className = 'sk-link';
            a.href = '#' + err.id;
            a.textContent = err.message;
            a.addEventListener('click', function (ev) {
              ev.preventDefault();
              var field = document.getElementById(err.id);
              if (field) field.focus();
            });
            li.appendChild(a);
            summaryList.appendChild(li);
          });

          $('h2', summary).textContent =
            'There ' + (errors.length === 1 ? 'is 1 problem' : 'are ' + errors.length + ' problems') +
            ' with this form';

          summary.hidden = false;
          summary.focus();
          return;
        }

        if (summary) summary.hidden = true;
        form.dispatchEvent(new CustomEvent('sk:demo:submit', { bubbles: true }));
      });
    });
  }

  /* ================================================================== *
   * Switches with a pending state
   *
   * A switch that lies about its state is worse than a slow one, so the demo
   * shows pending until the (simulated) server confirms.
   * ================================================================== */

  function initSwitches() {
    $$('.sk-switch__input[data-sk-async]').forEach(function (input) {
      var key = 'sk-setting-' + input.id;
      var stored;
      try { stored = localStorage.getItem(key); } catch (e) { stored = null; }
      if (stored !== null) input.checked = stored === 'true';
      function apply() {
        if (input.id === 'reduce-motion') document.documentElement.toggleAttribute('data-sk-reduce-motion', input.checked);
        if (input.id === 'mono-ids') document.documentElement.toggleAttribute('data-sk-mono-ids', input.checked);
      }
      apply();
      Sekura.createAsyncSwitch(input, {
        label: ($('label[for="' + input.id + '"]') || input).textContent.trim(),
        onToggle: function (next) {
          return new Promise(function (resolve) { setTimeout(function () {
            try { localStorage.setItem(key, String(next)); input.checked = next; apply(); resolve(true); }
            catch (e) { resolve(false); }
          }, 500); });
        }
      });
    });
  }

  /* ================================================================== *
   * Copy to clipboard
   * ================================================================== */

  function initCopy() {
    $$('[data-sk-copy]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var source = document.querySelector(btn.dataset.skCopy);
        var value = source ? (source.textContent || source.value || '').trim() : '';
        var done = function () {
          // The accessible NAME must not change; the confirmation is announced
          // separately.
          var labelEl = $('[data-sk-copy-label]', btn);
          if (labelEl) {
            var original = labelEl.textContent;
            labelEl.textContent = 'Copied';
            setTimeout(function () { labelEl.textContent = original; }, 2000);
          }
          announce('Copied to clipboard.');
        };
        if (navigator.clipboard) navigator.clipboard.writeText(value).then(done, failed);
        else failed();
        function failed() { announce('Could not copy. Select the text and copy it manually.'); }
      });
    });
  }

  /* ================================================================== *
   * Command palette
   *
   * Mod+K, suppressed while a text input has focus. aria-activedescendant, so
   * DOM focus never leaves the input.
   * ================================================================== */

  function initCommandPalette() {
    var palette = $('#command-palette');
    if (!palette) return;

    var input = $('.sk-command-palette__input', palette);
    var results = $('.sk-command-palette__results', palette);
    var status = $('[data-sk-palette-status]', palette);
    var returnFocus = null;

    var items = $$('.sk-command-palette__item', palette).map(function (el, i) {
      el.id = el.id || 'cp-item-' + i;
      return { el: el, text: el.textContent.toLowerCase(), href: el.dataset.href };
    });
    var active = 0;

    function setActive(i) {
      var visible = items.filter(function (it) { return !it.el.hidden; });
      if (!visible.length) return;
      active = Math.max(0, Math.min(i, visible.length - 1));
      items.forEach(function (it) { delete it.el.dataset.active; it.el.setAttribute('aria-selected', 'false'); });
      var target = visible[active];
      target.el.dataset.active = '';
      target.el.setAttribute('aria-selected', 'true');
      // DOM focus stays in the input; this is what moves the visual cursor.
      input.setAttribute('aria-activedescendant', target.el.id);
      target.el.scrollIntoView({ block: 'nearest' });
    }

    function filter() {
      var q = input.value.trim().toLowerCase();
      var shown = 0;
      items.forEach(function (it) {
        var match = !q || it.text.indexOf(q) !== -1;
        it.el.hidden = !match;
        if (match) shown++;
      });
      $$('[data-sk-palette-group]', palette).forEach(function (group) {
        group.hidden = $$('.sk-command-palette__item:not([hidden])', group).length === 0;
      });
      var empty = $('[data-sk-palette-empty]', palette);
      if (empty) empty.hidden = shown !== 0;
      status.textContent = shown + (shown === 1 ? ' result' : ' results') + '.';
      setActive(0);
    }

    function open() {
      returnFocus = document.activeElement;
      palette.hidden = false;
      input.value = '';
      filter();
      input.focus();
    }

    function close() {
      palette.hidden = true;
      if (returnFocus && document.contains(returnFocus)) returnFocus.focus();
      returnFocus = null;
    }

    $$('[data-sk-palette-open]').forEach(function (btn) {
      btn.addEventListener('click', open);
    });

    document.addEventListener('keydown', function (e) {
      var mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        palette.hidden ? open() : close();
      }
    });

    input.addEventListener('input', filter);

    input.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setActive(active + 1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(active - 1); }
      else if (e.key === 'Home') { e.preventDefault(); setActive(0); }
      else if (e.key === 'End') { e.preventDefault(); setActive(items.length); }
      else if (e.key === 'Escape') { e.preventDefault(); close(); }
      else if (e.key === 'Enter') {
        e.preventDefault();
        var visible = items.filter(function (it) { return !it.el.hidden; });
        var target = visible[active];
        if (target && target.href) window.location.href = target.href;
        else close();
      }
    });

    palette.addEventListener('click', function (e) {
      if (e.target === palette) close();
    });

    items.forEach(function (it) {
      it.el.addEventListener('click', function () {
        if (it.href) window.location.href = it.href;
        else close();
      });
    });
  }

  /* ================================================================== *
   * Sticky headers
   * ================================================================== */

  function initScrollState() {
    var bar = $('.sk-top-bar--sticky');
    var scroller = $('.sk-app-shell__main') || window;
    if (!bar) return;

    function update() {
      var y = scroller === window ? window.scrollY : scroller.scrollTop;
      if (y > 4) bar.setAttribute('data-scrolled', '');
      else bar.removeAttribute('data-scrolled');
    }
    scroller.addEventListener('scroll', update, { passive: true });
    update();
  }

  /* ================================================================== *
   * Demo-only handlers
   * ================================================================== */

  function initDemoActions() {
    $$('[data-sk-demo-toast]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        toast({
          intent: btn.dataset.skDemoIntent || 'success',
          message: 'Demo only: ' + btn.dataset.skDemoToast,
          action: null
        });
      });
    });

    // Busy-state demonstration: the label stays put, the spinner replaces the
    // icon, and progress is announced separately.
    $$('[data-sk-demo-busy]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (btn.getAttribute('aria-busy') === 'true') return;
        var icon = $('.sk-button__icon', btn);
        btn.setAttribute('aria-busy', 'true');
        var spinner = document.createElement('span');
        spinner.className = 'sk-button__spinner';
        spinner.setAttribute('aria-hidden', 'true');
        if (icon) icon.replaceWith(spinner); else btn.prepend(spinner);
        announce('Saving changes.');

        setTimeout(function () {
          btn.removeAttribute('aria-busy');
          if (icon) spinner.replaceWith(icon); else spinner.remove();
          toast({ intent: 'info', message: 'Save demonstration complete. No remote changes were made.' });
        }, 1600);
      });
    });

    $$('[data-sk-toggle-target]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var target = document.querySelector(btn.dataset.skToggleTarget);
        if (!target) return;
        target.hidden = !target.hidden;
        btn.setAttribute('aria-expanded', String(!target.hidden));
      });
    });
  }

  /* ================================================================== *
   * Boot
   * ================================================================== */

  function init() {
    initTheme();
    initDensity();
    initShared();
    initDialogs();
    initDrawers();
    initTables();
    initSearch();
    initForms();
    initSwitches();
    initCopy();
    initCommandPalette();
    initScrollState();
    initDemoActions();


  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
