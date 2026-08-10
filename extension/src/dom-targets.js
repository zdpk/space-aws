/**
 * dom-targets.js
 *
 * Best-effort candidate CSS selectors for locating the AWS Console header
 * mount point and the visible Region-selector control.
 *
 * The header mount selectors are intentionally limited to the current AWS
 * top-level navigation row. The surrounding global navigation also contains
 * a second shortcuts row, while generic `header` selectors can match hidden
 * panels during Console bootstrap. `findFirst` fails closed when the verified
 * top row is not present.
 */
(function (root) {
  'use strict';

  // Ordered best-effort candidates for the AWS Console header container that
  // the decorative layer is mounted into. Most specific/stable hooks first.
  var HEADER_MOUNT_SELECTORS = [
    '#awsc-top-level-nav',
    '[data-testid="awsc-top-level-nav"]'
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
