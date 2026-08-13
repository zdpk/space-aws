# Runtime Region assets

These are the production WebP files loaded by the Chrome extension.

## Coverage

- All 34 standard commercial AWS Region scenes
- One `aws-global` space scene
- Dimensions: all Cosmic Regions headers `4096 × 200`
- Format: WebP

## Generation and optimization

- Use case: `stylized-concept`
- Cosmic source canvas: generated layout sheet with a complete central panorama
- Cosmic final canvas: `4096 × 200`, aspect-preserving central subject over a dark feathered continuation
- WebP command: `cwebp -q 88 -m 6`

On 2026-08-12, all nine non-Seoul MVP Region images were regenerated after the earlier center-band crop cut through their Earth and geography compositions. The replacement sources compose each full scene inside a dedicated panorama before runtime assembly. Seoul and `aws-global` were not regenerated in this pass.

On 2026-08-13, the remaining 24 standard commercial Region images were generated with the same complete-panorama contract and added to both source and runtime asset sets. The production directory now contains 34 Region images plus `aws-global`.

All Region scenes and the global scene use the two-row Cosmic Regions direction.
Source PNG files, review crops, and production prompts are maintained separately from the public repository.
