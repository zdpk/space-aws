'use strict';

// Tests for extension/src/region-detector.js against the frozen contract in
// openspec/changes/aws-dream-mvp/design.md §2 and every requirement/scenario
// in openspec/changes/aws-dream-mvp/specs/region-detection/spec.md.
//
//   detectState({ href, search, regionSelectorText }):
//     { status: 'region' | 'global' | 'unsupported' | 'ambiguous', regionCode?: string }
//
// Pure function, no DOM access - all inputs are plain strings, per design.md
// ("so `qa` can unit test it with plain strings"). This file is owned by the
// `core` agent; if it does not exist yet, or diverges from the contract,
// these tests will fail/error - expected until `core` lands
// extension/src/region-detector.js.

const assert = require('node:assert/strict');
const { describe, it } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');

const REGION_DETECTOR_PATH = path.join(
  __dirname,
  '..',
  'extension',
  'src',
  'region-detector.js'
);
const REGION_CONFIG_PATH = path.join(
  __dirname,
  '..',
  'extension',
  'src',
  'region-config.js'
);

function loadDetector() {
  return require(REGION_DETECTOR_PATH);
}

function loadConfig() {
  return require(REGION_CONFIG_PATH);
}

const SUPPORTED_REGION_CODES = [
  'ap-northeast-2',
  'ap-northeast-1',
  'us-east-1',
  'us-west-2',
  'eu-west-1',
  'eu-central-1',
  'ap-southeast-1',
  'ap-southeast-2',
  'ap-south-1',
  'sa-east-1'
];

// Real, official AWS Region display names, as they would appear in the
// Region-selector UI. Used for the visible-selector-fallback scenario.
const OFFICIAL_REGION_LABELS = {
  'ap-northeast-2': 'Asia Pacific (Seoul)',
  'ap-northeast-1': 'Asia Pacific (Tokyo)',
  'us-east-1': 'US East (N. Virginia)',
  'us-west-2': 'US West (Oregon)',
  'eu-west-1': 'Europe (Ireland)',
  'eu-central-1': 'Europe (Frankfurt)',
  'ap-southeast-1': 'Asia Pacific (Singapore)',
  'ap-southeast-2': 'Asia Pacific (Sydney)',
  'ap-south-1': 'Asia Pacific (Mumbai)',
  'sa-east-1': 'South America (São Paulo)'
};

describe('region-detector.js - module contract', () => {
  it('module file exists at extension/src/region-detector.js', () => {
    assert.ok(
      fs.existsSync(REGION_DETECTOR_PATH),
      'expected extension/src/region-detector.js to exist (owned by core agent)'
    );
  });

  it('exports a detectState function', () => {
    const mod = loadDetector();
    assert.equal(typeof mod.detectState, 'function');
  });
});

describe('region-detector.js - URL and query Region parsing (FR-01, signal 1)', () => {
  const { detectState } = loadDetector();

  it('resolves a Region present in the query string (region=ap-northeast-2)', () => {
    const result = detectState({
      href: 'https://console.aws.amazon.com/ec2/home?region=ap-northeast-2#Instances',
      search: '?region=ap-northeast-2',
      regionSelectorText: ''
    });
    assert.equal(result.status, 'region');
    assert.equal(result.regionCode, 'ap-northeast-2');
  });

  it('resolves a Region present as a subdomain/path signal (us-west-2 console host)', () => {
    const result = detectState({
      href: 'https://us-west-2.console.aws.amazon.com/cloudwatch/home?region=us-west-2',
      search: '?region=us-west-2',
      regionSelectorText: ''
    });
    assert.equal(result.status, 'region');
    assert.equal(result.regionCode, 'us-west-2');
  });

  for (const code of SUPPORTED_REGION_CODES) {
    it(`resolves supported Region code ${code} from the query string`, () => {
      const result = detectState({
        href: `https://console.aws.amazon.com/console/home?region=${code}`,
        search: `?region=${code}`,
        regionSelectorText: ''
      });
      assert.equal(result.status, 'region');
      assert.equal(result.regionCode, code);
    });
  }

  it('resolves a Region code that is valid AWS but not in the 10-code allowlist to "unsupported" (e.g. ca-central-1)', () => {
    const result = detectState({
      href: 'https://console.aws.amazon.com/ec2/home?region=ca-central-1',
      search: '?region=ca-central-1',
      regionSelectorText: ''
    });
    assert.equal(result.status, 'unsupported');
    assert.notEqual(result.regionCode, 'ca-central-1');
  });

  it('does not guess a nearby supported Region for an unsupported code', () => {
    // ap-northeast-3 (Osaka) is geographically "nearby" ap-northeast-2/1 but
    // is not one of the 10 supported codes; must not be coerced to either.
    const result = detectState({
      href: 'https://console.aws.amazon.com/ec2/home?region=ap-northeast-3',
      search: '?region=ap-northeast-3',
      regionSelectorText: ''
    });
    assert.equal(result.status, 'unsupported');
  });
});

describe('region-detector.js - explicit global-service detection (FR-01/FR-04, signal 2)', () => {
  const { detectState } = loadDetector();

  it('resolves to aws-global for a known global service host/path (IAM, per spec example)', () => {
    const result = detectState({
      href: 'https://console.aws.amazon.com/iam/home',
      search: '',
      regionSelectorText: ''
    });
    assert.equal(result.status, 'global');
  });

  it('falls through to the selector fallback when no global marker or URL Region is present', () => {
    const result = detectState({
      href: 'https://console.aws.amazon.com/somesvc/home',
      search: '',
      regionSelectorText: 'Asia Pacific (Seoul)'
    });
    // No URL/global signal resolved it, so the visible selector fallback applies.
    assert.equal(result.status, 'region');
    assert.equal(result.regionCode, 'ap-northeast-2');
  });
});

describe('region-detector.js - visible Region-selector fallback (FR-01, signal 3)', () => {
  const { detectState } = loadDetector();
  const config = loadConfig();

  it('resolves ambiguous when the selector is missing/empty and no other signal resolved', () => {
    const result = detectState({
      href: 'https://console.aws.amazon.com/somesvc/home',
      search: '',
      regionSelectorText: ''
    });
    assert.equal(result.status, 'ambiguous');
  });

  it('resolves ambiguous when the selector text does not unambiguously match a supported Region', () => {
    const result = detectState({
      href: 'https://console.aws.amazon.com/somesvc/home',
      search: '',
      regionSelectorText: 'Some Unrelated Text'
    });
    assert.equal(result.status, 'ambiguous');
  });

  for (const code of SUPPORTED_REGION_CODES) {
    it(`resolves ${code} from its official Region-selector display text as a last resort`, () => {
      const result = detectState({
        href: 'https://console.aws.amazon.com/somesvc/home',
        search: '',
        regionSelectorText: OFFICIAL_REGION_LABELS[code]
      });
      assert.equal(result.status, 'region');
      assert.equal(result.regionCode, code);
    });
  }

  // Decoupled from any hardcoded label guesses: derive the expected selector
  // text directly from core's own REGION_MAP.label for each Region, so this
  // stays correct even if core picks different display strings than the
  // "official" AWS names above.
  for (const code of SUPPORTED_REGION_CODES) {
    it(`resolves ${code} from REGION_MAP's own configured label text`, () => {
      const label = config.REGION_MAP[code] && config.REGION_MAP[code].label;
      assert.ok(label, `REGION_MAP.${code}.label must exist for this test to be meaningful`);
      const result = detectState({
        href: 'https://console.aws.amazon.com/somesvc/home',
        search: '',
        regionSelectorText: label
      });
      assert.equal(result.status, 'region');
      assert.equal(result.regionCode, code);
    });
  }
});

describe('region-detector.js - ambiguous/unsupported classification', () => {
  const { detectState } = loadDetector();

  it('unsupported Region code takes precedence and does not fall back to the selector', () => {
    const result = detectState({
      href: 'https://console.aws.amazon.com/ec2/home?region=ca-central-1',
      search: '?region=ca-central-1',
      regionSelectorText: 'Asia Pacific (Seoul)'
    });
    assert.equal(result.status, 'unsupported');
  });
});

describe('region-detector.js - deterministic signal precedence', () => {
  const { detectState } = loadDetector();

  it('URL signal wins over a stale/conflicting Region-selector text', () => {
    const result = detectState({
      href: 'https://console.aws.amazon.com/ec2/home?region=eu-central-1',
      search: '?region=eu-central-1',
      regionSelectorText: 'US East (N. Virginia)' // stale, mid-UI-update text
    });
    assert.equal(result.status, 'region');
    assert.equal(result.regionCode, 'eu-central-1');
  });

  it('global-service signal wins over the Region-selector fallback', () => {
    const result = detectState({
      href: 'https://console.aws.amazon.com/iam/home',
      search: '',
      regionSelectorText: 'Asia Pacific (Seoul)' // should be ignored once global wins
    });
    assert.equal(result.status, 'global');
  });
});
