# Chrome Web Store visual assets

## Final assets

- `icons/aws-dream-store-icon-1024.png` — high-resolution golden-moon store icon
- `icons/aws-dream-store-icon-128.png` — Chrome Web Store and manifest icon
- `icons/aws-dream-store-icon-48.png` — extension management icon
- `icons/aws-dream-store-icon-16.png` — size-adapted golden crescent toolbar icon
- `screenshots/01-seoul-region.png` — supported Region header state
- `screenshots/02-tokyo-region.png` — Region switching state
- `screenshots/03-global-space-and-toggle.png` — global service and popup state

All store screenshots are 1280×800 pixels.

The screenshots are privacy-safe staged previews rendered from a local AWS Console mock. They contain no account identifiers or resource data. Replace them with equivalent live captures after the signed-in Console QA pass if the current production Console layout differs materially.

## Sources

- The golden crescent background was generated with OpenAI image generation at the highest available quality.
- The header artwork is bundled in `extension/assets/regions/`.
- `source/aws-logo-smile-official.png` is the AWS-only source image hosted on the official AWS static asset domain.
- `source/aws-logo-smile-white-transparent.png` preserves that mark while removing only its solid presentation background for composition.
- `source/powered-by-aws-white.png` and `source/icon-night-sky-background.png` preserve the previous icon concept.

Amazon Web Services, AWS, and the Powered by AWS logo are trademarks of Amazon.com, Inc. or its affiliates. AWS Dream is an independent extension and is not affiliated with, endorsed by, or sponsored by Amazon Web Services.

The AWS-only logo concept requires separate written permission or another applicable AWS license before public release. The general AWS Trademark Guidelines expressly cover the `Powered by AWS` logo for qualifying customers, but do not grant the same general license for an AWS Smile Logo used as a third-party product icon. Do not submit this concept to the Chrome Web Store until that permission is confirmed.

## Rebuild

Open `source/icon-composite.html` at a 1024×1024 viewport and capture it to rebuild the golden-moon icon source.

Open `source/store-screenshot.html` at a 1280×800 viewport with one of these query strings:

- `?scene=seoul`
- `?scene=tokyo`
- `?scene=global`
