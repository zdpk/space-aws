/**
 * region-config.js
 *
 * Region configuration map for AWS Dream. Pure data, no DOM access.
 *
 * Covers the 10 PRD-supported AWS Region codes plus the synthetic
 * `aws-global` key used for global-service console contexts. Every entry
 * points at a deterministic local asset path following the pattern
 * `assets/regions/<region-code>.webp`.
 *
 * Every configured path has a distinct approved 1536 x 256 WebP asset.
 * Source prompts and geographic research remain under prompts/ and docs/;
 * runtime copies are synchronized with scripts/sync-region-assets.sh.
 *
 * `backgroundColor` / `objectPosition` are visual fallback tokens derived
 * from the palette language in PRD.md §5 (e.g. "navy, indigo, coral
 * twilight" for Seoul). Final responsive safe zones still require live AWS
 * Console validation before store release.
 */
(function (root) {
  'use strict';

  var GLOBAL_REGION_CODE = 'aws-global';

  // The 10 MVP-supported AWS Region codes (PRD.md §5). Order matches the PRD.
  var SUPPORTED_REGIONS = [
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

  function assetPathFor(code) {
    return 'assets/regions/' + code + '.webp';
  }

  var REGION_MAP = {
    'ap-northeast-2': {
      label: 'Asia Pacific (Seoul)',
      assetPath: assetPathFor('ap-northeast-2'),
      backgroundColor: '#0b1e3d',
      objectPosition: 'center'
    },
    'ap-northeast-1': {
      label: 'Asia Pacific (Tokyo)',
      assetPath: assetPathFor('ap-northeast-1'),
      backgroundColor: '#0d1b3e',
      objectPosition: 'center'
    },
    'us-east-1': {
      label: 'US East (N. Virginia)',
      assetPath: assetPathFor('us-east-1'),
      backgroundColor: '#0e2340',
      objectPosition: 'center'
    },
    'us-west-2': {
      label: 'US West (Oregon)',
      assetPath: assetPathFor('us-west-2'),
      backgroundColor: '#0d2a2c',
      objectPosition: 'center'
    },
    'eu-west-1': {
      label: 'Europe (Ireland)',
      assetPath: assetPathFor('eu-west-1'),
      backgroundColor: '#0c2a22',
      objectPosition: 'center'
    },
    'eu-central-1': {
      label: 'Europe (Frankfurt)',
      assetPath: assetPathFor('eu-central-1'),
      backgroundColor: '#1a1f29',
      objectPosition: 'center'
    },
    'ap-southeast-1': {
      label: 'Asia Pacific (Singapore)',
      assetPath: assetPathFor('ap-southeast-1'),
      backgroundColor: '#072b2c',
      objectPosition: 'center'
    },
    'ap-southeast-2': {
      label: 'Asia Pacific (Sydney)',
      assetPath: assetPathFor('ap-southeast-2'),
      backgroundColor: '#0c2338',
      objectPosition: 'center'
    },
    'ap-south-1': {
      label: 'Asia Pacific (Mumbai)',
      assetPath: assetPathFor('ap-south-1'),
      backgroundColor: '#1b1533',
      objectPosition: 'center'
    },
    'sa-east-1': {
      label: 'South America (São Paulo)',
      assetPath: assetPathFor('sa-east-1'),
      backgroundColor: '#0d2313',
      objectPosition: 'center'
    }
  };

  REGION_MAP[GLOBAL_REGION_CODE] = {
    label: 'AWS Global',
    assetPath: assetPathFor(GLOBAL_REGION_CODE),
    backgroundColor: '#03050f',
    objectPosition: 'center'
  };

  // Small, maintained, best-effort allowlist of global-service URL markers
  // (PRD.md §9, spec: region-detection "Explicit global-service detection").
  // These are reasonable guesses at AWS Console path fragments for services
  // that have no Region concept; unverified against the live Console (see
  // PRD.md §16 deferred decisions). Matching is intentionally narrow (path
  // fragments), never a blanket host-only rule, so a regional service page
  // that happens to omit an explicit region query param is not
  // misclassified as global.
  var GLOBAL_SERVICE_MARKERS = [
    { pattern: /\/iam\//i, label: 'IAM' },
    { pattern: /\/organizations\//i, label: 'AWS Organizations' },
    { pattern: /\/billing\//i, label: 'Billing & Cost Management' },
    { pattern: /\/costmanagement\//i, label: 'Cost Management' },
    { pattern: /\/route53\//i, label: 'Route 53' },
    { pattern: /\/cloudfront\//i, label: 'CloudFront' },
    { pattern: /\/support\//i, label: 'AWS Support Center' },
    { pattern: /\/artifact\//i, label: 'AWS Artifact' },
    { pattern: /\/trustedadvisor\//i, label: 'Trusted Advisor' }
  ];

  var api = {
    GLOBAL_REGION_CODE: GLOBAL_REGION_CODE,
    SUPPORTED_REGIONS: SUPPORTED_REGIONS,
    REGION_MAP: REGION_MAP,
    GLOBAL_SERVICE_MARKERS: GLOBAL_SERVICE_MARKERS
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    root.AWSDream = root.AWSDream || {};
    Object.assign(root.AWSDream, api);
  }
})(typeof window !== 'undefined' ? window : globalThis);
