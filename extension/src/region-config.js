/**
 * region-config.js
 *
 * Region configuration map for AWS Dream. Pure data, no DOM access.
 *
 * Covers all 34 standard commercial AWS Region codes plus the synthetic
 * `aws-global` key used for global-service console contexts. Every entry
 * points at a deterministic local asset path following the pattern
 * `assets/regions/<region-code>.webp`.
 *
 * Every configured path has a distinct approved Cosmic Regions WebP asset.
 * All two-row assets use a 4096 x 200 production strip.
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

  // All standard commercial AWS Region codes, grouped by geography.
  var SUPPORTED_REGIONS = [
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

  function assetPathFor(code) {
    return 'assets/regions/' + code + '.webp';
  }

  var REGION_MAP = {
    'us-east-1': {
      label: 'US East (N. Virginia)',
      assetPath: assetPathFor('us-east-1'),
      backgroundColor: '#0e2340',
      objectPosition: 'center',
      badgeCode: 'US-EAST-1',
      flagAssetPath: 'assets/flags/us.svg'
    },
    'us-east-2': {
      label: 'US East (Ohio)', assetPath: assetPathFor('us-east-2'),
      backgroundColor: '#10263f', objectPosition: 'center',
      badgeCode: 'US-EAST-2', flagAssetPath: 'assets/flags/us.svg'
    },
    'us-west-1': {
      label: 'US West (N. California)', assetPath: assetPathFor('us-west-1'),
      backgroundColor: '#1b2635', objectPosition: 'center',
      badgeCode: 'US-WEST-1', flagAssetPath: 'assets/flags/us.svg'
    },
    'us-west-2': {
      label: 'US West (Oregon)',
      assetPath: assetPathFor('us-west-2'),
      backgroundColor: '#0d2a2c',
      objectPosition: 'center',
      badgeCode: 'US-WEST-2',
      flagAssetPath: 'assets/flags/us.svg'
    },
    'af-south-1': {
      label: 'Africa (Cape Town)', assetPath: assetPathFor('af-south-1'),
      backgroundColor: '#182334', objectPosition: 'center',
      badgeCode: 'AF-SOUTH-1', flagAssetPath: 'assets/flags/za.svg'
    },
    'ap-east-1': {
      label: 'Asia Pacific (Hong Kong)', assetPath: assetPathFor('ap-east-1'),
      backgroundColor: '#07282d', objectPosition: 'center',
      badgeCode: 'AP-EAST-1', flagAssetPath: 'assets/flags/hk.svg'
    },
    'ap-east-2': {
      label: 'Asia Pacific (Taipei)', assetPath: assetPathFor('ap-east-2'),
      backgroundColor: '#171738', objectPosition: 'center',
      badgeCode: 'AP-EAST-2', flagAssetPath: 'assets/flags/tw.svg'
    },
    'ap-northeast-1': {
      label: 'Asia Pacific (Tokyo)', assetPath: assetPathFor('ap-northeast-1'),
      backgroundColor: '#0d1b3e', objectPosition: 'center',
      badgeCode: 'AP-NORTHEAST-1', flagAssetPath: 'assets/flags/jp.svg'
    },
    'ap-northeast-2': {
      label: 'Asia Pacific (Seoul)', assetPath: assetPathFor('ap-northeast-2'),
      backgroundColor: '#0b1e3d', objectPosition: 'center',
      badgeCode: 'AP-NORTHEAST-2', flagAssetPath: 'assets/flags/kr.svg'
    },
    'ap-northeast-3': {
      label: 'Asia Pacific (Osaka)', assetPath: assetPathFor('ap-northeast-3'),
      backgroundColor: '#0a2138', objectPosition: 'center',
      badgeCode: 'AP-NORTHEAST-3', flagAssetPath: 'assets/flags/jp.svg'
    },
    'ap-south-1': {
      label: 'Asia Pacific (Mumbai)', assetPath: assetPathFor('ap-south-1'),
      backgroundColor: '#1b1533', objectPosition: 'center',
      badgeCode: 'AP-SOUTH-1', flagAssetPath: 'assets/flags/in.svg'
    },
    'ap-south-2': {
      label: 'Asia Pacific (Hyderabad)', assetPath: assetPathFor('ap-south-2'),
      backgroundColor: '#20182d', objectPosition: 'center',
      badgeCode: 'AP-SOUTH-2', flagAssetPath: 'assets/flags/in.svg'
    },
    'ap-southeast-1': {
      label: 'Asia Pacific (Singapore)',
      assetPath: assetPathFor('ap-southeast-1'),
      backgroundColor: '#072b2c',
      objectPosition: 'center',
      badgeCode: 'AP-SOUTHEAST-1',
      flagAssetPath: 'assets/flags/sg.svg'
    },
    'ap-southeast-2': {
      label: 'Asia Pacific (Sydney)',
      assetPath: assetPathFor('ap-southeast-2'),
      backgroundColor: '#0c2338',
      objectPosition: 'center',
      badgeCode: 'AP-SOUTHEAST-2',
      flagAssetPath: 'assets/flags/au.svg'
    },
    'ap-southeast-3': {
      label: 'Asia Pacific (Jakarta)', assetPath: assetPathFor('ap-southeast-3'),
      backgroundColor: '#071f32', objectPosition: 'center',
      badgeCode: 'AP-SOUTHEAST-3', flagAssetPath: 'assets/flags/id.svg'
    },
    'ap-southeast-4': {
      label: 'Asia Pacific (Melbourne)', assetPath: assetPathFor('ap-southeast-4'),
      backgroundColor: '#17162d', objectPosition: 'center',
      badgeCode: 'AP-SOUTHEAST-4', flagAssetPath: 'assets/flags/au.svg'
    },
    'ap-southeast-5': {
      label: 'Asia Pacific (Malaysia)', assetPath: assetPathFor('ap-southeast-5'),
      backgroundColor: '#06292d', objectPosition: 'center',
      badgeCode: 'AP-SOUTHEAST-5', flagAssetPath: 'assets/flags/my.svg'
    },
    'ap-southeast-6': {
      label: 'Asia Pacific (New Zealand)', assetPath: assetPathFor('ap-southeast-6'),
      backgroundColor: '#08273b', objectPosition: 'center',
      badgeCode: 'AP-SOUTHEAST-6', flagAssetPath: 'assets/flags/nz.svg'
    },
    'ap-southeast-7': {
      label: 'Asia Pacific (Thailand)', assetPath: assetPathFor('ap-southeast-7'),
      backgroundColor: '#0b2038', objectPosition: 'center',
      badgeCode: 'AP-SOUTHEAST-7', flagAssetPath: 'assets/flags/th.svg'
    },
    'ca-central-1': {
      label: 'Canada (Central)', assetPath: assetPathFor('ca-central-1'),
      backgroundColor: '#092b34', objectPosition: 'center',
      badgeCode: 'CA-CENTRAL-1', flagAssetPath: 'assets/flags/ca.svg'
    },
    'ca-west-1': {
      label: 'Canada West (Calgary)', assetPath: assetPathFor('ca-west-1'),
      backgroundColor: '#171a36', objectPosition: 'center',
      badgeCode: 'CA-WEST-1', flagAssetPath: 'assets/flags/ca.svg'
    },
    'eu-central-1': {
      label: 'Europe (Frankfurt)', assetPath: assetPathFor('eu-central-1'),
      backgroundColor: '#1a1f29', objectPosition: 'center',
      badgeCode: 'EU-CENTRAL-1', flagAssetPath: 'assets/flags/de.svg'
    },
    'eu-central-2': {
      label: 'Europe (Zurich)', assetPath: assetPathFor('eu-central-2'),
      backgroundColor: '#0b2137', objectPosition: 'center',
      badgeCode: 'EU-CENTRAL-2', flagAssetPath: 'assets/flags/ch.svg'
    },
    'eu-north-1': {
      label: 'Europe (Stockholm)', assetPath: assetPathFor('eu-north-1'),
      backgroundColor: '#082a36', objectPosition: 'center',
      badgeCode: 'EU-NORTH-1', flagAssetPath: 'assets/flags/se.svg'
    },
    'eu-south-1': {
      label: 'Europe (Milan)', assetPath: assetPathFor('eu-south-1'),
      backgroundColor: '#152437', objectPosition: 'center',
      badgeCode: 'EU-SOUTH-1', flagAssetPath: 'assets/flags/it.svg'
    },
    'eu-south-2': {
      label: 'Europe (Spain)', assetPath: assetPathFor('eu-south-2'),
      backgroundColor: '#201b2e', objectPosition: 'center',
      badgeCode: 'EU-SOUTH-2', flagAssetPath: 'assets/flags/es.svg'
    },
    'eu-west-1': {
      label: 'Europe (Ireland)', assetPath: assetPathFor('eu-west-1'),
      backgroundColor: '#0c2a22', objectPosition: 'center',
      badgeCode: 'EU-WEST-1', flagAssetPath: 'assets/flags/ie.svg'
    },
    'eu-west-2': {
      label: 'Europe (London)', assetPath: assetPathFor('eu-west-2'),
      backgroundColor: '#0d2137', objectPosition: 'center',
      badgeCode: 'EU-WEST-2', flagAssetPath: 'assets/flags/gb.svg'
    },
    'eu-west-3': {
      label: 'Europe (Paris)', assetPath: assetPathFor('eu-west-3'),
      backgroundColor: '#19172f', objectPosition: 'center',
      badgeCode: 'EU-WEST-3', flagAssetPath: 'assets/flags/fr.svg'
    },
    'il-central-1': {
      label: 'Israel (Tel Aviv)', assetPath: assetPathFor('il-central-1'),
      backgroundColor: '#1e2130', objectPosition: 'center',
      badgeCode: 'IL-CENTRAL-1', flagAssetPath: 'assets/flags/il.svg'
    },
    'me-central-1': {
      label: 'Middle East (UAE)', assetPath: assetPathFor('me-central-1'),
      backgroundColor: '#171d31', objectPosition: 'center',
      badgeCode: 'ME-CENTRAL-1', flagAssetPath: 'assets/flags/ae.svg'
    },
    'me-south-1': {
      label: 'Middle East (Bahrain)', assetPath: assetPathFor('me-south-1'),
      backgroundColor: '#171e2c', objectPosition: 'center',
      badgeCode: 'ME-SOUTH-1', flagAssetPath: 'assets/flags/bh.svg'
    },
    'mx-central-1': {
      label: 'Mexico (Central)', assetPath: assetPathFor('mx-central-1'),
      backgroundColor: '#211a29', objectPosition: 'center',
      badgeCode: 'MX-CENTRAL-1', flagAssetPath: 'assets/flags/mx.svg'
    },
    'sa-east-1': {
      label: 'South America (São Paulo)',
      assetPath: assetPathFor('sa-east-1'),
      backgroundColor: '#0d2313',
      objectPosition: 'center',
      badgeCode: 'SA-EAST-1',
      flagAssetPath: 'assets/flags/br.svg'
    }
  };

  REGION_MAP[GLOBAL_REGION_CODE] = {
    label: 'AWS Global',
    assetPath: assetPathFor(GLOBAL_REGION_CODE),
    backgroundColor: '#03050f',
    objectPosition: 'center',
    badgeCode: 'AWS-GLOBAL'
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
