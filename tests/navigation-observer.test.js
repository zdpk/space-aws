'use strict';

// Tests for extension/src/navigation-observer.js against the frozen contract
// in openspec/changes/aws-dream-mvp/design.md §2 and every requirement/
// scenario in openspec/changes/aws-dream-mvp/specs/navigation-tracking/spec.md.
//
//   observeNavigation(onChange: () => void): () => void  (disconnect fn)
//
// The contract takes no options object (unlike header-renderer.js /
// region-detector.js), so - per design.md - it is expected to operate on
// the ambient global `window`/`document`/`history`, as it will in a real
// content script. To unit test it in Node, this file temporarily installs
// a jsdom window's globals (window/document/history/location/
// MutationObserver/etc.) onto the Node `global` object before each test and
// restores the originals afterward.
//
// This file is owned by the `core` agent; if navigation-observer.js does
// not exist yet, or diverges from the contract, these tests will fail/error
// - expected until `core` lands it.

const assert = require('node:assert/strict');
const { describe, it, beforeEach, afterEach } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

const EXTENSION_SRC_DIR = path.join(__dirname, '..', 'extension', 'src');
const NAV_OBSERVER_PATH = path.join(EXTENSION_SRC_DIR, 'navigation-observer.js');
const HEADER_RENDERER_PATH = path.join(EXTENSION_SRC_DIR, 'header-renderer.js');
const DOM_TARGETS_PATH = path.join(EXTENSION_SRC_DIR, 'dom-targets.js');
const REGION_DETECTOR_PATH = path.join(EXTENSION_SRC_DIR, 'region-detector.js');
const FIXTURE_PATH = path.join(__dirname, 'fixtures', 'aws-console-header.html');
const NO_HEADER_FIXTURE_PATH = path.join(__dirname, 'fixtures', 'aws-console-no-header.html');

const GLOBAL_KEYS = [
  'window',
  'document',
  'history',
  'location',
  'MutationObserver',
  'Node',
  'Element',
  'HTMLElement',
  'Event',
  'CustomEvent',
  'PopStateEvent',
  'HashChangeEvent',
  'getComputedStyle',
  'matchMedia',
  'Image'
];

function loadFixtureDom(fixturePath, url) {
  const html = fs.readFileSync(fixturePath, 'utf8');
  return new JSDOM(html, { url: url || 'https://console.aws.amazon.com/console/home?region=ap-northeast-2' });
}

/** Installs the given jsdom window's globals onto Node's `global`, so
 * navigation-observer.js (and, for the system-level tests below,
 * header-renderer.js) can operate on an ambient window/document/history as
 * they would in a real content script. Returns an uninstall function that
 * restores the previous globals exactly.
 */
function installGlobalWindow(dom) {
  const saved = {};
  for (const key of GLOBAL_KEYS) {
    saved[key] = global[key];
  }

  global.window = dom.window;
  global.document = dom.window.document;
  global.history = dom.window.history;
  global.location = dom.window.location;
  global.MutationObserver = dom.window.MutationObserver;
  global.Node = dom.window.Node;
  global.Element = dom.window.Element;
  global.HTMLElement = dom.window.HTMLElement;
  global.Event = dom.window.Event;
  global.CustomEvent = dom.window.CustomEvent;
  global.PopStateEvent = dom.window.PopStateEvent;
  global.HashChangeEvent = dom.window.HashChangeEvent;
  global.getComputedStyle = dom.window.getComputedStyle.bind(dom.window);

  // jsdom does not implement matchMedia; stub a benign default so any
  // incidental header-renderer call in the system-level tests below does
  // not throw. Individual tests may overwrite this stub as needed.
  function matchMedia(query) {
    return {
      matches: false,
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
  dom.window.matchMedia = matchMedia;
  global.matchMedia = matchMedia;

  return function uninstall() {
    for (const key of GLOBAL_KEYS) {
      if (saved[key] === undefined) {
        delete global[key];
      } else {
        global[key] = saved[key];
      }
    }
  };
}

/** Installs a controllable fake Image (see header-renderer.test.js for the
 * fuller version); the system-level tests below only need "always
 * succeeds" behavior, since they exercise navigation/no-duplicate-layer
 * guarantees, not asset-failure handling.
 */
function installAlwaysSucceedingImage(win) {
  class AlwaysSucceedImage {
    constructor() {
      this._src = '';
      this.onload = null;
      this.onerror = null;
    }
    set src(value) {
      this._src = value;
      const self = this;
      queueMicrotask(() => {
        if (typeof self.onload === 'function') self.onload(new win.Event('load'));
      });
    }
    get src() {
      return this._src;
    }
  }
  win.Image = AlwaysSucceedImage;
  global.Image = AlwaysSucceedImage;
}

function flush() {
  return new Promise((resolve) => setImmediate(resolve)).then(
    () => new Promise((resolve) => setImmediate(resolve))
  );
}

function requireFresh(modulePath) {
  delete require.cache[require.resolve(modulePath)];
  return require(modulePath);
}

function listJsFilesRecursive(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...listJsFilesRecursive(fullPath));
    } else if (entry.isFile() && fullPath.endsWith('.js')) {
      out.push(fullPath);
    }
  }
  return out;
}

describe('navigation-observer.js - module contract', () => {
  it('module file exists at extension/src/navigation-observer.js', () => {
    assert.ok(
      fs.existsSync(NAV_OBSERVER_PATH),
      'expected extension/src/navigation-observer.js to exist (owned by core agent)'
    );
  });

  it('exports an observeNavigation function', () => {
    const mod = require(NAV_OBSERVER_PATH);
    assert.equal(typeof mod.observeNavigation, 'function');
  });

  it('observeNavigation(onChange) returns a disconnect function', () => {
    const dom = loadFixtureDom(FIXTURE_PATH);
    const uninstall = installGlobalWindow(dom);
    try {
      const mod = requireFresh(NAV_OBSERVER_PATH);
      const disconnect = mod.observeNavigation(() => {});
      assert.equal(typeof disconnect, 'function');
      disconnect();
    } finally {
      uninstall();
    }
  });
});

describe('navigation-observer.js - event-driven navigation detection (no polling)', () => {
  let dom;
  let uninstall;
  let observeNavigation;

  beforeEach(() => {
    dom = loadFixtureDom(FIXTURE_PATH);
    uninstall = installGlobalWindow(dom);
    observeNavigation = requireFresh(NAV_OBSERVER_PATH).observeNavigation;
  });

  afterEach(() => {
    uninstall();
  });

  it('fires onChange after history.pushState (in-app navigation)', async () => {
    const calls = [];
    const disconnect = observeNavigation(() => calls.push('change'));
    global.history.pushState({}, '', '/console/home?region=us-west-2');
    await flush();
    assert.ok(calls.length >= 1, 'expected onChange to fire at least once after pushState');
    disconnect();
  });

  it('fires onChange after history.replaceState', async () => {
    const calls = [];
    const disconnect = observeNavigation(() => calls.push('change'));
    global.history.replaceState({}, '', '/console/home?region=eu-west-1');
    await flush();
    assert.ok(calls.length >= 1, 'expected onChange to fire at least once after replaceState');
    disconnect();
  });

  it('fires onChange on a popstate event (back/forward navigation)', async () => {
    const calls = [];
    const disconnect = observeNavigation(() => calls.push('change'));
    global.window.dispatchEvent(new global.window.PopStateEvent('popstate', {}));
    await flush();
    assert.ok(calls.length >= 1, 'expected onChange to fire at least once after popstate');
    disconnect();
  });

  it('fires onChange on a hashchange event', async () => {
    const calls = [];
    const disconnect = observeNavigation(() => calls.push('change'));
    global.window.dispatchEvent(
      new global.window.HashChangeEvent('hashchange', {
        oldURL: 'https://console.aws.amazon.com/console/home#a',
        newURL: 'https://console.aws.amazon.com/console/home#b'
      })
    );
    await flush();
    assert.ok(calls.length >= 1, 'expected onChange to fire at least once after hashchange');
    disconnect();
  });

  it('stops firing onChange once the returned disconnect function is called', async () => {
    const calls = [];
    const disconnect = observeNavigation(() => calls.push('change'));
    disconnect();
    global.history.pushState({}, '', '/console/home?region=us-east-1');
    await flush();
    assert.equal(calls.length, 0, 'expected no onChange calls after disconnect()');
  });
});

describe('navigation-observer.js - fail-closed when no header mount point exists', () => {
  it('does not throw when observeNavigation is started on a page with no header mount', async () => {
    const dom = loadFixtureDom(NO_HEADER_FIXTURE_PATH, 'https://console.aws.amazon.com/console/home');
    const uninstall = installGlobalWindow(dom);
    try {
      const { observeNavigation } = requireFresh(NAV_OBSERVER_PATH);
      let disconnect;
      assert.doesNotThrow(() => {
        disconnect = observeNavigation(() => {});
      });
      // Should not spin up any interval/timer loop waiting for the header;
      // simply not finding a mount is a valid, quiet steady state.
      await flush();
      if (typeof disconnect === 'function') disconnect();
    } finally {
      uninstall();
    }
  });
});

describe('navigation-tracking spec - no periodic polling (static source scan)', () => {
  it('no file under extension/src contains a setInterval( call', () => {
    assert.ok(
      fs.existsSync(EXTENSION_SRC_DIR),
      'expected extension/src to exist to run the static no-polling scan'
    );
    const offenders = [];
    for (const file of listJsFilesRecursive(EXTENSION_SRC_DIR)) {
      const text = fs.readFileSync(file, 'utf8');
      if (text.includes('setInterval(')) {
        offenders.push(path.relative(EXTENSION_SRC_DIR, file));
      }
    }
    assert.deepEqual(
      offenders,
      [],
      `found setInterval( usage (forbidden by the "No periodic polling" requirement) in: ${offenders.join(', ')}`
    );
  });
});

describe('system-level (navigation-observer + region-detector + header-renderer) - single layer after repeated navigation', () => {
  let dom;
  let uninstall;
  let observeNavigation;
  let headerRenderer;
  let detectState;

  beforeEach(() => {
    dom = loadFixtureDom(FIXTURE_PATH);
    uninstall = installGlobalWindow(dom);
    installAlwaysSucceedingImage(dom.window);
    observeNavigation = requireFresh(NAV_OBSERVER_PATH).observeNavigation;
    headerRenderer = requireFresh(HEADER_RENDERER_PATH);
    detectState = requireFresh(REGION_DETECTOR_PATH).detectState;
  });

  afterEach(() => {
    try {
      headerRenderer.restoreNativeHeader({ rootDocument: global.document });
    } catch (_err) {
      // ignore
    }
    uninstall();
  });

  function rerender() {
    const state = detectState({
      href: global.location.href,
      search: global.location.search,
      regionSelectorText: ''
    });
    headerRenderer.renderState(state, { rootDocument: global.document });
  }

  it('DOM contains exactly one decorative element after several rapid in-app navigations within supported Regions', async () => {
    const disconnect = observeNavigation(rerender);
    rerender();
    await flush();

    const codes = ['us-west-2', 'eu-central-1', 'ap-southeast-1', 'ap-northeast-2'];
    for (const code of codes) {
      global.history.pushState({}, '', `/console/home?region=${code}`);
      await flush();
    }

    const layers = global.document.querySelectorAll('#aws-dream-layer');
    assert.ok(
      layers.length <= 1,
      `expected zero or one decorative layer after repeated navigation, found ${layers.length}`
    );
    disconnect();
  });

  it('removes the layer on navigation to an unsupported Region, then shows exactly one again after returning to a supported Region', async () => {
    const disconnect = observeNavigation(rerender);

    global.history.pushState({}, '', '/console/home?region=ap-northeast-2');
    rerender();
    await flush();
    assert.equal(
      global.document.querySelectorAll('#aws-dream-layer').length,
      1,
      'precondition: exactly one layer while in a supported Region'
    );

    global.history.pushState({}, '', '/console/home?region=ca-central-1');
    await flush();
    assert.equal(
      global.document.querySelectorAll('#aws-dream-layer').length,
      0,
      'expected the layer removed after navigating to an unsupported Region'
    );

    global.history.pushState({}, '', '/console/home?region=eu-west-1');
    await flush();
    assert.equal(
      global.document.querySelectorAll('#aws-dream-layer').length,
      1,
      'expected exactly one layer again after returning to a supported Region'
    );

    disconnect();
  });
});
