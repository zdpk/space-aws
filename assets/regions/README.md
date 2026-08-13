# Runtime Region assets

These are the production WebP files loaded by the Chrome extension.

## Coverage

- Ten approved MVP Regions
- All 34 standard commercial AWS Region scenes
- One `aws-global` space scene
- Dimensions: all Cosmic Regions headers `4096 × 200`
- Format: WebP

## Generation and optimization

- Use case: `stylized-concept`
- Cosmic source canvas: generated layout sheet with a complete central panorama
- Cosmic final canvas: `4096 × 200`, aspect-preserving central subject over a dark feathered continuation
- Prompt sources: `prompts/cosmic-regions.md`
- Existing reviewed sources and header PNGs: `output/imagegen/cosmic-regions-v2/`
- Added 24-Region sources and header PNGs: `output/imagegen/cosmic-regions-all/`
- WebP command: `cwebp -q 88 -m 6`

On 2026-08-12, all nine non-Seoul MVP Region images were regenerated after the earlier center-band crop cut through their Earth and geography compositions. The replacement sources compose each full scene inside a dedicated panorama before runtime assembly. Seoul and `aws-global` were not regenerated in this pass.

On 2026-08-13, the remaining 24 standard commercial Region images were generated with the same complete-panorama contract and added to both source and runtime asset sets. The production directory now contains 34 Region images plus `aws-global`.

All ten MVP Regions and the global scene use the two-row Cosmic Regions direction.
Source PNG files, review crops, and final prompts are kept under `output/imagegen/`.
