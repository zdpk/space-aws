# Chrome Web Store visual assets

## Final assets

- `icons/aws-dream-store-icon-1024.png` — high-resolution global-space store icon
- `icons/aws-dream-store-icon-128.png` — Chrome Web Store and manifest icon
- `icons/aws-dream-store-icon-48.png` — extension management icon
- `icons/aws-dream-store-icon-16.png` — size-adapted global-space toolbar icon
- `screenshots/01-seoul-region.png` — supported Region header state
- `screenshots/02-tokyo-region.png` — Region switching state
- `screenshots/03-global-space-and-toggle.png` — global service and popup state

All store screenshots are 1280×800 pixels.

The screenshots are privacy-safe staged previews rendered from a local AWS Console mock. They contain no account identifiers or resource data. Replace them with equivalent live captures after the signed-in Console QA pass if the current production Console layout differs materially.

## Sources

- The square global-space background was adapted from `extension/assets/regions/aws-global.webp` with OpenAI image generation at the highest available quality.
- The header artwork is bundled in `extension/assets/regions/`.
- The final icon uses `source/aws-logo-smile-white-transparent.png`, derived from the AWS-only source image hosted on the official AWS static asset domain.
- `source/powered-by-aws-white.png`, `source/icon-cloudy-moon-background.png`, `source/icon-yellow-moon-background.png`, and `source/icon-night-sky-background.png` preserve previous icon concepts only.

Amazon Web Services, AWS, and the Powered by AWS logo are trademarks of Amazon.com, Inc. or its affiliates. AWS Dream is an independent extension and is not affiliated with, endorsed by, or sponsored by Amazon Web Services.

The AWS Smile Logo is an AWS trademark. Obtain written permission or another applicable AWS license before public release, keep the independent-extension disclaimer, and do not imply AWS sponsorship, endorsement, or affiliation.

## Rebuild

Open `source/icon-composite.html` at a 1024×1024 viewport and capture it to rebuild the global-space icon source.

Open `source/store-screenshot.html` at a 1280×800 viewport with one of these query strings:

- `?scene=seoul`
- `?scene=tokyo`
- `?scene=global`
