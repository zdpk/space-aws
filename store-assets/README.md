# Chrome Web Store visual assets

## Final assets

- `icons/aws-dream-store-icon-1024.png` — high-resolution store icon source
- `icons/aws-dream-store-icon-128.png` — Chrome Web Store and manifest icon
- `icons/aws-dream-store-icon-48.png` — extension management icon
- `icons/aws-dream-store-icon-16.png` — toolbar icon
- `screenshots/01-seoul-region.png` — supported Region header state
- `screenshots/02-tokyo-region.png` — Region switching state
- `screenshots/03-global-space-and-toggle.png` — global service and popup state

All store screenshots are 1280×800 pixels.

The screenshots are privacy-safe staged previews rendered from a local AWS Console mock. They contain no account identifiers or resource data. Replace them with equivalent live captures after the signed-in Console QA pass if the current production Console layout differs materially.

## Sources

- The night-sky icon background was generated with OpenAI image generation at the highest available quality.
- The header artwork is bundled in `extension/assets/regions/`.
- `source/powered-by-aws-white.png` is the unmodified official dark-background asset supplied by the [AWS Co-Marketing Tools](https://aws.amazon.com/co-marketing/) page.

Amazon Web Services, AWS, and the Powered by AWS logo are trademarks of Amazon.com, Inc. or its affiliates. AWS Dream is an independent extension and is not affiliated with, endorsed by, or sponsored by Amazon Web Services.

Review the current [AWS Trademark Guidelines](https://aws.amazon.com/trademark-guidelines/) before public release. The logo must remain unmodified and must not imply AWS sponsorship or endorsement.

## Rebuild

Open `source/icon-composite.html` at a 1024×1024 viewport and capture it to rebuild the icon source.

Open `source/store-screenshot.html` at a 1280×800 viewport with one of these query strings:

- `?scene=seoul`
- `?scene=tokyo`
- `?scene=global`
