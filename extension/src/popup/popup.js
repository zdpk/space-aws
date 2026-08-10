// AWS Dream - popup.js
//
// Wires the single accessible switch in popup.html to the shared
// storage.js contract (window.AWSDream.getEnabled/setEnabled/
// onEnabledChanged). Classic script, no ESM import/export, no bundler.

(function () {
  'use strict';

  function init() {
    var storageApi = window.AWSDream;
    var checkbox = document.getElementById('enabled-toggle');
    var statusText = document.getElementById('status-text');

    if (!storageApi || !checkbox) {
      return;
    }

    function setStatusText(enabled) {
      if (statusText) {
        statusText.textContent = enabled
          ? 'AWS Dream theming is on.'
          : 'AWS Dream theming is off.';
      }
    }

    function applyState(enabled) {
      checkbox.checked = Boolean(enabled);
      setStatusText(Boolean(enabled));
    }

    // Initial state.
    storageApi
      .getEnabled()
      .then(applyState)
      .catch(function (error) {
        applyState(storageApi.DEFAULT_ENABLED);
        console.error('AWS Dream: failed to read enabled state', error);
      });

    // User-driven toggle.
    checkbox.addEventListener('change', function () {
      var nextEnabled = checkbox.checked;
      setStatusText(nextEnabled);
      storageApi.setEnabled(nextEnabled).catch(function (error) {
        console.error('AWS Dream: failed to persist enabled state', error);
      });
    });

    // Stay in sync if the value changes elsewhere (e.g. another open
    // popup window) while this popup instance is still open.
    if (typeof storageApi.onEnabledChanged === 'function') {
      var unsubscribe = storageApi.onEnabledChanged(function (enabled) {
        applyState(enabled);
      });

      window.addEventListener('unload', function () {
        if (typeof unsubscribe === 'function') {
          unsubscribe();
        }
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
