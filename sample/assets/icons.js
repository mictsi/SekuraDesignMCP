/**
 * Sekura icon sprite.
 *
 * Drawn on a 24px grid with 1.75px strokes and round caps, per the iconography
 * foundation. Every icon inherits `currentColor`, so it is automatically correct
 * in every theme, variant and state — that is the whole reason icons are never
 * given a hard-coded fill.
 *
 * In production this would be a static .svg file served over HTTP and referenced
 * with <use href="/icons.svg#sk-icon-x">. It is injected here instead so the
 * sample also works when opened straight from the filesystem, where browsers
 * block external SVG sprite references.
 *
 * Loaded synchronously immediately after <body> so the symbols exist before any
 * <use> element is parsed.
 */
(function () {
  var icons = {
    // Navigation and chrome
    'menu': '<path d="M4 7h16M4 12h16M4 17h16"/>',
    'search': '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.8-3.8"/>',
    'close': '<path d="M6 6l12 12M18 6L6 18"/>',
    'more': '<circle cx="5" cy="12" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="19" cy="12" r="1.2"/>',
    'filter': '<path d="M4 5h16l-6 7.2V20l-4-2.2v-5.6z"/>',
    'plus': '<path d="M12 5v14M5 12h14"/>',

    // Direction
    'chevron-down': '<path d="M6 9.5l6 6 6-6"/>',
  'chevron-up': '<path d="M6 14.5l6-6 6 6"/>',
    'chevron-right': '<path d="M9.5 6l6 6-6 6"/>',
    'chevron-left': '<path d="M14.5 6l-6 6 6 6"/>',
    'arrow-right': '<path d="M4 12h15M13.5 6.5L20 12l-6.5 5.5"/>',
    'arrow-left': '<path d="M20 12H5M10.5 6.5L4 12l6.5 5.5"/>',
    'arrow-up': '<path d="M12 20V5M6.5 10.5L12 4l5.5 6.5"/>',
    'arrow-down': '<path d="M12 4v15M17.5 13.5L12 20l-5.5-6.5"/>',

    // Status. Distinguishable by shape, not only hue — see the iconography
    // foundation: pending is a ring, settled states are filled marks.
    'check': '<path d="M5 13l4.5 4.5L19 7"/>',
    'check-circle': '<circle cx="12" cy="12" r="8.5"/><path d="M8.2 12.2l2.6 2.6 5-5.2"/>',
    'warning': '<path d="M12 3.5l8.6 15.5H3.4z"/><path d="M12 9.5v4.2M12 16.7h.01"/>',
    'error': '<circle cx="12" cy="12" r="8.5"/><path d="M9.2 9.2l5.6 5.6M14.8 9.2l-5.6 5.6"/>',
    'info': '<circle cx="12" cy="12" r="8.5"/><path d="M12 11.2v5.4M12 7.8h.01"/>',

    // Sorting
    'sort-unsorted': '<path d="M8 10l4-4 4 4M8 14l4 4 4-4"/>',
    'sort-asc': '<path d="M12 19V6M7 11l5-5 5 5"/>',
    'sort-desc': '<path d="M12 5v13M7 13l5 5 5-5"/>',

    // Actions
    'copy': '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15H4.5A1.5 1.5 0 013 13.5v-9A1.5 1.5 0 014.5 3h9A1.5 1.5 0 0115 4.5V5"/>',
    'edit': '<path d="M4 20h4.2L20 8.2 15.8 4 4 15.8z"/><path d="M14.5 5.3L18.7 9.5"/>',
    'trash': '<path d="M4 7h16M9.5 7V4.5h5V7M6.5 7l1 12.5h9L17.5 7"/><path d="M10.2 11v5M13.8 11v5"/>',
    'download': '<path d="M12 3.5v11.5M7.5 10.5L12 15l4.5-4.5M4 20h16"/>',
    'upload': '<path d="M12 20.5V9M7.5 13.5L12 9l4.5 4.5M4 4h16"/>',
    'refresh': '<path d="M20.5 12a8.5 8.5 0 11-2.5-6"/><path d="M20.5 3.5v5h-5"/>',
    'external': '<path d="M14 4h6v6M20 4l-8.5 8.5"/><path d="M18 14.5V19a1.5 1.5 0 01-1.5 1.5h-11A1.5 1.5 0 014 19V8a1.5 1.5 0 011.5-1.5H10"/>',
    'eye': '<path d="M2.5 12S6 6 12 6s9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6z"/><circle cx="12" cy="12" r="2.6"/>',
    'pin': '<path d="M9 3.5h6M10 3.5v6l-2.5 3.5h9L14 9.5v-6M12 13v7.5"/>',

    // Domain
    'home': '<path d="M3.5 11L12 4l8.5 7"/><path d="M6 9.7V20h12V9.7"/>',
    'globe': '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17"/><path d="M12 3.5c2.3 2.4 3.5 5.4 3.5 8.5s-1.2 6.1-3.5 8.5c-2.3-2.4-3.5-5.4-3.5-8.5S9.7 5.9 12 3.5z"/>',
    'users': '<circle cx="9" cy="8" r="3.4"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><path d="M16 5.2a3.4 3.4 0 010 6.6M17.2 14.4c2.3.8 3.8 2.9 3.8 5.6"/>',
    'key': '<circle cx="7.5" cy="12" r="3.8"/><path d="M11.3 12H21M18 12v3.5M21 12v2.5"/>',
    'shield': '<path d="M12 3.2l8 3.2v5.4c0 4.8-3.3 8.1-8 9.2-4.7-1.1-8-4.4-8-9.2V6.4z"/>',
    'activity': '<path d="M3 12h3.8l2.7-7 4.5 14 2.6-7H21"/>',
    'book': '<path d="M4 5.5A2.5 2.5 0 016.5 3H20v14H6.5A2.5 2.5 0 004 19.5z"/><path d="M20 17v4H6.5"/>',
    'settings': '<circle cx="12" cy="12" r="3.2"/><path d="M12 3v2.4M12 18.6V21M3 12h2.4M18.6 12H21M5.6 5.6l1.7 1.7M16.7 16.7l1.7 1.7M18.4 5.6l-1.7 1.7M7.3 16.7l-1.7 1.7"/>',
    'clock': '<circle cx="12" cy="12" r="8.5"/><path d="M12 7v5.3l3.4 2"/>',
    'bell': '<path d="M18 16.5V11a6 6 0 10-12 0v5.5L4 19.5h16z"/><path d="M10 22h4"/>',
    'server': '<rect x="3.5" y="4" width="17" height="6.5" rx="1.5"/><rect x="3.5" y="13.5" width="17" height="6.5" rx="1.5"/><path d="M7 7.2h.01M7 16.8h.01"/>',

    // Theme
    'sun': '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.2 5.2l1.6 1.6M17.2 17.2l1.6 1.6M18.8 5.2l-1.6 1.6M6.8 17.2l-1.6 1.6"/>',
    'moon': '<path d="M20.5 14.2A8.6 8.6 0 019.8 3.5a8.6 8.6 0 1010.7 10.7z"/>',
    'monitor': '<rect x="3" y="4.5" width="18" height="12" rx="1.8"/><path d="M8.5 20.5h7M12 16.5v4"/>',
    'contrast': '<circle cx="12" cy="12" r="8.5"/><path d="M12 3.5v17"/><path d="M12 6.5v11M14.5 8v8M17 10v4" opacity=".55"/>',

    // Brand
    'logo': '<path d="M12 2.8l8.2 3.3v5.6c0 5.1-3.4 8.6-8.2 9.7-4.8-1.1-8.2-4.6-8.2-9.7V6.1z"/><path d="M8.4 12.1l2.6 2.6 4.6-4.8"/>'
  };

  var parts = [
    '<svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false" ' +
    'style="position:absolute;width:0;height:0;overflow:hidden" data-sk-sprite>'
  ];

  for (var name in icons) {
    if (!Object.prototype.hasOwnProperty.call(icons, name)) continue;
    parts.push(
      '<symbol id="sk-icon-' + name + '" viewBox="0 0 24 24">' + icons[name] + '</symbol>'
    );
  }
  parts.push('</svg>');

  // document.write during parsing inserts the sprite synchronously, in place,
  // before any <use> that references it is resolved.
  document.write(parts.join(''));
})();
