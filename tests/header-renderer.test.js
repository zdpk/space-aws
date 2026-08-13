'use strict';

// Tests for extension/src/header-renderer.js against the frozen contract in
// openspec/changes/aws-dream-mvp/design.md §2/§3 and every requirement/
// scenario in openspec/changes/aws-dream-mvp/specs/header-theming/spec.md.
//
//   renderState(state, { rootDocument }): void
//   restoreNativeHeader({ rootDocument }): void
//
// Owns one namespaced background, an optional namespaced Region badge, and a
// single namespaced <style> tag; preloads via `new Image()` before swap; tracks
// and reverts only the one inline `position` style property it may add to
// the mount point.
//
// This file is owned by the `core` agent (header-renderer.js, dom-targets.js
// are both core files). If they do not exist yet, or diverge from the
// frozen contract, these tests will fail/error - expected until `core`
// lands them. jsdom does not implement real <img>/Image network loading
// (see jsdom's documented unimplemented parts of the platform), so asset
// preload/failure is simulated deterministically via a controllable fake
// `Image` constructor rather than relying on jsdom to actually fetch the
// bundled .webp files.

const assert = require('node:assert/strict');
const { describe, it, beforeEach, afterEach } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

const HEADER_RENDERER_PATH = path.join(__dirname, '..', 'extension', 'src', 'header-renderer.js');
const DOM_TARGETS_PATH = path.join(__dirname, '..', 'extension', 'src', 'dom-targets.js');
const REGION_CONFIG_PATH = path.join(__dirname, '..', 'extension', 'src', 'region-config.js');
const FIXTURE_PATH = path.join(__dirname, 'fixtures', 'aws-console-header.html');

const NATIVE_TESTIDS = [
  'awsc-nav-header',
  'awsc-nav-logo',
  'awsc-nav-services-menu',
  'awsc-nav-search',
  'awsc-nav-scallop-icon',
  'awsc-nav-region-menu',
  'awsc-nav-support-menu',
  'awsc-nav-username-menu',
  'awsc-nav-shortcuts'
];

function loadFixtureDom() {
  const html = fs.readFileSync(FIXTURE_PATH, 'utf8');
  return new JSDOM(html, {
    url: 'https://console.aws.amazon.com/console/home?region=ap-northeast-2'
  });
}

/** Installs a controllable fake `Image` on both the jsdom window and the
 * Node global, since it is unspecified by the frozen contract whether
 * header-renderer.js reads `rootDocument.defaultView.Image` or an ambient
 * global `Image` when running as a real content script. Call
 * `ControlledImage.resolveAll()` to fire pending onload handlers (default:
 * succeed), or `ControlledImage.resolveAll('fail')` to fire onerror instead.
 */
function installControlledImage(win) {
  class ControlledImage {
    constructor() {
      this._src = '';
      this.onload = null;
      this.onerror = null;
      ControlledImage.pending.push(this);
    }
    set src(value) {
      this._src = value;
    }
    get src() {
      return this._src;
    }
  }
  ControlledImage.pending = [];
  ControlledImage.resolveAll = function resolveAll(mode) {
    const toResolve = ControlledImage.pending.splice(0, ControlledImage.pending.length);
    for (const img of toResolve) {
      const fail = mode === 'fail';
      if (fail && typeof img.onerror === 'function') {
        img.onerror(new win.Event('error'));
      } else if (!fail && typeof img.onload === 'function') {
        img.onload(new win.Event('load'));
      }
    }
  };
  win.Image = ControlledImage;
  global.Image = ControlledImage;
  return ControlledImage;
}

/** Installs a stub `matchMedia` (jsdom does not implement it) on both the
 * jsdom window and the Node global, so header-renderer.js can read
 * `prefers-reduced-motion` regardless of whether it accesses it via
 * `rootDocument.defaultView` or an ambient global.
 */
function installMatchMedia(win, reduceMotionMatches) {
  function matchMedia(query) {
    const matches = query.includes('prefers-reduced-motion') ? !!reduceMotionMatches : false;
    return {
      matches,
      media: query,
      addListener() {},
      removeListener() {},
      addEventListener() {},
      removeEventListener() {},
      dispatchEvent() {
        return false;
      }
    };
  }
  win.matchMedia = matchMedia;
  global.matchMedia = matchMedia;
}

function flush() {
  return new Promise((resolve) => setImmediate(resolve));
}

function requireFresh(modulePath) {
  delete require.cache[require.resolve(modulePath)];
  return require(modulePath);
}

describe('header-renderer.js - module contract', () => {
  it('module file exists at extension/src/header-renderer.js', () => {
    assert.ok(
      fs.existsSync(HEADER_RENDERER_PATH),
      'expected extension/src/header-renderer.js to exist (owned by core agent)'
    );
  });

  it('exports renderState and restoreNativeHeader functions', () => {
    const mod = require(HEADER_RENDERER_PATH);
    assert.equal(typeof mod.renderState, 'function');
    assert.equal(typeof mod.restoreNativeHeader, 'function');
  });

  it('dom-targets.js exists (required to discover the header mount point)', () => {
    assert.ok(
      fs.existsSync(DOM_TARGETS_PATH),
      'expected extension/src/dom-targets.js to exist (owned by core agent)'
    );
  });
});

describe('header-renderer.js - single namespaced decorative layer', () => {
  let dom;
  let doc;
  let headerRenderer;
  let domTargets;

  beforeEach(() => {
    dom = loadFixtureDom();
    doc = dom.window.document;
    installMatchMedia(dom.window, false);
    headerRenderer = requireFresh(HEADER_RENDERER_PATH);
    domTargets = requireFresh(DOM_TARGETS_PATH);
  });

  afterEach(() => {
    try {
      headerRenderer.restoreNativeHeader({ rootDocument: doc });
    } catch (_err) {
      // ignore - best-effort cleanup
    }
    delete global.Image;
    delete global.matchMedia;
  });

  it('the fixture header container matches at least one HEADER_MOUNT_SELECTORS candidate', () => {
    const mount = domTargets.findFirst(domTargets.HEADER_MOUNT_SELECTORS, doc);
    assert.ok(
      mount,
      'tests/fixtures/aws-console-header.html does not match any of core\'s ' +
        'HEADER_MOUNT_SELECTORS candidates - the fixture may need an additional ' +
        'selector hook, or dom-targets.js needs a broader candidate list'
    );
  });

  it('injects exactly one #aws-dream-layer element on first successful render', async () => {
    const ControlledImage = installControlledImage(dom.window);
    headerRenderer.renderState(
      { status: 'region', regionCode: 'ap-northeast-2' },
      { rootDocument: doc }
    );
    ControlledImage.resolveAll();
    await flush();

    const layers = doc.querySelectorAll('#aws-dream-layer');
    assert.equal(layers.length, 1);
  });

  it('reuses the same DOM node (not a new one) across repeated renderState calls', async () => {
    const ControlledImage = installControlledImage(dom.window);

    headerRenderer.renderState(
      { status: 'region', regionCode: 'ap-northeast-2' },
      { rootDocument: doc }
    );
    ControlledImage.resolveAll();
    await flush();
    const layer1 = doc.getElementById('aws-dream-layer');
    assert.ok(layer1);

    headerRenderer.renderState(
      { status: 'region', regionCode: 'ap-northeast-2' },
      { rootDocument: doc }
    );
    ControlledImage.resolveAll();
    await flush();
    const layer2 = doc.getElementById('aws-dream-layer');

    assert.equal(layer2, layer1, 'expected the same node to be reused, not recreated');
    assert.equal(doc.querySelectorAll('#aws-dream-layer').length, 1);

    headerRenderer.renderState(
      { status: 'region', regionCode: 'us-east-1' },
      { rootDocument: doc }
    );
    ControlledImage.resolveAll();
    await flush();

    assert.equal(doc.querySelectorAll('#aws-dream-layer').length, 1);
    assert.equal(doc.getElementById('aws-dream-layer'), layer1);
  });
});

describe('header-renderer.js - non-interactive decoration', () => {
  let dom;
  let doc;
  let headerRenderer;

  beforeEach(() => {
    dom = loadFixtureDom();
    doc = dom.window.document;
    installMatchMedia(dom.window, false);
    headerRenderer = requireFresh(HEADER_RENDERER_PATH);
  });

  afterEach(() => {
    try {
      headerRenderer.restoreNativeHeader({ rootDocument: doc });
    } catch (_err) {
      // ignore
    }
    delete global.Image;
    delete global.matchMedia;
  });

  it('sets aria-hidden="true" and pointer-events: none on the decorative layer', async () => {
    const ControlledImage = installControlledImage(dom.window);
    headerRenderer.renderState(
      { status: 'global', regionCode: 'aws-global' },
      { rootDocument: doc }
    );
    ControlledImage.resolveAll();
    await flush();

    const layer = doc.getElementById('aws-dream-layer');
    assert.ok(layer, 'expected #aws-dream-layer after a global-state render');
    assert.equal(layer.getAttribute('aria-hidden'), 'true');
    assert.equal(dom.window.getComputedStyle(layer).pointerEvents, 'none');
    assert.equal(layer.parentElement.tagName, 'NAV');
    assert.equal(layer.parentElement.getAttribute('aria-label'), 'Global');
    assert.equal(layer.style.zIndex, '-1');
    assert.equal(doc.querySelector('#awsc-nav-shortcuts #aws-dream-layer'), null);
  });

  it('renders a non-interactive Region badge with the local flag asset for Seoul', async () => {
    const ControlledImage = installControlledImage(dom.window);
    headerRenderer.renderState(
      { status: 'region', regionCode: 'ap-northeast-2' },
      { rootDocument: doc }
    );
    ControlledImage.resolveAll();
    await flush();

    const badge = doc.getElementById('aws-dream-region-badge');
    assert.ok(badge, 'expected a Region badge for Seoul');
    assert.equal(badge.parentElement.tagName, 'NAV');
    assert.equal(badge.parentElement.getAttribute('aria-label'), 'Global');
    assert.equal(badge.getAttribute('aria-hidden'), 'true');
    assert.equal(dom.window.getComputedStyle(badge).pointerEvents, 'none');
    assert.equal(badge.textContent, 'AP-NORTHEAST-2');
    assert.equal(badge.querySelector('img').getAttribute('src'), 'assets/flags/kr.svg');
    assert.equal(badge.style.left, 'auto');
    assert.equal(badge.style.transform, 'none');
  });

  it('renders the matching code and country flag badge for every supported Region', async () => {
    const ControlledImage = installControlledImage(dom.window);
    const regionConfig = requireFresh(REGION_CONFIG_PATH);

    for (const regionCode of regionConfig.SUPPORTED_REGIONS) {
      const config = regionConfig.REGION_MAP[regionCode];
      headerRenderer.renderState(
        { status: 'region', regionCode },
        { rootDocument: doc }
      );
      ControlledImage.resolveAll();
      await flush();

      const badge = doc.getElementById('aws-dream-region-badge');
      assert.ok(badge, `expected a Region badge for ${regionCode}`);
      assert.equal(badge.dataset.assetKey, regionCode);
      assert.equal(badge.textContent, config.badgeCode);
      assert.equal(
        badge.querySelector('img').getAttribute('src'),
        config.flagAssetPath,
        `expected the configured country flag for ${regionCode}`
      );
      assert.equal(doc.querySelectorAll('#aws-dream-region-badge').length, 1);
    }
  });

  it('positions the Region badge immediately to the left of the visible CloudShell icon', async () => {
    const mount = doc.querySelector('nav[aria-label="Global"]');
    const cloudShell = doc.getElementById('awsc-nav-scallop-icon');
    mount.getBoundingClientRect = () => ({
      left: 0, right: 1000, top: 0, bottom: 73, width: 1000, height: 73
    });
    cloudShell.getBoundingClientRect = () => ({
      left: 700, right: 748, top: 0, bottom: 48, width: 48, height: 48
    });

    const ControlledImage = installControlledImage(dom.window);
    headerRenderer.renderState(
      { status: 'region', regionCode: 'ap-northeast-2' },
      { rootDocument: doc }
    );
    ControlledImage.resolveAll();
    await flush();

    const badge = doc.getElementById('aws-dream-region-badge');
    assert.equal(badge.style.right, '308px');
    assert.equal(badge.style.top, '13px');
    assert.equal(badge.style.bottom, 'auto');
  });
});

describe('header-renderer.js - native header controls are never touched', () => {
  let dom;
  let doc;
  let headerRenderer;
  let domTargets;

  beforeEach(() => {
    dom = loadFixtureDom();
    doc = dom.window.document;
    installMatchMedia(dom.window, false);
    headerRenderer = requireFresh(HEADER_RENDERER_PATH);
    domTargets = requireFresh(DOM_TARGETS_PATH);
  });

  afterEach(() => {
    try {
      headerRenderer.restoreNativeHeader({ rootDocument: doc });
    } catch (_err) {
      // ignore
    }
    delete global.Image;
    delete global.matchMedia;
  });

  it('never removes, reorders, or restyles native header children across multiple renders', async () => {
    const mount = domTargets.findFirst(domTargets.HEADER_MOUNT_SELECTORS, doc);
    assert.ok(mount, 'fixture header container must match a HEADER_MOUNT_SELECTORS candidate');

    const nativeBefore = Array.from(mount.children)
      .filter((el) => el.id !== 'aws-dream-layer' && el.id !== 'aws-dream-region-badge')
      .map((el) => el.outerHTML);

    const ControlledImage = installControlledImage(dom.window);
    headerRenderer.renderState({ status: 'region', regionCode: 'ap-northeast-2' }, { rootDocument: doc });
    ControlledImage.resolveAll();
    await flush();
    headerRenderer.renderState({ status: 'region', regionCode: 'us-east-1' }, { rootDocument: doc });
    ControlledImage.resolveAll();
    await flush();

    const nativeAfter = Array.from(mount.children)
      .filter((el) => el.id !== 'aws-dream-layer' && el.id !== 'aws-dream-region-badge')
      .map((el) => el.outerHTML);

    assert.deepEqual(nativeAfter, nativeBefore);

    for (const testid of NATIVE_TESTIDS) {
      assert.ok(
        doc.querySelector(`[data-testid="${testid}"]`),
        `expected native control [data-testid="${testid}"] to still be present unmodified`
      );
    }
  });
});

describe('header-renderer.js - fail-closed asset handling', () => {
  let dom;
  let doc;
  let headerRenderer;
  let domTargets;

  beforeEach(() => {
    dom = loadFixtureDom();
    doc = dom.window.document;
    installMatchMedia(dom.window, false);
    headerRenderer = requireFresh(HEADER_RENDERER_PATH);
    domTargets = requireFresh(DOM_TARGETS_PATH);
  });

  afterEach(() => {
    try {
      headerRenderer.restoreNativeHeader({ rootDocument: doc });
    } catch (_err) {
      // ignore
    }
    delete global.Image;
    delete global.matchMedia;
  });

  it('leaves no decorative layer when the very first asset load fails (missing/failed asset)', async () => {
    const ControlledImage = installControlledImage(dom.window);
    headerRenderer.renderState({ status: 'region', regionCode: 'us-east-1' }, { rootDocument: doc });
    ControlledImage.resolveAll('fail');
    await flush();

    assert.equal(doc.getElementById('aws-dream-layer'), null);

    const mount = domTargets.findFirst(domTargets.HEADER_MOUNT_SELECTORS, doc);
    assert.ok(mount);
    assert.equal(mount.querySelector('img[src]'), null, 'no broken-image <img> artifact should remain');
  });

  it('removes previously shown decorative content when a later asset load fails', async () => {
    const ControlledImage = installControlledImage(dom.window);
    headerRenderer.renderState({ status: 'region', regionCode: 'ap-northeast-2' }, { rootDocument: doc });
    ControlledImage.resolveAll();
    await flush();
    assert.ok(doc.getElementById('aws-dream-layer'), 'precondition: a layer should be visible');

    headerRenderer.renderState({ status: 'region', regionCode: 'us-east-1' }, { rootDocument: doc });
    ControlledImage.resolveAll('fail');
    await flush();

    assert.equal(
      doc.getElementById('aws-dream-layer'),
      null,
      'expected the decorative layer to be removed and the native header restored'
    );
  });
});

describe('header-renderer.js - preload before swap', () => {
  let dom;
  let doc;
  let headerRenderer;

  beforeEach(() => {
    dom = loadFixtureDom();
    doc = dom.window.document;
    installMatchMedia(dom.window, false);
    headerRenderer = requireFresh(HEADER_RENDERER_PATH);
  });

  afterEach(() => {
    try {
      headerRenderer.restoreNativeHeader({ rootDocument: doc });
    } catch (_err) {
      // ignore
    }
    delete global.Image;
    delete global.matchMedia;
  });

  it('keeps the previous rendered output visible until the next asset finishes preloading', async () => {
    const ControlledImage = installControlledImage(dom.window);

    headerRenderer.renderState({ status: 'region', regionCode: 'ap-northeast-2' }, { rootDocument: doc });
    ControlledImage.resolveAll();
    await flush();
    const layerAfterFirstRender = doc.getElementById('aws-dream-layer');
    assert.ok(layerAfterFirstRender);
    const snapshotBefore = layerAfterFirstRender.outerHTML;

    // Start a render for a different Region, but do NOT resolve the new
    // Image yet - the previous state must remain untouched.
    headerRenderer.renderState({ status: 'region', regionCode: 'us-west-2' }, { rootDocument: doc });
    await flush();

    const snapshotWhilePending = doc.getElementById('aws-dream-layer')
      ? doc.getElementById('aws-dream-layer').outerHTML
      : null;
    assert.equal(
      snapshotWhilePending,
      snapshotBefore,
      'expected no visible change while the next asset is still preloading'
    );

    // Now let the pending preload finish.
    ControlledImage.resolveAll();
    await flush();

    const snapshotAfter = doc.getElementById('aws-dream-layer')
      ? doc.getElementById('aws-dream-layer').outerHTML
      : null;
    assert.notEqual(
      snapshotAfter,
      snapshotBefore,
      'expected the layer to update once the new asset finished preloading'
    );
  });

  it('ignores a stale preload that finishes after a newer Region request', async () => {
    const ControlledImage = installControlledImage(dom.window);

    headerRenderer.renderState({ status: 'region', regionCode: 'us-west-2' }, { rootDocument: doc });
    headerRenderer.renderState({ status: 'region', regionCode: 'us-east-1' }, { rootDocument: doc });

    const [staleProbe, currentProbe] = ControlledImage.pending.splice(0, 2);
    currentProbe.onload(new dom.window.Event('load'));
    staleProbe.onload(new dom.window.Event('load'));
    await flush();

    const layer = doc.getElementById('aws-dream-layer');
    assert.ok(layer);
    assert.equal(layer.dataset.assetKey, 'us-east-1');
  });
});

describe('header-renderer.js - tracked mount style properties', () => {
  let dom;
  let doc;
  let headerRenderer;
  let domTargets;

  beforeEach(() => {
    dom = loadFixtureDom();
    doc = dom.window.document;
    installMatchMedia(dom.window, false);
    headerRenderer = requireFresh(HEADER_RENDERER_PATH);
    domTargets = requireFresh(DOM_TARGETS_PATH);
  });

  afterEach(() => {
    try {
      headerRenderer.restoreNativeHeader({ rootDocument: doc });
    } catch (_err) {
      // ignore
    }
    delete global.Image;
    delete global.matchMedia;
  });

  it('sets mount.style.position = "relative" only when the mount was position: static, and restoreNativeHeader removes exactly that', async () => {
    const mount = domTargets.findFirst(domTargets.HEADER_MOUNT_SELECTORS, doc);
    assert.ok(mount);
    assert.equal(
      dom.window.getComputedStyle(mount).position,
      'static',
      'fixture precondition: mount should start position: static'
    );
    assert.equal(mount.style.position, '', 'fixture precondition: no inline position set yet');

    const ControlledImage = installControlledImage(dom.window);
    headerRenderer.renderState({ status: 'region', regionCode: 'ap-northeast-2' }, { rootDocument: doc });
    ControlledImage.resolveAll();
    await flush();

    assert.equal(
      mount.style.position,
      'relative',
      'expected the renderer to add inline position: relative to a static mount'
    );

    headerRenderer.restoreNativeHeader({ rootDocument: doc });

    assert.equal(
      mount.style.position,
      '',
      'expected restoreNativeHeader to remove exactly the position property it added'
    );
    assert.equal(doc.getElementById('aws-dream-layer'), null);
  });

  it('does not add or remove mount.style.position when the mount is already positioned', async () => {
    const mount = domTargets.findFirst(domTargets.HEADER_MOUNT_SELECTORS, doc);
    assert.ok(mount);
    mount.style.position = 'relative'; // simulate AWS's own markup already being positioned

    const ControlledImage = installControlledImage(dom.window);
    headerRenderer.renderState({ status: 'region', regionCode: 'ap-northeast-2' }, { rootDocument: doc });
    ControlledImage.resolveAll();
    await flush();

    assert.equal(mount.style.position, 'relative');

    headerRenderer.restoreNativeHeader({ rootDocument: doc });

    assert.equal(
      mount.style.position,
      'relative',
      'expected restoreNativeHeader to leave a pre-existing position value untouched'
    );
  });

  it('creates an isolated stacking context so the negative background layer remains visible', async () => {
    const mount = domTargets.findFirst(domTargets.HEADER_MOUNT_SELECTORS, doc);
    assert.ok(mount);
    assert.equal(mount.style.isolation, '');

    const ControlledImage = installControlledImage(dom.window);
    headerRenderer.renderState({ status: 'region', regionCode: 'ap-northeast-2' }, { rootDocument: doc });
    ControlledImage.resolveAll();
    await flush();

    assert.equal(mount.style.isolation, 'isolate');
    assert.equal(doc.getElementById('aws-dream-layer').style.zIndex, '-1');

    headerRenderer.restoreNativeHeader({ rootDocument: doc });
    assert.equal(mount.style.isolation, '');
    assert.equal(mount.hasAttribute('data-aws-dream-original-isolation'), false);
  });

  it('restores a pre-existing inline isolation value exactly', async () => {
    const mount = domTargets.findFirst(domTargets.HEADER_MOUNT_SELECTORS, doc);
    assert.ok(mount);
    mount.style.isolation = 'auto';

    const ControlledImage = installControlledImage(dom.window);
    headerRenderer.renderState({ status: 'region', regionCode: 'ap-northeast-2' }, { rootDocument: doc });
    ControlledImage.resolveAll();
    await flush();

    assert.equal(mount.style.isolation, 'isolate');
    headerRenderer.restoreNativeHeader({ rootDocument: doc });
    assert.equal(mount.style.isolation, 'auto');
  });
});

describe('header-renderer.js - reduced-motion aware transition', () => {
  let dom;
  let doc;
  let headerRenderer;

  beforeEach(() => {
    dom = loadFixtureDom();
    doc = dom.window.document;
  });

  afterEach(() => {
    try {
      headerRenderer.restoreNativeHeader({ rootDocument: doc });
    } catch (_err) {
      // ignore
    }
    delete global.Image;
    delete global.matchMedia;
  });

  it('skips the animated transition when prefers-reduced-motion: reduce is active', async () => {
    installMatchMedia(dom.window, true); // matches: true => reduced motion preferred
    headerRenderer = requireFresh(HEADER_RENDERER_PATH);
    const ControlledImage = installControlledImage(dom.window);

    headerRenderer.renderState({ status: 'region', regionCode: 'ap-northeast-2' }, { rootDocument: doc });
    ControlledImage.resolveAll();
    await flush();
    headerRenderer.renderState({ status: 'region', regionCode: 'us-east-1' }, { rootDocument: doc });
    ControlledImage.resolveAll();
    await flush();

    const layer = doc.getElementById('aws-dream-layer');
    assert.ok(layer);
    const computed = dom.window.getComputedStyle(layer);
    const duration = computed.transitionDuration;
    assert.ok(
      duration === '0s' ||
        duration === '' ||
        layer.style.transitionDuration === '0s' ||
        layer.style.transition === 'none',
      `expected no animated transition under prefers-reduced-motion: reduce, got transitionDuration="${duration}"`
    );
  });
});

describe('header-renderer.js - disabled-state restoration', () => {
  let dom;
  let doc;
  let headerRenderer;

  beforeEach(() => {
    dom = loadFixtureDom();
    doc = dom.window.document;
    installMatchMedia(dom.window, false);
    headerRenderer = requireFresh(HEADER_RENDERER_PATH);
  });

  afterEach(() => {
    delete global.Image;
    delete global.matchMedia;
  });

  it('restoreNativeHeader removes the decorative layer entirely, restoring the native header', async () => {
    const ControlledImage = installControlledImage(dom.window);
    headerRenderer.renderState({ status: 'region', regionCode: 'ap-northeast-2' }, { rootDocument: doc });
    ControlledImage.resolveAll();
    await flush();
    assert.ok(doc.getElementById('aws-dream-layer'));

    headerRenderer.restoreNativeHeader({ rootDocument: doc });

    assert.equal(doc.getElementById('aws-dream-layer'), null);
    assert.equal(doc.getElementById('aws-dream-region-badge'), null);
    assert.equal(doc.querySelectorAll('style[data-aws-dream], style#aws-dream-style').length <= 1, true);
  });

  it('renderState resumes normally after a restore (re-enable path)', async () => {
    const ControlledImage = installControlledImage(dom.window);
    headerRenderer.renderState({ status: 'region', regionCode: 'ap-northeast-2' }, { rootDocument: doc });
    ControlledImage.resolveAll();
    await flush();
    headerRenderer.restoreNativeHeader({ rootDocument: doc });
    assert.equal(doc.getElementById('aws-dream-layer'), null);

    headerRenderer.renderState({ status: 'region', regionCode: 'ap-northeast-2' }, { rootDocument: doc });
    ControlledImage.resolveAll();
    await flush();
    assert.ok(doc.getElementById('aws-dream-layer'), 'expected rendering to resume after restore');
  });
});

describe('header-renderer.js - ambiguous/unsupported leaves header native', () => {
  let dom;
  let doc;
  let headerRenderer;

  beforeEach(() => {
    dom = loadFixtureDom();
    doc = dom.window.document;
    installMatchMedia(dom.window, false);
    headerRenderer = requireFresh(HEADER_RENDERER_PATH);
  });

  afterEach(() => {
    try {
      headerRenderer.restoreNativeHeader({ rootDocument: doc });
    } catch (_err) {
      // ignore
    }
    delete global.Image;
    delete global.matchMedia;
  });

  it('removes an existing decorative layer once state becomes "unsupported"', async () => {
    const ControlledImage = installControlledImage(dom.window);
    headerRenderer.renderState({ status: 'region', regionCode: 'ap-northeast-2' }, { rootDocument: doc });
    ControlledImage.resolveAll();
    await flush();
    assert.ok(doc.getElementById('aws-dream-layer'));

    headerRenderer.renderState({ status: 'unsupported' }, { rootDocument: doc });
    await flush();

    assert.equal(doc.getElementById('aws-dream-layer'), null);
  });

  it('removes an existing decorative layer once state becomes "ambiguous"', async () => {
    const ControlledImage = installControlledImage(dom.window);
    headerRenderer.renderState({ status: 'region', regionCode: 'ap-northeast-2' }, { rootDocument: doc });
    ControlledImage.resolveAll();
    await flush();
    assert.ok(doc.getElementById('aws-dream-layer'));

    headerRenderer.renderState({ status: 'ambiguous' }, { rootDocument: doc });
    await flush();

    assert.equal(doc.getElementById('aws-dream-layer'), null);
  });

  it('never renders anything for "unsupported" state from a clean header', async () => {
    headerRenderer.renderState({ status: 'unsupported' }, { rootDocument: doc });
    await flush();
    assert.equal(doc.getElementById('aws-dream-layer'), null);
  });
});
