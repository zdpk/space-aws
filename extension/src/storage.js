// AWS Dream - storage.js
//
// Frozen shared wrapper around chrome.storage.local for the single
// "enabled" boolean. Owned by the `popup` agent (see
// openspec/changes/aws-dream-mvp/design.md, Decisions #1 and #2) but
// consumed read-only by `core`'s content.js and by qa's Node tests.
//
// Loads unmodified either as:
//   - a classic (non-module) content script / popup <script> tag, where
//     it attaches its API to `window.AWSDream`, or
//   - a Node `require()`'d module (for tests), where it uses
//     `module.exports`.
//
// All `chrome.*` access is deferred to inside the exported functions so
// this file never throws merely from being loaded/required in an
// environment without a `chrome` global (e.g. plain Node before a test
// stubs `global.chrome`).

(function (root) {
  'use strict';

  var DEFAULT_ENABLED = true;

  function getChromeStorage() {
    var hasChrome = typeof chrome !== 'undefined' ? chrome : undefined;
    if (!hasChrome || !hasChrome.storage || !hasChrome.storage.local) {
      throw new Error(
        'AWSDream storage.js: chrome.storage.local is not available in this environment'
      );
    }
    return hasChrome.storage;
  }

  function getChromeStorageOnChanged() {
    var hasChrome = typeof chrome !== 'undefined' ? chrome : undefined;
    if (!hasChrome || !hasChrome.storage || !hasChrome.storage.onChanged) {
      throw new Error(
        'AWSDream storage.js: chrome.storage.onChanged is not available in this environment'
      );
    }
    return hasChrome.storage.onChanged;
  }

  async function getEnabled() {
    var storage = getChromeStorage();
    var result = await storage.local.get({ enabled: DEFAULT_ENABLED });
    return result.enabled;
  }

  async function setEnabled(value) {
    var storage = getChromeStorage();
    await storage.local.set({ enabled: value });
  }

  function onEnabledChanged(callback) {
    var onChanged = getChromeStorageOnChanged();

    function listener(changes, namespace) {
      if (namespace === 'local' && changes && changes.enabled) {
        callback(changes.enabled.newValue);
      }
    }

    onChanged.addListener(listener);

    return function unsubscribe() {
      onChanged.removeListener(listener);
    };
  }

  const api = {
    DEFAULT_ENABLED: DEFAULT_ENABLED,
    getEnabled: getEnabled,
    setEnabled: setEnabled,
    onEnabledChanged: onEnabledChanged
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    root.AWSDream = root.AWSDream || {};
    Object.assign(root.AWSDream, api);
  }
})(typeof window !== 'undefined' ? window : globalThis);
