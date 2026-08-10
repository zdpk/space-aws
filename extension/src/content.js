/**
 * content.js
 *
 * Entry point that wires region-detector + header-renderer +
 * navigation-observer + storage.js together. Reads the enabled flag,
 * detects the Region/global state, renders (or restores) the header
 * accordingly, and re-runs on navigation events and on enabled-state
 * changes broadcast from the popup.
 *
 * `storage.js` is owned by the `popup` agent (design.md §1/§2). This file
 * only ever calls its exported functions (`getEnabled`, `onEnabledChanged`)
 * against the frozen contract -- it never creates or edits storage.js.
 *
 * Exposes `init(overrides)` for testability; when loaded as a real content
 * script (classic `<script>`, not `require()`d by Node), it auto-invokes
 * `init()` once on load, exactly as a MV3 content script is expected to.
 */
(function (root) {
  'use strict';

  var isNodeRequire = typeof module !== 'undefined' && !!module.exports;

  var deps = isNodeRequire
    ? {
      regionDetector: require('./region-detector.js'),
      headerRenderer: require('./header-renderer.js'),
      navigationObserver: require('./navigation-observer.js'),
      domTargets: require('./dom-targets.js'),
      storage: require('./storage.js')
    }
    : {
      // Classic MV3 content scripts share one flat window.AWSDream API.
      // Mirror the grouped Node dependency shape without expecting nested
      // browser objects such as AWSDream.regionDetector.
      regionDetector: root.AWSDream,
      headerRenderer: root.AWSDream,
      navigationObserver: root.AWSDream,
      domTargets: root.AWSDream,
      storage: root.AWSDream
    };

  function noop() {}

  /**
   * init(overrides?) -> teardown function
   *
   * `overrides` (all optional, primarily for tests):
   *   rootDocument, detectState, renderState, restoreNativeHeader,
   *   observeNavigation, storage, domTargets
   */
  function init(overrides) {
    var opts = overrides || {};
    var rootDocument = opts.rootDocument || (typeof document !== 'undefined' ? document : null);
    var rootWindowRef = (rootDocument && rootDocument.defaultView) || (typeof window !== 'undefined' ? window : null);

    if (!rootDocument || !rootWindowRef) {
      return noop;
    }

    var detectStateFn = opts.detectState || deps.regionDetector.detectState;
    var renderStateFn = opts.renderState || deps.headerRenderer.renderState;
    var restoreNativeHeaderFn = opts.restoreNativeHeader || deps.headerRenderer.restoreNativeHeader;
    var observeNavigationFn = opts.observeNavigation || deps.navigationObserver.observeNavigation;
    var storageApi = opts.storage || deps.storage;
    var domTargetsApi = opts.domTargets || deps.domTargets;

    var disposed = false;
    var enabled = null;
    var disconnectNavigation = null;
    var unsubscribeStorage = null;

    function readRegionSelectorText() {
      var el = domTargetsApi.findFirst(domTargetsApi.REGION_SELECTOR_SELECTORS, rootDocument);
      return el ? (el.textContent || '') : '';
    }

    function evaluateAndRender() {
      if (disposed) {
        return;
      }
      if (!enabled) {
        restoreNativeHeaderFn({ rootDocument: rootDocument });
        return;
      }
      var location = rootWindowRef.location || {};
      var state = detectStateFn({
        href: location.href || '',
        search: location.search || '',
        regionSelectorText: readRegionSelectorText()
      });
      renderStateFn(state, { rootDocument: rootDocument });
    }

    storageApi.getEnabled().then(function (value) {
      if (disposed) {
        return;
      }
      enabled = !!value;
      evaluateAndRender();
      disconnectNavigation = observeNavigationFn(evaluateAndRender, { rootDocument: rootDocument });
    }).catch(function () {
      // Fail closed: if reading storage fails for any reason, do not theme.
      enabled = false;
    });

    unsubscribeStorage = storageApi.onEnabledChanged(function (nextEnabled) {
      enabled = !!nextEnabled;
      evaluateAndRender();
    });

    return function teardown() {
      disposed = true;
      if (typeof disconnectNavigation === 'function') {
        disconnectNavigation();
      }
      if (typeof unsubscribeStorage === 'function') {
        unsubscribeStorage();
      }
    };
  }

  var api = {
    init: init
  };

  if (isNodeRequire) {
    module.exports = api;
  } else {
    root.AWSDream = root.AWSDream || {};
    Object.assign(root.AWSDream, api);
    // Real content-script environment: start immediately.
    init();
  }
})(typeof window !== 'undefined' ? window : globalThis);
