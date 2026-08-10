# Runtime Region assets

These are the production WebP files loaded by the Chrome extension.

## Coverage

- Ten approved MVP Regions
- One `aws-global` space scene
- Dimensions: `1536 × 256`
- Format: WebP

## Generation and optimization

- Use case: `stylized-concept`
- Source canvas: `1536 × 1024`
- Final crop: `1536 × 256`
- Prompt source: `prompts/region-landscapes.md`
- WebP command: `cwebp -q 82 -m 6`

Frankfurt required one targeted composition revision so the complete skyline and River Main fit the shallow header crop. Singapore required a crop-position adjustment. The other generated scenes passed the first header-crop review.

Source PNG files and review crops are kept under `output/imagegen/`.
