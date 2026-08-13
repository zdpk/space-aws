'use strict';

// Tests for extension/manifest.json against openspec/changes/aws-dream-mvp/
// design.md §5 ("Permissions") and specs/*/spec.md privacy/permission
// requirements (PRD.md §9/§12). This file is owned by the `core` agent; if
// manifest.json does not exist yet, or diverges from the frozen contract,
// these tests will fail/error - expected until `core` lands
// extension/manifest.json.

const assert = require('node:assert/strict');
const { describe, it } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');

const EXTENSION_ROOT = path.join(__dirname, '..', 'extension');
const MANIFEST_PATH = path.join(EXTENSION_ROOT, 'manifest.json');
const ALLOWED_MATCH = 'https://*.console.aws.amazon.com/*';

function readManifest() {
  const raw = fs.readFileSync(MANIFEST_PATH, 'utf8');
  return JSON.parse(raw);
}

/**
 * Resolves a manifest-referenced path (which may contain a single trailing
 * "*" glob segment, e.g. "assets/regions/*.webp") to a boolean indicating
 * whether at least one matching file exists on disk under extension/.
 */
function referencedPathExists(relativePath) {
  const fullPath = path.join(EXTENSION_ROOT, relativePath);
  if (!relativePath.includes('*')) {
    return fs.existsSync(fullPath);
  }
  const dir = path.dirname(fullPath);
  const filePattern = path.basename(relativePath);
  if (!fs.existsSync(dir)) return false;
  const regex = new RegExp(
    '^' + filePattern.split('*').map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('.*') + '$'
  );
  const entries = fs.readdirSync(dir);
  return entries.some((entry) => regex.test(entry));
}

describe('manifest.json - presence and valid JSON', () => {
  it('extension/manifest.json exists', () => {
    assert.ok(fs.existsSync(MANIFEST_PATH), 'expected extension/manifest.json to exist (owned by core agent)');
  });

  it('parses as valid JSON', () => {
    assert.doesNotThrow(() => readManifest());
  });
});

describe('manifest.json - Manifest V3 basics', () => {
  const manifest = fs.existsSync(MANIFEST_PATH) ? readManifest() : {};

  it('declares manifest_version 3', () => {
    assert.equal(manifest.manifest_version, 3);
  });

  it('has a name and version', () => {
    assert.equal(typeof manifest.name, 'string');
    assert.ok(manifest.name.length > 0);
    assert.equal(typeof manifest.version, 'string');
    assert.ok(manifest.version.length > 0);
  });
});

describe('manifest.json - minimal permissions (design.md §5, PRD.md §9/§12)', () => {
  const manifest = fs.existsSync(MANIFEST_PATH) ? readManifest() : {};

  it('permissions is exactly ["storage"]', () => {
    assert.deepEqual(manifest.permissions, ['storage']);
  });

  it('does not declare host_permissions', () => {
    assert.equal(
      Object.prototype.hasOwnProperty.call(manifest, 'host_permissions'),
      false,
      'manifest must not include a host_permissions key'
    );
  });

  it('does not request "tabs" or "activeTab" in permissions', () => {
    const perms = manifest.permissions || [];
    assert.ok(!perms.includes('tabs'));
    assert.ok(!perms.includes('activeTab'));
  });

  it('does not request any permission beyond "storage"', () => {
    const perms = manifest.permissions || [];
    for (const perm of perms) {
      assert.equal(perm, 'storage', `unexpected extra permission: ${perm}`);
    }
  });
});

describe('manifest.json - content_scripts scoped to the AWS Console host only', () => {
  const manifest = fs.existsSync(MANIFEST_PATH) ? readManifest() : {};

  it('declares at least one content script', () => {
    assert.ok(Array.isArray(manifest.content_scripts));
    assert.ok(manifest.content_scripts.length > 0);
  });

  it('every content_scripts[].matches entry is exactly the scoped AWS Console pattern', () => {
    for (const entry of manifest.content_scripts || []) {
      assert.ok(Array.isArray(entry.matches), 'content_scripts entry should have a matches array');
      for (const match of entry.matches) {
        assert.equal(match, ALLOWED_MATCH);
      }
    }
  });

  it('does not use <all_urls> or any unrelated host pattern anywhere in content_scripts', () => {
    for (const entry of manifest.content_scripts || []) {
      for (const match of entry.matches || []) {
        assert.notEqual(match, '<all_urls>');
      }
    }
  });
});

describe('manifest.json - web_accessible_resources scoped to the AWS Console host only', () => {
  const manifest = fs.existsSync(MANIFEST_PATH) ? readManifest() : {};

  it('every web_accessible_resources[].matches entry is exactly the scoped AWS Console pattern', () => {
    for (const entry of manifest.web_accessible_resources || []) {
      assert.ok(Array.isArray(entry.matches), 'web_accessible_resources entry should have a matches array');
      for (const match of entry.matches) {
        assert.equal(match, ALLOWED_MATCH);
      }
      assert.notEqual(entry.matches.includes('<all_urls>'), true);
    }
  });

  it('exposes only scoped Region artwork and flag assets, not the whole package', () => {
    const manifest2 = fs.existsSync(MANIFEST_PATH) ? readManifest() : {};
    for (const entry of manifest2.web_accessible_resources || []) {
      for (const resource of entry.resources || []) {
        const isRegionArtwork = resource.startsWith('assets/regions/');
        const isFlagAsset = resource.startsWith('assets/flags/');
        assert.ok(
          isRegionArtwork || isFlagAsset,
          `web_accessible_resources should be scoped to assets/regions/ or assets/flags/, got: ${resource}`
        );
      }
    }
  });
});

describe('manifest.json - every referenced file exists on disk under extension/', () => {
  const manifest = fs.existsSync(MANIFEST_PATH) ? readManifest() : {};

  it('every content_scripts[].js file exists', () => {
    for (const entry of manifest.content_scripts || []) {
      for (const jsFile of entry.js || []) {
        assert.ok(
          referencedPathExists(jsFile),
          `content script js file not found on disk: extension/${jsFile}`
        );
      }
    }
  });

  it('every content_scripts[].css file exists (if declared)', () => {
    for (const entry of manifest.content_scripts || []) {
      for (const cssFile of entry.css || []) {
        assert.ok(
          referencedPathExists(cssFile),
          `content script css file not found on disk: extension/${cssFile}`
        );
      }
    }
  });

  it('action.default_popup file exists (if declared)', () => {
    if (manifest.action && manifest.action.default_popup) {
      assert.ok(
        referencedPathExists(manifest.action.default_popup),
        `popup html file not found on disk: extension/${manifest.action.default_popup}`
      );
    }
  });

  it('every icon file referenced (top-level icons and action.default_icon) exists', () => {
    const iconMaps = [];
    if (manifest.icons) iconMaps.push(manifest.icons);
    if (manifest.action && manifest.action.default_icon) iconMaps.push(manifest.action.default_icon);

    let checkedAtLeastOne = false;
    for (const iconMap of iconMaps) {
      for (const size of Object.keys(iconMap)) {
        checkedAtLeastOne = true;
        assert.ok(
          referencedPathExists(iconMap[size]),
          `icon file not found on disk: extension/${iconMap[size]}`
        );
      }
    }
    assert.ok(checkedAtLeastOne, 'expected manifest to declare at least one icon');
  });

  it('every web_accessible_resources[].resources entry resolves to at least one file on disk', () => {
    for (const entry of manifest.web_accessible_resources || []) {
      for (const resource of entry.resources || []) {
        // Intentionally soft here for non-ap-northeast-2 region assets: only
        // ap-northeast-2.webp is guaranteed to exist at this stage (see
        // region-config.test.js / region-assets spec). A glob pattern like
        // "assets/regions/*.webp" only needs >=1 match; a literal path to a
        // not-yet-produced asset would legitimately fail here, which is
        // expected/documented, not silently hidden.
        assert.ok(
          referencedPathExists(resource),
          `web_accessible_resources entry did not resolve to any file on disk: extension/${resource}`
        );
      }
    }
  });
});
