/**
 * Documentation-site behaviours, layered on top of app.js.
 *
 * Only the things a docs site needs that a product does not: scroll-spy for the
 * on-page contents, copy buttons on generated code blocks, the token filter, and
 * the motion demo.
 */
(function () {
  'use strict';

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* ================================================================== *
   * On-page contents scroll-spy
   *
   * Follow the actual content scroll root and batch its updates per frame.
   * The current section persists while the reader is between headings.
   * ================================================================== */

  function initScrollSpy() {
    var links = $$('.docs-toc__link');
    if (!links.length) return;

    var byId = {};
    links.forEach(function (link) {
      byId[link.getAttribute('href').slice(1)] = link;
    });

    var targets = Object.keys(byId)
      .map(function (id) { return document.getElementById(id); })
      .filter(Boolean);
    if (!targets.length) return;

    var root = $('.sk-app-shell__main');
    var scrollTarget = root || window;
    var frame = 0;

    function highlight() {
      frame = 0;
      var visibleTargets = targets.filter(function (target) { return !target.closest('[hidden]') && target.getClientRects().length > 0; });
      links.forEach(function (link) {
        var target = document.getElementById(link.getAttribute('href').slice(1));
        var visible = !!target && visibleTargets.indexOf(target) >= 0;
        var item = link.closest('li');
        if (item) item.hidden = !visible;
        if (!visible) link.removeAttribute('aria-current');
      });
      // Match the 5rem section scroll margin with a small rounding allowance.
      // A percentage IntersectionObserver margin would be based on width,
      // making the observation band empty in a wide, short viewport.
      var top = (root ? root.getBoundingClientRect().top : 0) + 88;
      var best = visibleTargets[0];
      visibleTargets.forEach(function (t) {
        if (t.getBoundingClientRect().top <= top) best = t;
      });
      links.forEach(function (link) {
        if (best && link === byId[best.id]) link.setAttribute('aria-current', 'location');
        else link.removeAttribute('aria-current');
      });
    }

    function schedule() { if (!frame) frame = requestAnimationFrame(highlight); }
    scrollTarget.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule, { passive: true });
    document.addEventListener('sk:docs:filter', highlight);
    highlight();
  }

  /* ================================================================== *
   * Copy buttons on generated code blocks
   * ================================================================== */

  function initCodeCopy() {
    $$('[data-sk-copy-block]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var block = btn.closest('.sk-code-block');
        var code = block && block.querySelector('code');
        if (!code) return;

        var done = function () {
          // The accessible NAME must not change; the confirmation is announced
          // separately by app.js's live region.
          Sekura.announce('Copied to clipboard.');
          var label = btn.querySelector('[data-sk-copy-label]');
          if (label) {
            var original = label.textContent;
            label.textContent = 'Copied';
            setTimeout(function () { label.textContent = original; }, 2000);
          }
        };

        if (navigator.clipboard) {
          navigator.clipboard.writeText(code.textContent).then(done, failed);
        } else { failed(); }
        function failed() { Sekura.announce('Could not copy. Select the code and copy it manually.'); }
      });
    });
  }

  function initComponentPreview() {
    var preview = $('[data-docs-component-preview]');
    if (!preview) return;
    var section = preview.closest('.docs-section');
    var code = $('.docs-demo__code code', section);
    var original = code ? code.textContent : '';
    var controls = $$('input, button, textarea, select', preview);
    var disabled = controls.map(function (control) { return control.disabled; });
    function apply() {
      var theme = $('[data-docs-preview-theme]', section).value;
      var density = $('[data-docs-preview-density]', section).value;
      var stateControl = $('[data-docs-preview-state]', section);
      var isDisabled = stateControl && stateControl.value === 'disabled';
      if (theme) preview.setAttribute('data-sk-theme', theme); else preview.removeAttribute('data-sk-theme');
      preview.setAttribute('data-sk-density', density);
      controls.forEach(function (control, index) { control.disabled = isDisabled || disabled[index]; });
      if (code) {
        var template = document.createElement('template'); template.innerHTML = original;
        if (isDisabled) $$('input, button, textarea, select', template.content).forEach(function (control) { control.disabled = true; });
        code.textContent = '<div' + (theme ? ' data-sk-theme="' + theme + '"' : '') + ' data-sk-density="' + density + '">\n' + template.innerHTML + '\n</div>';
      }
    }
    $$('select', $('.docs-preview-controls', section)).forEach(function (control) { control.addEventListener('change', apply); });
    apply();
  }

  /* ================================================================== *
   * Token filter
   * ================================================================== */

  function initTokenFilter() {
    var input = $('[data-sk-token-filter]');
    if (!input) return;
    var counter = $('[data-sk-token-count]');
    var timer;

    function apply() {
      var q = input.value.trim().toLowerCase();
      var shown = 0;

      $$('.token-table tbody tr').forEach(function (row) {
        var match = !q || row.textContent.toLowerCase().indexOf(q) !== -1;
        row.hidden = !match;
        if (match) shown++;
      });

      $$('[data-docs-token-group]').forEach(function (group) {
        var rows = $$('.token-table tbody tr', group);
        // A group can itself be the table wrapper.
        if (group.classList.contains('token-table')) rows = $$('tbody tr', group);
        group.hidden = rows.length > 0 && rows.every(function (row) { return row.hidden; });
      });

      // Hide a whole section once every row in it is filtered out, so the page
      // does not become a list of empty headings.
      $$('.docs-section').forEach(function (section) {
        var rows = $$('.token-table tbody tr', section);
        if (!rows.length) return;
        section.hidden = rows.every(function (r) { return r.hidden; });
      });
      document.dispatchEvent(new CustomEvent('sk:docs:filter'));

      if (counter) {
        counter.textContent = q
          ? shown + (shown === 1 ? ' token matches' : ' tokens match') + ' "' + input.value.trim() + '"'
          : shown + ' tokens';
      }
    }

    // Debounced, and the count is announced only after it settles rather than
    // on every keystroke.
    input.addEventListener('input', function () {
      clearTimeout(timer);
      timer = setTimeout(apply, 200);
    });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && input.value) {
        input.value = '';
        apply();
      }
    });
    apply();
  }

  /* ================================================================== *
   * Motion demo
   * ================================================================== */

  function initMotionDemo() {
    $$('[data-sk-motion-play]').forEach(function (btn) {
      var demo = btn.closest('.docs-motion');
      if (!demo) return;
      btn.addEventListener('click', function () {
        demo.removeAttribute('data-playing');
        // Force a reflow so the transition restarts from the beginning.
        void demo.offsetWidth;
        demo.setAttribute('data-playing', '');
        setTimeout(function () { demo.removeAttribute('data-playing'); }, 1400);
      });
    });
  }

  /* ================================================================== *
   * Boot
   * ================================================================== */

  function init() {
    // Keep the exact destination visible when its expanded branch is long.
    // Scroll only the navigation; never move the document or steal focus.
    var nav = $('#primary-nav');
    var scroll = nav && $('[data-docs-nav-scroll]', nav);
    function revealCurrent() {
      var current = nav && $('[aria-current="page"]', nav);
      if (!current || !scroll || nav.hidden) return;
      requestAnimationFrame(function () {
        var bounds = scroll.getBoundingClientRect();
        var item = current.getBoundingClientRect();
        if (item.bottom > bounds.bottom) scroll.scrollTop += item.bottom - bounds.bottom + 8;
        else if (item.top < bounds.top) scroll.scrollTop -= bounds.top - item.top + 8;
      });
    }
    revealCurrent();
    if (nav) nav.addEventListener('sk:drawer:open', revealCurrent);
    initScrollSpy();
    initCodeCopy();
    initComponentPreview();
    initTokenFilter();
    initMotionDemo();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
