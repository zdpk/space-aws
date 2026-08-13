/**
 * header-renderer.js
 *
 * Owns the namespaced decorative background (`#aws-dream-layer`), optional
 * Region badge (`#aws-dream-region-badge`), and style tag
 * (`#aws-dream-style`) injected into the AWS Console global header. Never
 * removes, reorders, or restyles a native header child; the only native
 * mutations it performs are conditionally setting
 * `mount.style.position = 'relative'` and `mount.style.isolation = 'isolate'`.
 * Both original inline values are tracked and restored precisely.
 *
 * Exposes exactly:
 *   renderState(state, { rootDocument }): void
 *   restoreNativeHeader({ rootDocument }): void
 *
 * per design.md §2/§3.
 */
(function (root) {
  'use strict';

  var deps = (typeof module !== 'undefined' && module.exports)
    ? {
      regionConfig: require('./region-config.js'),
      domTargets: require('./dom-targets.js')
    }
    : { regionConfig: root.AWSDream, domTargets: root.AWSDream };

  var REGION_MAP = deps.regionConfig.REGION_MAP;
  var HEADER_MOUNT_SELECTORS = deps.domTargets.HEADER_MOUNT_SELECTORS;
  var findFirst = deps.domTargets.findFirst;

  var LAYER_ID = 'aws-dream-layer';
  var BADGE_ID = 'aws-dream-region-badge';
  var STYLE_ID = 'aws-dream-style';
  var POSITIONED_ATTR = 'data-aws-dream-positioned';
  var ISOLATION_ATTR = 'data-aws-dream-original-isolation';
  var EMPTY_INLINE_VALUE = '__aws_dream_empty__';
  var TRANSITION_CSS = 'opacity 220ms ease-in-out';
  var BADGE_ANCHOR_SELECTORS = [
    '#awsc-nav-scallop-icon',
    '[data-testid="awsc-nav-scallop-icon"]',
    'a[title="CloudShell"]',
    'a[href*="/cloudshell/"]'
  ];
  var BADGE_ANCHOR_GAP = 8;
  var BADGE_FALLBACK_RIGHT = '34%';
  var BADGE_FALLBACK_TOP = '13px';
  var BADGE_ESTIMATED_HEIGHT = 22;
  var renderRequestId = 0;
  var badgePositionCleanup = null;

  // Documents intent; the essential structural/behavioral properties are
  // also always set inline on the layer element itself (see createLayer),
  // since inline styles are the source of truth this module relies on for
  // its own logic and are the most reliable thing to assert in a jsdom test
  // environment that only partially implements CSS media-query evaluation.
  var STYLE_CSS_TEXT = [
    '#' + LAYER_ID + ' {',
    '  pointer-events: none;',
    '}',
    '#' + BADGE_ID + ' {',
    '  pointer-events: none;',
    '}',
    '@media (prefers-reduced-motion: reduce) {',
    '  #' + LAYER_ID + ' {',
    '    transition: none !important;',
    '  }',
    '}'
  ].join('\n');

  function getRootDocument(opts) {
    return (opts && opts.rootDocument) || (typeof document !== 'undefined' ? document : null);
  }

  function getView(rootDocument) {
    return (rootDocument && rootDocument.defaultView) || (typeof window !== 'undefined' ? window : null);
  }

  function resolveAssetUrl(assetPath) {
    if (!assetPath) {
      return null;
    }
    if (typeof chrome !== 'undefined' && chrome.runtime && typeof chrome.runtime.getURL === 'function') {
      try {
        return chrome.runtime.getURL(assetPath);
      } catch (err) {
        return null;
      }
    }
    return assetPath;
  }

  function createImageProbe(rootDocument) {
    var view = getView(rootDocument);
    if (view && typeof view.Image === 'function') {
      return new view.Image();
    }
    if (typeof Image === 'function') {
      return new Image();
    }
    return rootDocument.createElement('img');
  }

  function prefersReducedMotion(rootDocument) {
    var view = getView(rootDocument);
    if (view && typeof view.matchMedia === 'function') {
      try {
        return !!view.matchMedia('(prefers-reduced-motion: reduce)').matches;
      } catch (err) {
        return false;
      }
    }
    return false;
  }

  function ensureStyleTag(rootDocument) {
    var styleEl = rootDocument.getElementById(STYLE_ID);
    if (!styleEl) {
      styleEl = rootDocument.createElement('style');
      styleEl.id = STYLE_ID;
      styleEl.textContent = STYLE_CSS_TEXT;
      (rootDocument.head || rootDocument.documentElement).appendChild(styleEl);
    }
    return styleEl;
  }

  function ensureMountPositioned(mount, view) {
    if (mount.getAttribute(POSITIONED_ATTR) === 'true') {
      return;
    }
    var computed = view && typeof view.getComputedStyle === 'function' ? view.getComputedStyle(mount) : null;
    var currentPosition = computed ? computed.position : '';
    if (currentPosition === 'static' || currentPosition === '') {
      mount.style.position = 'relative';
      mount.setAttribute(POSITIONED_ATTR, 'true');
    }
  }

  function ensureMountIsolated(mount, view) {
    if (mount.hasAttribute(ISOLATION_ATTR)) {
      return;
    }
    var computed = view && typeof view.getComputedStyle === 'function' ? view.getComputedStyle(mount) : null;
    var currentIsolation = computed ? computed.isolation : '';
    if (currentIsolation === 'isolate') {
      return;
    }
    mount.setAttribute(ISOLATION_ATTR, mount.style.isolation || EMPTY_INLINE_VALUE);
    mount.style.isolation = 'isolate';
  }

  function restoreTrackedMountPosition(mount) {
    if (!mount || mount.getAttribute(POSITIONED_ATTR) !== 'true') {
      return;
    }
    mount.style.removeProperty('position');
    mount.removeAttribute(POSITIONED_ATTR);
  }

  function restoreTrackedMountIsolation(mount) {
    if (!mount || !mount.hasAttribute(ISOLATION_ATTR)) {
      return;
    }
    var originalIsolation = mount.getAttribute(ISOLATION_ATTR);
    if (originalIsolation === EMPTY_INLINE_VALUE) {
      mount.style.removeProperty('isolation');
    } else {
      mount.style.isolation = originalIsolation || '';
    }
    mount.removeAttribute(ISOLATION_ATTR);
  }

  function createLayer(rootDocument) {
    var layer = rootDocument.createElement('div');
    layer.id = LAYER_ID;
    layer.setAttribute('aria-hidden', 'true');
    layer.style.position = 'absolute';
    layer.style.inset = '0';
    layer.style.top = '0';
    layer.style.right = '0';
    layer.style.bottom = '0';
    layer.style.left = '0';
    layer.style.pointerEvents = 'none';
    // The live AWS global nav establishes its own stacking context. A
    // negative layer sits above that nav's background but below its native
    // controls, so the artwork cannot obscure labels or buttons.
    layer.style.zIndex = '-1';
    layer.style.backgroundRepeat = 'no-repeat';
    layer.style.backgroundSize = 'cover';
    return layer;
  }

  function createBadge(rootDocument) {
    var badge = rootDocument.createElement('div');
    badge.id = BADGE_ID;
    badge.setAttribute('aria-hidden', 'true');
    badge.style.position = 'absolute';
    badge.style.top = BADGE_FALLBACK_TOP;
    badge.style.right = BADGE_FALLBACK_RIGHT;
    badge.style.bottom = 'auto';
    badge.style.left = 'auto';
    badge.style.transform = 'none';
    badge.style.zIndex = '1';
    badge.style.display = 'inline-flex';
    badge.style.alignItems = 'center';
    badge.style.gap = '6px';
    badge.style.height = '20px';
    badge.style.padding = '0 8px 0 5px';
    badge.style.border = '1px solid rgba(172, 216, 255, 0.28)';
    badge.style.borderRadius = '999px';
    badge.style.background = 'rgba(2, 7, 16, 0.72)';
    badge.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.38)';
    badge.style.backdropFilter = 'blur(8px)';
    badge.style.color = '#edf7ff';
    badge.style.fontFamily = 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';
    badge.style.fontSize = '10px';
    badge.style.fontWeight = '600';
    badge.style.lineHeight = '1';
    badge.style.letterSpacing = '0.12em';
    badge.style.whiteSpace = 'nowrap';
    badge.style.pointerEvents = 'none';
    return badge;
  }

  function stopBadgePositionTracking() {
    if (typeof badgePositionCleanup === 'function') {
      badgePositionCleanup();
    }
    badgePositionCleanup = null;
  }

  function getVisibleBadgeAnchor(rootDocument, mount) {
    for (var i = 0; i < BADGE_ANCHOR_SELECTORS.length; i += 1) {
      var candidates = rootDocument.querySelectorAll(BADGE_ANCHOR_SELECTORS[i]);
      for (var j = 0; j < candidates.length; j += 1) {
        var candidate = candidates[j];
        if (!mount.contains(candidate) || typeof candidate.getBoundingClientRect !== 'function') {
          continue;
        }
        var rect = candidate.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          return candidate;
        }
      }
    }
    return null;
  }

  function positionBadge(rootDocument, mount, badge) {
    var anchor = getVisibleBadgeAnchor(rootDocument, mount);
    if (!anchor || typeof mount.getBoundingClientRect !== 'function') {
      badge.style.top = BADGE_FALLBACK_TOP;
      badge.style.right = BADGE_FALLBACK_RIGHT;
      badge.style.bottom = 'auto';
      badge.style.left = 'auto';
      badge.style.transform = 'none';
      return null;
    }

    var mountRect = mount.getBoundingClientRect();
    var anchorRect = anchor.getBoundingClientRect();
    var badgeRect = typeof badge.getBoundingClientRect === 'function'
      ? badge.getBoundingClientRect()
      : null;
    var badgeHeight = badgeRect && badgeRect.height > 0
      ? badgeRect.height
      : BADGE_ESTIMATED_HEIGHT;
    var right = mountRect.right - anchorRect.left + BADGE_ANCHOR_GAP;
    var top = anchorRect.top - mountRect.top + ((anchorRect.height - badgeHeight) / 2);

    badge.style.top = Math.max(0, Math.round(top)) + 'px';
    badge.style.right = Math.max(0, Math.round(right)) + 'px';
    badge.style.bottom = 'auto';
    badge.style.left = 'auto';
    badge.style.transform = 'none';
    return anchor;
  }

  function startBadgePositionTracking(rootDocument, mount, badge) {
    stopBadgePositionTracking();

    var view = getView(rootDocument);
    var resizeObserver = null;
    var animationFrameId = null;

    function updatePosition() {
      if (!badge.isConnected || badge.parentElement !== mount) {
        return;
      }
      var anchor = positionBadge(rootDocument, mount, badge);
      if (resizeObserver && anchor) {
        try {
          resizeObserver.observe(anchor);
        } catch (_err) {
          // A transient React remount can detach the anchor between lookup
          // and observation. The next navigation/resize pass will retry.
        }
      }
    }

    updatePosition();

    if (view && typeof view.addEventListener === 'function') {
      view.addEventListener('resize', updatePosition);
    }
    if (view && typeof view.ResizeObserver === 'function') {
      resizeObserver = new view.ResizeObserver(updatePosition);
      resizeObserver.observe(mount);
      var initialAnchor = getVisibleBadgeAnchor(rootDocument, mount);
      if (initialAnchor) {
        resizeObserver.observe(initialAnchor);
      }
    }
    if (view && typeof view.requestAnimationFrame === 'function') {
      animationFrameId = view.requestAnimationFrame(updatePosition);
    }

    badgePositionCleanup = function () {
      if (view && typeof view.removeEventListener === 'function') {
        view.removeEventListener('resize', updatePosition);
      }
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
      if (animationFrameId !== null && view && typeof view.cancelAnimationFrame === 'function') {
        view.cancelAnimationFrame(animationFrameId);
      }
    };
  }

  function removeBadge(rootDocument) {
    stopBadgePositionTracking();
    var badge = rootDocument.getElementById(BADGE_ID);
    if (badge && badge.parentNode) {
      badge.parentNode.removeChild(badge);
    }
  }

  function updateBadge(rootDocument, mount, config, key) {
    if (!config.badgeCode) {
      removeBadge(rootDocument);
      return;
    }

    var badge = rootDocument.getElementById(BADGE_ID);
    if (!badge) {
      badge = createBadge(rootDocument);
    }
    if (badge.parentElement !== mount) {
      mount.appendChild(badge);
    }

    while (badge.firstChild) {
      badge.removeChild(badge.firstChild);
    }

    if (config.flagAssetPath) {
      var flagUrl = resolveAssetUrl(config.flagAssetPath);
      if (flagUrl) {
        var flag = rootDocument.createElement('img');
        flag.setAttribute('src', flagUrl);
        flag.setAttribute('alt', '');
        flag.style.display = 'block';
        flag.style.width = '15px';
        flag.style.height = '10px';
        flag.style.borderRadius = '1px';
        flag.style.boxShadow = '0 0 0 1px rgba(255, 255, 255, 0.16)';
        badge.appendChild(flag);
      }
    }

    var code = rootDocument.createElement('span');
    code.textContent = config.badgeCode;
    badge.appendChild(code);
    badge.dataset.assetKey = key;
    startBadgePositionTracking(rootDocument, mount, badge);
  }

  function ensureLayerIsFirstChild(mount, layer) {
    var previousMount = layer.parentElement;
    if (previousMount && previousMount !== mount) {
      restoreTrackedMountPosition(previousMount);
      restoreTrackedMountIsolation(previousMount);
    }
    if (mount.firstChild !== layer) {
      mount.insertBefore(layer, mount.firstChild);
    }
  }

  function applyLayerContent(layerEl, config, assetUrl) {
    layerEl.style.backgroundColor = config.backgroundColor || '';
    layerEl.style.backgroundImage = 'url("' + assetUrl + '")';
    layerEl.style.backgroundPosition = config.objectPosition || 'center';
  }

  function swapLayerContent(layerEl, config, assetUrl, reducedMotion, isFirstRender) {
    if (reducedMotion || isFirstRender) {
      applyLayerContent(layerEl, config, assetUrl);
      layerEl.style.transition = reducedMotion ? 'none' : TRANSITION_CSS;
      layerEl.style.opacity = '1';
      return;
    }
    layerEl.style.transition = TRANSITION_CSS;
    layerEl.style.opacity = '0';
    void layerEl.offsetWidth; // force a reflow so the opacity:0 state is committed before re-applying content
    applyLayerContent(layerEl, config, assetUrl);
    layerEl.style.opacity = '1';
  }

  /**
   * renderState(state, { rootDocument }): void
   *
   * `state` is whatever region-detector.detectState() returned. Only
   * `status: 'region'` or `'global'` with a REGION_MAP entry is renderable;
   * every other status (including unknown ones) is treated as a restore.
   */
  function renderState(state, opts) {
    var rootDocument = getRootDocument(opts);
    if (!rootDocument) {
      return;
    }

    var key = state && (state.regionCode || (state.status === 'global' ? 'aws-global' : null));
    var isRenderableStatus = !!state && (state.status === 'region' || state.status === 'global');
    var config = isRenderableStatus && key && REGION_MAP ? REGION_MAP[key] : null;

    if (!config) {
      restoreNativeHeader({ rootDocument: rootDocument });
      return;
    }

    var mount = findFirst(HEADER_MOUNT_SELECTORS, rootDocument);
    if (!mount) {
      restoreNativeHeader({ rootDocument: rootDocument });
      return;
    }

    var assetUrl = resolveAssetUrl(config.assetPath);
    if (!assetUrl) {
      restoreNativeHeader({ rootDocument: rootDocument });
      return;
    }

    var existingLayer = rootDocument.getElementById(LAYER_ID);
    if (existingLayer && existingLayer.dataset.assetKey === key && mount.contains(existingLayer)) {
      // Already showing the correct state for this Region/global key: reuse
      // in place, no re-preload, no flicker.
      ensureStyleTag(rootDocument);
      ensureLayerIsFirstChild(mount, existingLayer);
      updateBadge(rootDocument, mount, config, key);
      return;
    }

    var view = getView(rootDocument);
    var reducedMotion = prefersReducedMotion(rootDocument);
    var probe = createImageProbe(rootDocument);
    var requestId = ++renderRequestId;

    probe.onload = function () {
      if (requestId !== renderRequestId) {
        return;
      }
      ensureStyleTag(rootDocument);
      ensureMountPositioned(mount, view);
      ensureMountIsolated(mount, view);

      var layer = rootDocument.getElementById(LAYER_ID);
      var isFirstRender = !layer;
      if (!layer) {
        layer = createLayer(rootDocument);
      }
      ensureLayerIsFirstChild(mount, layer);
      swapLayerContent(layer, config, assetUrl, reducedMotion, isFirstRender);
      layer.dataset.assetKey = key;
      updateBadge(rootDocument, mount, config, key);
    };

    probe.onerror = function () {
      if (requestId !== renderRequestId) {
        return;
      }
      // Missing or failed-to-load asset: fail closed, never show a broken
      // image or another Region's asset.
      restoreNativeHeader({ rootDocument: rootDocument });
    };

    probe.src = assetUrl;
  }

  /**
   * restoreNativeHeader({ rootDocument }): void
   *
   * Removes the decorative layer, reverts the one tracked `position` inline
   * style on any mount(s) we set it on, and removes the namespaced style
   * tag. Idempotent and safe to call even if nothing was ever rendered.
   */
  function restoreNativeHeader(opts) {
    renderRequestId += 1;
    var rootDocument = getRootDocument(opts);
    if (!rootDocument) {
      return;
    }

    var layer = rootDocument.getElementById(LAYER_ID);
    if (layer && layer.parentNode) {
      layer.parentNode.removeChild(layer);
    }

    removeBadge(rootDocument);

    var positionedMounts = rootDocument.querySelectorAll('[' + POSITIONED_ATTR + '="true"]');
    for (var i = 0; i < positionedMounts.length; i += 1) {
      restoreTrackedMountPosition(positionedMounts[i]);
    }

    var isolatedMounts = rootDocument.querySelectorAll('[' + ISOLATION_ATTR + ']');
    for (var j = 0; j < isolatedMounts.length; j += 1) {
      restoreTrackedMountIsolation(isolatedMounts[j]);
    }

    var styleEl = rootDocument.getElementById(STYLE_ID);
    if (styleEl && styleEl.parentNode) {
      styleEl.parentNode.removeChild(styleEl);
    }
  }

  var api = {
    renderState: renderState,
    restoreNativeHeader: restoreNativeHeader
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    root.AWSDream = root.AWSDream || {};
    Object.assign(root.AWSDream, api);
  }
})(typeof window !== 'undefined' ? window : globalThis);
