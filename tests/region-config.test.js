'use strict';

// Tests for extension/src/region-config.js against the frozen contract in
// openspec/changes/aws-dream-mvp/design.md §2 and the requirements in
// openspec/changes/aws-dream-mvp/specs/region-assets/spec.md.
//
//   SUPPORTED_REGIONS: string[]  (all 34 commercial codes)
//   REGION_MAP: Record<code, {label, assetPath, backgroundColor, objectPosition}>
//               incl. `aws-global`
//   GLOBAL_SERVICE_MARKERS: Array<{pattern: RegExp, label: string}>
//
// This file is owned by the `core` agent. If it does not exist yet, or its
// exports diverge from the contract, these tests will fail/error - that is
// expected until `core` lands extension/src/region-config.js.

const assert = require('node:assert/strict');
const { describe, it } = require('node:test');
const fs = require('node:fs');
const crypto = require('node:crypto');
const path = require('node:path');

const REGION_CONFIG_PATH = path.join(
  __dirname,
  '..',
  'extension',
  'src',
  'region-config.js'
);
const EXTENSION_ROOT = path.join(__dirname, '..', 'extension');

const SUPPORTED_REGION_CODES = [
  'us-east-1',
  'us-east-2',
  'us-west-1',
  'us-west-2',
  'af-south-1',
  'ap-east-1',
  'ap-east-2',
  'ap-northeast-1',
  'ap-northeast-2',
  'ap-northeast-3',
  'ap-south-1',
  'ap-south-2',
  'ap-southeast-1',
  'ap-southeast-2',
  'ap-southeast-3',
  'ap-southeast-4',
  'ap-southeast-5',
  'ap-southeast-6',
  'ap-southeast-7',
  'ca-central-1',
  'ca-west-1',
  'eu-central-1',
  'eu-central-2',
  'eu-north-1',
  'eu-south-1',
  'eu-south-2',
  'eu-west-1',
  'eu-west-2',
  'eu-west-3',
  'il-central-1',
  'me-central-1',
  'me-south-1',
  'mx-central-1',
  'sa-east-1'
];

const GLOBAL_CODE = 'aws-global';

const EXPECTED_FLAG_CODES = {
  'us-east-1': 'us', 'us-east-2': 'us', 'us-west-1': 'us', 'us-west-2': 'us',
  'af-south-1': 'za', 'ap-east-1': 'hk', 'ap-east-2': 'tw',
  'ap-northeast-1': 'jp', 'ap-northeast-2': 'kr', 'ap-northeast-3': 'jp',
  'ap-south-1': 'in', 'ap-south-2': 'in', 'ap-southeast-1': 'sg',
  'ap-southeast-2': 'au', 'ap-southeast-3': 'id', 'ap-southeast-4': 'au',
  'ap-southeast-5': 'my', 'ap-southeast-6': 'nz', 'ap-southeast-7': 'th',
  'ca-central-1': 'ca', 'ca-west-1': 'ca', 'eu-central-1': 'de',
  'eu-central-2': 'ch', 'eu-north-1': 'se', 'eu-south-1': 'it',
  'eu-south-2': 'es', 'eu-west-1': 'ie', 'eu-west-2': 'gb',
  'eu-west-3': 'fr', 'il-central-1': 'il', 'me-central-1': 'ae',
  'me-south-1': 'bh', 'mx-central-1': 'mx', 'sa-east-1': 'br'
};

function loadRegionConfig() {
  return require(REGION_CONFIG_PATH);
}

function readWebPDimensions(buffer) {
  const chunk = buffer.subarray(12, 16).toString('ascii');
  if (chunk === 'VP8 ') {
    return {
      width: buffer.readUInt16LE(26) & 0x3fff,
      height: buffer.readUInt16LE(28) & 0x3fff
    };
  }
  if (chunk === 'VP8X') {
    return {
      width: 1 + buffer.readUIntLE(24, 3),
      height: 1 + buffer.readUIntLE(27, 3)
    };
  }
  throw new Error(`unsupported WebP chunk: ${chunk}`);
}

describe('region-config.js - module contract', () => {
  it('module file exists at extension/src/region-config.js', () => {
    assert.ok(
      fs.existsSync(REGION_CONFIG_PATH),
      'expected extension/src/region-config.js to exist (owned by core agent)'
    );
  });

  it('exports SUPPORTED_REGIONS, REGION_MAP, GLOBAL_SERVICE_MARKERS', () => {
    const mod = loadRegionConfig();
    assert.ok(Array.isArray(mod.SUPPORTED_REGIONS), 'SUPPORTED_REGIONS should be an array');
    assert.ok(
      mod.REGION_MAP && typeof mod.REGION_MAP === 'object',
      'REGION_MAP should be an object'
    );
    assert.ok(
      Array.isArray(mod.GLOBAL_SERVICE_MARKERS),
      'GLOBAL_SERVICE_MARKERS should be an array'
    );
  });
});

describe('region-config.js - SUPPORTED_REGIONS coverage (all 34 commercial Region codes)', () => {
  const mod = loadRegionConfig();

  it('contains exactly the 34 supported Region codes (no more, no fewer)', () => {
    const actual = [...mod.SUPPORTED_REGIONS].sort();
    const expected = [...SUPPORTED_REGION_CODES].sort();
    assert.deepEqual(actual, expected);
  });

  for (const code of SUPPORTED_REGION_CODES) {
    it(`includes ${code} in SUPPORTED_REGIONS`, () => {
      assert.ok(
        mod.SUPPORTED_REGIONS.includes(code),
        `SUPPORTED_REGIONS should include ${code}`
      );
    });
  }

  it(`does NOT include ${GLOBAL_CODE} in SUPPORTED_REGIONS`, () => {
    // aws-global is a distinct state, not one of the 34 Region codes.
    assert.ok(!mod.SUPPORTED_REGIONS.includes(GLOBAL_CODE));
  });
});

describe('region-config.js - REGION_MAP coverage (34 Regions + aws-global)', () => {
  const mod = loadRegionConfig();
  const allCodes = [...SUPPORTED_REGION_CODES, GLOBAL_CODE];

  for (const code of allCodes) {
    describe(`entry for "${code}"`, () => {
      it('is present in REGION_MAP', () => {
        assert.ok(
          Object.prototype.hasOwnProperty.call(mod.REGION_MAP, code),
          `REGION_MAP should have an entry for ${code}`
        );
      });

      it('has a non-empty label', () => {
        const entry = mod.REGION_MAP[code];
        assert.ok(entry, `REGION_MAP.${code} should exist`);
        assert.equal(typeof entry.label, 'string');
        assert.ok(entry.label.length > 0, `REGION_MAP.${code}.label should be non-empty`);
      });

      it(`has assetPath exactly "assets/regions/${code}.webp"`, () => {
        const entry = mod.REGION_MAP[code];
        assert.equal(entry.assetPath, `assets/regions/${code}.webp`);
      });

      it('has a backgroundColor field', () => {
        const entry = mod.REGION_MAP[code];
        assert.equal(typeof entry.backgroundColor, 'string');
        assert.ok(entry.backgroundColor.length > 0);
      });

      it('has an objectPosition field', () => {
        const entry = mod.REGION_MAP[code];
        assert.equal(typeof entry.objectPosition, 'string');
        assert.ok(entry.objectPosition.length > 0);
      });
    });
  }

  it('has exactly 35 entries (34 Regions + aws-global), no fabricated extras', () => {
    const keys = Object.keys(mod.REGION_MAP).sort();
    const expected = [...allCodes].sort();
    assert.deepEqual(keys, expected);
  });

  it('configures every Region badge with its bundled country flag', () => {
    for (const [code, flagCode] of Object.entries(EXPECTED_FLAG_CODES)) {
      const entry = mod.REGION_MAP[code];
      const flagAssetPath = `assets/flags/${flagCode}.svg`;
      assert.equal(entry.badgeCode, code.toUpperCase());
      assert.equal(entry.flagAssetPath, flagAssetPath);
      assert.ok(fs.existsSync(path.join(EXTENSION_ROOT, flagAssetPath)));
    }
  });

  it('configures a text-only badge for the global scene', () => {
    const global = mod.REGION_MAP[GLOBAL_CODE];
    assert.equal(global.badgeCode, 'AWS-GLOBAL');
    assert.equal(global.flagAssetPath, undefined);
  });

  it('every assetPath is unique across entries (no two Regions share an asset path)', () => {
    const entries = Object.entries(mod.REGION_MAP);
    const paths = entries.map(([, v]) => v.assetPath);
    const uniquePaths = new Set(paths);
    assert.equal(
      uniquePaths.size,
      paths.length,
      'expected every REGION_MAP entry to have a distinct assetPath'
    );
  });
});

describe('region-config.js - GLOBAL_SERVICE_MARKERS shape', () => {
  const mod = loadRegionConfig();

  it('is a non-empty array', () => {
    assert.ok(mod.GLOBAL_SERVICE_MARKERS.length > 0, 'expected at least one global-service marker');
  });

  it('every marker has a RegExp pattern and a string label', () => {
    for (const marker of mod.GLOBAL_SERVICE_MARKERS) {
      assert.ok(marker.pattern instanceof RegExp, 'marker.pattern should be a RegExp');
      assert.equal(typeof marker.label, 'string');
      assert.ok(marker.label.length > 0);
    }
  });

  it('includes a marker matching the IAM console (spec example: console.aws.amazon.com/iam/)', () => {
    const sampleHref = 'https://console.aws.amazon.com/iam/home';
    const matched = mod.GLOBAL_SERVICE_MARKERS.some((m) => m.pattern.test(sampleHref));
    assert.ok(
      matched,
      'expected at least one GLOBAL_SERVICE_MARKERS entry to match the IAM console URL, ' +
        'per specs/region-detection/spec.md "Known global service host or path" scenario'
    );
  });
});

describe('region-assets spec - complete production asset set', () => {
  const allCodes = [...SUPPORTED_REGION_CODES, GLOBAL_CODE];

  for (const code of allCodes) {
    it(`has a non-empty WebP asset for "${code}"`, () => {
      const assetPath = path.join(EXTENSION_ROOT, 'assets', 'regions', `${code}.webp`);
      assert.ok(fs.existsSync(assetPath), `missing extension/assets/regions/${code}.webp`);
      const asset = fs.readFileSync(assetPath);
      assert.ok(asset.length > 1000, `asset is unexpectedly small: ${code}.webp`);
      assert.equal(asset.subarray(0, 4).toString('ascii'), 'RIFF');
      assert.equal(asset.subarray(8, 12).toString('ascii'), 'WEBP');
      assert.deepEqual(readWebPDimensions(asset), { width: 4096, height: 200 });
    });
  }

  it('all 35 production assets are byte-distinct', () => {
    const hashes = allCodes.map((code) => {
      const assetPath = path.join(EXTENSION_ROOT, 'assets', 'regions', `${code}.webp`);
      return crypto.createHash('sha256').update(fs.readFileSync(assetPath)).digest('hex');
    });
    assert.equal(new Set(hashes).size, allCodes.length);
  });
});
