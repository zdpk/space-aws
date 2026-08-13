'use strict';

const assert = require('node:assert/strict');
const { describe, it } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

const EXTENSION_ROOT = path.join(__dirname, '..', 'extension');
const MANIFEST = JSON.parse(
  fs.readFileSync(path.join(EXTENSION_ROOT, 'manifest.json'), 'utf8')
);

describe('content scripts - classic browser namespace integration', () => {
  it('loads the manifest script sequence and auto-initializes without nested dependency errors', async () => {
    const dom = new JSDOM(
      '<!doctype html><html><head></head><body>' +
        '<header data-testid="awsc-nav-header">' +
          '<nav aria-label="Global">' +
            '<div id="awsc-top-level-nav">' +
              '<button data-testid="awsc-nav-region-menu">Asia Pacific (Seoul)</button>' +
            '</div>' +
            '<div id="awsc-nav-shortcuts">EC2 S3 VPC</div>' +
          '</nav>' +
        '</header>' +
      '</body></html>',
      {
        url: 'https://ap-northeast-2.console.aws.amazon.com/console/home?region=ap-northeast-2',
        runScripts: 'outside-only'
      }
    );

    const runtimeErrors = [];
    const storageListeners = new Set();
    dom.window.addEventListener('error', (event) => runtimeErrors.push(event.error || event.message));
    dom.window.chrome = {
      runtime: {
        getURL: (assetPath) => 'chrome-extension://aws-dream/' + assetPath
      },
      storage: {
        local: {
          get: async () => ({ enabled: true }),
          set: async () => {}
        },
        onChanged: {
          addListener: (listener) => storageListeners.add(listener),
          removeListener: (listener) => storageListeners.delete(listener)
        }
      }
    };

    try {
      const scripts = MANIFEST.content_scripts[0].js;
      for (const relativePath of scripts) {
        const source = fs.readFileSync(path.join(EXTENSION_ROOT, relativePath), 'utf8');
        assert.doesNotThrow(
          () => dom.window.eval(source),
          `expected ${relativePath} to load in the classic content-script environment`
        );
      }

      await new Promise((resolve) => dom.window.setTimeout(resolve, 0));

      assert.equal(typeof dom.window.AWSDream.detectState, 'function');
      assert.equal(typeof dom.window.AWSDream.renderState, 'function');
      assert.equal(typeof dom.window.AWSDream.observeNavigation, 'function');
      assert.equal(typeof dom.window.AWSDream.getEnabled, 'function');
      assert.equal(typeof dom.window.AWSDream.init, 'function');
      assert.deepEqual(runtimeErrors, []);
    } finally {
      dom.window.close();
    }
  });

  it('waits for the real AWS global header instead of mounting into an unrelated hidden header', async () => {
    const dom = new JSDOM(
      '<!doctype html><html><head></head><body>' +
        '<aside id="hidden-help-panel"><header id="hidden-help-header"></header></aside>' +
      '</body></html>',
      {
        url: 'https://ap-northeast-2.console.aws.amazon.com/console/home?region=ap-northeast-2',
        runScripts: 'outside-only'
      }
    );

    const storageListeners = new Set();
    class AutoLoadingImage {
      set src(value) {
        this._src = value;
        dom.window.queueMicrotask(() => {
          if (typeof this.onload === 'function') {
            this.onload(new dom.window.Event('load'));
          }
        });
      }
      get src() {
        return this._src;
      }
    }
    dom.window.Image = AutoLoadingImage;
    dom.window.chrome = {
      runtime: {
        getURL: (assetPath) => 'chrome-extension://aws-dream/' + assetPath
      },
      storage: {
        local: {
          get: async () => ({ enabled: true }),
          set: async () => {}
        },
        onChanged: {
          addListener: (listener) => storageListeners.add(listener),
          removeListener: (listener) => storageListeners.delete(listener)
        }
      }
    };

    try {
      for (const relativePath of MANIFEST.content_scripts[0].js) {
        const source = fs.readFileSync(path.join(EXTENSION_ROOT, relativePath), 'utf8');
        dom.window.eval(source);
      }

      await new Promise((resolve) => dom.window.setTimeout(resolve, 0));
      await new Promise((resolve) => dom.window.setTimeout(resolve, 0));

      const hiddenHeader = dom.window.document.querySelector('#hidden-help-header');
      assert.equal(hiddenHeader.querySelector('#aws-dream-layer'), null);

      const realHeader = dom.window.document.createElement('header');
      realHeader.id = 'awsc-nav-header';
      realHeader.setAttribute('data-testid', 'awsc-nav-header');
      const globalNav = dom.window.document.createElement('nav');
      globalNav.setAttribute('aria-label', 'Global');
      const topLevelNav = dom.window.document.createElement('div');
      topLevelNav.id = 'awsc-top-level-nav';
      const shortcutsNav = dom.window.document.createElement('div');
      shortcutsNav.id = 'awsc-nav-shortcuts';
      globalNav.appendChild(topLevelNav);
      globalNav.appendChild(shortcutsNav);
      realHeader.appendChild(globalNav);
      dom.window.document.body.prepend(realHeader);

      await new Promise((resolve) => dom.window.setTimeout(resolve, 0));
      await new Promise((resolve) => dom.window.setTimeout(resolve, 0));

      const layer = globalNav.querySelector(':scope > #aws-dream-layer');
      assert.ok(layer, 'expected the decorative layer inside the full AWS global header');
      assert.equal(layer.dataset.assetKey, 'ap-northeast-2');
      assert.equal(layer.style.zIndex, '-1');
      const badge = globalNav.querySelector(':scope > #aws-dream-region-badge');
      assert.ok(badge, 'expected the Seoul Region badge inside the full AWS global header');
      assert.equal(badge.textContent, 'AP-NORTHEAST-2');
      assert.equal(shortcutsNav.querySelector('#aws-dream-layer'), null);
      assert.equal(hiddenHeader.querySelector('#aws-dream-layer'), null);
    } finally {
      dom.window.close();
    }
  });

  it('restores the Region badge after AWS removes a direct header child', async () => {
    const dom = new JSDOM(
      '<!doctype html><html><head></head><body>' +
        '<header data-testid="awsc-nav-header">' +
          '<nav aria-label="Global">' +
            '<div id="awsc-top-level-nav">' +
              '<button data-testid="awsc-nav-region-menu">US East (N. Virginia)</button>' +
              '<a id="awsc-nav-scallop-icon" title="CloudShell"></a>' +
            '</div>' +
            '<div id="awsc-nav-shortcuts">EC2 S3 VPC</div>' +
          '</nav>' +
        '</header>' +
      '</body></html>',
      {
        url: 'https://us-east-1.console.aws.amazon.com/vpcconsole/home?region=us-east-1',
        runScripts: 'outside-only'
      }
    );

    const storageListeners = new Set();
    class AutoLoadingImage {
      set src(value) {
        this._src = value;
        dom.window.queueMicrotask(() => {
          if (typeof this.onload === 'function') {
            this.onload(new dom.window.Event('load'));
          }
        });
      }
      get src() {
        return this._src;
      }
    }
    dom.window.Image = AutoLoadingImage;
    dom.window.chrome = {
      runtime: {
        getURL: (assetPath) => 'chrome-extension://aws-dream/' + assetPath
      },
      storage: {
        local: {
          get: async () => ({ enabled: true }),
          set: async () => {}
        },
        onChanged: {
          addListener: (listener) => storageListeners.add(listener),
          removeListener: (listener) => storageListeners.delete(listener)
        }
      }
    };

    try {
      for (const relativePath of MANIFEST.content_scripts[0].js) {
        dom.window.eval(fs.readFileSync(path.join(EXTENSION_ROOT, relativePath), 'utf8'));
      }

      await new Promise((resolve) => dom.window.setTimeout(resolve, 0));
      await new Promise((resolve) => dom.window.setTimeout(resolve, 0));

      const nav = dom.window.document.querySelector('nav[aria-label="Global"]');
      const initialBadge = nav.querySelector(':scope > #aws-dream-region-badge');
      assert.ok(initialBadge, 'expected the initial Virginia Region badge');
      initialBadge.remove();

      await new Promise((resolve) => dom.window.setTimeout(resolve, 0));
      await new Promise((resolve) => dom.window.setTimeout(resolve, 0));

      const restoredBadge = nav.querySelector(':scope > #aws-dream-region-badge');
      assert.ok(restoredBadge, 'expected the Region badge to be restored after AWS removed it');
      assert.equal(restoredBadge.textContent, 'US-EAST-1');
      assert.equal(restoredBadge.querySelector('img').getAttribute('src'), 'chrome-extension://aws-dream/assets/flags/us.svg');
      assert.equal(nav.querySelectorAll(':scope > #aws-dream-layer').length, 1);
      assert.equal(nav.querySelectorAll(':scope > #aws-dream-region-badge').length, 1);
    } finally {
      dom.window.close();
    }
  });
});
