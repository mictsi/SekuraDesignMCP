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
  var currentPage = 'working-together';
  var details = document.getElementById('workspace-details');
  var detailsButton = document.querySelector('[data-sk-drawer-open="workspace-details"]');
  function syncDetails(event) {
    if (event.target === details) detailsButton.setAttribute('aria-expanded', String(!details.hidden));
  }
  details.addEventListener('sk:drawer:open', syncDetails);
  details.addEventListener('sk:drawer:close', syncDetails);
  details.addEventListener('click', function (event) {
    var link = event.target.closest('a[href^="#"]');
    if (!link) return;
    var target = document.getElementById(link.dataset.skWorkspaceSection || link.hash.slice(1));
    if (!target) return;
    event.preventDefault();
    if (details.getAttribute('aria-modal') === 'true') details.querySelector('[data-sk-drawer-close]').click();
    if (link.dataset.skWorkspaceSection && location.hash !== link.hash) history.pushState(null, '', link.hash);
    target.tabIndex = -1;
    target.focus();
    target.scrollIntoView({ block: 'start' });
  });
  function state(value, message) { status.dataset.state = value; status.textContent = message; }
  function starKey() { return 'sk-demo-workspace-star' + (currentPage === 'working-together' ? '' : '-' + currentPage); }
  function renderStar() {
    var starred = localStorage.getItem(starKey()) === 'true';
    star.setAttribute('aria-pressed', String(starred));
    star.textContent = starred ? 'Starred' : 'Star document';
  }
  try {
    var saved = localStorage.getItem(key);
    if (saved !== null) { note.value = saved; state('local', 'Saved on this device'); }
    renderStar();
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
      localStorage.setItem(starKey(), String(next));
      star.setAttribute('aria-pressed', String(next));
      star.textContent = next ? 'Starred' : 'Star document';
      Sekura.announce(next ? 'Document starred on this device.' : 'Document removed from your stars.');
    } catch (e) { Sekura.announce('Could not save your star. Device storage is unavailable.'); }
  });
  document.querySelector('[data-sk-copy-link]').addEventListener('click', function () {
    if (!navigator.clipboard) {
      Sekura.announce('Could not copy the link. Copy the address from your browser.');
      return;
    }
    navigator.clipboard.writeText(location.href).then(function () {
      Sekura.announce('Link copied.');
    }, function () {
      Sekura.announce('Could not copy the link. Copy the address from your browser.');
    });
  });

  var treeRoot = document.getElementById('workspace-tree');
  if (!treeRoot) return;
  var pageDrawer = document.getElementById('workspace-pages');
  var pagesButton = document.querySelector('[data-sk-workspace-pages-toggle]');
  var mobilePages = matchMedia('(max-width: 63.999rem)');
  var pagesController = Sekura.createDrawer(pageDrawer, {
    modal: '(max-width: 63.999rem)',
    onOpenChange: function (open) { pagesButton.setAttribute('aria-expanded', String(open)); }
  });
  pagesButton.addEventListener('click', function () {
    if (!details.hidden && details.getAttribute('aria-modal') === 'true') details.querySelector('[data-sk-drawer-close]').click();
    if (pagesController.open) pagesController.close(); else pagesController.show();
  });
  pageDrawer.querySelector('[data-sk-drawer-close]').addEventListener('click', function () { pagesController.close(); });
  function syncPages() {
    var hadFocus = pageDrawer.contains(document.activeElement);
    if (mobilePages.matches) {
      pagesController.close();
      if (hadFocus) pagesButton.focus();
    } else pagesController.show();
  }
  mobilePages.addEventListener('change', syncPages);
  syncPages();
  var actions = document.querySelector('.docs-workspace-more');
  var narrowActions = matchMedia('(max-width: 39.999rem)');
  function syncActions() {
    var summary = actions.querySelector('summary');
    var active = document.activeElement;
    var hadFocus = actions.contains(active);
    if (narrowActions.matches) {
      summary.hidden = false;
      if (hadFocus && active !== summary) summary.focus();
      actions.open = false;
    } else {
      actions.open = true;
      if (active === summary) actions.querySelector('button').focus();
      summary.hidden = true;
    }
  }
  narrowActions.addEventListener('change', syncActions);
  syncActions();
  var filter = document.getElementById('workspace-page-filter');
  var clear = document.getElementById('workspace-clear-filter');
  var result = document.getElementById('workspace-tree-status');
  var empty = document.getElementById('workspace-tree-empty');
  var title = document.getElementById('workspace-title');
  var body = document.querySelector('[data-sk-workspace-document]');
  var original = document.createDocumentFragment();
  Array.from(body.childNodes).forEach(function (node) { original.appendChild(node.cloneNode(true)); });
  var pages = {
    engineering: { title: 'Engineering', path: [], summary: 'Find the handbook and active projects in one shared hierarchy.', sections: [['Our handbook', 'The handbook records how the team works and how decisions are made.'], ['Active projects', 'Each project keeps its purpose, working documents and release decisions together.']] },
    handbook: { title: 'Handbook', path: ['engineering'], summary: 'The shared starting point for working together.', sections: [['Working agreements', 'Use clear owners and written decisions so the next person can understand the work.'], ['Design guidance', 'Keep navigation predictable, and review both the normal path and recovery states.']] },
    'working-together': { title: 'Working together', path: ['engineering', 'handbook'] },
    'navigation-guidelines': { title: 'Navigation guidelines', path: ['engineering', 'handbook'], summary: 'Help readers know where they are and find the next useful page.', sections: [['Show the current location', 'Keep the current page, its breadcrumb and its document title consistent. Exploring another branch should not move the reader.'], ['Make the hierarchy searchable', 'Preserve parent context in search results and provide a clear way back to the current page.']] },
    'design-reviews': { title: 'Design reviews and decision records', path: ['engineering', 'handbook'], summary: 'A review should lead to a decision that another teammate can understand later.', sections: [['Prepare the review', 'Include the problem, the proposed change and examples of important interaction states.'], ['Record the decision', 'Write the chosen approach, its owner and the next verification step.']] },
    projects: { title: 'Projects', path: ['engineering'], summary: 'Current projects and the documents that support delivery.', sections: [['Website redesign', 'The redesign brings navigation, content structure and release work into one project home.']] },
    'website-redesign': { title: 'Website redesign', path: ['engineering', 'projects'], summary: 'A project home for clearer content and predictable navigation.', sections: [['Project purpose', 'Make the right page easier to find while preserving familiar destinations.'], ['Delivery', 'Review the navigation plan and complete the release checklist before shipping.']] },
    'navigation-plan': { title: 'Navigation plan', path: ['engineering', 'projects', 'website-redesign'], summary: 'The proposed information structure for the website redesign.', sections: [['Primary destinations', 'Group destinations by the work people need to complete and use recognizable labels.'], ['Detailed browsing', 'Use a page hierarchy where readers need to explore nested documents, with search available alongside it.']] },
    'release-checklist': { title: 'Release checklist', path: ['engineering', 'projects', 'website-redesign'], summary: 'Checks that connect the design decision to the released experience.', sections: [['Interaction review', 'Verify navigation, disclosure, current location, keyboard movement and focus return.'], ['Content review', 'Check real titles, empty results and narrow layouts before making the release available.']] }
  };
  function node(tag, className, text) {
    var element = document.createElement(tag);
    if (className) element.className = className;
    if (text) element.textContent = text;
    return element;
  }
  function routeId() {
    if (!location.hash.startsWith('#page=')) return null;
    return new URLSearchParams(location.hash.slice(1)).get('page');
  }
  function routeSection() {
    return location.hash.startsWith('#page=') ? new URLSearchParams(location.hash.slice(1)).get('section') : null;
  }
  function focusSection(moveFocus) {
    var section = routeSection(), target = section && document.getElementById(section);
    if (!target || !document.querySelector('.sk-document').contains(target)) return false;
    if (moveFocus) { target.tabIndex = -1; target.focus(); }
    target.scrollIntoView({ block: 'start' }); return true;
  }
  function showPage(id, push, moveFocus) {
    if (!Object.prototype.hasOwnProperty.call(pages, id)) { console.warn('Unknown workspace page:', id); return; }
    var page = pages[id];
    if (id === 'working-together') body.replaceChildren(original.cloneNode(true));
    else {
      var prose = node('div', 'sk-prose');
      prose.appendChild(node('p', '', page.summary));
      page.sections.forEach(function (section, index) {
        var heading = node('h2', '', section[0]); heading.id = 'workspace-section-' + id + '-' + index;
        prose.appendChild(heading); prose.appendChild(node('p', '', section[1]));
      });
      body.replaceChildren(prose);
    }
    currentPage = id; title.textContent = page.title; document.title = page.title + ' — Documents — Sekura';
    var locationText = page.path.map(function (part) { return pages[part].title; }).join(' / ') || 'Documents';
    document.querySelector('.sk-document__eyebrow').textContent = locationText;
    var locations = details.querySelectorAll('.sk-dl__detail'); locations[1].textContent = locationText;
    var crumbs = document.querySelector('.sk-content-header__context ol');
    var first = node('li', 'sk-breadcrumbs__item'); var home = node('a', 'sk-link', 'Documents'); home.href = '#page=engineering'; first.appendChild(home);
    crumbs.replaceChildren(first);
    page.path.forEach(function (part) {
      var entry = node('li', 'sk-breadcrumbs__item'); var link = node('a', 'sk-link', pages[part].title); link.href = '#page=' + encodeURIComponent(part); entry.appendChild(link); crumbs.appendChild(entry);
    });
    var last = node('li', 'sk-breadcrumbs__item'); var current = node('span', '', page.title); current.setAttribute('aria-current', 'page'); last.appendChild(current); crumbs.appendChild(last);
    var outline = details.querySelector('[data-sk-workspace-outline]'); outline.replaceChildren();
    Array.from(body.querySelectorAll('h2[id]')).concat([document.getElementById('notes')]).forEach(function (heading) {
      var entry = node('li'); var link = node('a', 'sk-link', heading.textContent);
      link.href = '#page=' + encodeURIComponent(id) + '&section=' + encodeURIComponent(heading.id); link.dataset.skWorkspaceSection = heading.id;
      entry.appendChild(link); outline.appendChild(entry);
    });
    // Acknowledge current only after the destination has been rendered.
    tree.setCurrent(id);
    if (push) history.pushState(null, '', '#page=' + encodeURIComponent(id));
    try { renderStar(); } catch (error) { console.warn('Workspace star storage is unavailable.', error); }
    if (pageDrawer.getAttribute('aria-modal') === 'true') pageDrawer.querySelector('[data-sk-drawer-close]').click();
    if (moveFocus) { title.tabIndex = -1; title.focus(); }
  }
  var tree;
  try { tree = Sekura.createTree(treeRoot, { navigation: true, onActivate: function (item, id) { showPage(id, true, true); } }); }
  catch (error) {
    console.error('Workspace tree initialization failed.', { code: error.code, message: error.message });
    result.textContent = 'Pages are unavailable. Reload this page to try again.'; return;
  }
  var filterTimer;
  function applyFilter() { clearTimeout(filterTimer); tree.filter(filter.value); }
  filter.addEventListener('input', function () { clearTimeout(filterTimer); filterTimer = setTimeout(applyFilter, 150); });
  filter.addEventListener('search', applyFilter);
  filter.addEventListener('keydown', function (event) { if (event.key === 'Escape' && filter.value) { event.preventDefault(); event.stopPropagation(); filter.value = ''; applyFilter(); } });
  treeRoot.addEventListener('sk:tree:filter', function (event) {
    filter.value = event.detail.query; clear.disabled = !event.detail.query; empty.hidden = event.detail.matched !== 0;
    result.textContent = event.detail.query ? event.detail.matched + ' matching pages among ' + event.detail.total + ' loaded pages.' : event.detail.total + ' pages loaded.';
  });
  clear.addEventListener('click', function () { filter.value = ''; applyFilter(); filter.focus(); });
  document.getElementById('workspace-reveal-current').addEventListener('click', function () { clearTimeout(filterTimer); tree.revealCurrent({ focus: true }); });
  function restoreRoute() {
    var id = routeId();
    if (id || !location.hash) {
      showPage(id || 'working-together', false, false);
      if (!focusSection(true)) { title.tabIndex = -1; title.focus(); }
    }
  }
  window.addEventListener('hashchange', restoreRoute);
  // Close an existing mobile layer before the details opener establishes its modal background.
  document.querySelectorAll('[data-sk-drawer-open="workspace-details"]').forEach(function (button) {
    button.addEventListener('click', function () {
      if (pagesController.open && pagesController.modal) pagesController.close();
    }, true);
  });
  tree.filter('');
  var initial = routeId();
  showPage(initial && Object.prototype.hasOwnProperty.call(pages, initial) ? initial : 'working-together', false, false);
  focusSection(false);
  window.addEventListener('pagehide', function (event) {
    if (event.persisted) return;
    clearTimeout(filterTimer); window.removeEventListener('hashchange', restoreRoute); tree.destroy();
    mobilePages.removeEventListener('change', syncPages); narrowActions.removeEventListener('change', syncActions); pagesController.destroy();
  });
})();
