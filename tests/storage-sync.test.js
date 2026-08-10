'use strict';

// Tests for extension/src/storage.js against the frozen contract in
// openspec/changes/aws-dream-mvp/design.md §2 and every requirement/scenario
// in openspec/changes/aws-dream-mvp/specs/extension-popup/spec.md that
// concerns storage/persistence/sync (as opposed to the popup DOM itself,
// which is out of scope for a Node-only test).
//
//   DEFAULT_ENABLED = true
//   async getEnabled(): Promise<boolean>
//   async setEnabled(boolean): Promise<void>
//   onEnabledChanged(cb: (enabled: boolean) => void): () => void  (unsubscribe fn)
//
// There is no real `chrome` global in Node, so this file stubs a minimal
// in-memory fake of chrome.storage.local.get/set and
// chrome.storage.onChanged.addListener/removeListener before requiring/
// calling into storage.js, per the qa task instructions. This file is owned
// by the `popup` agent; if it does not exist yet, or diverges from the
// contract, these tests will fail/error - expected until `popup` lands
// extension/src/storage.js.

const assert = require('node:assert/strict');
const { describe, it, beforeEach, afterEach } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');

const STORAGE_PATH = path.join(__dirname, '..', 'extension', 'src', 'storage.js');

/**
 * Minimal in-memory fake of the subset of the chrome.storage API that
 * storage.js depends on: storage.local.get/set (promise-based, matching
 * MV3's promise-returning storage API) and storage.onChanged.addListener/
 * removeListener. Mirrors real chrome.storage.local semantics closely
 * enough for unit testing: set() fires onChanged listeners (including in
 * the same context that called set(), matching real Chrome behavior).
 */
function createFakeChrome(initialStore) {
  const store = Object.assign({}, initialStore || {});
  const listeners = new Set();

  return {
    storage: {
      local: {
        get(defaults) {
          return Promise.resolve().then(() => {
            const result = {};
            if (defaults && typeof defaults === 'object') {
              for (const key of Object.keys(defaults)) {
                result[key] = Object.prototype.hasOwnProperty.call(store, key)
                  ? store[key]
                  : defaults[key];
              }
            } else {
              Object.assign(result, store);
            }
            return result;
          });
        },
        set(values) {
          return Promise.resolve().then(() => {
            const changes = {};
            for (const key of Object.keys(values)) {
              const oldValue = store[key];
              store[key] = values[key];
              changes[key] = { oldValue: oldValue, newValue: values[key] };
            }
            for (const listener of listeners) {
              listener(changes, 'local');
            }
          });
        }
      },
      onChanged: {
        addListener(fn) {
          listeners.add(fn);
        },
        removeListener(fn) {
          listeners.delete(fn);
        }
      }
    },
    _store: store,
    _listenerCount: () => listeners.size
  };
}

describe('storage.js - module contract', () => {
  it('module file exists at extension/src/storage.js', () => {
    assert.ok(
      fs.existsSync(STORAGE_PATH),
      'expected extension/src/storage.js to exist (owned by popup agent)'
    );
  });

  it('exports DEFAULT_ENABLED === true, and getEnabled/setEnabled/onEnabledChanged functions', () => {
    const mod = require(STORAGE_PATH);
    assert.equal(mod.DEFAULT_ENABLED, true);
    assert.equal(typeof mod.getEnabled, 'function');
    assert.equal(typeof mod.setEnabled, 'function');
    assert.equal(typeof mod.onEnabledChanged, 'function');
  });
});

describe('storage.js - default-true behavior on fresh install', () => {
  let storage;
  let originalChrome;

  beforeEach(() => {
    storage = require(STORAGE_PATH);
    originalChrome = global.chrome;
  });

  afterEach(() => {
    global.chrome = originalChrome;
  });

  it('resolves getEnabled() to true when chrome.storage.local has no stored value', async () => {
    global.chrome = createFakeChrome({}); // nothing stored yet
    const enabled = await storage.getEnabled();
    assert.equal(enabled, true);
  });
});

describe('storage.js - persistence of a previously stored value', () => {
  let storage;
  let originalChrome;

  beforeEach(() => {
    storage = require(STORAGE_PATH);
    originalChrome = global.chrome;
  });

  afterEach(() => {
    global.chrome = originalChrome;
  });

  it('getEnabled() reflects a previously stored false value rather than the default', async () => {
    global.chrome = createFakeChrome({ enabled: false });
    const enabled = await storage.getEnabled();
    assert.equal(enabled, false);
  });

  it('setEnabled(false) persists so a subsequent getEnabled() returns false', async () => {
    const fake = createFakeChrome({ enabled: true });
    global.chrome = fake;

    await storage.setEnabled(false);
    assert.equal(fake._store.enabled, false);

    const enabled = await storage.getEnabled();
    assert.equal(enabled, false);
  });

  it('setEnabled(true) persists so a subsequent getEnabled() returns true', async () => {
    const fake = createFakeChrome({ enabled: false });
    global.chrome = fake;

    await storage.setEnabled(true);
    const enabled = await storage.getEnabled();
    assert.equal(enabled, true);
  });
});

describe('storage.js - onEnabledChanged notifications', () => {
  let storage;
  let originalChrome;

  beforeEach(() => {
    storage = require(STORAGE_PATH);
    originalChrome = global.chrome;
  });

  afterEach(() => {
    global.chrome = originalChrome;
  });

  it('invokes the callback with the new value when the enabled flag changes', async () => {
    const fake = createFakeChrome({ enabled: true });
    global.chrome = fake;

    const seen = [];
    const unsubscribe = storage.onEnabledChanged((value) => seen.push(value));

    await storage.setEnabled(false);

    assert.deepEqual(seen, [false]);
    unsubscribe();
  });

  it('stops receiving notifications after unsubscribe() is called', async () => {
    const fake = createFakeChrome({ enabled: true });
    global.chrome = fake;

    const seen = [];
    const unsubscribe = storage.onEnabledChanged((value) => seen.push(value));

    await storage.setEnabled(false);
    unsubscribe();
    await storage.setEnabled(true);

    assert.deepEqual(seen, [false], 'callback should not fire again after unsubscribe');
  });

  it('does not notify for unrelated storage keys', async () => {
    const fake = createFakeChrome({ enabled: true });
    global.chrome = fake;

    const seen = [];
    const unsubscribe = storage.onEnabledChanged((value) => seen.push(value));

    await fake.storage.local.set({ someOtherKey: 'irrelevant' });

    assert.deepEqual(seen, []);
    unsubscribe();
  });
});
