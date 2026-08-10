/**
 * dom-targets.js
 *
 * Best-effort candidate CSS selectors for locating the AWS Console header
 * mount point and the visible Region-selector control.
 *
 * IMPORTANT: Exact AWS Console header DOM selectors are unverified against a
 * live Console (deferred per PRD.md §16 and flagged as an Open Question in
 * openspec/changes/aws-dream-mvp/design.md). These lists are reasonable,
 * documented guesses, ordered from most specific/stable to most generic.
 * `findFirst` returns the first match and the rest of the system fails
 * closed (does nothing) if nothing matches, so a wrong guess here never
 * breaks the native AWS Console UI -- it just means no theming applies.
 */
(function (root) {
  'use strict';

  // Ordered best-effort candidates for the AWS Console header container that
  // the decorative layer is mounted into. Most specific/stable hooks first.
  var HEADER_MOUNT_SELECTORS = [
    '[data-testid="awsc-nav-header"]',
    '#awsc-nav-header',
    'header#awsc-nav-header',
    '.awsc-nav-header',
    'header[data-testid="awsc-nav-header"]',
    'nav[data-testid="awsc-nav-header"]',
    'header[role="banner"]',
    'header'
  ];

  // Ordered best-effort candidates for the visible Region-selector control
  // used only as the last-resort detection fallback (never scanned broadly).
  var REGION_SELECTOR_SELECTORS = [
    '[data-testid="awsc-nav-region-menu"]',
    '[data-testid="awsc-nav-region-menu-button"]',
    '#nav-regionMenu',
    'button[aria-label*="region" i]',
    '[data-testid*="region" i]',
    '.region-selector',
    '[class*="region-menu" i]'
  ];

  /**
   * Returns the first element in `root` (or the global `document`) matching
   * any selector in `selectors`, trying each selector in order. Never
   * throws on an individual selector failing to match or being invalid.
   *
   * @param {string[]} selectors
   * @param {Document|Element} [searchRoot]
   * @returns {Element|null}
   */
  function findFirst(selectors, searchRoot) {
    var scope = searchRoot || (typeof document !== 'undefined' ? document : null);
    if (!scope || !selectors || typeof scope.querySelector !== 'function') {
      return null;
    }
    for (var i = 0; i < selectors.length; i += 1) {
      var selector = selectors[i];
      var match = null;
      try {
        match = scope.querySelector(selector);
      } catch (err) {
        match = null;
      }
      if (match) {
        return match;
      }
    }
    return null;
  }

  var api = {
    HEADER_MOUNT_SELECTORS: HEADER_MOUNT_SELECTORS,
    REGION_SELECTOR_SELECTORS: REGION_SELECTOR_SELECTORS,
    findFirst: findFirst
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    root.AWSDream = root.AWSDream || {};
    Object.assign(root.AWSDream, api);
  }
})(typeof window !== 'undefined' ? window : globalThis);
