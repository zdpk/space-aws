/**
 * navigation-observer.js
 *
 * Detects AWS Console single-page navigation without any polling:
 *   - Patches `history.pushState`/`replaceState` to call back on use.
 *   - Listens for `popstate` and `hashchange`.
 *   - Runs ONE bounded, one-time bootstrap `MutationObserver` (with a sane
 *     timeout) to discover the header mount point if it is not present yet.
 *   - Once discovered, switches to a narrow steady-state `MutationObserver`
 *     scoped only to the mount point's *parent* (not document.body), which
 *     catches AWS remounting the header subtree, coalesced onto a
 *     microtask so bursts of mutations only trigger one re-render.
 *
 * This file contains no fixed-interval or recurring timer of any kind. The
 * one bounded, single-shot deferred callback used to time out the bootstrap
 * observer fires exactly once and never re-arms itself -- it is not a poll.
 *
 * Exposes exactly: observeNavigation(onChange): () => void (disconnect fn)
 * per design.md §2. An optional second `opts` argument
 * (`{ rootDocument, bootstrapTimeoutMs }`) is accepted for testability; both
 * default sensibly when omitted.
 */
(function (root) {
  'use strict';

  var deps = (typeof module !== 'undefined' && module.exports)
    ? require('./dom-targets.js')
    : root.AWSDream;

  var HEADER_MOUNT_SELECTORS = deps.HEADER_MOUNT_SELECTORS;
  var findFirst = deps.findFirst;

  var DEFAULT_BOOTSTRAP_TIMEOUT_MS = 10000;

  function noopDisconnect() {}

  function observeNavigation(onChange, opts) {
    var options = opts || {};
    var rootDocument = options.rootDocument || (typeof document !== 'undefined' ? document : null);
    var rootWindow = (rootDocument && rootDocument.defaultView) || (typeof window !== 'undefined' ? window : null);
    var bootstrapTimeoutMs = typeof options.bootstrapTimeoutMs === 'number'
      ? options.bootstrapTimeoutMs
      : DEFAULT_BOOTSTRAP_TIMEOUT_MS;

    if (!rootDocument || !rootWindow || typeof onChange !== 'function') {
      return noopDisconnect;
    }

    var disposed = false;
    var steadyObserver = null;
    var bootstrapObserver = null;
    var bootstrapTimeoutId = null;
    var coalesceScheduled = false;

    function safeTriggerChange() {
      if (disposed) {
        return;
      }
      try {
        onChange();
      } catch (err) {
        // Never let a consumer error break navigation tracking.
      }
    }

    function scheduleCoalescedChange() {
      if (coalesceScheduled) {
        return;
      }
      coalesceScheduled = true;
      var scheduleMicrotask = typeof rootWindow.queueMicrotask === 'function'
        ? rootWindow.queueMicrotask.bind(rootWindow)
        : function (fn) { Promise.resolve().then(fn); };
      scheduleMicrotask(function () {
        coalesceScheduled = false;
        safeTriggerChange();
      });
    }

    // 1. History/URL hooks (event-driven, no polling).
    var originalPushState = rootWindow.history && rootWindow.history.pushState;
    var originalReplaceState = rootWindow.history && rootWindow.history.replaceState;

    if (originalPushState) {
      rootWindow.history.pushState = function () {
        var result = originalPushState.apply(this, arguments);
        safeTriggerChange();
        return result;
      };
    }
    if (originalReplaceState) {
      rootWindow.history.replaceState = function () {
        var result = originalReplaceState.apply(this, arguments);
        safeTriggerChange();
        return result;
      };
    }

    function onPopState() {
      safeTriggerChange();
    }
    function onHashChange() {
      safeTriggerChange();
    }
    rootWindow.addEventListener('popstate', onPopState);
    rootWindow.addEventListener('hashchange', onHashChange);

    // 2. Bounded, one-time bootstrap MutationObserver to discover the header
    //    mount point, then a narrow steady-state MutationObserver scoped to
    //    the mount point's parent for remounts.
    function setupSteadyObserver(scopeNode) {
      if (steadyObserver || typeof rootWindow.MutationObserver !== 'function') {
        return;
      }
      steadyObserver = new rootWindow.MutationObserver(function () {
        scheduleCoalescedChange();
      });
      steadyObserver.observe(scopeNode, { childList: true, subtree: false });
    }

    function attemptSteadyStateSetup() {
      var mount = findFirst(HEADER_MOUNT_SELECTORS, rootDocument);
      if (!mount || !mount.parentNode) {
        return false;
      }
      setupSteadyObserver(mount.parentNode);
      return true;
    }

    if (!attemptSteadyStateSetup() && typeof rootWindow.MutationObserver === 'function') {
      bootstrapObserver = new rootWindow.MutationObserver(function () {
        if (attemptSteadyStateSetup()) {
          if (bootstrapObserver) {
            bootstrapObserver.disconnect();
            bootstrapObserver = null;
          }
          if (bootstrapTimeoutId) {
            rootWindow.clearTimeout(bootstrapTimeoutId);
            bootstrapTimeoutId = null;
          }
          // The header just appeared for the first time: give the caller a
          // chance to render immediately rather than waiting on the next
          // navigation event.
          safeTriggerChange();
        }
      });
      bootstrapObserver.observe(rootDocument.documentElement || rootDocument.body || rootDocument, {
        childList: true,
        subtree: true
      });
      // One-shot bound: stop looking after bootstrapTimeoutMs if the header
      // never appears. This never re-arms itself -- it is not a poll.
      bootstrapTimeoutId = rootWindow.setTimeout(function () {
        bootstrapTimeoutId = null;
        if (bootstrapObserver) {
          bootstrapObserver.disconnect();
          bootstrapObserver = null;
        }
      }, bootstrapTimeoutMs);
    }

    return function disconnect() {
      disposed = true;
      if (originalPushState) {
        rootWindow.history.pushState = originalPushState;
      }
      if (originalReplaceState) {
        rootWindow.history.replaceState = originalReplaceState;
      }
      rootWindow.removeEventListener('popstate', onPopState);
      rootWindow.removeEventListener('hashchange', onHashChange);
      if (steadyObserver) {
        steadyObserver.disconnect();
        steadyObserver = null;
      }
      if (bootstrapObserver) {
        bootstrapObserver.disconnect();
        bootstrapObserver = null;
      }
      if (bootstrapTimeoutId) {
        rootWindow.clearTimeout(bootstrapTimeoutId);
        bootstrapTimeoutId = null;
      }
    };
  }

  var api = {
    observeNavigation: observeNavigation
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    root.AWSDream = root.AWSDream || {};
    Object.assign(root.AWSDream, api);
  }
})(typeof window !== 'undefined' ? window : globalThis);
