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
   * Uses IntersectionObserver rather than a scroll listener, so it costs
   * nothing while the user is not scrolling.
   * ================================================================== */

  function initScrollSpy() {
    var links = $$('.docs-toc__link');
    if (!links.length || !('IntersectionObserver' in window)) return;

    var byId = {};
    links.forEach(function (link) {
      byId[link.getAttribute('href').slice(1)] = link;
    });

    var targets = Object.keys(byId)
      .map(function (id) { return document.getElementById(id); })
      .filter(Boolean);
    if (!targets.length) return;

    var visible = new Set();

    function highlight() {
      // The topmost visible section wins, which matches what the reader is
      // actually looking at.
      var best = null;
      targets.forEach(function (t) {
        if (!visible.has(t.id)) return;
        if (!best || t.getBoundingClientRect().top < best.getBoundingClientRect().top) best = t;
      });
      links.forEach(function (l) { l.removeAttribute('aria-current'); });
      if (best && byId[best.id]) byId[best.id].setAttribute('aria-current', 'true');
    }

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) visible.add(e.target.id);
          else visible.delete(e.target.id);
        });
        highlight();
      },
      // Bias the band toward the top of the viewport, allowing for the sticky
      // header.
      { rootMargin: '-88px 0px -70% 0px', threshold: 0 }
    );

    targets.forEach(function (t) { observer.observe(t); });
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

      // Hide a whole section once every row in it is filtered out, so the page
      // does not become a list of empty headings.
      $$('.docs-section').forEach(function (section) {
        var rows = $$('.token-table tbody tr', section);
        if (!rows.length) return;
        section.hidden = rows.every(function (r) { return r.hidden; });
      });

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
    initScrollSpy();
    initCodeCopy();
    initTokenFilter();
    initMotionDemo();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
