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

  var announcer = document.createElement('p');
  announcer.className = 'sk-visually-hidden';
  announcer.setAttribute('role', 'status');
  announcer.setAttribute('aria-live', 'polite');
  document.addEventListener('DOMContentLoaded', function () {
    document.body.appendChild(announcer);
  });

  var announceTimer;
  function announce(message) {
    // Clearing first forces a re-announcement when the same text repeats.
    announcer.textContent = '';
    clearTimeout(announceTimer);
    announceTimer = setTimeout(function () {
      announcer.textContent = message;
    }, 60);
  }

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
    $$('[data-sk-theme-option]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        window.sekuraTheme.set(btn.dataset.skThemeOption);
        syncThemeControls();
        announce('Theme set to ' + btn.textContent.trim() + '.');
      });
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

      btn.addEventListener('click', function () {
        var value = btn.dataset.skDensityOption;
        document.documentElement.setAttribute('data-sk-density', value);
        try { localStorage.setItem('sk-density', value); } catch (e) { /* private mode */ }
        $$('[data-sk-density-option]').forEach(function (b) {
          var isOn = b === btn;
          b.setAttribute('aria-checked', String(isOn));
          b.tabIndex = isOn ? 0 : -1;
        });
        announce('Density set to ' + value + '.');
      });
    });
  }

  /* ================================================================== *
   * Segmented controls
   *
   * role="radiogroup" with a roving tabindex: the whole group is one tab stop,
   * and arrows move between segments. Direction is mirrored under RTL, which
   * CSS does automatically but a key handler does not.
   * ================================================================== */

  function initSegmented() {
    $$('.sk-button-group--segmented[role="radiogroup"]').forEach(function (group) {
      var segments = $$('[role="radio"]', group);
      var rtl = getComputedStyle(group).direction === 'rtl';

      group.addEventListener('keydown', function (e) {
        var idx = segments.indexOf(document.activeElement);
        if (idx === -1) return;

        var forward = rtl ? 'ArrowLeft' : 'ArrowRight';
        var back = rtl ? 'ArrowRight' : 'ArrowLeft';
        var next = null;

        if (e.key === forward || e.key === 'ArrowDown') next = (idx + 1) % segments.length;
        else if (e.key === back || e.key === 'ArrowUp') next = (idx - 1 + segments.length) % segments.length;
        else if (e.key === 'Home') next = 0;
        else if (e.key === 'End') next = segments.length - 1;
        else return;

        e.preventDefault();
        segments[next].focus();
        segments[next].click();
      });
    });
  }

  /* ================================================================== *
   * Menus
   *
   * A menu moves REAL focus into itself, unlike a combobox. Escape closes and
   * returns focus to the trigger — including when closing by selecting an item.
   * ================================================================== */

  var openMenu = null;

  function closeMenu(restoreFocus) {
    if (!openMenu) return;
    var menu = openMenu.menu;
    var trigger = openMenu.trigger;
    menu.hidden = true;
    trigger.setAttribute('aria-expanded', 'false');
    openMenu = null;
    if (restoreFocus) trigger.focus();
  }

  function positionMenu(menu, trigger) {
    var rect = trigger.getBoundingClientRect();
    menu.style.position = 'fixed';
    menu.style.insetBlockStart = rect.bottom + 4 + 'px';
    menu.hidden = false;

    // Flip and clamp rather than letting the menu leave the viewport.
    var menuRect = menu.getBoundingClientRect();
    var left = rect.left;
    if (left + menuRect.width > window.innerWidth - 8) {
      left = Math.max(8, rect.right - menuRect.width);
    }
    menu.style.insetInlineStart = left + 'px';

    if (rect.bottom + menuRect.height > window.innerHeight - 8) {
      menu.style.insetBlockStart = Math.max(8, rect.top - menuRect.height - 4) + 'px';
    }
  }

  function initMenus() {
    $$('[aria-haspopup="menu"]').forEach(function (trigger) {
      var menu = document.getElementById(trigger.getAttribute('aria-controls'));
      if (!menu) return;

      function open(focusLast) {
        closeMenu(false);
        positionMenu(menu, trigger);
        trigger.setAttribute('aria-expanded', 'true');
        openMenu = { menu: menu, trigger: trigger };
        var items = $$('[role="menuitem"]:not([aria-disabled="true"])', menu);
        if (items.length) (focusLast ? items[items.length - 1] : items[0]).focus();
      }

      trigger.addEventListener('click', function (e) {
        e.stopPropagation();
        if (trigger.getAttribute('aria-expanded') === 'true') closeMenu(true);
        else open(false);
      });

      trigger.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowDown') { e.preventDefault(); open(false); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); open(true); }
      });

      menu.addEventListener('keydown', function (e) {
        var items = $$('[role="menuitem"]:not([aria-disabled="true"])', menu);
        var idx = items.indexOf(document.activeElement);

        if (e.key === 'ArrowDown') {
          e.preventDefault();
          items[(idx + 1) % items.length].focus();
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          items[(idx - 1 + items.length) % items.length].focus();
        } else if (e.key === 'Home') {
          e.preventDefault(); items[0].focus();
        } else if (e.key === 'End') {
          e.preventDefault(); items[items.length - 1].focus();
        } else if (e.key === 'Escape') {
          e.preventDefault(); closeMenu(true);
        } else if (e.key === 'Tab') {
          // A menu never traps Tab.
          closeMenu(false);
        } else if (/^[a-z0-9]$/i.test(e.key)) {
          // Type-ahead.
          var match = items.filter(function (i) {
            return i.textContent.trim().toLowerCase().indexOf(e.key.toLowerCase()) === 0;
          })[0];
          if (match) { e.preventDefault(); match.focus(); }
        }
      });

      $$('[role="menuitem"]', menu).forEach(function (item) {
        item.addEventListener('click', function () {
          if (item.getAttribute('aria-disabled') === 'true') return;
          var label = item.querySelector('.sk-menu__label');
          closeMenu(true);
          if (item.dataset.skDemo !== 'false') {
            toast({ intent: 'success', message: (label ? label.textContent.trim() : 'Action') + ' — demo only.' });
          }
        });
      });
    });

    document.addEventListener('click', function (e) {
      if (openMenu && !openMenu.menu.contains(e.target) && !openMenu.trigger.contains(e.target)) {
        closeMenu(false);
      }
    });
  }

  /* ================================================================== *
   * Dialogs
   *
   * Native <dialog> + showModal(): the top layer, focus trapping and page
   * inertness come free. Hand-rolling role="dialog" loses all three.
   * ================================================================== */

  function initDialogs() {
    $$('[data-sk-dialog-open]').forEach(function (trigger) {
      trigger.addEventListener('click', function () {
        var dialog = document.getElementById(trigger.dataset.skDialogOpen);
        if (dialog && typeof dialog.showModal === 'function') dialog.showModal();
      });
    });

    $$('dialog.sk-dialog').forEach(function (dialog) {
      $$('[data-sk-dialog-close]', dialog).forEach(function (btn) {
        btn.addEventListener('click', function () { dialog.close('cancel'); });
      });

      // Typed confirmation: the destructive button stays disabled until the
      // exact phrase is entered.
      var phraseInput = $('[data-sk-confirm-phrase]', dialog);
      if (phraseInput) {
        var expected = phraseInput.dataset.skConfirmPhrase;
        var confirmBtn = $('[data-sk-confirm-button]', dialog);
        phraseInput.addEventListener('input', function () {
          confirmBtn.disabled = phraseInput.value.trim() !== expected;
        });
        dialog.addEventListener('close', function () {
          phraseInput.value = '';
          confirmBtn.disabled = true;
        });
      }

      dialog.addEventListener('close', function () {
        if (dialog.returnValue === 'confirm') {
          toast({
            intent: 'success',
            message: dialog.dataset.skConfirmMessage || 'Done.',
            action: { label: 'Undo', onClick: function () { announce('Change undone.'); } }
          });
        }
      });
    });
  }

  /* ================================================================== *
   * Drawers
   *
   * Inline above lg (a flex sibling, page stays interactive, focus NOT
   * trapped, no aria-modal). Modal below lg. Shipping only the CSS half of
   * that switch is a real accessibility bug, so the JS switches the ARIA too.
   * ================================================================== */

  var drawerReturnFocus = null;

  function isNarrow() { return window.matchMedia('(max-width: 63.999rem)').matches; }

  function openDrawer(drawer, trigger) {
    drawerReturnFocus = trigger || document.activeElement;
    drawer.hidden = false;
    drawer.dataset.open = '';
    drawer.removeAttribute('inert');

    if (isNarrow()) {
      drawer.setAttribute('role', 'dialog');
      drawer.setAttribute('aria-modal', 'true');
      var heading = $('.sk-drawer__title', drawer);
      if (heading) { heading.tabIndex = -1; heading.focus(); }
    } else {
      // Non-modal: the page is still available, so claiming otherwise would lie.
      drawer.setAttribute('role', 'complementary');
      drawer.removeAttribute('aria-modal');
    }
  }

  function closeDrawer(drawer) {
    delete drawer.dataset.open;
    drawer.hidden = true;
    // A closed drawer must be inert, or it leaves invisible tab stops.
    drawer.setAttribute('inert', '');
    if (drawerReturnFocus && document.contains(drawerReturnFocus)) drawerReturnFocus.focus();
    drawerReturnFocus = null;
  }

  function initDrawers() {
    $$('.sk-drawer').forEach(function (drawer) {
      if (drawer.hidden) drawer.setAttribute('inert', '');
      $$('[data-sk-drawer-close]', drawer).forEach(function (btn) {
        btn.addEventListener('click', function () { closeDrawer(drawer); });
      });
    });

    $$('[data-sk-drawer-open]').forEach(function (trigger) {
      trigger.addEventListener('click', function () {
        var drawer = document.getElementById(trigger.dataset.skDrawerOpen);
        if (drawer) openDrawer(drawer, trigger);
      });
    });

    // Mobile navigation drawer.
    var navTrigger = $('.sk-top-bar__nav-trigger');
    var nav = $('#primary-nav');
    if (navTrigger && nav) {
      navTrigger.addEventListener('click', function () {
        var open = nav.hasAttribute('data-open');
        if (open) {
          nav.removeAttribute('data-open');
          navTrigger.setAttribute('aria-expanded', 'false');
          navTrigger.focus();
        } else {
          nav.setAttribute('data-open', '');
          navTrigger.setAttribute('aria-expanded', 'true');
          var first = $('a', nav);
          if (first) first.focus();
        }
      });
    }
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

  function initTabs() {
    $$('[role="tablist"]').forEach(function (tablist) {
      var tabs = $$('[role="tab"]', tablist);
      if (!tabs.length) return;
      var rtl = getComputedStyle(tablist).direction === 'rtl';

      function select(tab) {
        tabs.forEach(function (t) {
          var on = t === tab;
          t.setAttribute('aria-selected', String(on));
          t.tabIndex = on ? 0 : -1;
          var panel = document.getElementById(t.getAttribute('aria-controls'));
          if (panel) panel.hidden = !on;
        });
      }

      tabs.forEach(function (tab) {
        tab.addEventListener('click', function () { select(tab); });
      });

      tablist.addEventListener('keydown', function (e) {
        var idx = tabs.indexOf(document.activeElement);
        if (idx === -1) return;
        var forward = rtl ? 'ArrowLeft' : 'ArrowRight';
        var back = rtl ? 'ArrowRight' : 'ArrowLeft';
        var next = null;

        if (e.key === forward) next = (idx + 1) % tabs.length;
        else if (e.key === back) next = (idx - 1 + tabs.length) % tabs.length;
        else if (e.key === 'Home') next = 0;
        else if (e.key === 'End') next = tabs.length - 1;
        else return;

        e.preventDefault();
        tabs[next].focus();
        select(tabs[next]);
      });
    });
  }

  /* ================================================================== *
   * Popovers
   *
   * Non-modal: no aria-modal, focus not trapped, light dismiss, Escape returns
   * focus to the trigger.
   * ================================================================== */

  function initPopovers() {
    $$('[data-sk-popover-target]').forEach(function (trigger) {
      var popover = document.getElementById(trigger.dataset.skPopoverTarget);
      if (!popover) return;

      function close(restore) {
        popover.dataset.open = 'false';
        popover.hidden = true;
        trigger.setAttribute('aria-expanded', 'false');
        if (restore) trigger.focus();
      }

      trigger.addEventListener('click', function (e) {
        e.stopPropagation();
        var isOpen = trigger.getAttribute('aria-expanded') === 'true';
        if (isOpen) { close(false); return; }

        popover.hidden = false;
        popover.dataset.open = 'true';
        trigger.setAttribute('aria-expanded', 'true');

        var rect = trigger.getBoundingClientRect();
        popover.style.position = 'fixed';
        popover.style.insetBlockStart = rect.bottom + 6 + 'px';
        var pRect = popover.getBoundingClientRect();
        var left = Math.min(rect.left, window.innerWidth - pRect.width - 8);
        popover.style.insetInlineStart = Math.max(8, left) + 'px';

        var first = popover.querySelector('input, button, select, a[href]');
        if (first) first.focus();
      });

      popover.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') { e.preventDefault(); close(true); }
      });

      document.addEventListener('click', function (e) {
        if (trigger.getAttribute('aria-expanded') !== 'true') return;
        if (!popover.contains(e.target) && !trigger.contains(e.target)) close(false);
      });

      $$('[data-sk-popover-close]', popover).forEach(function (btn) {
        btn.addEventListener('click', function () { close(true); });
      });
    });
  }

  /* ================================================================== *
   * Tooltips
   *
   * Immediate on focus, delayed on hover. Dismissible with Escape, hoverable,
   * and persistent until focus moves (WCAG 1.4.13).
   * ================================================================== */

  function initTooltips() {
    var tip = document.createElement('span');
    tip.className = 'sk-tooltip';
    tip.setAttribute('role', 'tooltip');
    tip.id = 'sk-shared-tooltip';
    document.addEventListener('DOMContentLoaded', function () { document.body.appendChild(tip); });

    var showTimer;
    var current = null;

    function show(el) {
      current = el;
      tip.textContent = el.dataset.skTooltip;
      tip.dataset.visible = '';
      var rect = el.getBoundingClientRect();
      var tRect = tip.getBoundingClientRect();
      tip.style.insetInlineStart =
        Math.max(8, Math.min(rect.left + rect.width / 2 - tRect.width / 2,
                             window.innerWidth - tRect.width - 8)) + 'px';
      var top = rect.top - tRect.height - 8;
      tip.style.insetBlockStart = (top < 8 ? rect.bottom + 8 : top) + 'px';
    }

    function hide() {
      clearTimeout(showTimer);
      delete tip.dataset.visible;
      current = null;
    }

    document.addEventListener('mouseover', function (e) {
      var el = e.target.closest ? e.target.closest('[data-sk-tooltip]') : null;
      if (!el) return;
      clearTimeout(showTimer);
      showTimer = setTimeout(function () { show(el); }, 400);
    });
    document.addEventListener('mouseout', function (e) {
      var el = e.target.closest ? e.target.closest('[data-sk-tooltip]') : null;
      if (el && el === current) hide();
      else if (el) clearTimeout(showTimer);
    });
    // No delay on focus: a keyboard user has already committed to the control.
    document.addEventListener('focusin', function (e) {
      var el = e.target.closest ? e.target.closest('[data-sk-tooltip]') : null;
      if (el) show(el);
    });
    document.addEventListener('focusout', hide);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && current) hide();
    });
  }

  /* ================================================================== *
   * Tables: tri-state selection, sorting, bulk bar
   * ================================================================== */

  function initTables() {
    $$('[data-sk-table]').forEach(function (table) {
      var selectAll = $('[data-sk-select-all]', table);
      var rowBoxes = $$('[data-sk-select-row]', table);
      var bulkBar = document.getElementById(table.dataset.skBulkBar || '');

      function selectedRows() {
        return rowBoxes.filter(function (b) { return b.checked; });
      }

      function sync() {
        var selected = selectedRows();

        if (selectAll) {
          selectAll.checked = selected.length === rowBoxes.length && rowBoxes.length > 0;
          // Indeterminate is a DOM property with no HTML attribute. Announced
          // as "mixed".
          selectAll.indeterminate = selected.length > 0 && selected.length < rowBoxes.length;
        }

        rowBoxes.forEach(function (box) {
          var row = box.closest('tr');
          if (row) row.setAttribute('aria-selected', String(box.checked));
        });

        if (bulkBar) {
          bulkBar.hidden = selected.length === 0;
          var count = $('[data-sk-selection-count]', bulkBar);
          if (count) {
            count.textContent = selected.length + (selected.length === 1 ? ' zone selected' : ' zones selected');
          }
          $$('[data-sk-selection-label]', bulkBar).forEach(function (el) {
            el.textContent = el.dataset.skSelectionLabel.replace('{n}', String(selected.length));
          });
        }
      }

      if (selectAll) {
        selectAll.addEventListener('change', function () {
          // Scopes to the CURRENT PAGE only. Selecting everything matching the
          // filter is a separate, explicit escalation.
          rowBoxes.forEach(function (b) { b.checked = selectAll.checked; });
          sync();
          announce(selectAll.checked
            ? rowBoxes.length + ' zones on this page selected.'
            : 'Selection cleared.');
        });
      }

      rowBoxes.forEach(function (box) {
        box.addEventListener('change', sync);
      });

      if (bulkBar) {
        var clear = $('[data-sk-clear-selection]', bulkBar);
        if (clear) {
          clear.addEventListener('click', function () {
            rowBoxes.forEach(function (b) { b.checked = false; });
            sync();
            announce('Selection cleared.');
            var firstBox = rowBoxes[0];
            if (firstBox) firstBox.focus();
          });
        }
      }

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

          // The visual reorder is completely silent without this.
          announce('Sorted by ' + button.textContent.trim() + ', ' + next + '.');
        });
      });

      sync();
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
              ? 'Showing ' + shown + ' of ' + rows.length + ' zones matching "' + input.value.trim() + '".'
              : 'Showing all ' + rows.length + ' zones.';
          }

          var empty = $('[data-sk-filter-empty]');
          if (empty) {
            empty.hidden = shown !== 0;
            var term = $('[data-sk-filter-term]', empty);
            if (term) term.textContent = input.value.trim();
          }

          announce(shown === 0
            ? 'No zones match ' + input.value.trim() + '.'
            : shown + (shown === 1 ? ' zone' : ' zones') + ' found.');
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
      var summary = $('[data-sk-error-summary]', form);
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
        toast({ intent: 'success', message: 'Zone created. This is a demo, so nothing was saved.' });
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
      var wrapper = input.closest('.sk-switch');
      var label = $('.sk-switch__label', wrapper);

      input.addEventListener('change', function () {
        var intended = input.checked;
        // Revert until confirmed: do not claim a state we have not reached.
        input.checked = !intended;
        input.disabled = true;
        wrapper.setAttribute('data-pending', '');
        input.setAttribute('aria-busy', 'true');
        announce(label.textContent.trim() + ', saving.');

        setTimeout(function () {
          input.checked = intended;
          input.disabled = false;
          wrapper.removeAttribute('data-pending');
          input.removeAttribute('aria-busy');
          announce(label.textContent.trim() + ' turned ' + (intended ? 'on' : 'off') + '.');
        }, 900);
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
        if (navigator.clipboard) navigator.clipboard.writeText(value).then(done, done);
        else done();
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
          message: btn.dataset.skDemoToast,
          action: btn.dataset.skDemoUndo
            ? { label: 'Undo', onClick: function () { announce('Change undone.'); } }
            : null
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
          toast({ intent: 'success', message: 'Changes saved.' });
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
    initSegmented();
    initMenus();
    initDialogs();
    initDrawers();
    initTabs();
    initPopovers();
    initTooltips();
    initTables();
    initSearch();
    initForms();
    initSwitches();
    initCopy();
    initCommandPalette();
    initScrollState();
    initDemoActions();

    // Global Escape: close the topmost overlay.
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      if (openMenu) closeMenu(true);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
