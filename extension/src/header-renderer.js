/**
 * header-renderer.js
 *
 * Owns the single namespaced decorative layer (`#aws-dream-layer`) and the
 * single namespaced `<style>` tag (`#aws-dream-style`) injected into the AWS
 * Console header. Never removes, reorders, or restyles any native header
 * child; the only native mutation it ever performs is conditionally setting
 * `mount.style.position = 'relative'` (tracked via
 * `data-aws-dream-positioned`, reverted precisely on restore).
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
  var STYLE_ID = 'aws-dream-style';
  var POSITIONED_ATTR = 'data-aws-dream-positioned';
  var TRANSITION_CSS = 'opacity 220ms ease-in-out';

  // Documents intent; the essential structural/behavioral properties are
  // also always set inline on the layer element itself (see createLayer),
  // since inline styles are the source of truth this module relies on for
  // its own logic and are the most reliable thing to assert in a jsdom test
  // environment that only partially implements CSS media-query evaluation.
  var STYLE_CSS_TEXT = [
    '#' + LAYER_ID + ' {',
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
    layer.style.zIndex = '0';
    layer.style.backgroundRepeat = 'no-repeat';
    layer.style.backgroundSize = 'cover';
    return layer;
  }

  function ensureLayerIsFirstChild(mount, layer) {
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

    var key = state && state.regionCode;
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
      return;
    }

    var view = getView(rootDocument);
    var reducedMotion = prefersReducedMotion(rootDocument);
    var probe = createImageProbe(rootDocument);

    probe.onload = function () {
      ensureStyleTag(rootDocument);
      ensureMountPositioned(mount, view);

      var layer = rootDocument.getElementById(LAYER_ID);
      var isFirstRender = !layer;
      if (!layer) {
        layer = createLayer(rootDocument);
      }
      ensureLayerIsFirstChild(mount, layer);
      swapLayerContent(layer, config, assetUrl, reducedMotion, isFirstRender);
      layer.dataset.assetKey = key;
    };

    probe.onerror = function () {
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
    var rootDocument = getRootDocument(opts);
    if (!rootDocument) {
      return;
    }

    var layer = rootDocument.getElementById(LAYER_ID);
    if (layer && layer.parentNode) {
      layer.parentNode.removeChild(layer);
    }

    var positionedMounts = rootDocument.querySelectorAll('[' + POSITIONED_ATTR + '="true"]');
    for (var i = 0; i < positionedMounts.length; i += 1) {
      var mount = positionedMounts[i];
      mount.style.removeProperty('position');
      mount.removeAttribute(POSITIONED_ATTR);
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
