/**
 * region-detector.js
 *
 * Pure Region/global-state detection. No DOM access -- every input is a
 * plain value passed in by the caller (content.js), which is what lets this
 * module be unit-tested with plain strings.
 *
 * Implements the deterministic signal precedence from
 * openspec/changes/aws-dream-mvp/specs/region-detection/spec.md:
 *   1. Explicit Region in the URL/query string (fixed 10-code allowlist;
 *      a well-formed-but-unsupported code resolves to `unsupported`, never
 *      a guessed nearby Region).
 *   2. Explicit global-service marker allowlist.
 *   3. Narrow visible Region-selector text fallback (must unambiguously
 *      match exactly one supported Region).
 *   Anything else resolves to `ambiguous`.
 */
(function (root) {
  'use strict';

  var deps = (typeof module !== 'undefined' && module.exports)
    ? require('./region-config.js')
    : root.AWSDream;

  var SUPPORTED_REGIONS = deps.SUPPORTED_REGIONS;
  var REGION_MAP = deps.REGION_MAP;
  var GLOBAL_REGION_CODE = deps.GLOBAL_REGION_CODE;
  var GLOBAL_SERVICE_MARKERS = deps.GLOBAL_SERVICE_MARKERS;

  // Shape of a generic AWS Region code, e.g. `us-east-1`, `ca-central-1`,
  // `ap-northeast-2`. Used to recognize "this looks like an AWS Region code"
  // independent of whether it is one of the 10 codes AWS Dream supports.
  var AWS_REGION_CODE_PATTERN = /^[a-z]{2}-[a-z]+-\d{1,2}$/i;

  /**
   * Attempts to read a `region=` style value from a URLSearchParams-like
   * query string. Returns null if absent or unreadable.
   */
  function readRegionQueryParam(searchStr) {
    if (!searchStr) {
      return null;
    }
    try {
      var params = new URLSearchParams(searchStr);
      return params.get('region');
    } catch (err) {
      return null;
    }
  }

  /**
   * Looks for an explicit AWS Region signal in the URL: a `region` query
   * parameter first, then a Region-shaped subdomain segment, then a
   * Region-shaped path segment. Returns `{ raw, isRegionShaped }` or null
   * if no Region-shaped token was found anywhere.
   */
  function extractRegionFromUrl(href, searchStr) {
    var url = null;
    if (href) {
      try {
        url = new URL(href);
      } catch (err) {
        url = null;
      }
    }

    var queryValue = url ? url.searchParams.get('region') : null;
    if (!queryValue) {
      queryValue = readRegionQueryParam(searchStr);
    }
    if (queryValue) {
      return { raw: queryValue.toLowerCase(), isRegionShaped: AWS_REGION_CODE_PATTERN.test(queryValue) };
    }

    if (url) {
      var hostSegments = url.hostname ? url.hostname.split('.') : [];
      for (var h = 0; h < hostSegments.length; h += 1) {
        if (AWS_REGION_CODE_PATTERN.test(hostSegments[h])) {
          return { raw: hostSegments[h].toLowerCase(), isRegionShaped: true };
        }
      }

      var pathSegments = url.pathname ? url.pathname.split('/').filter(Boolean) : [];
      for (var p = 0; p < pathSegments.length; p += 1) {
        if (AWS_REGION_CODE_PATTERN.test(pathSegments[p])) {
          return { raw: pathSegments[p].toLowerCase(), isRegionShaped: true };
        }
      }
      return null;
    }

    // href did not parse as an absolute URL (e.g. a bare test fixture
    // string) -- fall back to a defensive raw scan of URL-ish separators.
    if (href) {
      var rawSegments = String(href).split(/[\/?#&=]/).filter(Boolean);
      for (var r = 0; r < rawSegments.length; r += 1) {
        if (AWS_REGION_CODE_PATTERN.test(rawSegments[r])) {
          return { raw: rawSegments[r].toLowerCase(), isRegionShaped: true };
        }
      }
    }

    return null;
  }

  /**
   * Checks the small maintained global-service marker allowlist against the
   * full href.
   */
  function matchesGlobalServiceMarker(href) {
    if (!href || !GLOBAL_SERVICE_MARKERS) {
      return false;
    }
    for (var i = 0; i < GLOBAL_SERVICE_MARKERS.length; i += 1) {
      var marker = GLOBAL_SERVICE_MARKERS[i];
      try {
        if (marker.pattern.test(href)) {
          return true;
        }
      } catch (err) {
        // Ignore a malformed marker pattern rather than throwing.
      }
    }
    return false;
  }

  /**
   * Matches free-text Region-selector content against the supported Region
   * allowlist. Returns a Region code only when exactly one supported Region
   * unambiguously matches (by code or by display label); returns null for
   * zero or multiple matches, or empty/unreadable text.
   */
  function matchRegionSelectorText(regionSelectorText) {
    if (!regionSelectorText) {
      return null;
    }
    var normalized = String(regionSelectorText).trim();
    if (!normalized) {
      return null;
    }

    var matches = SUPPORTED_REGIONS.filter(function (code) {
      var config = REGION_MAP[code];
      var label = config && config.label;
      return normalized.indexOf(code) !== -1 || (label ? normalized.indexOf(label) !== -1 : false);
    });

    return matches.length === 1 ? matches[0] : null;
  }

  /**
   * detectState({ href, search, regionSelectorText }) -> {
   *   status: 'region' | 'global' | 'unsupported' | 'ambiguous',
   *   regionCode?: string
   * }
   *
   * Pure function; no DOM access.
   */
  function detectState(input) {
    var options = input || {};
    var href = options.href || '';
    var search = options.search || '';
    var regionSelectorText = options.regionSelectorText || '';

    // 1. Explicit Region in the URL/query string.
    var urlMatch = extractRegionFromUrl(href, search);
    if (urlMatch && urlMatch.isRegionShaped) {
      if (SUPPORTED_REGIONS.indexOf(urlMatch.raw) !== -1) {
        return { status: 'region', regionCode: urlMatch.raw };
      }
      return { status: 'unsupported' };
    }

    // 2. Explicit global-service marker allowlist.
    if (matchesGlobalServiceMarker(href)) {
      return { status: 'global', regionCode: GLOBAL_REGION_CODE };
    }

    // 3. Narrow visible Region-selector text fallback.
    var selectorRegion = matchRegionSelectorText(regionSelectorText);
    if (selectorRegion) {
      return { status: 'region', regionCode: selectorRegion };
    }

    return { status: 'ambiguous' };
  }

  var api = {
    detectState: detectState
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    root.AWSDream = root.AWSDream || {};
    Object.assign(root.AWSDream, api);
  }
})(typeof window !== 'undefined' ? window : globalThis);
