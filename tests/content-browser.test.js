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
          '<button data-testid="awsc-nav-region-menu">Asia Pacific (Seoul)</button>' +
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
});
